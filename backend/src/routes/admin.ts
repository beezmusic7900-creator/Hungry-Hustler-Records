import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkAdminStatus, requireAdmin, getBearerToken } from '../utils/admin.js';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import { hash } from '@node-rs/argon2';

// File size limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for images
const MAX_AUDIO_FILE_SIZE = 100 * 1024 * 1024; // 100MB for audio
const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024; // 500MB for video

// Allowed MIME types
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/webm'];
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/mpeg'];

export function registerAdminRoutes(app: App) {
  const fastify = app.fastify;

  // Setup admin user (no auth required - for initial setup)
  fastify.post('/api/admin/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Admin setup initiated');
    try {
      const email = 'hungry.hustler@yahoo.com';
      const password = 'Afroman420!';
      const name = 'Hungry Hustler Admin';

      // Check if user already exists
      const existingUsers = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.email, email));

      let userId: string;

      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
        app.logger.info({ email, userId }, 'User already exists');

        // Update the account with new password
        const hashedPassword = await hash(password, {
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });

        const accounts = await app.db
          .select()
          .from(authSchema.account)
          .where(eq(authSchema.account.userId, userId));

        if (accounts.length > 0) {
          await app.db
            .update(authSchema.account)
            .set({ password: hashedPassword, updatedAt: new Date() })
            .where(eq(authSchema.account.userId, userId));
          app.logger.info({ userId }, 'Password updated for existing user');
        } else {
          // Create account with email/password provider
          await app.db.insert(authSchema.account).values({
            id: `account_${Date.now()}`,
            accountId: email,
            providerId: 'credential',
            userId,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          app.logger.info({ userId }, 'Account created for existing user');
        }
      } else {
        // Create new user
        userId = `user_${Date.now()}`;
        const hashedPassword = await hash(password, {
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });

        await app.db.insert(authSchema.user).values({
          id: userId,
          name,
          email,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Create account with email/password provider
        await app.db.insert(authSchema.account).values({
          id: `account_${Date.now()}`,
          accountId: email,
          providerId: 'credential',
          userId,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        app.logger.info({ email, userId }, 'New user created');
      }

      // Check if user is already an admin
      const adminRecords = await app.db
        .select()
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.userId, userId));

      if (adminRecords.length > 0) {
        if (adminRecords[0].isAdmin) {
          app.logger.info({ userId }, 'User is already marked as admin');
          return {
            success: true,
            message: 'Admin user already exists',
          };
        } else {
          // Update to admin
          await app.db
            .update(schema.adminUsers)
            .set({ isAdmin: true })
            .where(eq(schema.adminUsers.userId, userId));
          app.logger.info({ userId }, 'User updated to admin status');
          return {
            success: true,
            message: 'Admin user created',
          };
        }
      } else {
        // Create admin record
        await app.db.insert(schema.adminUsers).values({
          userId,
          isAdmin: true,
          createdAt: new Date(),
        });
        app.logger.info({ userId }, 'Admin user record created');
        return {
          success: true,
          message: 'Admin user created',
        };
      }
    } catch (error) {
      app.logger.error({ err: error }, 'Admin setup failed');
      throw error;
    }
  });

  // Check if user is admin
  fastify.post('/api/admin/check', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Checking admin status');
    try {
      const adminStatus = await checkAdminStatus(app, request, reply);

      if (!adminStatus) {
        app.logger.info('User is not authenticated');
        return { isAdmin: false };
      }

      app.logger.info({ userId: adminStatus.userId, isAdmin: adminStatus.isAdmin }, 'Admin status checked');
      return { isAdmin: adminStatus.isAdmin, userId: adminStatus.userId };
    } catch (error) {
      app.logger.error({ err: error }, 'Error checking admin status');
      return { isAdmin: false };
    }
  });

  // Upload image
  fastify.post('/api/upload/image', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Image upload initiated');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    try {
      const data = await request.file({ limits: { fileSize: MAX_FILE_SIZE } });

      if (!data) {
        app.logger.warn('No file provided in upload request');
        return reply.status(400).send({ error: 'No file provided' });
      }

      // Validate MIME type
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(data.mimetype)) {
        app.logger.warn({ mimetype: data.mimetype }, 'Invalid file type');
        return reply.status(400).send({ error: 'Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)' });
      }

      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        app.logger.error({ err }, 'File too large');
        return reply.status(413).send({ error: 'File too large' });
      }

      // Generate storage key with timestamp and sanitized filename
      const timestamp = Date.now();
      const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${timestamp}-${sanitizedFilename}`;

      // Upload to storage
      const uploadedKey = await app.storage.upload(key, buffer);

      // Generate signed URL
      const { url } = await app.storage.getSignedUrl(uploadedKey);

      app.logger.info({ key: uploadedKey, filename: data.filename }, 'Image uploaded successfully');
      return { url };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to upload image');
      throw error;
    }
  });

  // Upload audio
  fastify.post('/api/upload/audio', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Audio upload initiated');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    try {
      const data = await request.file({ limits: { fileSize: MAX_AUDIO_FILE_SIZE } });

      if (!data) {
        app.logger.warn('No file provided in upload request');
        return reply.status(400).send({ error: 'No file provided' });
      }

      // Validate MIME type
      if (!ALLOWED_AUDIO_MIME_TYPES.includes(data.mimetype)) {
        app.logger.warn({ mimetype: data.mimetype }, 'Invalid file type');
        return reply.status(400).send({ error: 'Only audio files are allowed (MP3, WAV, AAC, OGG, FLAC, M4A, WebM)' });
      }

      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        app.logger.error({ err }, 'File too large');
        return reply.status(413).send({ error: 'File too large' });
      }

      // Generate storage key with timestamp and sanitized filename
      const timestamp = Date.now();
      const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${timestamp}-${sanitizedFilename}`;

      // Upload to storage
      const uploadedKey = await app.storage.upload(key, buffer);

      // Generate signed URL
      const { url } = await app.storage.getSignedUrl(uploadedKey);

      app.logger.info({ key: uploadedKey, filename: data.filename }, 'Audio uploaded successfully');
      return { url };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to upload audio');
      throw error;
    }
  });

  // Upload video
  fastify.post('/api/upload/video', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Video upload initiated');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    try {
      const data = await request.file({ limits: { fileSize: MAX_VIDEO_FILE_SIZE } });

      if (!data) {
        app.logger.warn('No file provided in upload request');
        return reply.status(400).send({ error: 'No file provided' });
      }

      // Validate MIME type
      if (!ALLOWED_VIDEO_MIME_TYPES.includes(data.mimetype)) {
        app.logger.warn({ mimetype: data.mimetype }, 'Invalid file type');
        return reply.status(400).send({ error: 'Only video files are allowed (MP4, MOV, AVI, WebM, MKV, MPEG)' });
      }

      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        app.logger.error({ err }, 'File too large');
        return reply.status(413).send({ error: 'File too large' });
      }

      // Generate storage key with timestamp and sanitized filename
      const timestamp = Date.now();
      const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${timestamp}-${sanitizedFilename}`;

      // Upload to storage
      const uploadedKey = await app.storage.upload(key, buffer);

      // Generate signed URL
      const { url } = await app.storage.getSignedUrl(uploadedKey);

      app.logger.info({ key: uploadedKey, filename: data.filename }, 'Video uploaded successfully');
      return { url };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to upload video');
      throw error;
    }
  });
}
