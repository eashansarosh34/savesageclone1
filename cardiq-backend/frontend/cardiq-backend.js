// ============================================================
// CardIQ — Backend Integration Module (frontend, website-only)
// Include after supabase.js. Wires up Gmail sync, reconciliation,
// Razorpay checkout, and support — all from the website.
// ============================================================

// ---- CONFIG (fill from your dashboards) ----
const CARDIQ_CONFIG = {
  supabaseUrl: "REPLACE_SUPABASE_URL",
  supabaseKey: "REPLACE_SUPABASE_ANON_KEY",
  googleClientId: "REPLACE_GOOGLE_OAUTH_CLIENT_ID",
  functionsBase: "REPLACE_SUPABASE_URL/functions/v1",
};

// ============================================================
// 1. GMAIL SYNC — the web equivalent of SaveSage's auto-detection
// ============================================================

// Google OAuth with Gmail read-only scope. Runs entirely in the browser.
// We request the MINIMUM scope: gmail.readonly. We never send/modify email.
async function connectGmail() {
  return new Promise((resolve, reject) => {
    // Google Identity Services token client
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CARDIQ_CONFIG.googleClientId,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      callback: (resp) => {
        if (resp.error) return reject(resp);
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

// Sync bank emails → parsed transactions → user confirms → logged
async function syncGmailTransactions(sinceDays = 30) {
  showSyncStatus("Connecting to Gmail…");
  let googleAccessToken;
  try {
    googleAccessToken = await connectGmail();
  } catch (e) {
    showSyncStatus("Gmail connection cancelled", true);
    return;
  }

  showSyncStatus("Reading bank emails only…");
  const session = await sb.auth.getSession();
  const res = await fetch(`${CARDIQ_CONFIG.functionsBase}/gmail-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.data.session.access_token}`,
    },
    body: JSON.stringify({ googleAccessToken, sinceDays }),
  });
  const data = await res.json();
  if (data.error) {
    showSyncStatus("Sync failed: " + data.error, true);
    return;
  }

  // Map cardEnding → card, merchant → category (reuse in-app engine),
  // then present to the user for one-tap confirmation before saving.
  const enriched = data.transactions.map((tx) => {
    const card = matchCardFromEnding(tx.cardEnding); // from main app
    const { cat } = merchantToCategory(tx.merchant);  // from main app
    return { ...tx, cardId: card?.id ?? null, cat };
  });

  showSyncStatus(`Found ${enriched.length} transactions from bank emails`);
  presentGmailReview(enriched); // show a review modal (user confirms/edits)
}

// ============================================================
// 2. RECONCILIATION — the differentiator
// ============================================================

// User pastes the reward-points figure from their statement; we compare.
async function runReconciliation(cardId, month, actualRewardCredited) {
  const session = await sb.auth.getSession();
  const res = await fetch(`${CARDIQ_CONFIG.functionsBase}/reconcile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.data.session.access_token}`,
    },
    body: JSON.stringify({ cardId, month, actualRewardCredited }),
  });
  return await res.json();
  // returns { status, expectedReward, actualRewardCredited, discrepancy,
  //           causes, disputeLetter, message }
}

// ============================================================
// 3. RAZORPAY SUBSCRIPTION (website checkout)
// ============================================================

async function upgradeToProCheckout() {
  const session = await sb.auth.getSession();
  if (!session.data.session) {
    alert("Please sign in first.");
    return;
  }

  // 1. Ask backend to create a subscription
  const res = await fetch(`${CARDIQ_CONFIG.functionsBase}/razorpay?action=create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.data.session.access_token}`,
    },
    body: JSON.stringify({}),
  });
  const sub = await res.json();
  if (sub.error) { alert("Checkout error: " + sub.error); return; }

  // 2. Open Razorpay checkout (script loaded in index.html)
  const rzp = new Razorpay({
    key: sub.razorpayKeyId,
    subscription_id: sub.subscriptionId,
    name: "CardIQ Pro",
    description: "Annual subscription — reconciliation, Gmail sync, priority support",
    theme: { color: "#0A1628" },
    handler: function (response) {
      // Payment success is confirmed server-side via webhook.
      // Here we just show optimistic UI; the webhook flips the plan.
      showProUpgradeSuccess();
    },
    modal: {
      ondismiss: function () { /* user closed checkout */ },
    },
  });
  rzp.open();
}

// Check current plan (reads the profiles.plan flag set by the webhook)
async function getUserPlan() {
  const { data } = await sb.from("profiles").select("plan").single();
  return data?.plan || "free";
}

async function requirePro(featureName) {
  const plan = await getUserPlan();
  if (plan !== "pro") {
    showProGate(featureName);
    return false;
  }
  return true;
}

// ============================================================
// 4. SUPPORT (website-native CS)
// ============================================================

// Option A: submit a ticket to our own table (CS team reads via dashboard)
async function submitSupportTicket(subject, body, category = "general") {
  const plan = await getUserPlan();
  const { error } = await sb.from("support_tickets").insert({
    subject, body, category,
    priority: plan === "pro" ? "high" : "normal",
  });
  return !error;
}

// Option B: Crisp live chat (embed — see index.html snippet).
// When a pro user opens chat, pass their context to the agent:
function setCrispUserContext(user, plan) {
  if (window.$crisp) {
    window.$crisp.push(["set", "user:email", [user.email]]);
    window.$crisp.push(["set", "session:data", [[
      ["plan", plan],
      ["user_id", user.id],
    ]]]);
  }
}

// ============================================================
// UI helpers (implement to match your design system)
// ============================================================
function showSyncStatus(msg, isError = false) {
  console.log((isError ? "❌ " : "⏳ ") + msg);
  // wire to your toast/status UI
}
function presentGmailReview(transactions) {
  // render a modal listing parsed transactions with confirm/edit,
  // then call the existing logTransaction() flow for each confirmed one
}
function showProUpgradeSuccess() {
  // celebratory UI; re-fetch plan
}
function showProGate(featureName) {
  // modal: "Reconciliation is a Pro feature. Upgrade for ₹299/year."
}
