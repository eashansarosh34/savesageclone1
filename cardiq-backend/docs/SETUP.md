# CardIQ Backend Layer — Setup Guide
## Gmail sync + Reconciliation + Payments + CS. All website, no app.

Prerequisite: you've already deployed the base CardIQ (Netlify + Supabase from
the earlier deploy package). This adds the backend intelligence layer on top.

---

## STEP 1 — Extend the database (5 min)

1. Supabase dashboard → SQL Editor → New query
2. Paste `supabase/schema_extended.sql` and Run
3. Verify 4 new tables appear: reconciliations, subscriptions, gmail_sync, support_tickets

---

## STEP 2 — Deploy the Edge Functions (15 min)

Install the Supabase CLI, then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# deploy the three functions
supabase functions deploy gmail-sync
supabase functions deploy reconcile
supabase functions deploy razorpay

# set secrets
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx
supabase secrets set RAZORPAY_KEY_SECRET=xxx
supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxx
supabase secrets set RAZORPAY_PLAN_PRO_YEARLY=plan_xxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx   # from Settings → API
```

---

## STEP 3 — Google OAuth for Gmail (20 min)

This is what lets the website read bank emails (the web version of auto-detection).

1. Google Cloud Console → APIs & Services → Enable "Gmail API"
2. OAuth consent screen:
   - User type: External
   - Scopes: add `.../auth/gmail.readonly` (read-only — you cannot send/delete)
   - Add your domain to authorized domains
   - **Important**: Google requires a security review for gmail.readonly in production.
     Until approved, you can add up to 100 test users who can use it immediately.
3. Credentials → Create OAuth Client ID → Web application
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Copy the Client ID → put in `CARDIQ_CONFIG.googleClientId`

### The privacy contract (say this loudly on your site)
- You request **read-only** Gmail access
- You search **only** emails from known bank senders (hardcoded list)
- You extract **only** transaction fields (amount, merchant, date, card last-4)
- You **never** store email content — only the parsed transaction
- Users can revoke access anytime from their Google account

This transparency is your advantage: SaveSage gets hammered in reviews for asking
"full email access". Be explicit that you read only bank-sender emails.

---

## STEP 4 — Razorpay subscriptions (30 min)

1. Sign up at razorpay.com, complete KYC (needs business PAN/GST)
2. Dashboard → Subscriptions → Plans → Create Plan
   - Billing: Yearly, ₹299
   - Copy the plan_id → set as RAZORPAY_PLAN_PRO_YEARLY secret
3. Dashboard → Settings → API Keys → generate Key ID + Secret
4. Dashboard → Settings → Webhooks → Add webhook
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/razorpay?action=webhook`
   - Events: subscription.charged, subscription.activated, subscription.cancelled, subscription.halted
   - Copy the webhook secret → set as RAZORPAY_WEBHOOK_SECRET
5. Add Razorpay checkout script to index.html:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

---

## STEP 5 — Customer service (15 min)

### Fastest path: Crisp (free tier, live chat)
1. Sign up at crisp.chat, create a website
2. Copy your Website ID
3. Add to index.html before </body>:
   ```html
   <script type="text/javascript">
     window.$crisp=[];window.CRISP_WEBSITE_ID="YOUR_WEBSITE_ID";
     (function(){d=document;s=d.createElement("script");
     s.src="https://client.crisp.chat/l.js";s.async=1;
     d.getElementsByTagName("head")[0].appendChild(s);})();
   </script>
   ```
4. When a user signs in, call `setCrispUserContext(user, plan)` so the agent
   sees who they are and their plan.

Your CS team logs into the Crisp dashboard (web) to answer chats. Pro users can be
routed to humans; free users get the AI assistant first.

### Fallback: in-app tickets
The support_tickets table + submitSupportTicket() give you a ticketing system if
you don't want a third-party tool. Build a simple admin page that reads open tickets
ordered by priority (pro users surface first).

---

## STEP 6 — Wire the frontend (20 min)

1. Add `frontend/cardiq-backend.js` to your site, after supabase.js
2. Fill CARDIQ_CONFIG with your URLs/keys
3. Add these scripts to index.html <head>:
   ```html
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```
4. Wire buttons:
   - "Sync from Gmail" → syncGmailTransactions()
   - "Check my rewards" (reconciliation) → requirePro() then runReconciliation()
   - "Upgrade to Pro" → upgradeToProCheckout()

---

## THE BUSINESS LOGIC — free vs pro

| Feature | Free | Pro (₹299/yr) |
|---|---|---|
| Single-category ranker | ✅ | ✅ |
| Wallet optimizer | ✅ | ✅ |
| Manual + SMS-paste tracking | ✅ | ✅ |
| Monthly report | ✅ | ✅ |
| Cards tracked | 5 | unlimited |
| **Gmail auto-sync** | — | ✅ |
| **Reconciliation (did the bank pay you?)** | — | ✅ |
| **Dispute letter generator** | — | ✅ |
| **Points-expiry alerts** | — | ✅ |
| **Priority support** | — | ✅ |
| 7-day Pro trial + clear refund policy | ✅ | ✅ |

Undercut SaveSage (₹399), give more away free, and be radically transparent about
data. That combination — cheaper, more generous free tier, honest about privacy —
is how a website product beats an app-first incumbent.

---

## WHAT YOU CANNOT DO ON WEB (be honest with yourself)

- **Auto-read SMS**: impossible on web (needs an Android app). Mitigate with
  Gmail sync + manual SMS paste. For most salaried users, bank emails cover
  the same transactions as SMS.
- **Account Aggregator**: needs an FIU license or a regulated partner. Revisit
  once you have scale and can partner with an AA/TSP like Setu or Finvu.
  Note: AA rules forbid storing the financial data — you'd relay, not warehouse.

For v1, Gmail + manual + reconciliation is a genuinely competitive, fully-web stack.
