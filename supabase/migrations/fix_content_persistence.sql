-- ============================================================
-- HUNGRY HUSTLER — Content Persistence Fix
-- Run this in: https://supabase.com/dashboard/project/egmaxjskylfepliwaeme/sql/new
-- ============================================================

-- 1. SONGS TABLE
CREATE TABLE IF NOT EXISTS public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  category text NOT NULL DEFAULT 'Exclusive Songs',
  price numeric(10,2),
  is_published boolean NOT NULL DEFAULT true,
  audio_url text,
  cover_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ARTISTS TABLE — add missing columns
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. VIDEOS TABLE — add missing columns
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 4. MERCH TABLE — add missing columns
ALTER TABLE public.merch ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 5. ABOUT CONTENT TABLE
CREATE TABLE IF NOT EXISTS public.about_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text,
  mission text,
  contact_email text,
  contact_phone text,
  instagram_url text,
  twitter_url text,
  facebook_url text,
  youtube_url text,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO public.about_content (description) VALUES ('') ON CONFLICT DO NOTHING;

-- 6. RLS — SONGS
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "songs_public_read" ON public.songs;
DROP POLICY IF EXISTS "songs_auth_write" ON public.songs;
CREATE POLICY "songs_public_read" ON public.songs FOR SELECT USING (true);
CREATE POLICY "songs_auth_write" ON public.songs FOR ALL USING (auth.role() = 'authenticated');

-- 7. RLS — ARTISTS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "artists_public_read" ON public.artists;
DROP POLICY IF EXISTS "artists_auth_write" ON public.artists;
CREATE POLICY "artists_public_read" ON public.artists FOR SELECT USING (true);
CREATE POLICY "artists_auth_write" ON public.artists FOR ALL USING (auth.role() = 'authenticated');

-- 8. RLS — VIDEOS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "videos_public_read" ON public.videos;
DROP POLICY IF EXISTS "videos_auth_write" ON public.videos;
CREATE POLICY "videos_public_read" ON public.videos FOR SELECT USING (true);
CREATE POLICY "videos_auth_write" ON public.videos FOR ALL USING (auth.role() = 'authenticated');

-- 9. RLS — MERCH
ALTER TABLE public.merch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merch_public_read" ON public.merch;
DROP POLICY IF EXISTS "merch_auth_write" ON public.merch;
CREATE POLICY "merch_public_read" ON public.merch FOR SELECT USING (true);
CREATE POLICY "merch_auth_write" ON public.merch FOR ALL USING (auth.role() = 'authenticated');

-- 10. RLS — ABOUT CONTENT
ALTER TABLE public.about_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "about_public_read" ON public.about_content;
DROP POLICY IF EXISTS "about_auth_write" ON public.about_content;
CREATE POLICY "about_public_read" ON public.about_content FOR SELECT USING (true);
CREATE POLICY "about_auth_write" ON public.about_content FOR ALL USING (auth.role() = 'authenticated');

-- 11. STORAGE BUCKETS (run these separately if buckets don't exist)
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT DO NOTHING;

-- 12. STORAGE RLS POLICIES
DROP POLICY IF EXISTS "storage_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_images_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "storage_images_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_audio_public_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_audio_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "storage_audio_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_covers_public_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_covers_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "storage_covers_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_videos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_videos_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "storage_videos_auth_delete" ON storage.objects;

CREATE POLICY "storage_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "storage_images_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
CREATE POLICY "storage_images_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "storage_audio_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'audio');
CREATE POLICY "storage_audio_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio' AND auth.role() = 'authenticated');
CREATE POLICY "storage_audio_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'audio' AND auth.role() = 'authenticated');

CREATE POLICY "storage_covers_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "storage_covers_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');
CREATE POLICY "storage_covers_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.role() = 'authenticated');

CREATE POLICY "storage_videos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "storage_videos_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');
CREATE POLICY "storage_videos_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
