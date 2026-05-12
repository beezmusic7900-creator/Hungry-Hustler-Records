import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Animated,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, User, Search } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { HHRLogo } from '@/components/HHRLogo';
import { supabasePublic } from '@/integrations/supabase/client';

interface MerchItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface HomeData {
  id: string;
  hero_banner_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  featured_artist_id: string | null;
  latest_release_title: string | null;
  latest_release_artist: string | null;
  latest_release_image_url: string | null;
  latest_release_spotify_url: string | null;
  latest_release_apple_music_url: string | null;
  latest_release_youtube_url: string | null;
  latest_release_soundcloud_url: string | null;
  featured_merch_ids: string[] | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function MerchPreviewCard({ item }: { item: MerchItem }) {
  const router = useRouter();
  const priceDisplay = `$${Number(item.price).toFixed(2)}`;

  const handlePress = () => {
    console.log(`[Home] Tapped merch preview: ${item.name} (${item.id})`);
    router.push(`/merch-detail/${item.id}`);
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          width: 160,
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
          marginRight: 12,
        }}
      >
        {item.image_url ? (
          <Image
            source={resolveImageSource(item.image_url)}
            style={{ width: 160, height: 160 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 160,
              height: 160,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={40} color={COLORS.textTertiary} />
          </View>
        )}
        <View style={{ padding: 12 }}>
          <Text
            style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text
            style={{
              color: COLORS.primary,
              fontSize: 14,
              fontWeight: '700',
              marginTop: 4,
            }}
          >
            {priceDisplay}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [featuredMerch, setFeaturedMerch] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadHome();
  }, []);

  const loadHome = async () => {
    try {
      console.log('[Home] Loading home content from Supabase');
      setLoading(true);
      setError(null);

      const { data: home, error: homeErr } = await (supabasePublic as any)
        .from('home_content')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (homeErr) {
        console.warn('[Home] home_content not available:', homeErr.message);
      }

      setHomeData(home ?? null);

      const parallelTasks: Promise<void>[] = [];

      if (home?.featured_merch_ids && home.featured_merch_ids.length > 0) {
        parallelTasks.push(
          (async () => {
            const { data } = await (supabasePublic as any)
              .from('merch')
              .select('id, name, price, image_url')
              .in('id', home.featured_merch_ids as string[])
              .eq('is_published', true);
            setFeaturedMerch(data ?? []);
          })()
        );
      }

      await Promise.all(parallelTasks);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } catch (err) {
      console.error('[Home] Failed to load home content:', err);
      setError('Could not load content. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  };

  const heroTitle = homeData?.hero_title ?? 'HUNGRY HUSTLER RECORDS';
  const heroSubtitle = homeData?.hero_subtitle ?? 'Independent. Authentic. Unstoppable.';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 20,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <HHRLogo size="medium" showGlow />

        {/* Header action buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Search button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Search button pressed');
              router.push('/search');
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Search size={18} color={COLORS.text} />
            </View>
          </AnimatedPressable>

          {/* Profile button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Profile button pressed');
              router.push('/fan-profile');
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <User size={18} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Hero Banner */}
      {loading ? (
        <SkeletonLine
          width="100%"
          height={200}
          borderRadius={0}
          style={{ marginBottom: 24 }}
        />
      ) : (
        <View style={{ height: 200, marginBottom: 24, position: 'relative' }}>
          {homeData?.hero_banner_url ? (
            <Image
              source={resolveImageSource(homeData.hero_banner_url)}
              style={{ width: '100%', height: 200 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 200,
                backgroundColor: COLORS.surfaceSecondary,
              }}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
              justifyContent: 'flex-end',
              paddingHorizontal: 20,
              paddingBottom: 16,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                fontSize: 22,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              {heroTitle}
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                marginTop: 4,
              }}
            >
              {heroSubtitle}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* The Label */}
      <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          The Label
        </Text>
        <Text
          style={{
            color: '#ffffff',
            fontSize: 15,
            lineHeight: 24,
          }}
        >
          {'Welcome to the official Hungry Hustler Records app — the home of independent excellence, authentic music, and powerful artists. This is your direct connection to the music, artists, and movement behind Hungry Hustler Records.\n\nDiscover new releases, watch exclusive videos, explore artist profiles, and stay connected with everything happening inside the label. This platform gives fans exclusive access to music, merch, announcements, and behind-the-scenes content you won\'t find anywhere else.\n\nHungry Hustler Records represents the hustle, the vision, and the future of independent music.'}
        </Text>
      </View>

      {/* Featured Merch */}
      {(loading || featuredMerch.length > 0) && (
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
              paddingHorizontal: 20,
            }}
          >
            Featured Merch
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {loading
              ? [0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: 160,
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      marginRight: 12,
                    }}
                  >
                    <SkeletonLine width={160} height={160} borderRadius={0} />
                    <View style={{ padding: 12, gap: 6 }}>
                      <SkeletonLine width="80%" height={13} />
                      <SkeletonLine width="40%" height={14} />
                    </View>
                  </View>
                ))
              : featuredMerch.map((item) => (
                  <MerchPreviewCard key={item.id} item={item} />
                ))}
          </ScrollView>
        </View>
      )}

      {/* Latest Releases info card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Latest Releases
          </Text>
          {(['New Singles', 'Albums', 'Exclusive Releases', 'Featured Tracks'] as const).map((item) => (
            <View
              key={item}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
            >
              <Text style={{ color: '#00FF66', fontSize: 16, lineHeight: 28, marginRight: 10 }}>
                {'•'}
              </Text>
              <Text style={{ color: '#ffffff', fontSize: 14, lineHeight: 28 }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Exclusive Videos card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Exclusive Videos
          </Text>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 15,
              lineHeight: 24,
              marginBottom: 16,
            }}
          >
            {'Watch official music videos, behind-the-scenes footage, interviews, and exclusive content from Hungry Hustler Records artists.'}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Tapped Watch Now — navigating to Videos tab');
              router.push('/(tabs)/videos');
            }}
          >
            <View
              style={{
                backgroundColor: '#00FF66',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#000000', fontSize: 14, fontWeight: '700' }}>
                Watch Now
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Merch Store card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Merch Store
          </Text>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 15,
              lineHeight: 24,
              marginBottom: 16,
            }}
          >
            {'Shop official Hungry Hustler Records merchandise, including apparel, accessories, and exclusive artist merch.'}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Tapped Shop Now — navigating to Merch tab');
              router.push('/(tabs)/merch');
            }}
          >
            <View
              style={{
                backgroundColor: '#00FF66',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#000000', fontSize: 14, fontWeight: '700' }}>
                Shop Now
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Error state */}
      {error && !loading && (
        <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
          <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Retry loading');
              loadHome();
            }}
            style={{ marginTop: 12 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                Try Again
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      )}
    </ScrollView>
  );
}
