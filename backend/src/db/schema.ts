import { pgTable, uuid, text, timestamp, integer, decimal, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  spotifyUrl: text('spotify_url'),
  appleMusicUrl: text('apple_music_url'),
  youtubeUrl: text('youtube_url'),
  soundcloudUrl: text('soundcloud_url'),
  instagramUrl: text('instagram_url'),
  twitterUrl: text('twitter_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const merchItems = pgTable('merch_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  stock: integer('stock').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const homepageContent = pgTable('homepage_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  heroBannerUrl: text('hero_banner_url'),
  featuredArtistId: uuid('featured_artist_id').references(() => artists.id, { onDelete: 'set null' }),
  featuredMerchId: uuid('featured_merch_id').references(() => merchItems.id, { onDelete: 'set null' }),
  latestReleaseTitle: text('latest_release_title'),
  latestReleaseUrl: text('latest_release_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aboutContent = pgTable('about_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  logoUrl: text('logo_url'),
  description: text('description'),
  mission: text('mission'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  instagramUrl: text('instagram_url'),
  twitterUrl: text('twitter_url'),
  facebookUrl: text('facebook_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminUsers = pgTable('admin_users', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const homepageContentRelations = relations(homepageContent, ({ one }) => ({
  featuredArtist: one(artists, {
    fields: [homepageContent.featuredArtistId],
    references: [artists.id],
  }),
  featuredMerch: one(merchItems, {
    fields: [homepageContent.featuredMerchId],
    references: [merchItems.id],
  }),
}));

export const adminUsersRelations = relations(adminUsers, ({ one }) => ({
  user: one(user, {
    fields: [adminUsers.userId],
    references: [user.id],
  }),
}));
