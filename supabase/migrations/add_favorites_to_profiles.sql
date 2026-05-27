-- ============================================================
-- Add favorite_artist_id and favorite_song_id to fan_profiles
-- Run in: https://supabase.com/dashboard/project/egmaxjskylfepliwaeme/sql/new
-- ============================================================

ALTER TABLE public.fan_profiles
  ADD COLUMN IF NOT EXISTS favorite_artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_song_id uuid REFERENCES public.songs(id) ON DELETE SET NULL;
