import { createApplication } from "@specific-dev/framework";
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

    // Seed artists
    const existingArtists = await app.db.select().from(appSchema.artists).limit(1);
    if (existingArtists.length === 0) {
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

      app.logger.info({ afromanId: afromanResult[0].id }, 'Artists seeded');

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

      app.logger.info({ merchCount: 3 }, 'Merch items seeded');

      // Seed home content
      app.logger.info('Seeding home content');
      await app.db.insert(appSchema.home_content).values({
        hero_title: 'Hungry Hustler Records',
        hero_subtitle: 'Where Authentic Hip-Hop Lives',
        hero_banner_url: 'https://picsum.photos/seed/hhrbanner/800/400',
        featured_artist_id: afromanResult[0].id,
        latest_release_title: 'Because I Got High (Remastered)',
        latest_release_artist: 'Afroman',
        latest_release_image_url: 'https://picsum.photos/seed/afromanrelease/400/400',
        latest_release_spotify_url: 'https://open.spotify.com/track/0z4gvV4rjIZ7R289VMsTd4',
        featured_merch_ids: [teeResult[0].id, capResult[0].id],
      }).returning();

      app.logger.info('Home content seeded');

      // Seed about content
      app.logger.info('Seeding about content');
      await app.db.insert(appSchema.about_content).values({
        description: 'Hungry Hustler Records is an independent hip-hop label dedicated to authentic artistry, real storytelling, and building a legacy in the culture. We represent artists who hustle hard and stay true to their craft.',
        mission: 'Our mission is to amplify authentic voices in hip-hop, provide artists with the platform and resources they need to succeed, and build a brand that stands for integrity, creativity, and hustle.',
        contact_email: 'info@hungryhustlerrecords.com',
        instagram_url: 'https://instagram.com/hungryhustlerrecords',
        twitter_url: 'https://twitter.com/hungryhustlerrec',
        youtube_url: 'https://youtube.com/hungryhustlerrecords',
      }).returning();

      app.logger.info('About content seeded');
    } else {
      app.logger.info('Seed data already exists');
    }
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to seed data');
  }
}

await seedData();
await app.run();
app.logger.info('Application running');
