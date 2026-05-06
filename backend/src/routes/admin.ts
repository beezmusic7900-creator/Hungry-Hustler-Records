import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

export function registerAdminRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/admin/upload - Protected endpoint
  app.fastify.post('/api/admin/upload', {
    schema: {
      description: 'Upload a file to S3 storage',
      tags: ['admin'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        413: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info('Processing file upload');

    const data = await request.file({ limits: { fileSize: 50 * 1024 * 1024 } });
    if (!data) {
      app.logger.warn('No file provided in upload request');
      return reply.status(400).send({ error: 'No file provided' });
    }

    try {
      const buffer = await data.toBuffer();
      const key = `uploads/${Date.now()}-${data.filename}`;

      await app.storage.upload(key, buffer);
      const { url } = await app.storage.getSignedUrl(key);

      app.logger.info({ url, filename: data.filename }, 'File uploaded successfully');
      return { url };
    } catch (error) {
      app.logger.error({ err: error, filename: data.filename }, 'File upload failed');
      return reply.status(400).send({ error: 'File upload failed' });
    }
  });
}
