import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../db/supabase.js';
import type { App } from '../index.js';

export function registerAboutRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get('/api/about', {
    schema: {
      description: 'Get about content',
      tags: ['about'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            logo_url: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            mission: { type: ['string', 'null'] },
            contact_email: { type: ['string', 'null'] },
            contact_phone: { type: ['string', 'null'] },
            contact_address: { type: ['string', 'null'] },
            instagram_url: { type: ['string', 'null'] },
            twitter_url: { type: ['string', 'null'] },
            facebook_url: { type: ['string', 'null'] },
            youtube_url: { type: ['string', 'null'] },
            tiktok_url: { type: ['string', 'null'] },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async () => {
    app.logger.info('Getting about content');
    const { data: aboutContent, error } = await supabase.from('about_content').select('*').limit(1).single();
    if (error || !aboutContent) {
      app.logger.warn('About content not found');
      return { error: 'About content not found' };
    }
    app.logger.info('About content retrieved');
    return aboutContent;
  });

  app.fastify.put('/api/admin/about', {
    schema: {
      description: 'Upsert about content',
      tags: ['admin', 'about'],
      body: {
        type: 'object',
        properties: {
          logo_url: { type: 'string' },
          description: { type: 'string' },
          mission: { type: 'string' },
          contact_email: { type: 'string' },
          contact_phone: { type: 'string' },
          contact_address: { type: 'string' },
          instagram_url: { type: 'string' },
          twitter_url: { type: 'string' },
          facebook_url: { type: 'string' },
          youtube_url: { type: 'string' },
          tiktok_url: { type: 'string' },
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
    app.logger.info('Upserting about content');

    const { data: existing } = await supabase.from('about_content').select('id').limit(1).single();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.mission !== undefined) updateData.mission = body.mission;
    if (body.contact_email !== undefined) updateData.contact_email = body.contact_email;
    if (body.contact_phone !== undefined) updateData.contact_phone = body.contact_phone;
    if (body.contact_address !== undefined) updateData.contact_address = body.contact_address;
    if (body.instagram_url !== undefined) updateData.instagram_url = body.instagram_url;
    if (body.twitter_url !== undefined) updateData.twitter_url = body.twitter_url;
    if (body.facebook_url !== undefined) updateData.facebook_url = body.facebook_url;
    if (body.youtube_url !== undefined) updateData.youtube_url = body.youtube_url;
    if (body.tiktok_url !== undefined) updateData.tiktok_url = body.tiktok_url;

    let aboutContent: any;
    if (existing) {
      const { data, error } = await supabase.from('about_content').update(updateData).eq('id', existing.id).select().single();
      if (error) throw error;
      aboutContent = data;
      app.logger.info({ aboutId: aboutContent.id }, 'About content updated');
    } else {
      const { data, error } = await supabase.from('about_content').insert(updateData).select().single();
      if (error) throw error;
      aboutContent = data;
      app.logger.info({ aboutId: aboutContent.id }, 'About content created');
    }

    return aboutContent;
  });
}
