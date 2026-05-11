import { pgTable, uuid, text, timestamp, integer, boolean, numeric } from 'drizzle-orm/pg-core';

export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  bio: text('bio'),
  photo_url: text('photo_url'),
  spotify_url: text('spotify_url'),
  apple_music_url: text('apple_music_url'),
  youtube_url: text('youtube_url'),
  soundcloud_url: text('soundcloud_url'),
  instagram_url: text('instagram_url'),
  twitter_url: text('twitter_url'),
  facebook_url: text('facebook_url'),
  tiktok_url: text('tiktok_url'),
  video_urls: text('video_urls').array(),
  display_order: integer('display_order').default(0),
  is_featured: boolean('is_featured').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const merch_items = pgTable('merch_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  image_url: text('image_url'),
  category: text('category'),
  in_stock: boolean('in_stock').default(true),
  checkout_url: text('checkout_url'),
  display_order: integer('display_order').default(0),
  is_featured: boolean('is_featured').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const home_content = pgTable('home_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  hero_banner_url: text('hero_banner_url'),
  hero_title: text('hero_title'),
  hero_subtitle: text('hero_subtitle'),
  featured_artist_id: uuid('featured_artist_id'),
  latest_release_title: text('latest_release_title'),
  latest_release_artist: text('latest_release_artist'),
  latest_release_image_url: text('latest_release_image_url'),
  latest_release_spotify_url: text('latest_release_spotify_url'),
  latest_release_apple_music_url: text('latest_release_apple_music_url'),
  latest_release_youtube_url: text('latest_release_youtube_url'),
  latest_release_soundcloud_url: text('latest_release_soundcloud_url'),
  featured_merch_ids: text('featured_merch_ids').array(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const about_content = pgTable('about_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  logo_url: text('logo_url'),
  description: text('description'),
  mission: text('mission'),
  contact_email: text('contact_email'),
  contact_phone: text('contact_phone'),
  contact_address: text('contact_address'),
  instagram_url: text('instagram_url'),
  twitter_url: text('twitter_url'),
  facebook_url: text('facebook_url'),
  youtube_url: text('youtube_url'),
  tiktok_url: text('tiktok_url'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
