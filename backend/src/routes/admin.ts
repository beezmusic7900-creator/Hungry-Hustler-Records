import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkAdminStatus, requireAdmin } from '../utils/admin.js';

// File size limit: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export function registerAdminRoutes(app: App) {
  const fastify = app.fastify;

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
      return { isAdmin: adminStatus.isAdmin };
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
      if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
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
}
