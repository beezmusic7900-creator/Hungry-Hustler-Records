import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function registerHomeRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/home - Public endpoint
  app.fastify.get('/api/home', {
    schema: {
      description: 'Get home content',
      tags: ['home'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            hero_banner_url: { type: ['string', 'null'] },
            hero_title: { type: ['string', 'null'] },
            hero_subtitle: { type: ['string', 'null'] },
            featured_artist: { type: ['object', 'null'] },
            latest_release_title: { type: ['string', 'null'] },
            latest_release_artist: { type: ['string', 'null'] },
            latest_release_image_url: { type: ['string', 'null'] },
            latest_release_spotify_url: { type: ['string', 'null'] },
            latest_release_apple_music_url: { type: ['string', 'null'] },
            latest_release_youtube_url: { type: ['string', 'null'] },
            latest_release_soundcloud_url: { type: ['string', 'null'] },
            featured_merch: { type: 'array', items: { type: 'object' } },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async () => {
    app.logger.info('Getting home content');
    const rows = await app.db.select().from(schema.home_content).limit(1);
    const homeContent = rows[0];

    if (!homeContent) {
      app.logger.warn('Home content not found');
      return { error: 'Home content not found' };
    }

    let featured_artist = null;
    let featured_merch: any[] = [];

    // Fetch featured artist if id is set
    if (homeContent.featured_artist_id) {
      featured_artist = await app.db.query.artists.findFirst({
        where: eq(schema.artists.id, homeContent.featured_artist_id),
      });
    }

    // Fetch featured merch items if ids are set
    if (homeContent.featured_merch_ids && homeContent.featured_merch_ids.length > 0) {
      featured_merch = await app.db.select().from(schema.merch_items).where(
        inArray(schema.merch_items.id, homeContent.featured_merch_ids)
      );
    }

    const result = {
      ...homeContent,
      featured_artist,
      featured_merch,
    };

    app.logger.info('Home content retrieved');
    return result;
  });

  // PUT /api/admin/home - Protected endpoint
  app.fastify.put('/api/admin/home', {
    schema: {
      description: 'Upsert home content',
      tags: ['admin', 'home'],
      body: {
        type: 'object',
        properties: {
          hero_banner_url: { type: 'string' },
          hero_title: { type: 'string' },
          hero_subtitle: { type: 'string' },
          featured_artist_id: { type: 'string', format: 'uuid' },
          latest_release_title: { type: 'string' },
          latest_release_artist: { type: 'string' },
          latest_release_image_url: { type: 'string' },
          latest_release_spotify_url: { type: 'string' },
          latest_release_apple_music_url: { type: 'string' },
          latest_release_youtube_url: { type: 'string' },
          latest_release_soundcloud_url: { type: 'string' },
          featured_merch_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
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

    const body = request.body as Record<string, any>;
    app.logger.info('Upserting home content');

    const rows = await app.db.select().from(schema.home_content).limit(1);
    const existing = rows[0];

    const updateData: any = {
      updated_at: new Date(),
    };

    if (body.hero_banner_url !== undefined) updateData.hero_banner_url = body.hero_banner_url;
    if (body.hero_title !== undefined) updateData.hero_title = body.hero_title;
    if (body.hero_subtitle !== undefined) updateData.hero_subtitle = body.hero_subtitle;
    if (body.featured_artist_id !== undefined) updateData.featured_artist_id = body.featured_artist_id;
    if (body.latest_release_title !== undefined) updateData.latest_release_title = body.latest_release_title;
    if (body.latest_release_artist !== undefined) updateData.latest_release_artist = body.latest_release_artist;
    if (body.latest_release_image_url !== undefined) updateData.latest_release_image_url = body.latest_release_image_url;
    if (body.latest_release_spotify_url !== undefined) updateData.latest_release_spotify_url = body.latest_release_spotify_url;
    if (body.latest_release_apple_music_url !== undefined) updateData.latest_release_apple_music_url = body.latest_release_apple_music_url;
    if (body.latest_release_youtube_url !== undefined) updateData.latest_release_youtube_url = body.latest_release_youtube_url;
    if (body.latest_release_soundcloud_url !== undefined) updateData.latest_release_soundcloud_url = body.latest_release_soundcloud_url;
    if (body.featured_merch_ids !== undefined) updateData.featured_merch_ids = body.featured_merch_ids;

    let homeContent: any;

    if (existing) {
      const result = await app.db.update(schema.home_content).set(updateData).where(eq(schema.home_content.id, existing.id)).returning();
      [homeContent] = result;
      app.logger.info({ homeId: homeContent.id }, 'Home content updated');
    } else {
      const result = await app.db.insert(schema.home_content).values(updateData).returning();
      [homeContent] = result;
      app.logger.info({ homeId: homeContent.id }, 'Home content created');
    }

    // Fetch full data with joined tables
    let featured_artist = null;
    let featured_merch: any[] = [];

    if (homeContent.featured_artist_id) {
      featured_artist = await app.db.query.artists.findFirst({
        where: eq(schema.artists.id, homeContent.featured_artist_id),
      });
    }

    if (homeContent.featured_merch_ids && homeContent.featured_merch_ids.length > 0) {
      featured_merch = await app.db.select().from(schema.merch_items).where(
        inArray(schema.merch_items.id, homeContent.featured_merch_ids)
      );
    }

    const result = {
      ...homeContent,
      featured_artist,
      featured_merch,
    };

    return result;
  });
}
