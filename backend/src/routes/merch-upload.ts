import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';
import { v4 as uuidv4 } from 'uuid';

export function registerMerchUploadRoutes(app: App) {
  const fastify = app.fastify;

  // POST /api/merch - Admin only, create merch
  fastify.post('/api/merch', {
    schema: {
      description: 'Create a new merch item (admin only)',
      tags: ['merch'],
      body: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          imageUrl: { type: 'string' },
          stripeUrl: { type: 'string' },
        },
      },
      response: {
        201: { type: 'object' },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ body: request.body }, 'Creating merch item');

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
      const { name, description, price, imageUrl, stripeUrl } = request.body as any;

      if (!name || price === undefined) {
        return reply.status(400).send({ error: 'name and price required' });
      }

      const merchId = uuidv4();
      const created = await app.db
        .insert(schema.merch)
        .values({
          id: merchId,
          name,
          description: description || null,
          price: String(price) as any,
          imageUrl: imageUrl || null,
          stripeUrl: stripeUrl || null,
          stock: 0,
          isPublished: true,
          isActive: true,
          sortOrder: 0,
          uploadedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      reply.status(201);
      app.logger.info({ merchId }, 'Merch item created');
      return created[0];
    } catch (error) {
      app.logger.error({ err: error, body: request.body }, 'Failed to create merch item');
      throw error;
    }
  });

  // GET /api/merch - Public endpoint
  fastify.get('/api/merch', {
    schema: {
      description: 'Get published merch items',
      tags: ['merch'],
      response: {
        200: {
          type: 'object',
          properties: {
            merch: { type: 'array' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Fetching published merch');

    try {
      const items = await app.db
        .select()
        .from(schema.merch)
        .where(and(
          eq(schema.merch.isActive, true),
          eq(schema.merch.isPublished, true)
        ))
        .orderBy(desc(schema.merch.createdAt));

      app.logger.info({ count: items.length }, 'Merch items fetched');
      return { merch: items };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch merch items');
      throw error;
    }
  });

  // DELETE /api/merch/:id - Admin only
  fastify.delete('/api/merch/:id', {
    schema: {
      description: 'Delete a merch item (admin only)',
      tags: ['merch'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: {
        204: { description: 'Merch deleted' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Deleting merch item');

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
      const item = await app.db
        .select()
        .from(schema.merch)
        .where(eq(schema.merch.id, id));

      if (item.length === 0) {
        return reply.status(404).send({ error: 'Merch item not found' });
      }

      await app.db.delete(schema.merch).where(eq(schema.merch.id, id));
      app.logger.info({ merchId: id }, 'Merch item deleted');
      return reply.status(204).send();
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to delete merch item');
      throw error;
    }
  });
}
