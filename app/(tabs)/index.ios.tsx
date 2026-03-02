
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

interface HomepageContent {
  hero_banner_url?: string;
  featured_artist?: {
    id: string;
    name: string;
    photo_url?: string;
    bio?: string;
  };
  featured_merch?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
  };
  latest_release_title?: string;
  latest_release_url?: string;
}

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<HomepageContent | null>(null);

  useEffect(() => {
    console.log('HomeScreen (iOS): Fetching homepage content');
    fetchHomepageContent();
  }, []);

  const fetchHomepageContent = async () => {
    try {
      setLoading(true);
      console.log('[HomeScreen iOS] Fetching homepage content from /api/homepage');
      
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<HomepageContent>('/api/homepage');
      
      console.log('[HomeScreen iOS] Homepage content received:', data);
      setContent(data);
    } catch (error) {
      console.error('[HomeScreen iOS] Error fetching homepage content:', error);
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url: string | undefined) => {
    if (!url) return;
    console.log('HomeScreen (iOS): Opening link:', url);
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Official Logo Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/3b5745fe-e173-4118-9832-7f94f05f0173.jpeg')}
            style={styles.officialLogo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>INDEPENDENT • AUTHENTIC • LEGENDARY</Text>
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

        {/* Featured Artist */}
        {content?.featured_artist && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>FEATURED ARTIST</Text>
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

        {/* Latest Release */}
        {content?.latest_release_title && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>LATEST RELEASE</Text>
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

        {/* Featured Merch */}
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
            <TouchableOpacity style={styles.ctaButton}>
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera"
                size={20}
                color={colors.background}
              />
              <Text style={styles.ctaButtonText}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaButton}>
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
});
