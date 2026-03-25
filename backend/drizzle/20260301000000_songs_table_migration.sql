-- Drop existing songs table and recreate with new schema
DROP TABLE IF EXISTS songs CASCADE;

CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration INTEGER,
  file_url TEXT NOT NULL,
  cover_url TEXT,
  category TEXT NOT NULL DEFAULT 'exclusive',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX idx_songs_is_published ON songs(is_published);
CREATE INDEX idx_songs_is_active ON songs(is_active);
CREATE INDEX idx_songs_category ON songs(category);
