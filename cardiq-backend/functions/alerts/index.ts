// ============================================================
// CardIQ — Alerts Engine (Supabase Edge Function)
// Deploy: supabase functions deploy alerts
// Schedule: run daily via Supabase cron (pg_cron) or an external scheduler
//
// Generates two kinds of high-value alerts:
//   1. POINTS EXPIRY  — "4,200 HDFC points (₹1,050) expire in 38 days"
//   2. PAYMENT DUE    — "HDFC statement ₹42,000 due in 3 days"
//
// Both are the features users actually pay for. Both are website-native:
// they read data already in Supabase and email/notify the user.
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Point-expiry windows per bank (months until points expire), from card program T&Cs.
// This can be moved to the card database later; kept here for clarity.
const POINT_EXPIRY_MONTHS: Record<string, number> = {
  "HDFC Bank": 24,      // CashPoints expire in 2 years
  "SBI Card": 24,       // reward points 2 years
  "Axis Bank": 36,      // EDGE points 3 years
  "ICICI Bank": 0,      // Amazon Pay balance — no expiry
  "IDFC First Bank": 0, // never expire
  "Kotak Mahindra": 24,
};

interface AlertResult {
  userId: string;
  email: string;
  type: "points_expiry" | "payment_due";
  title: string;
  body: string;
  urgency: "info" | "warning" | "critical";
  valueAtRisk?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  try {
    // Service-role client — this runs as a scheduled job, not a user request.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const alerts: AlertResult[] = [];
    const now = new Date();

    // ---- Load all pro users (alerts are a Pro feature) ----
    const { data: proSubs } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active");
    const proUserIds = new Set((proSubs || []).map((s) => s.user_id));
    if (proUserIds.size === 0) {
      return json({ generated: 0, note: "No active pro users." });
    }

    // ---- Load profiles for emails ----
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", [...proUserIds]);
    const emailById: Record<string, string> = {};
    (profiles || []).forEach((p) => { emailById[p.id] = p.email; });

    // =========================================================
    // ALERT TYPE 1 — POINTS EXPIRY
    // =========================================================
    // We estimate accumulated points per card from the transaction log,
    // and warn when the OLDEST points approach their expiry window.
    for (const userId of proUserIds) {
      const { data: pointsRecords } = await supabase
        .from("points_balances")
        .select("*")
        .eq("user_id", userId);

      for (const rec of pointsRecords || []) {
        const expiryMonths = POINT_EXPIRY_MONTHS[rec.bank] ?? 24;
        if (expiryMonths === 0) continue; // never expires

        // oldest points earned date → expiry date
        const earnedDate = new Date(rec.oldest_earned_at || rec.updated_at);
        const expiryDate = new Date(earnedDate);
        expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
        const daysToExpiry = Math.floor(
          (expiryDate.getTime() - now.getTime()) / 86400000,
        );

        // Alert at 60, 30, 7 day thresholds
        if (daysToExpiry <= 60 && daysToExpiry > 0 && rec.balance_value > 100) {
          const urgency = daysToExpiry <= 7
            ? "critical"
            : daysToExpiry <= 30
            ? "warning"
            : "info";
          alerts.push({
            userId,
            email: emailById[userId],
            type: "points_expiry",
            title: `${Math.round(rec.balance_points).toLocaleString("en-IN")} ${rec.card_name} points expiring soon`,
            body: `Your ${rec.card_name} has approximately ${Math.round(rec.balance_points).toLocaleString("en-IN")} points worth about ₹${Math.round(rec.balance_value).toLocaleString("en-IN")}, expiring in ${daysToExpiry} days (around ${expiryDate.toLocaleDateString("en-IN")}). Redeem before they lapse.`,
            urgency,
            valueAtRisk: rec.balance_value,
          });
        }
      }
    }

    // =========================================================
    // ALERT TYPE 2 — PAYMENT DUE
    // =========================================================
    // Statement due dates come from parsed statement emails (gmail-sync)
    // stored in card_statements. Warn 5/3/1 days before due.
    for (const userId of proUserIds) {
      const { data: statements } = await supabase
        .from("card_statements")
        .select("*")
        .eq("user_id", userId)
        .eq("paid", false);

      for (const st of statements || []) {
        const dueDate = new Date(st.due_date);
        const daysToDue = Math.floor(
          (dueDate.getTime() - now.getTime()) / 86400000,
        );
        if (daysToDue <= 5 && daysToDue >= 0) {
          const urgency = daysToDue <= 1
            ? "critical"
            : daysToDue <= 3
            ? "warning"
            : "info";
          alerts.push({
            userId,
            email: emailById[userId],
            type: "payment_due",
            title: `${st.card_name} payment of ₹${Math.round(st.total_due).toLocaleString("en-IN")} due in ${daysToDue} day${daysToDue === 1 ? "" : "s"}`,
            body: `Your ${st.card_name} statement of ₹${Math.round(st.total_due).toLocaleString("en-IN")} is due on ${dueDate.toLocaleDateString("en-IN")}. Missing it triggers 40%+ interest and hurts your CIBIL score. Pay before the due date.`,
            urgency,
          });
        }
      }
    }

    // =========================================================
    // Persist alerts + send email (via Resend or Supabase's email)
    // =========================================================
    for (const a of alerts) {
      await supabase.from("alerts").insert({
        user_id: a.userId,
        type: a.type,
        title: a.title,
        body: a.body,
        urgency: a.urgency,
        value_at_risk: a.valueAtRisk || null,
        sent: true,
      });
      // Email delivery: wire to Resend (recommended for India-friendly sending)
      await sendEmail(a.email, a.title, a.body, a.urgency);
    }

    return json({
      generated: alerts.length,
      pointsExpiry: alerts.filter((a) => a.type === "points_expiry").length,
      paymentDue: alerts.filter((a) => a.type === "payment_due").length,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// Email via Resend (resend.com) — free tier covers early volume.
async function sendEmail(to: string, subject: string, body: string, urgency: string) {
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_KEY || !to) return;
  const color = urgency === "critical" ? "#D93B3B" : urgency === "warning" ? "#E8940A" : "#0A1628";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: "CardIQ Alerts <alerts@yourdomain.com>",
      to,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#0A1628;padding:16px 20px;border-radius:12px 12px 0 0">
          <span style="font-family:Georgia,serif;font-size:20px;color:#C9A84C">CardIQ</span>
        </div>
        <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:20px">
          <div style="font-size:16px;font-weight:600;color:${color};margin-bottom:10px">${subject}</div>
          <p style="font-size:14px;line-height:1.6;color:#333">${body}</p>
          <p style="font-size:11px;color:#999;margin-top:16px">You're receiving this because you enabled alerts on CardIQ Pro. Manage alerts in your settings.</p>
        </div>
      </div>`,
    }),
  }).catch(() => {});
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
