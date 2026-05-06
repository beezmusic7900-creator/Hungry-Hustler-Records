import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function registerMerchRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/merch - Public endpoint
  app.fastify.get('/api/merch', {
    schema: {
      description: 'Get all merch items',
      tags: ['merch'],
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  price: { type: 'string' },
                  image_url: { type: ['string', 'null'] },
                  category: { type: ['string', 'null'] },
                  in_stock: { type: 'boolean' },
                  checkout_url: { type: ['string', 'null'] },
                  display_order: { type: 'number' },
                  is_featured: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  }, async () => {
    app.logger.info('Getting all merch items');
    const items = await app.db.select().from(schema.merch_items).orderBy(schema.merch_items.display_order);
    app.logger.info({ count: items.length }, 'Merch items retrieved');
    return { items };
  });

  // GET /api/merch/:id - Public endpoint
  app.fastify.get('/api/merch/:id', {
    schema: {
      description: 'Get merch item by ID',
      tags: ['merch'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: ['string', 'null'] },
            price: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ merchId: id }, 'Getting merch item');
    const item = await app.db.query.merch_items.findFirst({
      where: eq(schema.merch_items.id, id),
    });
    if (!item) {
      app.logger.warn({ merchId: id }, 'Merch item not found');
      return reply.status(404).send({ error: 'Merch item not found' });
    }
    app.logger.info({ merchId: id }, 'Merch item retrieved');
    return item;
  });

  // POST /api/admin/merch - Protected endpoint
  app.fastify.post('/api/admin/merch', {
    schema: {
      description: 'Create a new merch item',
      tags: ['admin', 'merch'],
      body: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          image_url: { type: 'string' },
          category: { type: 'string' },
          in_stock: { type: 'boolean' },
          checkout_url: { type: 'string' },
          display_order: { type: 'number' },
          is_featured: { type: 'boolean' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
          },
        },
        401: {
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

    const body = request.body as {
      name: string;
      price: number;
      description?: string;
      image_url?: string;
      category?: string;
      in_stock?: boolean;
      checkout_url?: string;
      display_order?: number;
      is_featured?: boolean;
    };

    app.logger.info({ name: body.name }, 'Creating merch item');
    const result = await app.db.insert(schema.merch_items).values({
      name: body.name,
      price: body.price.toString(),
      description: body.description,
      image_url: body.image_url,
      category: body.category,
      in_stock: body.in_stock ?? true,
      checkout_url: body.checkout_url,
      display_order: body.display_order ?? 0,
      is_featured: body.is_featured ?? false,
    }).returning();

    const [item] = result;
    app.logger.info({ merchId: item.id }, 'Merch item created successfully');
    return reply.status(201).send(item);
  });

  // PUT /api/admin/merch/:id - Protected endpoint
  app.fastify.put('/api/admin/merch/:id', {
    schema: {
      description: 'Update merch item by ID',
      tags: ['admin', 'merch'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          image_url: { type: 'string' },
          category: { type: 'string' },
          in_stock: { type: 'boolean' },
          checkout_url: { type: 'string' },
          display_order: { type: 'number' },
          is_featured: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;
    const body = request.body as Record<string, any>;

    app.logger.info({ merchId: id }, 'Updating merch item');

    const existing = await app.db.query.merch_items.findFirst({
      where: eq(schema.merch_items.id, id),
    });

    if (!existing) {
      app.logger.warn({ merchId: id }, 'Merch item not found for update');
      return reply.status(404).send({ error: 'Merch item not found' });
    }

    const updateData: any = { updated_at: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = body.price.toString();
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.in_stock !== undefined) updateData.in_stock = body.in_stock;
    if (body.checkout_url !== undefined) updateData.checkout_url = body.checkout_url;
    if (body.display_order !== undefined) updateData.display_order = body.display_order;
    if (body.is_featured !== undefined) updateData.is_featured = body.is_featured;

    const result = await app.db.update(schema.merch_items).set(updateData).where(eq(schema.merch_items.id, id)).returning();
    const [item] = result;
    app.logger.info({ merchId: id }, 'Merch item updated successfully');
    return item;
  });

  // DELETE /api/admin/merch/:id - Protected endpoint
  app.fastify.delete('/api/admin/merch/:id', {
    schema: {
      description: 'Delete merch item by ID',
      tags: ['admin', 'merch'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;
    app.logger.info({ merchId: id }, 'Deleting merch item');

    const existing = await app.db.query.merch_items.findFirst({
      where: eq(schema.merch_items.id, id),
    });

    if (!existing) {
      app.logger.warn({ merchId: id }, 'Merch item not found for deletion');
      return reply.status(404).send({ error: 'Merch item not found' });
    }

    await app.db.delete(schema.merch_items).where(eq(schema.merch_items.id, id));
    app.logger.info({ merchId: id }, 'Merch item deleted successfully');
    return { success: true };
  });
}
