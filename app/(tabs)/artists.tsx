
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

interface Artist {
  id: string;
  name: string;
  bio?: string;
  // Support both camelCase (from backend mapping) and snake_case
  photo_url?: string;
  photoUrl?: string;
  spotify_url?: string;
  spotifyUrl?: string;
  apple_music_url?: string;
  appleMusicUrl?: string;
  youtube_url?: string;
  youtubeUrl?: string;
  soundcloud_url?: string;
  soundcloudUrl?: string;
  instagram_url?: string;
  instagramUrl?: string;
  twitter_url?: string;
  twitterUrl?: string;
  // New fields added via migration
  specialties?: string[] | string | null;
  status?: string | null;
  label?: string | null;
}

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function ArtistsScreen() {
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    console.log('ArtistsScreen: Fetching artists');
    fetchArtists();
  }, []);

  const parseSpecialties = (specialties: string[] | string | null | undefined): string[] => {
    if (!specialties) return [];
    if (Array.isArray(specialties)) return specialties;
    try {
      const parsed = JSON.parse(specialties);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If it's a plain string, treat as single specialty
      return specialties ? [specialties] : [];
    }
  };

  const normalizeArtist = (artist: any): Artist => ({
    id: artist.id,
    name: artist.name,
    bio: artist.bio,
    // Normalize URL fields - backend may return camelCase or snake_case
    photo_url: artist.photo_url || artist.photoUrl,
    spotify_url: artist.spotify_url || artist.spotifyUrl,
    apple_music_url: artist.apple_music_url || artist.appleMusicUrl,
    youtube_url: artist.youtube_url || artist.youtubeUrl,
    soundcloud_url: artist.soundcloud_url || artist.soundcloudUrl,
    instagram_url: artist.instagram_url || artist.instagramUrl,
    twitter_url: artist.twitter_url || artist.twitterUrl,
    // New fields
    specialties: parseSpecialties(artist.specialties),
    status: artist.status || 'Active',
    label: artist.label || 'Hungry Hustler Records',
  });

  const AFROMAN_LOCAL: Artist = {
    id: 'afroman-local',
    name: 'Afroman',
    bio: 'Afroman is a legendary voice in hip-hop whose influence spans generations. Best known for his worldwide smash hit "Because I Got High," & "Crazy Rap". Afroman earned global recognition and a Grammy nomination, cementing his place as one of the most recognizable and authentic artists in the culture. His music blends humor, truth, and real-life storytelling, creating timeless records that continue to resonate with fans across the world. Born Joseph Edgar Foreman in Hattiesburg, Mississippi, by the way of Los Angeles, California, Afroman built his career independently, proving that authenticity and consistency can break barriers in the music industry. His laid-back delivery, signature sound, and unapologetic honesty helped define an era of hip-hop while inspiring countless independent artists to follow their own path. Today, Afroman continues to perform internationally, release new music, and expand his legacy as a pioneer, entrepreneur, and cultural icon. His dedication to his craft and his fans has solidified his status as a respected legend whose impact on hip-hop remains undeniable.',
    photo_url: undefined,
    status: 'Active',
    label: 'Hungry Hustler Records',
    specialties: [],
  };

  const AFROMAN_IMAGE = require('@/assets/images/642808ff-ffcc-4ee4-9821-35212f99ca16.jpeg');

  const OG_DADDY_V_LOCAL: Artist = {
    id: 'og-daddy-v-local',
    name: 'OG Daddy V',
    bio: 'OG Daddy V is an hip-hop artist representing authenticity, resilience, and the true spirit of independent hustle. Known for his raw lyricism and commanding presence, OG Daddy V delivers music rooted life experiences, street wisdom, and personal growth. His sound reflects both struggle and success, connecting with listeners who value truth, loyalty, and perseverance. With a growing fanbase and a strong independent foundation, OG Daddy V continues to build his brand through consistent releases, live performances, and community engagement. His dedication to his craft and his message has positioned him as a respected voice and rising force in modern hip-hop. As he continues to evolve as an artist, OG Daddy V represents more than music, he represents vision, leadership, and the relentless drive to succeed. His journey reflects the core values of Hungry Hustler Records: independence, authenticity, and legacy.',
    photo_url: undefined,
    status: 'Active',
    label: 'Hungry Hustler Records',
    specialties: [],
  };

  const OG_DADDY_V_IMAGE = require('@/assets/images/aaa383a6-b67a-4440-a35b-8b456595eaff.png');

  const fetchArtists = async () => {
    try {
      setLoading(true);
      console.log('[ArtistsScreen] Fetching artists from /api/artists');
      
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<any[]>('/api/artists');
      
      console.log('[ArtistsScreen] Artists received:', data);
      const normalized = (data || []).map(normalizeArtist);
      // Prepend local artists: Afroman first, then OG Daddy V
      setArtists([AFROMAN_LOCAL, OG_DADDY_V_LOCAL, ...normalized]);
    } catch (error) {
      console.error('[ArtistsScreen] Error fetching artists:', error);
      setArtists([AFROMAN_LOCAL, OG_DADDY_V_LOCAL]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url: string | undefined) => {
    if (!url) return;
    console.log('ArtistsScreen: Opening link:', url);
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 0;

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>OUR ARTISTS</Text>
          <Text style={styles.headerSubtitle}>
            Hungry Hustler Records is home to a diverse roster of talented artists,
          </Text>
          <Text style={styles.headerSubtitle}>
            each bringing their own voice, story, and energy to the culture.
          </Text>
        </View>

        {artists.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="person.3"
              android_material_icon_name="group"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No artists yet</Text>
          </View>
        ) : (
          <View style={styles.artistsList}>
            {artists.map((artist) => {
              const artistName = artist.name;
              const artistBio = artist.bio || '';
              const artistStatus = artist.status || 'Active';
              const artistLabel = artist.label || 'Hungry Hustler Records';
              const specialties = Array.isArray(artist.specialties) ? artist.specialties : [];
              
              const hasSpotify = !!artist.spotify_url;
              const hasAppleMusic = !!artist.apple_music_url;
              const hasYouTube = !!artist.youtube_url;
              const hasSoundCloud = !!artist.soundcloud_url;
              const hasInstagram = !!artist.instagram_url;
              const hasTwitter = !!artist.twitter_url;

              const isActive = artistStatus.toLowerCase() === 'active';

              const listenNowUrl = artist.id === 'afroman-local'
                ? 'https://music.apple.com/us/artist/afroman/88434'
                : artist.id === 'og-daddy-v-local'
                ? 'https://music.apple.com/us/artist/og-daddy-v/382358555'
                : undefined;

              return (
                <View key={artist.id} style={styles.artistCard}>
                  {/* Artist Photo with Gradient Overlay */}
                  {(artist.photo_url || artist.id === 'afroman-local' || artist.id === 'og-daddy-v-local') ? (
                    <View style={styles.artistImageContainer}>
                      <Image
                        source={artist.id === 'afroman-local' ? AFROMAN_IMAGE : artist.id === 'og-daddy-v-local' ? OG_DADDY_V_IMAGE : resolveImageSource(artist.photo_url)}
                        style={styles.artistImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)', colors.background]}
                        style={styles.artistImageGradient}
                      />
                    </View>
                  ) : (
                    <View style={styles.artistImagePlaceholder}>
                      <IconSymbol
                        ios_icon_name="person.circle"
                        android_material_icon_name="account-circle"
                        size={80}
                        color={colors.textTertiary}
                      />
                    </View>
                  )}
                  
                  {/* Artist Info */}
                  <View style={styles.artistInfo}>
                    {/* Name and Status Badge */}
                    <View style={styles.artistHeader}>
                      <Text style={styles.artistName}>{artistName}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: isActive ? colors.primaryGlow : colors.inactive }
                      ]}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: isActive ? colors.primary : colors.textTertiary }
                        ]} />
                        <Text style={[
                          styles.statusText,
                          { color: isActive ? colors.primary : colors.textSecondary }
                        ]}>
                          {artistStatus}
                        </Text>
                      </View>
                    </View>

                    {/* Label */}
                    <Text style={styles.artistLabel}>{artistLabel}</Text>

                    {/* Bio */}
                    {artistBio && (
                      <Text style={styles.artistBio}>{artistBio}</Text>
                    )}

                    {/* Specialties */}
                    {specialties.length > 0 && (
                      <View style={styles.specialtiesSection}>
                        <Text style={styles.specialtiesTitle}>SPECIALTIES</Text>
                        <View style={styles.specialtiesList}>
                          {specialties.map((specialty, index) => {
                            const specialtyText = specialty;
                            return (
                              <View key={index} style={styles.specialtyItem}>
                                <View style={styles.specialtyBullet} />
                                <Text style={styles.specialtyText}>{specialtyText}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                          console.log('ArtistsScreen: Listen Now pressed for', artistName, '- URL:', listenNowUrl);
                          handleOpenLink(listenNowUrl);
                        }}
                      >
                        <IconSymbol
                          ios_icon_name="music.note"
                          android_material_icon_name="music-note"
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.secondaryButtonText}>Listen Now</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Music Platform Links */}
                    {(hasSpotify || hasAppleMusic || hasYouTube || hasSoundCloud) && (
                      <View style={styles.linksSection}>
                        <Text style={styles.linksSectionTitle}>MUSIC PLATFORMS</Text>
                        <View style={styles.linksGrid}>
                          {hasSpotify && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.spotify_url)}
                            >
                              <IconSymbol
                                ios_icon_name="music.note"
                                android_material_icon_name="music-note"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>Spotify</Text>
                            </TouchableOpacity>
                          )}
                          
                          {hasAppleMusic && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.apple_music_url)}
                            >
                              <IconSymbol
                                ios_icon_name="music.note"
                                android_material_icon_name="music-note"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>Apple Music</Text>
                            </TouchableOpacity>
                          )}
                          
                          {hasYouTube && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.youtube_url)}
                            >
                              <IconSymbol
                                ios_icon_name="play.circle"
                                android_material_icon_name="play-arrow"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>YouTube</Text>
                            </TouchableOpacity>
                          )}
                          
                          {hasSoundCloud && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.soundcloud_url)}
                            >
                              <IconSymbol
                                ios_icon_name="waveform"
                                android_material_icon_name="music-note"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>SoundCloud</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Social Links */}
                    {(hasInstagram || hasTwitter) && (
                      <View style={styles.linksSection}>
                        <Text style={styles.linksSectionTitle}>SOCIAL MEDIA</Text>
                        <View style={styles.linksGrid}>
                          {hasInstagram && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.instagram_url)}
                            >
                              <IconSymbol
                                ios_icon_name="camera"
                                android_material_icon_name="camera"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>Instagram</Text>
                            </TouchableOpacity>
                          )}
                          
                          {hasTwitter && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.twitter_url)}
                            >
                              <IconSymbol
                                ios_icon_name="at"
                                android_material_icon_name="alternate-email"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>Twitter</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  artistsList: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  artistCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  artistImageContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  artistImagePlaceholder: {
    width: '100%',
    height: 320,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInfo: {
    padding: 24,
  },
  artistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    flex: 1,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  artistLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  artistBio: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  specialtiesSection: {
    marginBottom: 24,
  },
  specialtiesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  specialtiesList: {
    gap: 8,
  },
  specialtyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specialtyBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  specialtyText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 255, 102, 0.3)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  linksSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  linksSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  platformLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  platformLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  bottomPadding: {
    height: 120,
  },
});
