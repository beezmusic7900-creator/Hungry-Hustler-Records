import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/webm'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function registerSongUploadRoutes(app: App) {
  const fastify = app.fastify;

  // POST /api/songs/upload - Upload new song
  fastify.post('/api/songs/upload', {
    schema: {
      description: 'Upload a new song with audio file and optional cover art',
      tags: ['songs'],
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            artist: { type: 'string' },
            fileUrl: { type: 'string' },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Song upload initiated');

    try {
      const parts = request.parts();
      let audioFile: any = null;
      let title = '';
      let artist = '';
      let category = 'exclusive';
      let price = '0';

      // Parse multipart form data
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          audioFile = part;
        } else if (part.type === 'field') {
          const fieldValue = part.value;
          if (part.fieldname === 'title') {
            title = String(fieldValue);
          } else if (part.fieldname === 'artist') {
            artist = String(fieldValue);
          } else if (part.fieldname === 'category') {
            category = String(fieldValue) || 'exclusive';
          } else if (part.fieldname === 'price') {
            price = String(fieldValue) || '0';
          }
        }
      }

      if (!audioFile) {
        app.logger.warn('No audio file provided in song upload');
        return reply.status(400).send({ error: 'No audio file provided' });
      }

      if (!title || !artist) {
        app.logger.warn('Missing required fields in song upload');
        return reply.status(400).send({ error: 'title and artist required' });
      }

      // Validate MIME type
      if (!ALLOWED_AUDIO_MIME_TYPES.includes(audioFile.mimetype)) {
        app.logger.warn({ mimetype: audioFile.mimetype }, 'Invalid audio file type');
        return reply.status(400).send({ error: 'Only audio files allowed' });
      }

      // Upload audio file to storage
      let audioBuffer: Buffer;
      try {
        audioBuffer = await audioFile.toBuffer();
      } catch (err) {
        app.logger.error({ err }, 'Failed to read audio file');
        return reply.status(413).send({ error: 'File too large' });
      }

      const timestamp = Date.now();
      const sanitized = audioFile.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const audioKey = `songs/${timestamp}-${sanitized}`;

      let fileUrl: string;
      try {
        const uploadedKey = await app.storage.upload(audioKey, audioBuffer);
        const { url } = await app.storage.getSignedUrl(uploadedKey);
        fileUrl = url;
        app.logger.info({ key: uploadedKey }, 'Audio file uploaded');
      } catch (err) {
        app.logger.error({ err }, 'Audio upload to storage failed');
        return reply.status(500).send({ error: 'Failed to upload audio file' });
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
      const songId = uuidv4();
      try {
        await app.db.insert(schema.songs).values({
          id: songId,
          title,
          artist,
          category,
          fileUrl,
          coverUrl: null,
          price: String(price) as any,
          isActive: true,
          isPublished: true,
          uploadedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        app.logger.info({ songId }, 'Song record created in database');
      } catch (err) {
        app.logger.error({ err, songId }, 'Failed to write song to database');
        return reply.status(500).send({ error: 'DB write failed', fileUrl });
      }

      reply.status(201);
      return { id: songId, title, artist, fileUrl };
    } catch (error) {
      app.logger.error({ err: error }, 'Song upload failed');
      throw error;
    }
  });

  // GET /api/songs - Public endpoint
  fastify.get('/api/songs', {
    schema: {
      description: 'Get published songs, optionally filtered by category',
      tags: ['songs'],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            songs: { type: 'array' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ query: request.query }, 'Fetching published songs');

    try {
      const { category } = request.query as { category?: string };

      let conditions: any[] = [
        eq(schema.songs.isActive, true),
        eq(schema.songs.isPublished, true),
      ];

      if (category) {
        conditions.push(eq(schema.songs.category, category));
      }

      const songs = await app.db
        .select()
        .from(schema.songs)
        .where(and(...conditions))
        .orderBy(desc(schema.songs.createdAt));

      app.logger.info({ count: songs.length }, 'Songs fetched');
      return { songs };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch songs');
      throw error;
    }
  });

  // GET /api/songs/all - Admin only
  fastify.get('/api/songs/all', {
    schema: {
      description: 'Get all songs (admin only)',
      tags: ['songs'],
      response: {
        200: {
          type: 'object',
          properties: {
            songs: { type: 'array' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Fetching all songs (admin)');

    // Check authentication and admin status
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      app.logger.warn('Unauthorized: no bearer token');
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    try {
      const sessions = await app.db
        .select()
        .from(authSchema.session)
        .where(eq(authSchema.session.token, token));

      if (sessions.length === 0) {
        app.logger.warn('Unauthorized: invalid token');
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
        app.logger.warn({ userId }, 'Forbidden: user is not admin');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const songs = await app.db
        .select()
        .from(schema.songs)
        .orderBy(desc(schema.songs.createdAt));

      app.logger.info({ count: songs.length }, 'All songs fetched');
      return { songs };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch all songs');
      throw error;
    }
  });

  // PUT /api/songs/:id - Admin only
  fastify.put('/api/songs/:id', {
    schema: {
      description: 'Update a song (admin only)',
      tags: ['songs'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: { type: 'object' },
      response: {
        200: { type: 'object' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id, body: request.body }, 'Updating song');

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
      const existing = await app.db
        .select()
        .from(schema.songs)
        .where(eq(schema.songs.id, id));

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Song not found' });
      }

      const updates = request.body as any;
      const updated = await app.db
        .update(schema.songs)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.songs.id, id))
        .returning();

      app.logger.info({ songId: id }, 'Song updated');
      return updated[0];
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to update song');
      throw error;
    }
  });

  // DELETE /api/songs/:id - Admin only
  fastify.delete('/api/songs/:id', {
    schema: {
      description: 'Delete a song (admin only)',
      tags: ['songs'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: {
        204: { description: 'Song deleted' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Deleting song');

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
      const song = await app.db
        .select()
        .from(schema.songs)
        .where(eq(schema.songs.id, id));

      if (song.length === 0) {
        return reply.status(404).send({ error: 'Song not found' });
      }

      await app.db.delete(schema.songs).where(eq(schema.songs.id, id));
      app.logger.info({ songId: id }, 'Song deleted from database');
      return reply.status(204).send();
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to delete song');
      throw error;
    }
  });
}
