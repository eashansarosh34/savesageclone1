// ============================================================
// CardIQ — Gmail Transaction Sync (Supabase Edge Function)
// Deploy: supabase functions deploy gmail-sync
//
// Reads ONLY bank transaction emails via Gmail API (read-only scope),
// parses them, and returns structured transactions. Does NOT store
// email content — only the extracted transaction fields.
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Known Indian bank email senders — we ONLY read these, never the whole inbox.
// This is the privacy contract: we search Gmail with a strict sender filter.
const BANK_SENDERS = [
  "alerts@hdfcbank.net",
  "emailstatements.cc@hdfcbank.net",
  "alerts@sbicard.com",
  "Statements@sbicard.com",
  "credit_cards@icicibank.com",
  "transaction.alerts@axisbank.com",
  "cc.statements@axisbank.com",
  "creditcardalerts@kotak.com",
  "alerts@idfcfirstbank.com",
  "no-reply@rblbank.com",
  "estatement@yesbank.in",
];

// Build the Gmail search query: only bank senders, only recent, only transaction-like
function buildGmailQuery(sinceDays: number): string {
  const from = BANK_SENDERS.map((s) => `from:${s}`).join(" OR ");
  const after = new Date(Date.now() - sinceDays * 86400000)
    .toISOString().split("T")[0].replace(/-/g, "/");
  // subject/body keywords that indicate a spend notification
  const keywords = `(spent OR debited OR "used for" OR transaction OR purchase)`;
  return `(${from}) after:${after} ${keywords}`;
}

// --- Transaction parser (same logic as the in-app SMS parser) ---
const AMOUNT_RE = /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i;
const CARD_END_RE = /(?:ending|card no\.?|xxxx|xx)\s*(\d{4})/i;
const DATE_RE = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;

const MERCHANT_PATTERNS = [
  /(?:at|At|AT)\s+([A-Z0-9][A-Z0-9 &'.,\-\/]{2,40}?)(?:\s+on|\.|,|\s+Avl|\s+Ref|$)/,
  /(?:to|To)\s+([A-Z0-9][A-Z0-9 &'.,\-\/]{2,40}?)(?:\s+on|\.|,|$)/,
];

function parseAmount(text: string): number | null {
  const m = text.match(AMOUNT_RE);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function parseMerchant(text: string): string {
  for (const re of MERCHANT_PATTERNS) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim().replace(/\s+/g, " ");
  }
  return "";
}

function parseCardEnding(text: string): string | null {
  const m = text.match(CARD_END_RE);
  return m ? m[1] : null;
}

function parseDate(text: string): string {
  const m = text.match(DATE_RE);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}

// Decode base64url Gmail body
function decodeBody(data: string): string {
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(escape(atob(normalized)));
  } catch {
    return "";
  }
}

function extractText(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBody(payload.body.data);
  if (payload.parts) {
    return payload.parts.map((p: any) => extractText(p)).join(" ");
  }
  return "";
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const { googleAccessToken, sinceDays = 30 } = await req.json();
    if (!googleAccessToken) {
      return json({ error: "Missing googleAccessToken" }, 400);
    }

    // Authenticate the CardIQ user (Supabase JWT in Authorization header)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // 1. Search Gmail for bank transaction emails only
    const query = buildGmailQuery(sinceDays);
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`,
      { headers: { Authorization: `Bearer ${googleAccessToken}` } },
    );
    if (!listRes.ok) {
      return json({ error: "Gmail search failed", detail: await listRes.text() }, 502);
    }
    const listData = await listRes.json();
    const messages = listData.messages || [];

    // 2. Fetch and parse each message
    const transactions = [];
    for (const msg of messages.slice(0, 100)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${googleAccessToken}` } },
      );
      if (!msgRes.ok) continue;
      const msgData = await msgRes.json();

      const snippet = msgData.snippet || "";
      const bodyText = extractText(msgData.payload) || snippet;
      const fullText = (snippet + " " + bodyText).slice(0, 5000);

      const amount = parseAmount(fullText);
      if (!amount || amount <= 0) continue; // not a spend email

      const merchant = parseMerchant(fullText);
      const cardEnding = parseCardEnding(fullText);
      const date = parseDate(fullText);

      transactions.push({
        gmailId: msg.id,       // dedup key — so re-syncing doesn't double-count
        amount,
        merchant,
        cardEnding,
        date,
        source: "gmail",
      });
    }

    // 3. Return parsed transactions. We do NOT store raw email anywhere.
    //    The frontend maps cardEnding → card, merchant → category, then
    //    inserts via the normal transactions table (RLS-protected).
    return json({
      count: transactions.length,
      transactions,
      note: "Parsed from bank-sender emails only. No email content stored.",
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
