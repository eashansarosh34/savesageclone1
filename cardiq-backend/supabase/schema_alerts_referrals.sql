-- ============================================================
-- CardIQ — Alerts, Points, Statements, Referrals, Freshness
-- Run AFTER schema.sql and schema_extended.sql
-- ============================================================

-- ── POINTS BALANCES ────────────────────────────────────────
-- Tracks accumulated reward points per card so we can warn on expiry.
CREATE TABLE IF NOT EXISTS public.points_balances (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id          INTEGER NOT NULL,
  card_name        TEXT NOT NULL,
  bank             TEXT NOT NULL,
  balance_points   NUMERIC(12,2) DEFAULT 0,   -- current point balance
  balance_value    NUMERIC(12,2) DEFAULT 0,   -- ₹ value of that balance
  oldest_earned_at TIMESTAMPTZ,               -- for expiry calc
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- ── CARD STATEMENTS ────────────────────────────────────────
-- Due dates + amounts parsed from statement emails, for payment reminders.
CREATE TABLE IF NOT EXISTS public.card_statements (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id      INTEGER NOT NULL,
  card_name    TEXT NOT NULL,
  total_due    NUMERIC(12,2) NOT NULL,
  min_due      NUMERIC(12,2),
  due_date     DATE NOT NULL,
  statement_date DATE,
  paid         BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id, due_date)
);

-- ── ALERTS ─────────────────────────────────────────────────
-- Generated notifications (points expiry, payment due, etc.)
CREATE TABLE IF NOT EXISTS public.alerts (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,          -- points_expiry | payment_due | rate_change
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  urgency        TEXT DEFAULT 'info',    -- info | warning | critical
  value_at_risk  NUMERIC(12,2),
  read           BOOLEAN DEFAULT false,
  sent           BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── REFERRALS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id            BIGSERIAL PRIMARY KEY,
  referrer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status        TEXT DEFAULT 'pending',  -- pending | completed | rewarded
  reward_granted BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- Each user gets a unique referral code
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code        TEXT UNIQUE NOT NULL,
  uses        INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── DATA CHANGE REPORTS (crowdsourced freshness) ───────────
-- Users flag when a card's rate/fee looks wrong. Feeds re-verification.
CREATE TABLE IF NOT EXISTS public.rate_change_reports (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  card_id      INTEGER NOT NULL,
  card_name    TEXT,
  field        TEXT,                    -- which field looks wrong
  current_value TEXT,
  reported_value TEXT,
  note         TEXT,
  status       TEXT DEFAULT 'new',      -- new | verified | rejected
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.points_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_change_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "points_own" ON public.points_balances
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stmt_own" ON public.card_statements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_own" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "referrals_own" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
CREATE POLICY "refcodes_own" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);
-- rate change reports: anyone signed in can insert, only their own visible
CREATE POLICY "rcr_insert" ON public.rate_change_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rcr_own" ON public.rate_change_reports
  FOR SELECT USING (auth.uid() = user_id);

-- ── REFERRAL CODE GENERATOR ────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS TRIGGER AS $$
DECLARE new_code TEXT;
BEGIN
  new_code := upper(substr(md5(NEW.id::text || random()::text), 1, 8));
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, new_code)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
CREATE TRIGGER on_profile_created_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_referral_code();

-- ── DATA DELETION (DPDP Act compliance) ────────────────────
-- One function that wipes ALL user data. Called from the "delete my account" flow.
CREATE OR REPLACE FUNCTION public.delete_all_user_data(uid UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM public.transactions WHERE user_id = uid;
  DELETE FROM public.points_balances WHERE user_id = uid;
  DELETE FROM public.card_statements WHERE user_id = uid;
  DELETE FROM public.alerts WHERE user_id = uid;
  DELETE FROM public.reconciliations WHERE user_id = uid;
  DELETE FROM public.card_endings WHERE user_id = uid;
  DELETE FROM public.my_cards WHERE user_id = uid;
  DELETE FROM public.gmail_sync WHERE user_id = uid;
  DELETE FROM public.support_tickets WHERE user_id = uid;
  DELETE FROM public.referrals WHERE referrer_id = uid OR referee_id = uid;
  DELETE FROM public.referral_codes WHERE user_id = uid;
  DELETE FROM public.subscriptions WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;
  -- auth.users row is deleted separately via the admin API
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON public.alerts(user_id, read);
CREATE INDEX IF NOT EXISTS idx_stmt_due ON public.card_statements(due_date, paid);
CREATE INDEX IF NOT EXISTS idx_points_user ON public.points_balances(user_id);

-- ============================================================
-- DONE. Tables: points_balances, card_statements, alerts,
-- referrals, referral_codes, rate_change_reports.
-- Plus: delete_all_user_data() for DPDP compliance.
-- ============================================================
