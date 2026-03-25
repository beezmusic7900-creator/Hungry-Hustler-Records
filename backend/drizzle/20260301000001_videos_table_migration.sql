-- Drop existing videos table and recreate with new schema
DROP TABLE IF EXISTS videos CASCADE;

CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  youtube_url TEXT,
  file_url TEXT,
  cover_url TEXT,
  category TEXT NOT NULL DEFAULT 'music_video',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  duration INTEGER,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_videos_is_published ON videos(is_published);
CREATE INDEX idx_videos_is_active ON videos(is_active);
CREATE INDEX idx_videos_category ON videos(category);
