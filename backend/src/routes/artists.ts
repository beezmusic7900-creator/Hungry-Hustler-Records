import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../db/supabase.js';
import type { App } from '../index.js';

export function registerArtistsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get('/api/artists', {
    schema: {
      description: 'Get all artists',
      tags: ['artists'],
      response: {
        200: {
          type: 'object',
          properties: {
            artists: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  bio: { type: ['string', 'null'] },
                  photo_url: { type: ['string', 'null'] },
                  spotify_url: { type: ['string', 'null'] },
                  apple_music_url: { type: ['string', 'null'] },
                  youtube_url: { type: ['string', 'null'] },
                  soundcloud_url: { type: ['string', 'null'] },
                  instagram_url: { type: ['string', 'null'] },
                  twitter_url: { type: ['string', 'null'] },
                  facebook_url: { type: ['string', 'null'] },
                  tiktok_url: { type: ['string', 'null'] },
                  video_urls: { type: ['array', 'null'], items: { type: 'string' } },
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
    app.logger.info('Getting all artists');
    const { data: artists, error } = await supabase.from('artists').select('*').order('display_order');
    if (error) throw error;
    app.logger.info({ count: artists?.length }, 'Artists retrieved');
    return { artists: artists || [] };
  });

  app.fastify.get('/api/artists/:id', {
    schema: {
      description: 'Get artist by ID',
      tags: ['artists'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            bio: { type: ['string', 'null'] },
            photo_url: { type: ['string', 'null'] },
            spotify_url: { type: ['string', 'null'] },
            apple_music_url: { type: ['string', 'null'] },
            youtube_url: { type: ['string', 'null'] },
            soundcloud_url: { type: ['string', 'null'] },
            instagram_url: { type: ['string', 'null'] },
            twitter_url: { type: ['string', 'null'] },
            facebook_url: { type: ['string', 'null'] },
            tiktok_url: { type: ['string', 'null'] },
            video_urls: { type: ['array', 'null'], items: { type: 'string' } },
            display_order: { type: 'number' },
            is_featured: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    app.logger.info({ artistId: id }, 'Getting artist');
    const { data: artist, error } = await supabase.from('artists').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return reply.status(404).send({ error: 'Artist not found' });
      throw error;
    }
    app.logger.info({ artistId: id }, 'Artist retrieved');
    return artist;
  });

  app.fastify.post('/api/admin/artists', {
    schema: {
      description: 'Create a new artist',
      tags: ['admin', 'artists'],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          bio: { type: 'string' },
          photo_url: { type: 'string' },
          spotify_url: { type: 'string' },
          apple_music_url: { type: 'string' },
          youtube_url: { type: 'string' },
          soundcloud_url: { type: 'string' },
          instagram_url: { type: 'string' },
          twitter_url: { type: 'string' },
          facebook_url: { type: 'string' },
          tiktok_url: { type: 'string' },
          video_urls: { type: 'array', items: { type: 'string' } },
          display_order: { type: 'number' },
          is_featured: { type: 'boolean' },
        },
      },
      response: {
        201: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as {
      name: string; bio?: string; photo_url?: string; spotify_url?: string;
      apple_music_url?: string; youtube_url?: string; soundcloud_url?: string;
      instagram_url?: string; twitter_url?: string; facebook_url?: string;
      tiktok_url?: string; video_urls?: string[]; display_order?: number; is_featured?: boolean;
    };

    app.logger.info({ name: body.name }, 'Creating artist');
    const { data: artist, error } = await supabase.from('artists').insert({
      name: body.name,
      bio: body.bio,
      photo_url: body.photo_url,
      spotify_url: body.spotify_url,
      apple_music_url: body.apple_music_url,
      youtube_url: body.youtube_url,
      soundcloud_url: body.soundcloud_url,
      instagram_url: body.instagram_url,
      twitter_url: body.twitter_url,
      facebook_url: body.facebook_url,
      tiktok_url: body.tiktok_url,
      video_urls: body.video_urls,
      display_order: body.display_order ?? 0,
      is_featured: body.is_featured ?? false,
    }).select().single();
    if (error) throw error;
    app.logger.info({ artistId: artist.id }, 'Artist created successfully');
    return reply.status(201).send(artist);
  });

  app.fastify.put('/api/admin/artists/:id', {
    schema: {
      description: 'Update artist by ID',
      tags: ['admin', 'artists'],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' }, bio: { type: 'string' }, photo_url: { type: 'string' },
          spotify_url: { type: 'string' }, apple_music_url: { type: 'string' }, youtube_url: { type: 'string' },
          soundcloud_url: { type: 'string' }, instagram_url: { type: 'string' }, twitter_url: { type: 'string' },
          facebook_url: { type: 'string' }, tiktok_url: { type: 'string' },
          video_urls: { type: 'array', items: { type: 'string' } },
          display_order: { type: 'number' }, is_featured: { type: 'boolean' },
        },
      },
      response: {
        200: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;
    const body = request.body as Record<string, any>;
    app.logger.info({ artistId: id }, 'Updating artist');

    const { error: checkError } = await supabase.from('artists').select('id').eq('id', id).single();
    if (checkError) {
      if (checkError.code === 'PGRST116') return reply.status(404).send({ error: 'Artist not found' });
      throw checkError;
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.photo_url !== undefined) updateData.photo_url = body.photo_url;
    if (body.spotify_url !== undefined) updateData.spotify_url = body.spotify_url;
    if (body.apple_music_url !== undefined) updateData.apple_music_url = body.apple_music_url;
    if (body.youtube_url !== undefined) updateData.youtube_url = body.youtube_url;
    if (body.soundcloud_url !== undefined) updateData.soundcloud_url = body.soundcloud_url;
    if (body.instagram_url !== undefined) updateData.instagram_url = body.instagram_url;
    if (body.twitter_url !== undefined) updateData.twitter_url = body.twitter_url;
    if (body.facebook_url !== undefined) updateData.facebook_url = body.facebook_url;
    if (body.tiktok_url !== undefined) updateData.tiktok_url = body.tiktok_url;
    if (body.video_urls !== undefined) updateData.video_urls = body.video_urls;
    if (body.display_order !== undefined) updateData.display_order = body.display_order;
    if (body.is_featured !== undefined) updateData.is_featured = body.is_featured;

    const { data: artist, error } = await supabase.from('artists').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    app.logger.info({ artistId: id }, 'Artist updated successfully');
    return artist;
  });

  app.fastify.delete('/api/admin/artists/:id', {
    schema: {
      description: 'Delete artist by ID',
      tags: ['admin', 'artists'],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const { id } = request.params;
    app.logger.info({ artistId: id }, 'Deleting artist');

    const { error: checkError } = await supabase.from('artists').select('id').eq('id', id).single();
    if (checkError) {
      if (checkError.code === 'PGRST116') return reply.status(404).send({ error: 'Artist not found' });
      throw checkError;
    }

    const { error } = await supabase.from('artists').delete().eq('id', id);
    if (error) throw error;
    app.logger.info({ artistId: id }, 'Artist deleted successfully');
    return { success: true };
  });
}
