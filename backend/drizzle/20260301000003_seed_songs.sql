-- Seed songs data
INSERT INTO songs (id, title, artist, category, file_url, cover_url, price, is_active, is_published, duration, created_at, updated_at)
SELECT
  gen_random_uuid(),
  title,
  artist,
  category,
  file_url,
  cover_url,
  price,
  is_active,
  is_published,
  duration,
  NOW(),
  NOW()
FROM (
  VALUES
    ('Street Anthem', 'HHR Artist', 'exclusive', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://picsum.photos/seed/song1/400/400', 0, true, true, 180),
    ('Hustle Hard', 'HHR Artist', 'exclusive', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://picsum.photos/seed/song2/400/400', 0, true, true, 210),
    ('Night Moves', 'HHR Artist', 'featured', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://picsum.photos/seed/song3/400/400', 0, true, true, 195)
) AS data(title, artist, category, file_url, cover_url, price, is_active, is_published, duration)
WHERE NOT EXISTS (
  SELECT 1 FROM songs WHERE title IN ('Street Anthem', 'Hustle Hard', 'Night Moves')
);
