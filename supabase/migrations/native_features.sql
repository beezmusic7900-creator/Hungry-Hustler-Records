-- ============================================================
-- HUNGRY HUSTLER — Native Features Migration
-- Safe to run on existing databases (idempotent)
-- ============================================================

-- ============================================================
-- 1. EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  venue text,
  city text,
  ticket_url text,
  image_url text,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. FAVORITES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('song', 'video', 'merch', 'event')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- ============================================================
-- 3. FAN PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fan_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. SAFE COLUMN ADDITIONS TO EXISTING TABLES
-- ============================================================
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- ============================================================
-- 5. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS events_event_date_idx ON public.events(event_date DESC);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_item_idx ON public.favorites(item_type, item_id);

-- ============================================================
-- 6. RLS — EVENTS
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_read" ON public.events;
DROP POLICY IF EXISTS "events_auth_write" ON public.events;

CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (is_published = true);

CREATE POLICY "events_auth_write" ON public.events
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 7. RLS — FAVORITES
-- ============================================================
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;

CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 8. RLS — FAN PROFILES
-- ============================================================
ALTER TABLE public.fan_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fan_profiles_select_own" ON public.fan_profiles;
DROP POLICY IF EXISTS "fan_profiles_insert_own" ON public.fan_profiles;
DROP POLICY IF EXISTS "fan_profiles_update_own" ON public.fan_profiles;

CREATE POLICY "fan_profiles_select_own" ON public.fan_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "fan_profiles_insert_own" ON public.fan_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "fan_profiles_update_own" ON public.fan_profiles
  FOR UPDATE USING (auth.uid() = id);
