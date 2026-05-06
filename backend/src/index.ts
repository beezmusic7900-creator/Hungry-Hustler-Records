import { createApplication } from "@specific-dev/framework";
import { eq } from 'drizzle-orm';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { registerArtistsRoutes } from './routes/artists.js';
import { registerMerchRoutes } from './routes/merch.js';
import { registerHomeRoutes } from './routes/home.js';
import { registerAboutRoutes } from './routes/about.js';
import { registerAdminRoutes } from './routes/admin.js';

const schema = { ...appSchema, ...authSchema };

export const app = await createApplication(schema);
export type App = typeof app;

app.withAuth();
app.withStorage();

// Register routes
registerArtistsRoutes(app);
registerMerchRoutes(app);
registerHomeRoutes(app);
registerAboutRoutes(app);
registerAdminRoutes(app);

// Seed initial data
async function seedData() {
  try {
    // Seed admin user
    const existingUser = await app.db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, 'admin@hungryhustlerrecords.com'),
    });

    if (!existingUser) {
      app.logger.info('Creating admin user');
      await app.auth.api.signUpEmail({
        body: {
          email: 'admin@hungryhustlerrecords.com',
          password: 'HHR_Admin2024!',
          name: 'Admin',
        },
      });
      app.logger.info('Admin user created successfully');
    } else {
      app.logger.info('Admin user already exists');
    }

    // Seed artists - only insert if Afroman doesn't exist
    const afromanExists = await app.db.query.artists.findFirst({
      where: (artists, { eq }) => eq(artists.name, 'Afroman'),
    });

    let afromanId: string;
    let teeId: string;
    let capId: string;

    if (!afromanExists) {
      app.logger.info('Seeding artists');
      const afromanResult = await app.db.insert(appSchema.artists).values({
        name: 'Afroman',
        bio: 'Grammy-nominated recording artist Afroman is a legendary voice in hip-hop whose influence spans generations. Best known for his worldwide smash hit "Because I Got High," & "Crazy Rap". Afroman earned global recognition and a Grammy nomination, cementing his place as one of the most recognizable and authentic artists in the culture. His music blends humor, truth, and real-life storytelling, creating timeless records that continue to resonate with fans across the world. Born Joseph Edgar Foreman in Hattiesburg, Mississippi, by the way of Los Angeles, California, Afroman built his career independently, proving that authenticity and consistency can break barriers in the music industry. His laid-back delivery, signature sound, and unapologetic honesty helped define an era of hip-hop while inspiring countless independent artists to follow their own path. Today, Afroman continues to perform internationally, release new music, and expand his legacy as a pioneer, entrepreneur, and cultural icon. His dedication to his craft and his fans has solidified his status as a respected legend whose impact on hip-hop remains undeniable.',
        photo_url: 'https://picsum.photos/seed/afroman/400/400',
        spotify_url: 'https://open.spotify.com/artist/0z4gvV4rjIZ7R289VMsTd4',
        youtube_url: 'https://www.youtube.com/c/AfromanOfficial',
        is_featured: true,
        display_order: 1,
      }).returning();

      const hhartistResult = await app.db.insert(appSchema.artists).values({
        name: 'Hungry Hustler Artist',
        bio: 'An emerging force in the hip-hop scene, this artist brings raw energy and authentic storytelling to every track. Signed to Hungry Hustler Records, they represent the next generation of independent hip-hop.',
        photo_url: 'https://picsum.photos/seed/hhartist/400/400',
        display_order: 2,
      }).returning();

      afromanId = afromanResult[0].id;
      app.logger.info({ afromanId }, 'Artists seeded');

      // Seed merch items
      app.logger.info('Seeding merch items');
      const teeResult = await app.db.insert(appSchema.merch_items).values({
        name: 'HHR Logo Tee',
        price: '35.00',
        description: 'Premium black tee featuring the iconic Hungry Hustler Records logo in neon green. 100% cotton, available in all sizes.',
        image_url: 'https://picsum.photos/seed/hhrtee/400/400',
        category: 'Apparel',
        is_featured: true,
        display_order: 1,
      }).returning();

      const capResult = await app.db.insert(appSchema.merch_items).values({
        name: 'HHR Snapback Cap',
        price: '45.00',
        description: 'Structured snapback cap with embroidered HHR logo. One size fits all.',
        image_url: 'https://picsum.photos/seed/hhrcap/400/400',
        category: 'Accessories',
        is_featured: true,
        display_order: 2,
      }).returning();

      const hoodieResult = await app.db.insert(appSchema.merch_items).values({
        name: 'HHR Hoodie',
        price: '75.00',
        description: 'Heavyweight pullover hoodie with Hungry Hustler Records branding. Perfect for the streets.',
        image_url: 'https://picsum.photos/seed/hhrhoodie/400/400',
        category: 'Apparel',
        display_order: 3,
      }).returning();

      teeId = teeResult[0].id;
      capId = capResult[0].id;
      app.logger.info({ merchCount: 3 }, 'Merch items seeded');
    } else {
      app.logger.info('Afroman artist already exists');
      afromanId = afromanExists.id;
      // Get existing merch IDs
      const tee = await app.db.query.merch_items.findFirst({
        where: (merch, { eq }) => eq(merch.name, 'HHR Logo Tee'),
      });
      const cap = await app.db.query.merch_items.findFirst({
        where: (merch, { eq }) => eq(merch.name, 'HHR Snapback Cap'),
      });
      teeId = tee?.id || '';
      capId = cap?.id || '';
    }

    // Upsert home content
    app.logger.info('Upserting home content');
    const homeRows = await app.db.select().from(appSchema.home_content).limit(1);
    const homeContent = homeRows[0];

    if (homeContent) {
      await app.db.update(appSchema.home_content).set({
        hero_title: 'Welcome to Hungry Hustler Records',
        hero_subtitle: 'The home of independent excellence, authentic music, and powerful artists.',
        updated_at: new Date(),
      }).where(eq(appSchema.home_content.id, homeContent.id));
      app.logger.info('Home content updated');
    } else {
      await app.db.insert(appSchema.home_content).values({
        hero_title: 'Welcome to Hungry Hustler Records',
        hero_subtitle: 'The home of independent excellence, authentic music, and powerful artists.',
        hero_banner_url: 'https://picsum.photos/seed/hhrbanner/800/400',
        featured_artist_id: afromanId,
        latest_release_title: 'Because I Got High (Remastered)',
        latest_release_artist: 'Afroman',
        latest_release_image_url: 'https://picsum.photos/seed/afromanrelease/400/400',
        latest_release_spotify_url: 'https://open.spotify.com/track/0z4gvV4rjIZ7R289VMsTd4',
        featured_merch_ids: [teeId, capId],
      }).returning();
      app.logger.info('Home content created');
    }

    // Upsert about content
    app.logger.info('Upserting about content');
    const aboutRows = await app.db.select().from(appSchema.about_content).limit(1);
    const aboutContent = aboutRows[0];

    if (aboutContent) {
      await app.db.update(appSchema.about_content).set({
        description: 'Hungry Hustler Records is an independent record label built on vision, ownership, and the relentless pursuit of success. Founded with the mission to empower artists and create opportunities without limitations, Hungry Hustler Records stands as a platform for authentic voices and real stories. The label represents the spirit of independence—where talent, hard work, and dedication come before everything else.\n\nCreated by the great mind of Afroman. Hungry Hustler Records is more than a label—it is a movement and a brand dedicated to building legacy. With a focus on artist development, music production, branding, and distribution, the label provides artists with the tools and support needed to grow creatively and professionally while maintaining ownership of their identity and sound.\n\nHungry Hustler Records represents both established legends and rising talent, bridging generations of hip-hop and bringing authentic music to global audiences. Every artist under the label represents the core values of hunger, hustle, loyalty, and independence.',
        mission: 'The mission is simple: build powerful artists, create timeless music, and establish a legacy that lasts forever.',
        updated_at: new Date(),
      }).where(eq(appSchema.about_content.id, aboutContent.id));
      app.logger.info('About content updated');
    } else {
      await app.db.insert(appSchema.about_content).values({
        description: 'Hungry Hustler Records is an independent record label built on vision, ownership, and the relentless pursuit of success. Founded with the mission to empower artists and create opportunities without limitations, Hungry Hustler Records stands as a platform for authentic voices and real stories. The label represents the spirit of independence—where talent, hard work, and dedication come before everything else.\n\nCreated by the great mind of Afroman. Hungry Hustler Records is more than a label—it is a movement and a brand dedicated to building legacy. With a focus on artist development, music production, branding, and distribution, the label provides artists with the tools and support needed to grow creatively and professionally while maintaining ownership of their identity and sound.\n\nHungry Hustler Records represents both established legends and rising talent, bridging generations of hip-hop and bringing authentic music to global audiences. Every artist under the label represents the core values of hunger, hustle, loyalty, and independence.',
        mission: 'The mission is simple: build powerful artists, create timeless music, and establish a legacy that lasts forever.',
        contact_email: 'info@hungryhustlerrecords.com',
        instagram_url: 'https://instagram.com/hungryhustlerrecords',
        twitter_url: 'https://twitter.com/hungryhustlerrec',
        youtube_url: 'https://youtube.com/hungryhustlerrecords',
      }).returning();
      app.logger.info('About content created');
    }

    // Seed OG Daddy V artist if not exists
    const ogDaddyVExists = await app.db.query.artists.findFirst({
      where: (artists, { eq }) => eq(artists.name, 'OG Daddy V'),
    });

    if (!ogDaddyVExists) {
      app.logger.info('Creating OG Daddy V artist');
      await app.db.insert(appSchema.artists).values({
        name: 'OG Daddy V',
        bio: 'Experience authentic music and follow the journey.',
        is_featured: true,
        display_order: 2,
      }).returning();
      app.logger.info('OG Daddy V artist created');
    } else {
      app.logger.info('OG Daddy V artist already exists');
    }
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to seed data');
  }
}

await seedData();
await app.run();
app.logger.info('Application running');
