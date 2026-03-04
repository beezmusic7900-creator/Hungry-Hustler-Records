import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { requireUploadPermission } from '../utils/admin.js';
import { v4 as uuidv4 } from 'uuid';

export function registerSongRoutes(app: App) {
  const fastify = app.fastify;

  // PUBLIC: Get all songs
  fastify.get('/api/songs', async (request, reply) => {
    app.logger.info('Fetching all songs');
    try {
      const songs = await app.db.select().from(schema.songs);
      app.logger.info({ count: songs.length }, 'Songs fetched successfully');
      return songs;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch songs');
      throw error;
    }
  });

  // PUBLIC: Get exclusive songs (for Merch tab)
  fastify.get('/api/songs/exclusive', async (request, reply) => {
    app.logger.info('Fetching exclusive songs');
    try {
      const songs = await app.db
        .select()
        .from(schema.songs)
        .where(eq(schema.songs.isExclusive, true))
        .orderBy(desc(schema.songs.releaseDate));
      app.logger.info({ count: songs.length }, 'Exclusive songs fetched successfully');
      return songs;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch exclusive songs');
      throw error;
    }
  });

  // ADMIN: Create song
  fastify.post('/api/admin/songs', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ body: request.body }, 'Creating song');

    const uploadPerm = await requireUploadPermission(app, request, reply);
    if (!uploadPerm) return;

    const { title, artistId, mp3Url, coverPhotoUrl, price, isExclusive } = request.body as any;

    if (!title || !mp3Url || !coverPhotoUrl) {
      app.logger.warn({ body: request.body }, 'Song creation failed: missing required fields');
      return reply.status(400).send({ error: 'title, mp3Url, and coverPhotoUrl are required' });
    }

    try {
      const song = await app.db
        .insert(schema.songs)
        .values({
          id: uuidv4() as any,
          title,
          artistId: artistId || null,
          mp3Url,
          coverPhotoUrl,
          price: price ? String(price) : '0',
          isExclusive: isExclusive !== undefined ? isExclusive : true,
          releaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      app.logger.info({ songId: song[0].id }, 'Song created successfully');
      return song[0];
    } catch (error) {
      app.logger.error({ err: error, body: request.body }, 'Failed to create song');
      throw error;
    }
  });

  // ADMIN: Update song
  fastify.put('/api/admin/songs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id, body: request.body }, 'Updating song');

    const uploadPerm = await requireUploadPermission(app, request, reply);
    if (!uploadPerm) return;

    const { title, artistId, mp3Url, coverPhotoUrl, price, isExclusive } = request.body as any;

    try {
      const songs = await app.db.select().from(schema.songs).where(eq(schema.songs.id, id));

      if (songs.length === 0) {
        app.logger.warn({ id }, 'Song not found for update');
        return reply.status(404).send({ error: 'Song not found' });
      }

      const currentSong = songs[0];

      const updatedSong = await app.db
        .update(schema.songs)
        .set({
          title: title || currentSong.title,
          artistId: artistId !== undefined ? artistId : currentSong.artistId,
          mp3Url: mp3Url || currentSong.mp3Url,
          coverPhotoUrl: coverPhotoUrl || currentSong.coverPhotoUrl,
          price: price !== undefined ? String(price) : currentSong.price,
          isExclusive: isExclusive !== undefined ? isExclusive : currentSong.isExclusive,
          updatedAt: new Date(),
        })
        .where(eq(schema.songs.id, id))
        .returning();

      app.logger.info({ songId: id }, 'Song updated successfully');
      return updatedSong[0];
    } catch (error) {
      app.logger.error({ err: error, id, body: request.body }, 'Failed to update song');
      throw error;
    }
  });

  // ADMIN: Delete song
  fastify.delete('/api/admin/songs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Deleting song');

    const uploadPerm = await requireUploadPermission(app, request, reply);
    if (!uploadPerm) return;

    try {
      const result = await app.db.delete(schema.songs).where(eq(schema.songs.id, id)).returning();

      if (result.length === 0) {
        app.logger.warn({ id }, 'Song not found for deletion');
        return reply.status(404).send({ error: 'Song not found' });
      }

      app.logger.info({ songId: id }, 'Song deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to delete song');
      throw error;
    }
  });
}
