import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

const AFROMAN_ARTIST_ID = 88434;
const ITUNES_BASE = 'https://itunes.apple.com';

interface ItunesAlbum {
  wrapperType: string;
  collectionId: number;
  collectionName: string;
  artworkUrl100: string;
  releaseDate: string;
  trackCount: number;
  collectionViewUrl: string;
  primaryGenreName: string;
}

interface ItunesTrack {
  wrapperType: string;
  trackId: number;
  trackName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl: string | null;
  trackViewUrl: string;
  releaseDate: string;
  primaryGenreName: string;
  trackTimeMillis: number;
}

// Simple in-memory cache — 10 minute TTL
let cache: { data: unknown; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export function registerAppleMusicRoutes(app: App) {
  app.fastify.get('/api/apple-music/artist', {
    schema: {
      description: 'Get Afroman Apple Music artist data via iTunes API',
      tags: ['apple-music'],
      response: {
        200: {
          type: 'object',
          properties: {
            artist: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                genre: { type: 'string' },
                artistUrl: { type: 'string' },
              },
            },
            albums: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  artwork: { type: 'string' },
                  releaseYear: { type: 'string' },
                  trackCount: { type: 'number' },
                  url: { type: 'string' },
                  genre: { type: 'string' },
                },
              },
            },
            topSongs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  title: { type: 'string' },
                  album: { type: 'string' },
                  artwork: { type: 'string' },
                  previewUrl: { type: ['string', 'null'] },
                  trackUrl: { type: 'string' },
                  releaseYear: { type: 'string' },
                  durationMs: { type: 'number' },
                },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    if (cache && Date.now() < cache.expiresAt) {
      app.logger.info('Serving Apple Music data from cache');
      return cache.data;
    }

    app.logger.info('Fetching Afroman Apple Music data from iTunes');

    try {
      const [albumsRes, songsRes] = await Promise.all([
        fetch(`${ITUNES_BASE}/lookup?id=${AFROMAN_ARTIST_ID}&entity=album&limit=25`),
        fetch(`${ITUNES_BASE}/lookup?id=${AFROMAN_ARTIST_ID}&entity=song&limit=30`),
      ]);

      if (!albumsRes.ok || !songsRes.ok) {
        app.logger.error('iTunes API returned non-200 response');
        return reply.status(500).send({ error: 'Failed to fetch from iTunes API' });
      }

      const [albumsData, songsData] = await Promise.all([
        albumsRes.json() as Promise<{ results: unknown[] }>,
        songsRes.json() as Promise<{ results: unknown[] }>,
      ]);

      const artistResult = (albumsData.results as any[]).find((r: any) => r.wrapperType === 'artist');
      const artist = {
        id: AFROMAN_ARTIST_ID,
        name: artistResult?.artistName ?? 'Afroman',
        genre: artistResult?.primaryGenreName ?? 'Hip-Hop/Rap',
        artistUrl: artistResult?.artistLinkUrl ?? `https://music.apple.com/us/artist/afroman/${AFROMAN_ARTIST_ID}`,
      };

      const seenAlbumNames = new Set<string>();
      const albums = (albumsData.results as any[])
        .filter((r: any) => r.wrapperType === 'collection')
        .filter((r: ItunesAlbum) => {
          const key = r.collectionName.toLowerCase().trim();
          if (seenAlbumNames.has(key)) return false;
          seenAlbumNames.add(key);
          return true;
        })
        .sort((a: ItunesAlbum, b: ItunesAlbum) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
        )
        .map((r: ItunesAlbum) => ({
          id: r.collectionId,
          name: r.collectionName,
          artwork: r.artworkUrl100.replace('100x100bb', '600x600bb'),
          releaseYear: r.releaseDate?.slice(0, 4) ?? '',
          trackCount: r.trackCount,
          url: r.collectionViewUrl,
          genre: r.primaryGenreName,
        }));

      const seenTrackNames = new Set<string>();
      const topSongs = (songsData.results as any[])
        .filter((r: any) => r.wrapperType === 'track')
        .filter((r: ItunesTrack) => {
          const key = r.trackName.toLowerCase().trim();
          if (seenTrackNames.has(key)) return false;
          seenTrackNames.add(key);
          return true;
        })
        .sort((a: ItunesTrack, b: ItunesTrack) => {
          if (a.previewUrl && !b.previewUrl) return -1;
          if (!a.previewUrl && b.previewUrl) return 1;
          return 0;
        })
        .slice(0, 20)
        .map((r: ItunesTrack) => ({
          id: r.trackId,
          title: r.trackName,
          album: r.collectionName,
          artwork: r.artworkUrl100.replace('100x100bb', '300x300bb'),
          previewUrl: r.previewUrl ?? null,
          trackUrl: r.trackViewUrl,
          releaseYear: r.releaseDate?.slice(0, 4) ?? '',
          durationMs: r.trackTimeMillis ?? 0,
        }));

      const result = { artist, albums, topSongs };
      cache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };

      app.logger.info({ albums: albums.length, songs: topSongs.length }, 'Apple Music data fetched');
      return result;
    } catch (err) {
      app.logger.error({ err }, 'Failed to fetch Apple Music data');
      return reply.status(500).send({ error: 'Failed to fetch Apple Music data' });
    }
  });
}
