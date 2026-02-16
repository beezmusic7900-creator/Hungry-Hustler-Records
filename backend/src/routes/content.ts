import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { requireAdmin } from '../utils/admin.js';
import { v4 as uuidv4 } from 'uuid';

export function registerContentRoutes(app: App) {
  const fastify = app.fastify;

  // PUBLIC: Get homepage content
  fastify.get('/api/homepage', async (request, reply) => {
    app.logger.info('Fetching homepage content');
    try {
      const homepages = await app.db.select().from(schema.homepageContent);
      let homepage = homepages[0];

      // Create default homepage content if it doesn't exist
      if (!homepage) {
        app.logger.info('Creating default homepage content');
        const created = await app.db
          .insert(schema.homepageContent)
          .values({
            id: uuidv4() as any,
            heroBannerUrl: null,
            featuredArtistId: null,
            featuredMerchId: null,
            latestReleaseTitle: null,
            latestReleaseUrl: null,
            updatedAt: new Date(),
          })
          .returning();
        homepage = created[0];
      }

      // Fetch related featured artist and merch
      let featuredArtist = null;
      let featuredMerch = null;

      if (homepage.featuredArtistId) {
        const artists = await app.db
          .select()
          .from(schema.artists)
          .where(eq(schema.artists.id, homepage.featuredArtistId as string));
        featuredArtist = artists[0] || null;
      }

      if (homepage.featuredMerchId) {
        const merches = await app.db
          .select()
          .from(schema.merchItems)
          .where(eq(schema.merchItems.id, homepage.featuredMerchId as string));
        featuredMerch = merches[0] || null;
      }

      app.logger.info('Homepage content fetched successfully');
      return {
        heroBannerUrl: homepage.heroBannerUrl,
        featuredArtist,
        featuredMerch,
        latestReleaseTitle: homepage.latestReleaseTitle,
        latestReleaseUrl: homepage.latestReleaseUrl,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch homepage content');
      throw error;
    }
  });

  // PUBLIC: Get about content
  fastify.get('/api/about', async (request, reply) => {
    app.logger.info('Fetching about content');
    try {
      const abouts = await app.db.select().from(schema.aboutContent);
      let about = abouts[0];

      // Create default about content if it doesn't exist
      if (!about) {
        app.logger.info('Creating default about content');
        const created = await app.db
          .insert(schema.aboutContent)
          .values({
            id: uuidv4() as any,
            logoUrl: null,
            description: null,
            mission: null,
            contactEmail: null,
            contactPhone: null,
            instagramUrl: null,
            twitterUrl: null,
            facebookUrl: null,
            updatedAt: new Date(),
          })
          .returning();
        about = created[0];
      }

      app.logger.info('About content fetched successfully');
      return about;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch about content');
      throw error;
    }
  });

  // ADMIN: Update homepage content
  fastify.put('/api/admin/homepage', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ body: request.body }, 'Updating homepage content');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    const {
      hero_banner_url,
      featured_artist_id,
      featured_merch_id,
      latest_release_title,
      latest_release_url,
    } = request.body as any;

    try {
      // Get or create homepage content
      const homepages = await app.db.select().from(schema.homepageContent);
      let homepage = homepages[0];

      if (!homepage) {
        const created = await app.db
          .insert(schema.homepageContent)
          .values({
            id: uuidv4() as any,
            heroBannerUrl: hero_banner_url || null,
            featuredArtistId: featured_artist_id || null,
            featuredMerchId: featured_merch_id || null,
            latestReleaseTitle: latest_release_title || null,
            latestReleaseUrl: latest_release_url || null,
            updatedAt: new Date(),
          })
          .returning();
        homepage = created[0];
        app.logger.info('Homepage content created');
      } else {
        const updated = await app.db
          .update(schema.homepageContent)
          .set({
            heroBannerUrl: hero_banner_url !== undefined ? hero_banner_url : homepage.heroBannerUrl,
            featuredArtistId: featured_artist_id !== undefined ? featured_artist_id : homepage.featuredArtistId,
            featuredMerchId: featured_merch_id !== undefined ? featured_merch_id : homepage.featuredMerchId,
            latestReleaseTitle:
              latest_release_title !== undefined ? latest_release_title : homepage.latestReleaseTitle,
            latestReleaseUrl:
              latest_release_url !== undefined ? latest_release_url : homepage.latestReleaseUrl,
            updatedAt: new Date(),
          })
          .where(eq(schema.homepageContent.id, homepage.id as string))
          .returning();
        homepage = updated[0];
        app.logger.info('Homepage content updated');
      }

      // Fetch related featured artist and merch
      let featuredArtist = null;
      let featuredMerch = null;

      if (homepage.featuredArtistId) {
        const artists = await app.db
          .select()
          .from(schema.artists)
          .where(eq(schema.artists.id, homepage.featuredArtistId as string));
        featuredArtist = artists[0] || null;
      }

      if (homepage.featuredMerchId) {
        const merches = await app.db
          .select()
          .from(schema.merchItems)
          .where(eq(schema.merchItems.id, homepage.featuredMerchId as string));
        featuredMerch = merches[0] || null;
      }

      app.logger.info('Homepage content updated successfully');
      return {
        heroBannerUrl: homepage.heroBannerUrl,
        featuredArtist,
        featuredMerch,
        latestReleaseTitle: homepage.latestReleaseTitle,
        latestReleaseUrl: homepage.latestReleaseUrl,
      };
    } catch (error) {
      app.logger.error({ err: error, body: request.body }, 'Failed to update homepage content');
      throw error;
    }
  });

  // ADMIN: Update about content
  fastify.put('/api/admin/about', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ body: request.body }, 'Updating about content');

    const admin = await requireAdmin(app, request, reply);
    if (!admin) return;

    const { logo_url, description, mission, contact_email, contact_phone, instagram_url, twitter_url, facebook_url } =
      request.body as any;

    try {
      // Get or create about content
      const abouts = await app.db.select().from(schema.aboutContent);
      let about = abouts[0];

      if (!about) {
        const created = await app.db
          .insert(schema.aboutContent)
          .values({
            id: uuidv4() as any,
            logoUrl: logo_url || null,
            description: description || null,
            mission: mission || null,
            contactEmail: contact_email || null,
            contactPhone: contact_phone || null,
            instagramUrl: instagram_url || null,
            twitterUrl: twitter_url || null,
            facebookUrl: facebook_url || null,
            updatedAt: new Date(),
          })
          .returning();
        about = created[0];
        app.logger.info('About content created');
      } else {
        const updated = await app.db
          .update(schema.aboutContent)
          .set({
            logoUrl: logo_url !== undefined ? logo_url : about.logoUrl,
            description: description !== undefined ? description : about.description,
            mission: mission !== undefined ? mission : about.mission,
            contactEmail: contact_email !== undefined ? contact_email : about.contactEmail,
            contactPhone: contact_phone !== undefined ? contact_phone : about.contactPhone,
            instagramUrl: instagram_url !== undefined ? instagram_url : about.instagramUrl,
            twitterUrl: twitter_url !== undefined ? twitter_url : about.twitterUrl,
            facebookUrl: facebook_url !== undefined ? facebook_url : about.facebookUrl,
            updatedAt: new Date(),
          })
          .where(eq(schema.aboutContent.id, about.id as string))
          .returning();
        about = updated[0];
        app.logger.info('About content updated');
      }

      app.logger.info('About content updated successfully');
      return about;
    } catch (error) {
      app.logger.error({ err: error, body: request.body }, 'Failed to update about content');
      throw error;
    }
  });
}
