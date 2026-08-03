-- ============================================================
-- CardIQ — Extended Schema (backend layer)
-- Run AFTER the base schema.sql
-- Adds: reconciliation, subscriptions, support tickets, gmail sync state
-- ============================================================

-- ── PROFILES: add plan column ──────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
-- plan: 'free' | 'pro'

-- ── RECONCILIATIONS ────────────────────────────────────────
-- Expected vs actual reward comparison per card per month
CREATE TABLE IF NOT EXISTS public.reconciliations (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id           INTEGER NOT NULL,
  month             TEXT NOT NULL,          -- "2026-08"
  expected_reward   NUMERIC(10,2) DEFAULT 0,
  actual_reward     NUMERIC(10,2) DEFAULT 0,
  discrepancy       NUMERIC(10,2) DEFAULT 0,
  status            TEXT DEFAULT 'match',   -- match | underpaid | overpaid
  transaction_count INTEGER DEFAULT 0,
  dispute_sent      BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id, month)
);

-- ── SUBSCRIPTIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       BIGSERIAL PRIMARY KEY,
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_subscription_id TEXT,
  plan                     TEXT DEFAULT 'pro',
  status                   TEXT DEFAULT 'created', -- created|active|cancelled|halted
  expires_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── GMAIL SYNC STATE ───────────────────────────────────────
-- Tracks last sync + processed gmail message IDs (dedup, no email content stored)
CREATE TABLE IF NOT EXISTS public.gmail_sync (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_synced_at TIMESTAMPTZ,
  processed_ids  TEXT[] DEFAULT '{}',      -- gmail message IDs already imported
  UNIQUE(user_id)
);

-- ── SUPPORT TICKETS ────────────────────────────────────────
-- Lightweight ticketing (or forward to Crisp/Freshdesk; this is the fallback)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  category     TEXT DEFAULT 'general',  -- general|reconciliation|billing|bug
  status       TEXT DEFAULT 'open',     -- open|in_progress|resolved
  priority     TEXT DEFAULT 'normal',   -- normal|high (pro users = high)
  agent_notes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recon_own" ON public.reconciliations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subs_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- subscriptions are written only by the service role (webhook), not users
CREATE POLICY "gmail_own" ON public.gmail_sync
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tickets_own" ON public.support_tickets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── HELPER: is this user pro? ──────────────────────────────
CREATE OR REPLACE FUNCTION public.is_pro(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = uid AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE sql STABLE;

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recon_user_month ON public.reconciliations(user_id, month);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status, priority);

-- ============================================================
-- DONE. Backend tables ready:
--   reconciliations  — the differentiator (expected vs actual)
--   subscriptions    — Razorpay-driven pro/free state
--   gmail_sync       — dedup state (no email content stored)
--   support_tickets  — CS fallback / routing
-- ============================================================
