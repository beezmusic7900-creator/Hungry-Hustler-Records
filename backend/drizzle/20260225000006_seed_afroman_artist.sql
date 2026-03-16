INSERT INTO "artists" ("id", "name", "bio", "photo_url", "spotify_url", "apple_music_url", "youtube_url", "soundcloud_url", "instagram_url", "twitter_url", "specialties", "status", "label", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'Afroman',
  'Afroman is a legendary voice in hip-hop whose influence spans generations. Best known for his worldwide smash hit "Because I Got High," & "Crazy Rap". Afroman earned global recognition and a Grammy nomination, cementing his place as one of the most recognizable and authentic artists in the culture. His music blends humor, truth, and real-life storytelling, creating timeless records that continue to resonate with fans across the world. Born Joseph Edgar Foreman in Hattiesburg, Mississippi, by the way of Los Angeles, California, Afroman built his career independently, proving that authenticity and consistency can break barriers in the music industry. His laid-back delivery, signature sound, and unapologetic honesty helped define an era of hip-hop while inspiring countless independent artists to follow their own path. Today, Afroman continues to perform internationally, release new music, and expand his legacy as a pioneer, entrepreneur, and cultural icon. His dedication to his craft and his fans has solidified his status as a respected legend whose impact on hip-hop remains undeniable.',
  'https://prod-finalquest-user-projects-storage-bucket-aws.s3.amazonaws.com/user-projects/e6f7a075-2ed0-4f03-bcbc-37c67737a41d/assets/images/0146739f-6c22-4506-9173-c2805071eea6.png?AWSAccessKeyId=AKIAVRUVRKQJC5DISQ4Q&Signature=zhXupTXadMJYymeDpvTYq9rpfjM%3D&Expires=1773713830',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  '["Recording Artist", "Songwriter", "Performer", "Cultural Icon"]',
  'Active',
  'Hungry Hustler Records',
  now(),
  now()
);
