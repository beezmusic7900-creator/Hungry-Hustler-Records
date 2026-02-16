
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
    console.log('HomeScreen: Fetching homepage content');
    fetchHomepageContent();
  }, []);

  const fetchHomepageContent = async () => {
    try {
      setLoading(true);
      console.log('[HomeScreen] Fetching homepage content from /api/homepage');
      
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<HomepageContent>('/api/homepage');
      
      console.log('[HomeScreen] Homepage content received:', data);
      setContent(data);
    } catch (error) {
      console.error('[HomeScreen] Error fetching homepage content:', error);
      // Set empty content on error
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Logo Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>HUNGRY HUSTLER</Text>
          <Text style={styles.logoSubtitle}>RECORDS</Text>
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
              colors={['transparent', colors.background]}
              style={styles.heroBannerGradient}
            />
          </View>
        )}

        {/* Featured Artist */}
        {content?.featured_artist && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEATURED ARTIST</Text>
            <View style={commonStyles.card}>
              {content.featured_artist.photo_url && (
                <Image
                  source={resolveImageSource(content.featured_artist.photo_url)}
                  style={styles.artistImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.artistName}>{content.featured_artist.name}</Text>
              {content.featured_artist.bio && (
                <Text style={styles.artistBio}>{content.featured_artist.bio}</Text>
              )}
            </View>
          </View>
        )}

        {/* Latest Release */}
        {content?.latest_release_title && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LATEST RELEASE</Text>
            <TouchableOpacity
              style={[commonStyles.card, styles.releaseCard]}
              onPress={() => handleOpenLink(content.latest_release_url)}
            >
              <IconSymbol
                ios_icon_name="music.note"
                android_material_icon_name="music-note"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.releaseTitle}>{content.latest_release_title}</Text>
              <Text style={styles.releaseSubtitle}>Tap to listen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Featured Merch */}
        {content?.featured_merch && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEATURED MERCH</Text>
            <View style={commonStyles.card}>
              {content.featured_merch.image_url && (
                <Image
                  source={resolveImageSource(content.featured_merch.image_url)}
                  style={styles.merchImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.merchName}>{content.featured_merch.name}</Text>
              <Text style={styles.merchPrice}>${content.featured_merch.price.toFixed(2)}</Text>
            </View>
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
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 4,
    marginTop: 4,
  },
  heroBanner: {
    height: 200,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
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
    height: 100,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  artistImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  artistName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  artistBio: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  releaseCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  releaseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  releaseSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  merchImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  merchName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  merchPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  bottomPadding: {
    height: 100,
  },
});
