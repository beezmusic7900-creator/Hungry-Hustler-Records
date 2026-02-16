import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { requireAdmin } from '../utils/admin.js';
import { v4 as uuidv4 } from 'uuid';

export function registerMerchRoutes(app: App) {
  const fastify = app.fastify;

  // PUBLIC: Get all merch items
  fastify.get('/api/merch', async (request, reply) => {
    app.logger.info('Fetching all merch items');
    try {
      const items = await app.db.select().from(schema.merchItems);
      app.logger.info({ count: items.length }, 'Merch items fetched successfully');
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        stock: item.stock,
      }));
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch merch items');
      throw error;
    }
  });

  // PUBLIC: Get single merch item by id
  fastify.get('/api/merch/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Fetching merch item');
    try {
      const item = await app.db.query.merchItems.findFirst({
        where: eq(schema.merchItems.id, id),
      });

      if (!item) {
        app.logger.warn({ id }, 'Merch item not found');
        return reply.status(404).send({ error: 'Merch item not found' });
      }

      app.logger.info({ id }, 'Merch item fetched successfully');
      return item;
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to fetch merch item');
      throw error;
    }
  });

  // ADMIN: Create merch item
  fastify.post('/api/admin/merch', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ body: request.body }, 'Creating merch item');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    const { name, description, price, image_url, stock } = request.body as any;

    if (!name || !price) {
      app.logger.warn({ body: request.body }, 'Merch creation failed: missing required fields');
      return reply.status(400).send({ error: 'Name and price are required' });
    }

    try {
      const item = await app.db
        .insert(schema.merchItems)
        .values({
          id: uuidv4() as any,
          name,
          description: description || null,
          price: String(price) as any,
          imageUrl: image_url || null,
          stock: stock || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      app.logger.info({ merchId: item[0].id }, 'Merch item created successfully');
      return item[0];
    } catch (error) {
      app.logger.error({ err: error, body: request.body }, 'Failed to create merch item');
      throw error;
    }
  });

  // ADMIN: Update merch item
  fastify.put('/api/admin/merch/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id, body: request.body }, 'Updating merch item');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    const { name, description, price, image_url, stock } = request.body as any;

    if (!name || !price) {
      app.logger.warn({ id, body: request.body }, 'Merch update failed: missing required fields');
      return reply.status(400).send({ error: 'Name and price are required' });
    }

    try {
      const item = await app.db
        .update(schema.merchItems)
        .set({
          name,
          description: description || null,
          price: String(price) as any,
          imageUrl: image_url || null,
          stock: stock || 0,
          updatedAt: new Date(),
        })
        .where(eq(schema.merchItems.id, id))
        .returning();

      if (item.length === 0) {
        app.logger.warn({ id }, 'Merch item not found for update');
        return reply.status(404).send({ error: 'Merch item not found' });
      }

      app.logger.info({ merchId: id }, 'Merch item updated successfully');
      return item[0];
    } catch (error) {
      app.logger.error({ err: error, id, body: request.body }, 'Failed to update merch item');
      throw error;
    }
  });

  // ADMIN: Delete merch item
  fastify.delete('/api/admin/merch/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    app.logger.info({ id }, 'Deleting merch item');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    try {
      const result = await app.db.delete(schema.merchItems).where(eq(schema.merchItems.id, id)).returning();

      if (result.length === 0) {
        app.logger.warn({ id }, 'Merch item not found for deletion');
        return reply.status(404).send({ error: 'Merch item not found' });
      }

      app.logger.info({ merchId: id }, 'Merch item deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, id }, 'Failed to delete merch item');
      throw error;
    }
  });
}
