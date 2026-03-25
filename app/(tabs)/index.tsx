
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

interface HomepageContent {
  hero_banner_url?: string;
  heroBannerUrl?: string;
  featured_artist?: {
    id: string;
    name: string;
    photo_url?: string;
    photoUrl?: string;
    bio?: string;
  };
  featured_merch?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    imageUrl?: string;
  };
  latest_release_title?: string;
  latestReleaseTitle?: string;
  latest_release_url?: string;
  latestReleaseUrl?: string;
}

interface ExclusiveVideo {
  id: string;
  title: string;
  artistId?: string;
  videoUrl?: string;
  video_url?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  isExclusive?: boolean;
  releaseDate?: string;
}

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [exclusiveVideos, setExclusiveVideos] = useState<ExclusiveVideo[]>([]);

  useEffect(() => {
    console.log('HomeScreen: Fetching homepage content and exclusive videos');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { apiGet } = await import('@/utils/api');

      // Fetch homepage content
      console.log('[HomeScreen] Fetching homepage content from /api/homepage');
      const rawData = await apiGet<any>('/api/homepage');
      console.log('[HomeScreen] Homepage content received:', rawData);
      // Normalize camelCase/snake_case fields from API
      const data: HomepageContent = {
        hero_banner_url: rawData?.heroBannerUrl || rawData?.hero_banner_url,
        heroBannerUrl: rawData?.heroBannerUrl || rawData?.hero_banner_url,
        featured_artist: rawData?.featuredArtist || rawData?.featured_artist
          ? {
              id: (rawData?.featuredArtist || rawData?.featured_artist)?.id,
              name: (rawData?.featuredArtist || rawData?.featured_artist)?.name,
              photo_url: (rawData?.featuredArtist || rawData?.featured_artist)?.photoUrl ||
                         (rawData?.featuredArtist || rawData?.featured_artist)?.photo_url,
              bio: (rawData?.featuredArtist || rawData?.featured_artist)?.bio,
            }
          : undefined,
        featured_merch: rawData?.featuredMerch || rawData?.featured_merch
          ? {
              id: (rawData?.featuredMerch || rawData?.featured_merch)?.id,
              name: (rawData?.featuredMerch || rawData?.featured_merch)?.name,
              price: parseFloat((rawData?.featuredMerch || rawData?.featured_merch)?.price) || 0,
              image_url: (rawData?.featuredMerch || rawData?.featured_merch)?.imageUrl ||
                         (rawData?.featuredMerch || rawData?.featured_merch)?.image_url,
            }
          : undefined,
        latest_release_title: rawData?.latestReleaseTitle || rawData?.latest_release_title,
        latest_release_url: rawData?.latestReleaseUrl || rawData?.latest_release_url,
      };
      setContent(data);

      // Fetch exclusive videos for Home tab
      try {
        console.log('[HomeScreen] Fetching exclusive videos from /api/videos/exclusive');
        const videosData = await apiGet<ExclusiveVideo[]>('/api/videos/exclusive');
        console.log('[HomeScreen] Exclusive videos received:', videosData);
        setExclusiveVideos((videosData || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          artistId: v.artistId || v.artist_id,
          videoUrl: v.videoUrl || v.video_url,
          thumbnailUrl: v.thumbnailUrl || v.thumbnail_url,
          isExclusive: v.isExclusive ?? v.is_exclusive ?? true,
          releaseDate: v.releaseDate || v.release_date,
        })));
      } catch (videoError) {
        console.log('[HomeScreen] Could not fetch exclusive videos:', videoError);
        setExclusiveVideos([]);
      }
    } catch (error) {
      console.error('[HomeScreen] Error fetching homepage content:', error);
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchHomepageContent = fetchData;

  const handleOpenLink = (url: string | undefined) => {
    if (!url) return;
    console.log('HomeScreen: Opening link:', url);
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
        {/* Official Logo Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/9b0d68b6-aabc-4c32-904b-7517b29a9c31.png')}
            style={styles.officialLogo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>INDEPENDENT • AUTHENTIC • LEGENDARY</Text>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to Hungry Hustler Records</Text>
          <Text style={styles.welcomeText}>
            Welcome to the official Hungry Hustler Records app — the home of independent excellence, authentic music, and powerful artists. This is your direct connection to the music, artists, and movement behind Hungry Hustler Records.
          </Text>
          <Text style={styles.welcomeText}>
            Discover new releases, watch exclusive videos, explore artist profiles, and stay connected with everything happening inside the label. This platform gives fans exclusive access to music, merch, announcements, and behind-the-scenes content you won&apos;t find anywhere else.
          </Text>
          <Text style={styles.welcomeHighlight}>
            Hungry Hustler Records represents the hustle, the vision, and the future of independent music.
          </Text>
        </View>

        {/* Featured Artists Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>FEATURED ARTISTS</Text>
            </View>
          </View>

          {/* Afroman */}
          <View style={styles.artistCard}>
            <View style={styles.artistHeader}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.artistName}>Afroman</Text>
            </View>
            <Text style={styles.artistDescription}>
              Grammy-nominated artist and hip-hop legend.
            </Text>
          </View>

          {/* OG Daddy V */}
          <View style={styles.artistCard}>
            <View style={styles.artistHeader}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.artistName}>OG Daddy V</Text>
            </View>
            <Text style={styles.artistDescription}>
              Experience authentic music and follow the journey.
            </Text>
          </View>
        </View>

        {/* Latest Releases Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>LATEST RELEASES</Text>
            </View>
          </View>

          <View style={styles.listCard}>
            <View style={styles.listItem}>
              <IconSymbol
                ios_icon_name="music.note"
                android_material_icon_name="music-note"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.listItemText}>New Singles</Text>
            </View>
            <View style={styles.listItem}>
              <IconSymbol
                ios_icon_name="music.note"
                android_material_icon_name="music-note"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.listItemText}>Albums</Text>
            </View>
            <View style={styles.listItem}>
              <IconSymbol
                ios_icon_name="music.note"
                android_material_icon_name="music-note"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.listItemText}>Exclusive Releases</Text>
            </View>
            <View style={styles.listItem}>
              <IconSymbol
                ios_icon_name="music.note"
                android_material_icon_name="music-note"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.listItemText}>Featured Tracks</Text>
            </View>
          </View>
        </View>

        {/* Exclusive Videos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>EXCLUSIVE VIDEOS</Text>
            </View>
          </View>

          {exclusiveVideos.length === 0 ? (
            <View style={styles.infoCard}>
              <IconSymbol
                ios_icon_name="play.rectangle.fill"
                android_material_icon_name="videocam"
                size={40}
                color={colors.primary}
              />
              <Text style={styles.infoCardText}>
                Watch official music videos, behind-the-scenes footage, interviews, and exclusive content from Hungry Hustler Records artists.
              </Text>
            </View>
          ) : (
            <View style={styles.videosGrid}>
              {exclusiveVideos.map((video) => (
                <View key={video.id} style={styles.videoCard}>
                  {video.thumbnailUrl ? (
                    <Image
                      source={resolveImageSource(video.thumbnailUrl)}
                      style={styles.videoThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.videoThumbnailPlaceholder}>
                      <IconSymbol
                        ios_icon_name="play.rectangle.fill"
                        android_material_icon_name="videocam"
                        size={48}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  <View style={styles.videoExclusiveBadge}>
                    <IconSymbol
                      ios_icon_name="star.fill"
                      android_material_icon_name="star"
                      size={10}
                      color={colors.background}
                    />
                    <Text style={styles.videoExclusiveBadgeText}>EXCLUSIVE</Text>
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle}>{video.title}</Text>
                    <TouchableOpacity
                      style={styles.watchButton}
                      onPress={() => {
                        const url = video.videoUrl;
                        if (url) {
                          console.log('[HomeScreen] Opening video:', url);
                          Linking.openURL(url);
                        }
                      }}
                    >
                      <IconSymbol
                        ios_icon_name="play.circle.fill"
                        android_material_icon_name="play-arrow"
                        size={20}
                        color={colors.background}
                      />
                      <Text style={styles.watchButtonText}>Watch Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Merch Store Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>MERCH STORE</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="bag.fill"
              android_material_icon_name="shopping-bag"
              size={40}
              color={colors.primary}
            />
            <Text style={styles.infoCardText}>
              Shop official Hungry Hustler Records merchandise, including apparel, accessories, and exclusive artist merch.
            </Text>
          </View>
        </View>

        {/* Hero Banner */}
        {content?.hero_banner_url && (
          <View style={styles.heroBanner}>
            <Image
              source={resolveImageSource(content.hero_banner_url)}
              style={styles.heroBannerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)', colors.background]}
              style={styles.heroBannerGradient}
            />
            <View style={styles.heroBannerOverlay}>
              <Text style={styles.heroBannerText}>LATEST DROPS</Text>
            </View>
          </View>
        )}

        {/* Featured Artist from API */}
        {content?.featured_artist && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>SPOTLIGHT</Text>
              </View>
            </View>
            
            <View style={styles.featuredArtistCard}>
              {content.featured_artist.photo_url && (
                <View style={styles.featuredArtistImageContainer}>
                  <Image
                    source={resolveImageSource(content.featured_artist.photo_url)}
                    style={styles.featuredArtistImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.featuredArtistGradient}
                  />
                </View>
              )}
              <View style={styles.featuredArtistInfo}>
                <Text style={styles.featuredArtistName}>{content.featured_artist.name}</Text>
                {content.featured_artist.bio && (
                  <Text style={styles.featuredArtistBio} numberOfLines={3}>
                    {content.featured_artist.bio}
                  </Text>
                )}
                <TouchableOpacity style={styles.featuredArtistButton}>
                  <Text style={styles.featuredArtistButtonText}>EXPLORE</Text>
                  <IconSymbol
                    ios_icon_name="arrow.right"
                    android_material_icon_name="arrow-forward"
                    size={16}
                    color={colors.background}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Latest Release from API */}
        {content?.latest_release_title && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>NOW PLAYING</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.releaseCard}
              onPress={() => handleOpenLink(content.latest_release_url)}
            >
              <View style={styles.releaseIconContainer}>
                <IconSymbol
                  ios_icon_name="music.note"
                  android_material_icon_name="music-note"
                  size={40}
                  color={colors.primary}
                />
                <View style={styles.releaseIconGlow} />
              </View>
              <View style={styles.releaseInfo}>
                <Text style={styles.releaseTitle}>{content.latest_release_title}</Text>
                <Text style={styles.releaseSubtitle}>TAP TO LISTEN NOW</Text>
              </View>
              <IconSymbol
                ios_icon_name="play.circle.fill"
                android_material_icon_name="play-arrow"
                size={32}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Featured Merch from API */}
        {content?.featured_merch && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>FEATURED MERCH</Text>
              </View>
            </View>
            
            <View style={styles.merchCard}>
              {content.featured_merch.image_url && (
                <View style={styles.merchImageContainer}>
                  <Image
                    source={resolveImageSource(content.featured_merch.image_url)}
                    style={styles.merchImage}
                    resizeMode="cover"
                  />
                </View>
              )}
              <View style={styles.merchInfo}>
                <Text style={styles.merchName}>{content.featured_merch.name}</Text>
                <View style={styles.merchPriceContainer}>
                  <Text style={styles.merchPrice}>${content.featured_merch.price.toFixed(2)}</Text>
                  <TouchableOpacity style={styles.merchButton}>
                    <Text style={styles.merchButtonText}>SHOP NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Call to Action */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={[colors.primaryGlow, 'transparent']}
            style={styles.ctaGradient}
          />
          <Text style={styles.ctaTitle}>JOIN THE MOVEMENT</Text>
          <Text style={styles.ctaSubtitle}>
            Follow us on social media for exclusive drops, behind-the-scenes content, and more.
          </Text>
          <View style={styles.ctaButtons}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                console.log('[HomeScreen] Opening Instagram');
                Linking.openURL('https://www.instagram.com/hungryhustlerrecords');
              }}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera"
                size={20}
                color={colors.background}
              />
              <Text style={styles.ctaButtonText}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                console.log('[HomeScreen] Opening Twitter/X');
                Linking.openURL('https://www.twitter.com/hungryhustlerrecords');
              }}
            >
              <IconSymbol
                ios_icon_name="at"
                android_material_icon_name="alternate-email"
                size={20}
                color={colors.background}
              />
              <Text style={styles.ctaButtonText}>Twitter</Text>
            </TouchableOpacity>
          </View>
        </View>

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
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    position: 'relative',
  },
  officialLogo: {
    width: 280,
    height: 180,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: 8,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'left',
  },
  welcomeHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  artistCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  artistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  artistName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  artistDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: 36,
  },
  listCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  listItemText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  infoCardText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 16,
  },
  heroBanner: {
    height: 240,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
  },
  heroBannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroBannerOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  heroBannerText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  featuredArtistCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredArtistImageContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  featuredArtistImage: {
    width: '100%',
    height: '100%',
  },
  featuredArtistGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  featuredArtistInfo: {
    padding: 20,
  },
  featuredArtistName: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  featuredArtistBio: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  featuredArtistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: `0px 4px 8px rgba(0, 255, 102, 0.3)`,
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
  featuredArtistButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 1,
  },
  releaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  releaseIconContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseIconGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    backgroundColor: colors.primary,
    opacity: 0.2,
    borderRadius: 32,
  },
  releaseInfo: {
    flex: 1,
  },
  releaseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  releaseSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  merchCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  merchImageContainer: {
    width: '100%',
    height: 200,
  },
  merchImage: {
    width: '100%',
    height: '100%',
  },
  merchInfo: {
    padding: 20,
  },
  merchName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  merchPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  merchPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  merchButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    ...Platform.select({
      web: {
        boxShadow: `0px 4px 8px rgba(0, 255, 102, 0.3)`,
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
  merchButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 1,
  },
  ctaSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 1,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: `0px 4px 8px rgba(0, 255, 102, 0.3)`,
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
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.5,
  },
  bottomPadding: {
    height: 120,
  },
  videosGrid: {
    gap: 16,
  },
  videoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: colors.secondary,
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoExclusiveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },
  videoExclusiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.5,
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
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
  watchButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.5,
  },
});
