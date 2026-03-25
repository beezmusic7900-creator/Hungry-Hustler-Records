import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/mpeg'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function registerVideoUploadRoutes(app: App) {
  const fastify = app.fastify;

  // POST /api/videos/upload - Upload new video
  fastify.post('/api/videos/upload', {
    schema: {
      description: 'Upload a new video with optional video file, youtube URL, and cover art',
      tags: ['videos'],
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Video upload initiated');

    try {
      const parts = request.parts();
      let videoFile: any = null;
      let title = '';
      let artist = '';
      let category = 'music_video';
      let youtubeUrl = '';

      // Parse multipart form data
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          if (!ALLOWED_VIDEO_MIME_TYPES.includes(part.mimetype)) {
            app.logger.warn({ mimetype: part.mimetype }, 'Invalid video file type');
            return reply.status(400).send({ error: 'Only video files allowed' });
          }
          videoFile = part;
        } else if (part.type === 'field') {
          const fieldValue = part.value;
          if (part.fieldname === 'title') {
            title = String(fieldValue);
          } else if (part.fieldname === 'artist') {
            artist = String(fieldValue);
          } else if (part.fieldname === 'category') {
            category = String(fieldValue) || 'music_video';
          } else if (part.fieldname === 'youtube_url') {
            youtubeUrl = String(fieldValue) || '';
          }
        }
      }

      if (!title) {
        app.logger.warn('Missing title in video upload');
        return reply.status(400).send({ error: 'title required' });
      }

      if (!videoFile && !youtubeUrl) {
        app.logger.warn('No video file or youtube URL provided');
        return reply.status(400).send({ error: 'Either file or youtube_url required' });
      }

      let fileUrl: string | null = null;

      // Upload video file if provided
      if (videoFile) {
        try {
          const videoBuffer = await videoFile.toBuffer();
          const timestamp = Date.now();
          const sanitized = videoFile.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          const videoKey = `videos/${timestamp}-${sanitized}`;

          const uploadedKey = await app.storage.upload(videoKey, videoBuffer);
          const { url } = await app.storage.getSignedUrl(uploadedKey);
          fileUrl = url;
          app.logger.info({ key: uploadedKey }, 'Video file uploaded');
        } catch (err) {
          app.logger.error({ err }, 'Video upload to storage failed');
          return reply.status(500).send({ error: 'Failed to upload video file' });
        }
      }

      // Get authenticated user if present
      let uploadedBy: string | null = null;
      try {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const sessions = await app.db
            .select()
            .from(authSchema.session)
            .where(eq(authSchema.session.token, token));
          if (sessions.length > 0) {
            uploadedBy = sessions[0].userId;
          }
        }
      } catch {
        // User not authenticated, proceed without uploadedBy
      }

      // Write to database
      const videoId = uuidv4();
      try {
        await app.db.insert(schema.videos).values({
          id: videoId,
          title,
          artist: artist || null,
          category,
          fileUrl,
          youtubeUrl: youtubeUrl || null,
          videoUrl: fileUrl || youtubeUrl || null,
          thumbnailUrl: null,
          coverUrl: null,
          isActive: true,
          isPublished: true,
          uploadedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        app.logger.info({ videoId }, 'Video record created in database');
      } catch (err) {
        app.logger.error({ err, videoId }, 'Failed to write video to database');
        return reply.status(500).send({ error: 'DB write failed', fileUrl });
      }

      reply.status(201);
      return { id: videoId, title };
    } catch (error) {
      app.logger.error({ err: error }, 'Video upload failed');
      throw error;
    }
  });

  // GET /api/videos - Public endpoint
  fastify.get('/api/videos', {
    schema: {
      description: 'Get published videos',
      tags: ['videos'],
      response: {
        200: {
          type: 'object',
          properties: {
            videos: { type: 'array' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Fetching published videos');

    try {
      const videos = await app.db
        .select()
        .from(schema.videos)
        .where(and(
          eq(schema.videos.isActive, true),
          eq(schema.videos.isPublished, true)
        ))
        .orderBy(desc(schema.videos.createdAt));

      app.logger.info({ count: videos.length }, 'Videos fetched');
      return { videos };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch videos');
      throw error;
    }
  });

  // DELETE /api/videos/:id - Admin only
  fastify.delete('/api/videos/:id', {
    schema: {
      description: 'Delete a video (admin only)',
      tags: ['videos'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: {
        204: { description: 'Video deleted' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Deleting video');

    // Check admin
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const sessions = await app.db
      .select()
      .from(authSchema.session)
      .where(eq(authSchema.session.token, token));

    if (sessions.length === 0) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = sessions[0].userId;
    const adminRecords = await app.db
      .select()
      .from(schema.adminUsers)
      .where(and(
        eq(schema.adminUsers.userId, userId),
        eq(schema.adminUsers.isAdmin, true)
      ));

    if (adminRecords.length === 0) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const video = await app.db
        .select()
        .from(schema.videos)
        .where(eq(schema.videos.id, id));

      if (video.length === 0) {
        return reply.status(404).send({ error: 'Video not found' });
      }

      await app.db.delete(schema.videos).where(eq(schema.videos.id, id));
      app.logger.info({ videoId: id }, 'Video deleted from database');
      return reply.status(204).send();
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to delete video');
      throw error;
    }
  });
}
