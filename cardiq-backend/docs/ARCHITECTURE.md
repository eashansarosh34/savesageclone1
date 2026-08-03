# CardIQ — Transaction Verification, Payments & Support Architecture
## Website-only. No mobile app required.

---

## PART 1 — HOW TRANSACTION VERIFICATION ACTUALLY WORKS

### The core truth about "how do they know the customer really bought it"

SaveSage and every similar Indian product use the **same underlying trust anchor**: the
bank's own transaction notification. When your bank sends you
"₹1,499 spent on HDFC card ending 4521 at SWIGGY on 15-Aug", that message:

- came FROM THE BANK, not from the user
- therefore cannot be forged by the user
- IS the proof of purchase

Nobody has a live API into Swiggy or Amazon confirming your specific purchase.
The bank notification is the verification. Everything is built on parsing that notification.

There are exactly three ways to get that bank notification into a website:

| Method | How | Web-native? | Trust level | Build effort |
|---|---|---|---|---|
| **Manual SMS paste** | User copies bank SMS, pastes it | ✅ Yes | High (bank-authored text) | ✅ Already built |
| **Gmail OAuth** | User connects Google, we read bank emails | ✅ Yes | High (bank-authored email) | Medium — build now |
| **Account Aggregator** | RBI consent framework | ✅ Yes | Highest (regulated) | Very high — needs FIU license |

### Why we do NOT auto-read SMS on web
Reading SMS automatically requires an Android app with SMS permission. A website cannot
read your phone's SMS. This is the ONE thing the app has that a website cannot replicate.
Our answer: manual SMS paste (already built) + Gmail email parsing (the web equivalent of
auto-detection, since bank emails contain the same data as bank SMS).

### The verification pipeline (what we build)

```
Bank sends transaction email  ──►  Gmail  ──►  [user consents once via OAuth]
                                                      │
                                                      ▼
                            Backend searches ONLY bank-sender emails
                                                      │
                                                      ▼
                            Parse: amount, merchant, card, date
                                                      │
                                                      ▼
                            Merchant → category → reward calculation
                                                      │
                                                      ▼
                            Store transaction (user owns it, RLS-protected)
                                                      │
                                                      ▼
                            Reconcile against expected rewards
                                                      │
                                                      ▼
                    "You earned ₹75. Bank should credit this by Aug 30."
```

### The "did you actually earn the reward?" layer — this is the NEW value

SaveSage tells you what you *should* earn. The harder, more valuable question is:
**did the bank actually credit the reward you were owed?**

This is where reconciliation comes in, and it's genuinely useful because banks make errors:
- excluded categories that shouldn't have been excluded
- caps applied incorrectly
- milestone bonuses not credited
- promised accelerated rewards paid at base rate

**Our reconciliation engine:**
1. From each parsed transaction, compute the reward the user SHOULD earn (we already do this)
2. When the monthly card statement email arrives, parse the ACTUAL reward points credited
3. Compare expected vs actual per card per month
4. Flag discrepancies: "HDFC credited 1,200 points; you were owed 1,450. Dispute ₹250."
5. Generate a ready-to-send dispute email to the bank

No competitor does this well. This is the feature that justifies a subscription.

---

## PART 2 — PAYMENTS (subscription backend)

### Recommended: Razorpay (India-native)

Razorpay is the standard for Indian SaaS. It handles UPI, cards, netbanking, wallets,
and — critically — **subscriptions/recurring billing** which you need for a ₹399/year plan.

```
User clicks "Upgrade to Pro"
        │
        ▼
Frontend calls your backend  ──►  Razorpay Subscription API
        │                                    │
        │                                    ▼
        │                         Razorpay hosted checkout
        │                         (UPI / card / netbanking)
        │                                    │
        ▼                                    ▼
Backend receives webhook  ◄──── Razorpay confirms payment
        │
        ▼
Mark user.plan = 'pro' in Supabase, set expiry
        │
        ▼
Unlock Pro features (reconciliation, unlimited cards, CS priority)
```

### Why Razorpay over Stripe
- Stripe India has restrictions on domestic recurring payments
- Razorpay natively supports UPI AutoPay (huge in India for subscriptions)
- Razorpay settles to Indian bank accounts without friction
- Lower effective fees for INR domestic

### Plan structure (learn from SaveSage's mistakes)
SaveSage is heavily criticized for: locking EVERYTHING behind subscription after trial,
no refund policy, and requiring full email access even for basic features.

**Do the opposite:**
- **Free tier**: manual tracking, SMS paste, single-category ranker, wallet optimizer,
  up to 5 cards, monthly report. (Everything we've built so far stays free.)
- **Pro (₹299/year — undercut SaveSage's ₹399)**: Gmail auto-sync, reconciliation engine,
  unlimited cards, dispute letter generator, priority CS, points-expiry alerts.
- **7-day free trial of Pro, with a clear refund policy.** Trust is the moat.

---

## PART 3 — CUSTOMER SERVICE (website-native)

You said you want a CS team. Here's the web-native stack:

### Tier 1: Self-serve (deflect 70% of tickets)
- In-app help center (searchable articles)
- "Savvy"-style assistant, but powered by YOUR card database — answers
  "which card for Swiggy?" without a human. We already have the engine.

### Tier 2: Async support (email/ticket)
- Every Pro user gets a support ticket form
- Tickets land in a shared inbox (use **Crisp**, **Freshdesk**, or **Intercom**)
- Crisp has a generous free tier and a live-chat widget you embed with one script tag

### Tier 3: Live chat + human escalation
- Embed a chat widget (Crisp/Intercom) — one line of JavaScript
- Route Pro users to human agents, free users to the AI assistant first
- The CS team works from the Crisp/Freshdesk dashboard — no custom build needed

### The smart part: CS agents see the user's data (with permission)
When a Pro user raises "my reward wasn't credited", the CS agent can see:
- the transaction in question
- the expected vs actual reward (from reconciliation)
- a pre-drafted dispute letter

This turns a 20-minute investigation into a 2-minute confirmation. That's the
operational moat — your CS is faster because the product did the analysis already.

---

## PART 4 — THE COMPLETE STACK (all website, no app)

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (website)                    │
│  CardIQ HTML/JS  ·  hosted on Netlify  ·  custom domain  │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┬─────────────────┐
          ▼              ▼              ▼                 ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐   ┌──────────────┐
   │ Supabase  │  │  Gmail    │  │ Razorpay  │   │  Crisp/      │
   │ Auth + DB │  │  OAuth    │  │ payments  │   │  Freshdesk   │
   │           │  │  + parse  │  │           │   │  (CS)        │
   └───────────┘  └───────────┘  └───────────┘   └──────────────┘
          │              │              │
          ▼              ▼              ▼
   ┌──────────────────────────────────────────┐
   │      Supabase Edge Functions (backend)    │
   │  • gmail-sync    • reconcile              │
   │  • razorpay-webhook   • dispute-generator │
   └──────────────────────────────────────────┘
```

Every component is either serverless or third-party SaaS. No servers to manage.
Everything runs from a website. No mobile app anywhere in the stack.

---

## PART 5 — BUILD SEQUENCE

1. ✅ **Core app** (done — the CardIQ HTML with 6 tabs)
2. ✅ **Supabase auth + sync** (done — deploy package)
3. **Gmail OAuth + email parser** (build now — code in /functions)
4. **Reconciliation engine** (build now — the differentiator)
5. **Razorpay subscriptions** (build now — code in /functions)
6. **CS widget** (embed — one script tag, config in /frontend)

The rest of this package contains working code for items 3–6.
