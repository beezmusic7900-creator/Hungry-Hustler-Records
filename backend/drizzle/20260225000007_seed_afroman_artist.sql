INSERT INTO "artists" ("id", "name", "bio", "photo_url", "spotify_url", "apple_music_url", "youtube_url", "soundcloud_url", "instagram_url", "twitter_url", "specialties", "status", "label", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'Afroman',
  'Afroman is a rapper, singer, and songwriter best known for his hit "Because I Got High." With a laid-back style blending hip-hop, reggae, and blues, he has built a loyal fanbase over decades of independent releases.',
  'https://picsum.photos/seed/afroman/400/400',
  'https://open.spotify.com/artist/0z4gvV4rjIZ7wjpq8dho5E',
  'https://music.apple.com/us/artist/afroman/217813',
  'https://www.youtube.com/@AfromanOfficial',
  'https://soundcloud.com/afroman',
  'https://www.instagram.com/afromanmusic',
  'https://twitter.com/afroman',
  'Hip-Hop, Reggae, Blues',
  'active',
  'Hungry Hustler Records',
  now(),
  now()
);
