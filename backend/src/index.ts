import { createApplication } from "@specific-dev/framework";
import * as authSchema from './db/schema/auth-schema.js';
import { supabase } from './db/supabase.js';
import { registerArtistsRoutes } from './routes/artists.js';
import { registerMerchRoutes } from './routes/merch.js';
import { registerHomeRoutes } from './routes/home.js';
import { registerAboutRoutes } from './routes/about.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAppleMusicRoutes } from './routes/appleMusic.js';

const schema = { ...authSchema };

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
registerAppleMusicRoutes(app);

async function ensureTables(logger: any) {
  const sql = `
    CREATE TABLE IF NOT EXISTS artists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      bio text,
      photo_url text,
      spotify_url text,
      apple_music_url text,
      youtube_url text,
      soundcloud_url text,
      instagram_url text,
      twitter_url text,
      facebook_url text,
      tiktok_url text,
      video_urls text[],
      display_order integer DEFAULT 0,
      is_featured boolean DEFAULT false,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS merch_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      price numeric(10,2) NOT NULL,
      image_url text,
      category text,
      in_stock boolean DEFAULT true,
      checkout_url text,
      display_order integer DEFAULT 0,
      is_featured boolean DEFAULT false,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS home_content (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      hero_banner_url text,
      hero_title text,
      hero_subtitle text,
      featured_artist_id uuid,
      latest_release_title text,
      latest_release_artist text,
      latest_release_image_url text,
      latest_release_spotify_url text,
      latest_release_apple_music_url text,
      latest_release_youtube_url text,
      latest_release_soundcloud_url text,
      featured_merch_ids text[],
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS about_content (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      logo_url text,
      description text,
      mission text,
      contact_email text,
      contact_phone text,
      contact_address text,
      instagram_url text,
      twitter_url text,
      facebook_url text,
      youtube_url text,
      tiktok_url text,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
  `;
  try {
    const res = await fetch('https://egmaxjskylfepliwaeme.supabase.co/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });
    if (!res.ok) {
      logger.warn('ensureTables: exec_sql RPC not available, assuming tables exist');
    } else {
      logger.info('ensureTables: tables ensured');
    }
  } catch (e) {
    logger.warn({ err: e }, 'ensureTables: failed, assuming tables exist');
  }
}

async function seedData() {
  try {
    // Seed admin user
    const existingUser = await app.db.query.user.findFirst({
      where: (user: any, { eq }: any) => eq(user.email, 'admin@hungryhustlerrecords.com'),
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

    // Seed Afroman
    const { data: afromanExists } = await supabase.from('artists').select('id').eq('name', 'Afroman').single();

    let afromanId: string;
    let teeId: string = '';
    let capId: string = '';

    if (!afromanExists) {
      app.logger.info('Seeding artists');
      const { data: afromanResult } = await supabase.from('artists').insert({
        name: 'Afroman',
        bio: 'Grammy-nominated recording artist Afroman is a legendary voice in hip-hop whose influence spans generations. Best known for his worldwide smash hit "Because I Got High," & "Crazy Rap". Afroman earned global recognition and a Grammy nomination, cementing his place as one of the most recognizable and authentic artists in the culture. His music blends humor, truth, and real-life storytelling, creating timeless records that continue to resonate with fans across the world. Born Joseph Edgar Foreman in Hattiesburg, Mississippi, by the way of Los Angeles, California, Afroman built his career independently, proving that authenticity and consistency can break barriers in the music industry. His laid-back delivery, signature sound, and unapologetic honesty helped define an era of hip-hop while inspiring countless independent artists to follow their own path. Today, Afroman continues to perform internationally, release new music, and expand his legacy as a pioneer, entrepreneur, and cultural icon. His dedication to his craft and his fans has solidified his status as a respected legend whose impact on hip-hop remains undeniable.',
        photo_url: 'https://picsum.photos/seed/afroman/400/400',
        spotify_url: 'https://open.spotify.com/artist/0z4gvV4rjIZ7R289VMsTd4',
        youtube_url: 'https://www.youtube.com/c/AfromanOfficial',
        is_featured: true,
        display_order: 1,
      }).select('id').single();

      afromanId = afromanResult?.id || '';
      app.logger.info({ afromanId }, 'Afroman seeded');

      // Seed merch
      app.logger.info('Seeding merch items');
      const { data: teeResult } = await supabase.from('merch_items').insert({
        name: 'HHR Logo Tee',
        price: '35.00',
        description: 'Premium black tee featuring the iconic Hungry Hustler Records logo in neon green. 100% cotton, available in all sizes.',
        image_url: 'https://picsum.photos/seed/hhrtee/400/400',
        category: 'Apparel',
        is_featured: true,
        display_order: 1,
      }).select('id').single();

      const { data: capResult } = await supabase.from('merch_items').insert({
        name: 'HHR Snapback Cap',
        price: '45.00',
        description: 'Structured snapback cap with embroidered HHR logo. One size fits all.',
        image_url: 'https://picsum.photos/seed/hhrcap/400/400',
        category: 'Accessories',
        is_featured: true,
        display_order: 2,
      }).select('id').single();

      await supabase.from('merch_items').insert({
        name: 'HHR Hoodie',
        price: '75.00',
        description: 'Heavyweight pullover hoodie with Hungry Hustler Records branding. Perfect for the streets.',
        image_url: 'https://picsum.photos/seed/hhrhoodie/400/400',
        category: 'Apparel',
        display_order: 3,
      });

      teeId = teeResult?.id || '';
      capId = capResult?.id || '';
      app.logger.info({ merchCount: 3 }, 'Merch items seeded');
    } else {
      app.logger.info('Afroman already exists');
      afromanId = afromanExists.id;
      const { data: tee } = await supabase.from('merch_items').select('id').eq('name', 'HHR Logo Tee').single();
      const { data: cap } = await supabase.from('merch_items').select('id').eq('name', 'HHR Snapback Cap').single();
      teeId = tee?.id || '';
      capId = cap?.id || '';
    }

    // Upsert home content
    app.logger.info('Upserting home content');
    const { data: homeRow } = await supabase.from('home_content').select('id').limit(1).single();
    if (homeRow) {
      await supabase.from('home_content').update({
        hero_title: 'Welcome to Hungry Hustler Records',
        hero_subtitle: 'The home of independent excellence, authentic music, and powerful artists.',
        updated_at: new Date().toISOString(),
      }).eq('id', homeRow.id);
      app.logger.info('Home content updated');
    } else {
      await supabase.from('home_content').insert({
        hero_title: 'Welcome to Hungry Hustler Records',
        hero_subtitle: 'The home of independent excellence, authentic music, and powerful artists.',
        hero_banner_url: 'https://picsum.photos/seed/hhrbanner/800/400',
        featured_artist_id: afromanId || null,
        latest_release_title: 'Because I Got High (Remastered)',
        latest_release_artist: 'Afroman',
        latest_release_image_url: 'https://picsum.photos/seed/afromanrelease/400/400',
        latest_release_spotify_url: 'https://open.spotify.com/track/0z4gvV4rjIZ7R289VMsTd4',
        featured_merch_ids: [teeId, capId].filter(Boolean),
      });
      app.logger.info('Home content created');
    }

    // Upsert about content
    app.logger.info('Upserting about content');
    const { data: aboutRow } = await supabase.from('about_content').select('id').limit(1).single();
    const aboutData = {
      description: 'Hungry Hustler Records is an independent record label built on vision, ownership, and the relentless pursuit of success. Founded with the mission to empower artists and create opportunities without limitations, Hungry Hustler Records stands as a platform for authentic voices and real stories. The label represents the spirit of independence—where talent, hard work, and dedication come before everything else.\n\nCreated by the great mind of Afroman. Hungry Hustler Records is more than a label—it is a movement and a brand dedicated to building legacy. With a focus on artist development, music production, branding, and distribution, the label provides artists with the tools and support needed to grow creatively and professionally while maintaining ownership of their identity and sound.\n\nHungry Hustler Records represents both established legends and rising talent, bridging generations of hip-hop and bringing authentic music to global audiences. Every artist under the label represents the core values of hunger, hustle, loyalty, and independence.',
      mission: 'The mission is simple: build powerful artists, create timeless music, and establish a legacy that lasts forever.',
      contact_email: 'info@hungryhustlerrecords.com',
      instagram_url: 'https://instagram.com/hungryhustlerrecords',
      twitter_url: 'https://twitter.com/hungryhustlerrec',
      youtube_url: 'https://youtube.com/hungryhustlerrecords',
    };
    if (aboutRow) {
      await supabase.from('about_content').update({ ...aboutData, updated_at: new Date().toISOString() }).eq('id', aboutRow.id);
      app.logger.info('About content updated');
    } else {
      await supabase.from('about_content').insert(aboutData);
      app.logger.info('About content created');
    }

    // Seed / update OG Daddy V
    const OG_DADDY_V_BIO = 'OG Daddy V is an emerging hip-hop artist representing authenticity, resilience, and the true spirit of independent hustle. Known for his raw lyricism and commanding presence, OG Daddy V delivers music rooted in life experiences, street wisdom, and personal growth. His sound reflects both struggle and success, connecting with listeners who value truth, loyalty, and perseverance. With a growing fanbase and a strong independent foundation, OG Daddy V continues to build his brand through consistent releases, live performances, and community engagement. His dedication to his craft and his message has positioned him as a respected voice and rising force in modern hip-hop. As he continues to evolve as an artist, OG Daddy V represents more than music — he represents vision, leadership, and the relentless drive to succeed. His journey reflects the core values of Hungry Hustler Records: independence, authenticity, and legacy.';

    const { data: ogDaddyVExists } = await supabase.from('artists').select('id').eq('name', 'OG Daddy V').single();
    if (!ogDaddyVExists) {
      app.logger.info('Creating OG Daddy V artist');
      await supabase.from('artists').insert({
        name: 'OG Daddy V',
        bio: OG_DADDY_V_BIO,
        photo_url: 'https://picsum.photos/seed/ogdaddyv/400/400',
        is_featured: true,
        display_order: 2,
      });
      app.logger.info('OG Daddy V artist created');
    } else {
      app.logger.info('Updating OG Daddy V bio');
      await supabase.from('artists').update({ bio: OG_DADDY_V_BIO, updated_at: new Date().toISOString() }).eq('id', ogDaddyVExists.id);
      app.logger.info('OG Daddy V bio updated');
    }
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to seed data');
  }
}

await ensureTables(app.logger);
await seedData();
await app.run();
app.logger.info('Application running');
