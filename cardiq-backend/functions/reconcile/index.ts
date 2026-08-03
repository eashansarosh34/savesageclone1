// ============================================================
// CardIQ — Reward Reconciliation Engine (Supabase Edge Function)
// Deploy: supabase functions deploy reconcile
//
// THE DIFFERENTIATOR. Compares:
//   expected reward (what CardIQ calculated the user SHOULD earn)
//   vs
//   actual reward (what the bank statement email says was credited)
//
// Flags discrepancies and generates a dispute letter.
// This is what justifies a subscription — no competitor does it well.
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ReconcileRequest {
  cardId: number;
  month: string;          // "2026-08"
  actualRewardCredited: number; // parsed from statement email (points or ₹)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { cardId, month, actualRewardCredited }: ReconcileRequest = await req.json();

    // 1. Fetch all this user's transactions on this card in this month
    const start = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().split("T")[0];

    const { data: txns, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("card_id", cardId)
      .gte("tx_date", start)
      .lt("tx_date", end);

    if (error) return json({ error: error.message }, 500);

    // 2. Sum expected rewards (CardIQ already computed reward_earned per txn)
    const expectedReward = (txns || []).reduce(
      (sum, t) => sum + parseFloat(t.reward_earned || 0), 0,
    );

    // 3. Compare
    const discrepancy = expectedReward - actualRewardCredited;
    const pctOff = expectedReward > 0 ? (discrepancy / expectedReward) * 100 : 0;

    let status: "match" | "underpaid" | "overpaid";
    if (Math.abs(discrepancy) < Math.max(5, expectedReward * 0.02)) {
      status = "match";           // within 2% or ₹5 — considered correct
    } else if (discrepancy > 0) {
      status = "underpaid";        // bank owes the user
    } else {
      status = "overpaid";         // bank gave more (rare, don't dispute)
    }

    // 4. Identify likely causes of underpayment (for the dispute letter)
    const causes: string[] = [];
    if (status === "underpaid") {
      const cappedTxns = (txns || []).filter((t) => t.cap_hit);
      const excludedGuess = (txns || []).filter(
        (t) => parseFloat(t.reward_earned) === 0,
      );
      if (cappedTxns.length) {
        causes.push(
          `${cappedTxns.length} transaction(s) hit reward caps — verify the cap was applied correctly, not over-restricted.`,
        );
      }
      if (discrepancy > expectedReward * 0.3) {
        causes.push(
          "Large shortfall suggests accelerated rewards may have been paid at base rate, or a milestone bonus was missed.",
        );
      }
      if (!causes.length) {
        causes.push(
          "Rewards credited are below the calculated entitlement. Request a line-item breakdown from the bank.",
        );
      }
    }

    // 5. Persist the reconciliation record
    await supabase.from("reconciliations").upsert({
      user_id: user.id,
      card_id: cardId,
      month,
      expected_reward: expectedReward,
      actual_reward: actualRewardCredited,
      discrepancy,
      status,
      transaction_count: (txns || []).length,
      updated_at: new Date().toISOString(),
    });

    // 6. Generate a dispute letter if underpaid
    let disputeLetter = null;
    if (status === "underpaid" && discrepancy >= 10) {
      disputeLetter = generateDisputeLetter({
        month,
        expectedReward,
        actualRewardCredited,
        discrepancy,
        txnCount: (txns || []).length,
        causes,
      });
    }

    return json({
      status,
      expectedReward: round2(expectedReward),
      actualRewardCredited: round2(actualRewardCredited),
      discrepancy: round2(discrepancy),
      pctOff: round2(pctOff),
      transactionCount: (txns || []).length,
      causes,
      disputeLetter,
      message: status === "match"
        ? "✓ Bank credited the correct reward. Nothing to dispute."
        : status === "underpaid"
        ? `⚠ You were underpaid ₹${round2(discrepancy)}. A dispute letter is ready.`
        : "Bank credited more than expected — no action needed.",
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function generateDisputeLetter(d: {
  month: string;
  expectedReward: number;
  actualRewardCredited: number;
  discrepancy: number;
  txnCount: number;
  causes: string[];
}): string {
  const monthName = new Date(d.month + "-01").toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  return `Subject: Reward Points Discrepancy — ${monthName} Statement

Dear Cardholder Services,

I am writing regarding a discrepancy in the reward points/cashback credited on my
credit card statement for ${monthName}.

Based on my ${d.txnCount} eligible transactions during this billing cycle, I was
entitled to approximately ₹${d.expectedReward.toFixed(2)} in rewards. However, my
statement reflects only ₹${d.actualRewardCredited.toFixed(2)} credited — a shortfall
of ₹${d.discrepancy.toFixed(2)}.

Possible reasons for this discrepancy:
${d.causes.map((c) => `  • ${c}`).join("\n")}

I request that you:
  1. Provide a transaction-level breakdown of reward points earned for ${monthName}.
  2. Review the eligible transactions and credit any shortfall.
  3. Confirm the corrected reward balance in writing.

I have maintained detailed records of all transactions and am happy to share them.

Thank you for your prompt attention to this matter.

Sincerely,
[Your Name]
[Card ending in XXXX]

---
Generated by CardIQ reconciliation. Verify figures against your own statement
before sending. CardIQ is not affiliated with any bank.`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}
