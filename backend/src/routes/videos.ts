import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { requireUploadPermission } from '../utils/admin.js';
import { v4 as uuidv4 } from 'uuid';

export function registerVideoRoutes(app: App) {
  const fastify = app.fastify;

  // PUBLIC: Get all videos
  fastify.get('/api/videos', async (request, reply) => {
    app.logger.info('Fetching all videos');
    try {
      const videos = await app.db.select().from(schema.videos);
      app.logger.info({ count: videos.length }, 'Videos fetched successfully');
      return videos;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch videos');
      throw error;
    }
  });

  // PUBLIC: Get exclusive videos (for Home tab)
  fastify.get('/api/videos/exclusive', async (request, reply) => {
    app.logger.info('Fetching exclusive videos');
    try {
      const videos = await app.db
        .select()
        .from(schema.videos)
        .where(eq(schema.videos.isExclusive, true))
        .orderBy(desc(schema.videos.releaseDate));
      app.logger.info({ count: videos.length }, 'Exclusive videos fetched successfully');
      return videos;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch exclusive videos');
      throw error;
    }
  });

  // ADMIN: Create video
  fastify.post('/api/admin/videos', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ body: request.body }, 'Creating video');

    const uploadPerm = await requireUploadPermission(app, request, reply);
    if (!uploadPerm) return;

    const { title, artistId, videoUrl, thumbnailUrl, isExclusive } = request.body as any;

    if (!title || !videoUrl) {
      app.logger.warn({ body: request.body }, 'Video creation failed: missing required fields');
      return reply.status(400).send({ error: 'title and videoUrl are required' });
    }

    try {
      const video = await app.db
        .insert(schema.videos)
        .values({
          id: uuidv4() as any,
          title,
          artistId: artistId || null,
          videoUrl,
          thumbnailUrl: thumbnailUrl || null,
          isExclusive: isExclusive !== undefined ? isExclusive : true,
          releaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      app.logger.info({ videoId: video[0].id }, 'Video created successfully');
      return video[0];
    } catch (error) {
      app.logger.error({ err: error, body: request.body }, 'Failed to create video');
      throw error;
    }
  });

  // ADMIN: Update video
  fastify.put('/api/admin/videos/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id, body: request.body }, 'Updating video');

    const uploadPerm = await requireUploadPermission(app, request, reply);
    if (!uploadPerm) return;

    const { title, artistId, videoUrl, thumbnailUrl, isExclusive } = request.body as any;

    try {
      const videos = await app.db.select().from(schema.videos).where(eq(schema.videos.id, id));

      if (videos.length === 0) {
        app.logger.warn({ id }, 'Video not found for update');
        return reply.status(404).send({ error: 'Video not found' });
      }

      const currentVideo = videos[0];

      const updatedVideo = await app.db
        .update(schema.videos)
        .set({
          title: title || currentVideo.title,
          artistId: artistId !== undefined ? artistId : currentVideo.artistId,
          videoUrl: videoUrl || currentVideo.videoUrl,
          thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : currentVideo.thumbnailUrl,
          isExclusive: isExclusive !== undefined ? isExclusive : currentVideo.isExclusive,
          updatedAt: new Date(),
        })
        .where(eq(schema.videos.id, id))
        .returning();

      app.logger.info({ videoId: id }, 'Video updated successfully');
      return updatedVideo[0];
    } catch (error) {
      app.logger.error({ err: error, id, body: request.body }, 'Failed to update video');
      throw error;
    }
  });

  // ADMIN: Delete video
  fastify.delete('/api/admin/videos/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Deleting video');

    const uploadPerm = await requireUploadPermission(app, request, reply);
    if (!uploadPerm) return;

    try {
      const result = await app.db.delete(schema.videos).where(eq(schema.videos.id, id)).returning();

      if (result.length === 0) {
        app.logger.warn({ id }, 'Video not found for deletion');
        return reply.status(404).send({ error: 'Video not found' });
      }

      app.logger.info({ videoId: id }, 'Video deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to delete video');
      throw error;
    }
  });
}
