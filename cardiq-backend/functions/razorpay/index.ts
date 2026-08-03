// ============================================================
// CardIQ — Razorpay Subscription Handler (Supabase Edge Function)
// Deploy: supabase functions deploy razorpay
//
// Two endpoints in one function (routed by action):
//   action=create   → creates a Razorpay subscription, returns checkout params
//   action=webhook  → receives Razorpay payment confirmation, upgrades user
// ============================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

// Your plan IDs from Razorpay dashboard (Subscriptions → Plans)
const PLAN_PRO_YEARLY = Deno.env.get("RAZORPAY_PLAN_PRO_YEARLY")!; // e.g. plan_xxx

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "webhook") return handleWebhook(req);
  if (action === "create") return handleCreate(req);
  return json({ error: "Unknown action" }, 400);
});

// ---- Create a subscription checkout ----
async function handleCreate(req: Request): Promise<Response> {
  try {
    const supabase = adminClient();
    const authClient = userClient(req);
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Create a Razorpay subscription for this user
    const auth = "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        plan_id: PLAN_PRO_YEARLY,
        customer_notify: 1,
        total_count: 1,          // 1 yearly cycle; user renews manually (trust-friendly)
        notes: { supabase_user_id: user.id, email: user.email },
      }),
    });
    if (!res.ok) return json({ error: "Razorpay error", detail: await res.text() }, 502);
    const sub = await res.json();

    // Store pending subscription
    await supabase.from("subscriptions").upsert({
      user_id: user.id,
      razorpay_subscription_id: sub.id,
      plan: "pro",
      status: "created",
      updated_at: new Date().toISOString(),
    });

    // Return the params the frontend Razorpay checkout needs
    return json({
      subscriptionId: sub.id,
      razorpayKeyId: RAZORPAY_KEY_ID,
      planName: "CardIQ Pro (Yearly)",
      amount: 29900,          // ₹299 in paise
      currency: "INR",
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

// ---- Handle Razorpay webhook ----
async function handleWebhook(req: Request): Promise<Response> {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // Verify webhook signature (security-critical)
    const expected = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(bodyText).digest("hex");
    if (signature !== expected) {
      return json({ error: "Invalid signature" }, 401);
    }

    const event = JSON.parse(bodyText);
    const supabase = adminClient();

    // subscription.charged = payment succeeded
    if (event.event === "subscription.charged" ||
        event.event === "subscription.activated") {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes?.supabase_user_id;
      if (userId) {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          razorpay_subscription_id: sub.id,
          plan: "pro",
          status: "active",
          expires_at: expiry.toISOString(),
          updated_at: new Date().toISOString(),
        });
        // Also flag the profile for quick reads
        await supabase.from("profiles").update({ plan: "pro" }).eq("id", userId);
      }
    }

    // subscription.cancelled / halted → downgrade
    if (event.event === "subscription.cancelled" ||
        event.event === "subscription.halted") {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes?.supabase_user_id;
      if (userId) {
        await supabase.from("subscriptions").update({ status: "cancelled" })
          .eq("razorpay_subscription_id", sub.id);
        await supabase.from("profiles").update({ plan: "free" }).eq("id", userId);
      }
    }

    return json({ received: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
function userClient(req: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
  );
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, x-razorpay-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}
