import { createApplication } from '@specific-dev/framework';
import * as appSchema from './schema.js';
import * as authSchema from './auth-schema.js';
import { eq } from 'drizzle-orm';

const schema = { ...appSchema, ...authSchema };

async function seedArtists() {
  const app = await createApplication(schema);

  try {
    console.log('Starting artists seed...');

    const artists = [
      {
        name: 'Afroman',
        bio: 'Grammy-nominated recording artist Afroman is a legendary voice in hip-hop whose influence spans generations. Best known for his worldwide smash hit "Because I Got High," & "Crazy Rap". Afroman earned global recognition and a Grammy nomination, cementing his place as one of the most recognizable and authentic artists in the culture. His music blends humor, truth, and real-life storytelling, creating timeless records that continue to resonate with fans across the world. Born Joseph Edgar Foreman in Hattiesburg, Mississippi, by the way of Los Angeles, California, Afroman built his career independently, proving that authenticity and consistency can break barriers in the music industry. His laid-back delivery, signature sound, and unapologetic honesty helped define an era of hip-hop while inspiring countless independent artists to follow their own path. Today, Afroman continues to perform internationally, release new music, and expand his legacy as a pioneer, entrepreneur, and cultural icon. His dedication to his craft and his fans has solidified his status as a respected legend whose impact on hip-hop remains undeniable.',
        specialties: JSON.stringify(['Recording Artist', 'Songwriter', 'Performer', 'Cultural Icon']),
        status: 'Active',
        label: 'Hungry Hustler Records',
      },
      {
        name: 'OG Daddy V',
        bio: 'OG Daddy V is an emerging hip-hop artist representing authenticity, resilience, and the true spirit of independent hustle. Known for his raw lyricism and commanding presence, OG Daddy V delivers music rooted life experiences, street wisdom, and personal growth. His sound reflects both struggle and success, connecting with listeners who value truth, loyalty, and perseverance. With a growing fanbase and a strong independent foundation, OG Daddy V continues to build his brand through consistent releases, live performances, and community engagement. His dedication to his craft and his message has positioned him as a respected voice and rising force in modern hip-hop. As he continues to evolve as an artist, OG Daddy V represents more than music, he represents vision, leadership, and the relentless drive to succeed. His journey reflects the core values of Hungry Hustler Records: independence, authenticity, and legacy.',
        specialties: JSON.stringify(['Recording Artist', 'Songwriter', 'Performer']),
        status: 'Active',
        label: 'Hungry Hustler Records',
      },
    ];

    for (const artistData of artists) {
      // Check if artist already exists
      const existingArtists = await app.db
        .select()
        .from(appSchema.artists)
        .where(eq(appSchema.artists.name, artistData.name));

      if (existingArtists.length > 0) {
        console.log(`Artist ${artistData.name} already exists`);
        // Update existing artist
        await app.db
          .update(appSchema.artists)
          .set({
            bio: artistData.bio,
            specialties: artistData.specialties,
            status: artistData.status,
            label: artistData.label,
            updatedAt: new Date(),
          })
          .where(eq(appSchema.artists.name, artistData.name));
        console.log(`Updated artist: ${artistData.name}`);
      } else {
        // Create new artist
        await app.db.insert(appSchema.artists).values({
          id: `artist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: artistData.name,
          bio: artistData.bio,
          photoUrl: null,
          spotifyUrl: null,
          appleMusicUrl: null,
          youtubeUrl: null,
          soundcloudUrl: null,
          instagramUrl: null,
          twitterUrl: null,
          specialties: artistData.specialties,
          status: artistData.status,
          label: artistData.label,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`Created artist: ${artistData.name}`);
      }
    }

    console.log('Artists seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seedArtists();
