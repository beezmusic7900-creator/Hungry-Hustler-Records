import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, asc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { requireAdmin } from '../utils/admin.js';
import { v4 as uuidv4 } from 'uuid';

export function registerArtistRoutes(app: App) {
  const fastify = app.fastify;

  // PUBLIC: Get all artists
  fastify.get('/api/artists', async (request, reply) => {
    app.logger.info('Fetching all artists');
    try {
      const artists = await app.db
        .select()
        .from(schema.artists)
        .orderBy(asc(schema.artists.createdAt));
      app.logger.info({ count: artists.length }, 'Artists fetched successfully');
      return artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
        bio: artist.bio,
        photoUrl: artist.photoUrl,
        spotifyUrl: artist.spotifyUrl,
        appleMusicUrl: artist.appleMusicUrl,
        youtubeUrl: artist.youtubeUrl,
        soundcloudUrl: artist.soundcloudUrl,
        instagramUrl: artist.instagramUrl,
        twitterUrl: artist.twitterUrl,
        specialties: artist.specialties,
        status: artist.status,
        label: artist.label,
        createdAt: artist.createdAt,
        updatedAt: artist.updatedAt,
      }));
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch artists');
      throw error;
    }
  });

  // PUBLIC: Get single artist by id
  fastify.get('/api/artists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Fetching artist');
    try {
      const artists = await app.db
        .select()
        .from(schema.artists)
        .where(eq(schema.artists.id, id));

      if (artists.length === 0) {
        app.logger.warn({ id }, 'Artist not found');
        return reply.status(404).send({ error: 'Artist not found' });
      }

      app.logger.info({ id }, 'Artist fetched successfully');
      return artists[0];
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to fetch artist');
      throw error;
    }
  });

  // ADMIN: Create artist
  fastify.post('/api/admin/artists', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ body: request.body }, 'Creating artist');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    const { name, bio, photo_url, spotify_url, apple_music_url, youtube_url, soundcloud_url, instagram_url, twitter_url, specialties, status, label } = request.body as any;

    if (!name) {
      app.logger.warn({ body: request.body }, 'Artist creation failed: missing name');
      return reply.status(400).send({ error: 'Name is required' });
    }

    try {
      const artist = await app.db
        .insert(schema.artists)
        .values({
          id: uuidv4() as any,
          name,
          bio: bio || null,
          photoUrl: photo_url || null,
          spotifyUrl: spotify_url || null,
          appleMusicUrl: apple_music_url || null,
          youtubeUrl: youtube_url || null,
          soundcloudUrl: soundcloud_url || null,
          instagramUrl: instagram_url || null,
          twitterUrl: twitter_url || null,
          specialties: specialties ? (typeof specialties === 'string' ? specialties : JSON.stringify(specialties)) : null,
          status: status || 'Active',
          label: label || 'Hungry Hustler Records',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      app.logger.info({ artistId: artist[0].id }, 'Artist created successfully');
      return artist[0];
    } catch (error) {
      app.logger.error({ err: error, body: request.body }, 'Failed to create artist');
      throw error;
    }
  });

  // ADMIN: Update artist
  fastify.put('/api/admin/artists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id, body: request.body }, 'Updating artist');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    const { name, bio, photo_url, spotify_url, apple_music_url, youtube_url, soundcloud_url, instagram_url, twitter_url, specialties, status, label } = request.body as any;

    if (!name) {
      app.logger.warn({ id, body: request.body }, 'Artist update failed: missing name');
      return reply.status(400).send({ error: 'Name is required' });
    }

    try {
      const artist = await app.db
        .update(schema.artists)
        .set({
          name,
          bio: bio || null,
          photoUrl: photo_url || null,
          spotifyUrl: spotify_url || null,
          appleMusicUrl: apple_music_url || null,
          youtubeUrl: youtube_url || null,
          soundcloudUrl: soundcloud_url || null,
          instagramUrl: instagram_url || null,
          twitterUrl: twitter_url || null,
          specialties: specialties ? (typeof specialties === 'string' ? specialties : JSON.stringify(specialties)) : null,
          status: status || 'Active',
          label: label || 'Hungry Hustler Records',
          updatedAt: new Date(),
        })
        .where(eq(schema.artists.id, id))
        .returning();

      if (artist.length === 0) {
        app.logger.warn({ id }, 'Artist not found for update');
        return reply.status(404).send({ error: 'Artist not found' });
      }

      app.logger.info({ artistId: id }, 'Artist updated successfully');
      return artist[0];
    } catch (error) {
      app.logger.error({ err: error, id, body: request.body }, 'Failed to update artist');
      throw error;
    }
  });

  // ADMIN: Delete artist
  fastify.delete('/api/admin/artists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Deleting artist');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    try {
      const result = await app.db.delete(schema.artists).where(eq(schema.artists.id, id)).returning();

      if (result.length === 0) {
        app.logger.warn({ id }, 'Artist not found for deletion');
        return reply.status(404).send({ error: 'Artist not found' });
      }

      app.logger.info({ artistId: id }, 'Artist deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to delete artist');
      throw error;
    }
  });
}
