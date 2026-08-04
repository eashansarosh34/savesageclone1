-- ============================================================
-- CardIQ — STARTER SCHEMA (run this FIRST in Supabase → SQL Editor)
-- Creates the profiles table the website needs for real accounts +
-- cross-device sync. Safe to run more than once.
-- ============================================================

-- 1. Profiles table: one row per user, created automatically on signup.
--    'plan' drives free/pro gating. 'data' is a JSON blob holding the user's
--    prefs + wallet + tracked points/payments so any device they log in on
--    gets everything back (cross-device sync).
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  plan        TEXT DEFAULT 'free',       -- 'free' | 'pro'
  data        JSONB DEFAULT '{}'::jsonb, -- prefs, wallet, tracking (cross-device)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Row Level Security: a user can only read/write their OWN row.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Auto-create a profile row the moment a user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Keep updated_at fresh on writes.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- DONE. After this runs:
--   • Signing up on the website creates a profile row automatically.
--   • The website reads/writes profiles.data for cross-device sync.
--   • plan='free' by default; the Razorpay webhook flips it to 'pro'.
-- Next (optional, for Pro features): run schema_extended.sql and
-- schema_alerts_referrals.sql from this same folder.
-- ============================================================
