import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../db/supabase.js';
import type { App } from '../index.js';

export function registerHomeRoutes(app: App) {
  const requireAuth = app.requireAuth();

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
    const { data: homeData, error } = await supabase.from('home_content').select('*').limit(1).single();
    if (error || !homeData) {
      app.logger.warn('Home content not found');
      return { error: 'Home content not found' };
    }

    let featured_artist = null;
    let featured_merch: any[] = [];

    if (homeData.featured_artist_id) {
      const { data } = await supabase.from('artists').select('*').eq('id', homeData.featured_artist_id).single();
      featured_artist = data;
    }

    if (homeData.featured_merch_ids && homeData.featured_merch_ids.length > 0) {
      const { data } = await supabase.from('merch_items').select('*').in('id', homeData.featured_merch_ids);
      featured_merch = data || [];
    }

    app.logger.info('Home content retrieved');
    return { ...homeData, featured_artist, featured_merch };
  });

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
        200: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as Record<string, any>;
    app.logger.info('Upserting home content');

    const { data: existing } = await supabase.from('home_content').select('id').limit(1).single();

    const updateData: any = { updated_at: new Date().toISOString() };
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
      const { data, error } = await supabase.from('home_content').update(updateData).eq('id', existing.id).select().single();
      if (error) throw error;
      homeContent = data;
      app.logger.info({ homeId: homeContent.id }, 'Home content updated');
    } else {
      const { data, error } = await supabase.from('home_content').insert(updateData).select().single();
      if (error) throw error;
      homeContent = data;
      app.logger.info({ homeId: homeContent.id }, 'Home content created');
    }

    let featured_artist = null;
    let featured_merch: any[] = [];

    if (homeContent.featured_artist_id) {
      const { data } = await supabase.from('artists').select('*').eq('id', homeContent.featured_artist_id).single();
      featured_artist = data;
    }
    if (homeContent.featured_merch_ids?.length) {
      const { data } = await supabase.from('merch_items').select('*').in('id', homeContent.featured_merch_ids);
      featured_merch = data || [];
    }

    return { ...homeContent, featured_artist, featured_merch };
  });
}
