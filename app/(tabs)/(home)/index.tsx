import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Animated,
  Linking,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, ShoppingBag } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { HHRLogo } from '@/components/HHRLogo';
import { supabase } from '@/integrations/supabase/client';

interface Artist {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
}

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

function PlatformButton({
  label,
  color,
  url,
}: {
  label: string;
  color: string;
  url: string;
}) {
  const handlePress = () => {
    console.log(`[Home] Opening platform link: ${label} - ${url}`);
    Linking.openURL(url);
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
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
  const [featuredArtist, setFeaturedArtist] = useState<Artist | null>(null);
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

      const { data: home, error: homeErr } = await supabase
        .from('home_content')
        .select('*')
        .limit(1)
        .single();

      if (homeErr && homeErr.code !== 'PGRST116') {
        console.error('[Home] Supabase error:', homeErr.message);
        setError('Could not load content. Pull to refresh.');
        return;
      }

      setHomeData(home ?? null);

      // Load featured artist and merch in parallel
      const promises: Promise<void>[] = [];

      const parallelTasks: Promise<void>[] = [];

      if (home?.featured_artist_id) {
        parallelTasks.push(
          (async () => {
            const { data } = await supabase
              .from('artists')
              .select('id, name, bio, photo_url')
              .eq('id', home.featured_artist_id as string)
              .single();
            setFeaturedArtist(data ?? null);
          })()
        );
      }

      if (home?.featured_merch_ids && home.featured_merch_ids.length > 0) {
        parallelTasks.push(
          (async () => {
            const { data } = await supabase
              .from('merch_items')
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
        useNativeDriver: true,
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
          alignItems: 'center',
        }}
      >
        <HHRLogo size="medium" showGlow />
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

      {/* Featured Artist */}
      <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
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
          Featured Artist
        </Text>

        {loading ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              gap: 16,
            }}
          >
            <SkeletonLine width={80} height={80} borderRadius={40} />
            <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
              <SkeletonLine width="60%" height={16} />
              <SkeletonLine width="100%" height={12} />
              <SkeletonLine width="80%" height={12} />
            </View>
          </View>
        ) : featuredArtist ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              {featuredArtist.photo_url ? (
                <Image
                  source={resolveImageSource(featuredArtist.photo_url)}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontSize: 28,
                      fontWeight: '700',
                    }}
                  >
                    {featuredArtist.name.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 18,
                    fontWeight: '700',
                  }}
                >
                  {featuredArtist.name}
                </Text>
                {featuredArtist.bio ? (
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 13,
                      lineHeight: 18,
                      marginTop: 4,
                    }}
                    numberOfLines={2}
                  >
                    {featuredArtist.bio}
                  </Text>
                ) : null}
              </View>
            </View>
            <AnimatedPressable
              onPress={() => {
                console.log(`[Home] View profile: ${featuredArtist.name}`);
                router.push(`/artist/${featuredArtist.id}`);
              }}
              style={{ marginTop: 16 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  View Profile
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: COLORS.textTertiary, fontSize: 14 }}>
              No featured artist yet
            </Text>
          </View>
        )}
      </View>

      {/* Latest Release */}
      <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
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
          Latest Release
        </Text>

        {loading ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              gap: 16,
            }}
          >
            <SkeletonLine width={80} height={80} borderRadius={8} />
            <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
              <SkeletonLine width="70%" height={16} />
              <SkeletonLine width="50%" height={12} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <SkeletonLine width={70} height={28} borderRadius={14} />
                <SkeletonLine width={70} height={28} borderRadius={14} />
              </View>
            </View>
          </View>
        ) : homeData?.latest_release_title ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
              {homeData.latest_release_image_url ? (
                <Image
                  source={resolveImageSource(homeData.latest_release_image_url)}
                  style={{ width: 80, height: 80, borderRadius: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    backgroundColor: COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Music size={28} color={COLORS.textTertiary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                  numberOfLines={2}
                >
                  {homeData.latest_release_title}
                </Text>
                {homeData.latest_release_artist ? (
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    {homeData.latest_release_artist}
                  </Text>
                ) : null}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {homeData.latest_release_spotify_url ? (
                    <PlatformButton
                      label="Spotify"
                      color="#1DB954"
                      url={homeData.latest_release_spotify_url}
                    />
                  ) : null}
                  {homeData.latest_release_apple_music_url ? (
                    <PlatformButton
                      label="Apple Music"
                      color="#FC3C44"
                      url={homeData.latest_release_apple_music_url}
                    />
                  ) : null}
                  {homeData.latest_release_youtube_url ? (
                    <PlatformButton
                      label="YouTube"
                      color="#FF0000"
                      url={homeData.latest_release_youtube_url}
                    />
                  ) : null}
                  {homeData.latest_release_soundcloud_url ? (
                    <PlatformButton
                      label="SoundCloud"
                      color="#FF5500"
                      url={homeData.latest_release_soundcloud_url}
                    />
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: COLORS.textTertiary, fontSize: 14 }}>
              No release info yet
            </Text>
          </View>
        )}
      </View>

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
              console.log('[Home] Tapped Watch Now — navigating to Artists tab');
              router.push('/(tabs)/artists');
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
