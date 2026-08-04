# Connecting CardIQ to Supabase — Plain Steps

Your website works right now in **local mode** (accounts saved only in the browser).
To get **real accounts, cross-device sync, Gmail sync, and Pro payments**, connect
Supabase by filling in 4 values. Here's exactly how.

---

## The one block you edit

Open `cardiq-india.html`, press Ctrl+F, and search for:

```
const CARDIQ_CONFIG
```

You'll find this near the top of the script:

```javascript
const CARDIQ_CONFIG = {
  supabaseUrl:    "",
  supabaseKey:    "",
  googleClientId: "",
  functionsBase:  ""
};
```

You fill these in. **Until you do, the site still works** — it just uses browser-only
accounts. That's by design, so nothing breaks.

---

## Step 1 — Create the database tables (2 min)

1. Go to your Supabase project → **SQL Editor** → **New query**.
2. Open `supabase/schema_starter.sql` (in the backend folder), copy all of it, paste, and press **Run**.
3. You should see "Success." This creates the `profiles` table with automatic
   account creation and cross-device sync.

*(This is the step that was actually missing — not just the config block. The website
needs a table to save profiles into.)*

---

## Step 2 — Get your two Supabase keys (2 min)

1. Supabase project → **Project Settings** (gear icon) → **API**.
2. Copy **Project URL** → paste into `supabaseUrl`.
   - It looks like `https://abcdefgh.supabase.co`
3. Copy the **anon / public** key (NOT the service_role key) → paste into `supabaseKey`.
   - The anon key is safe to put in frontend code. Never put the service_role key here.
4. Set `functionsBase` to your Project URL + `/functions/v1`:
   - e.g. `https://abcdefgh.supabase.co/functions/v1`

After this, **sign-up, sign-in, and cross-device sync work.** You can stop here if you
don't need Gmail sync yet.

Your block now looks like:

```javascript
const CARDIQ_CONFIG = {
  supabaseUrl:    "https://abcdefgh.supabase.co",
  supabaseKey:    "eyJhbGciOi...your-anon-key...",
  googleClientId: "",
  functionsBase:  "https://abcdefgh.supabase.co/functions/v1"
};
```

---

## Step 3 — (Optional) Gmail sync key

Only needed for the Pro "Gmail auto-sync" feature.

1. Google Cloud Console → **APIs & Services** → **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add your website domain under "Authorized JavaScript origins."
4. Copy the **Client ID** → paste into `googleClientId`.

*(Gmail's read-only scope needs Google's review before public launch. Until approved,
you can add up to 100 test users who can use it immediately.)*

---

## Step 4 — Turn off email confirmation for easy testing (optional)

By default Supabase emails a confirmation link on signup. For quick testing:
- Supabase → **Authentication** → **Providers** → **Email** → turn **off**
  "Confirm email." (Turn it back on before real launch for security.)

---

## How to check it worked

1. Open your site. Open the browser console (F12). You should see:
   `CardIQ: connected to Supabase.`
   (If you see "running in LOCAL mode", a key is missing or misspelled.)
2. Click **Sign in — free**, enter an email + password, create the account.
3. In Supabase → **Table Editor** → **profiles**, you should see your new row.
4. Log in on your phone with the same email — your saved wallet/prefs appear.
   That's cross-device sync working.

---

## What each value unlocks

| Value | Unlocks |
|---|---|
| `supabaseUrl` + `supabaseKey` | Real login/signup, profiles, **cross-device sync** |
| `functionsBase` | Gmail sync + reconciliation (with backend functions deployed) |
| `googleClientId` | The Google sign-in popup for Gmail sync |

Pro **payments** are handled by the Razorpay function in the backend package; the
webhook flips a user's `plan` to `pro` in the same profiles table. See `docs/SETUP.md`.

---

## Important honesty note

The website is the "cash register." Supabase is the "warehouse." These 4 values are
the address + key that connect them. But the register also needs the warehouse to
actually **have shelves** — that's why Step 1 (running the SQL) matters as much as the
config block. Filling the config without creating the table would let the site connect
but fail to save anything. Do both.
