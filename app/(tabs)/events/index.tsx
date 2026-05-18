import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Linking,
  RefreshControl,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic: any = supabasePublic;

const INSTAGRAM_GRADIENT_COLORS = ['#833AB4', '#FD1D1D', '#F77737'];

interface SocialPost {
  id: string;
  artist_name: string | null;
  caption: string | null;
  image_url: string | null;
  post_url: string | null;
  post_date: string | null;
  is_published: boolean;
}

interface ArtistSection {
  name: string;
  handle: string;
  profileUrl: string;
}

const ARTISTS: ArtistSection[] = [
  {
    name: 'Afroman',
    handle: '@ogafroman',
    profileUrl: 'https://www.instagram.com/ogafroman',
  },
  {
    name: 'OG Daddy V',
    handle: '@ogdaddy_vee',
    profileUrl: 'https://www.instagram.com/ogdaddy_vee/',
  },
];

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function InstagramGradientBorder({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 10,
        padding: 1.5,
        backgroundColor: INSTAGRAM_GRADIENT_COLORS[1],
        borderWidth: 0,
      }}
    >
      {children}
    </View>
  );
}

function SkeletonPostCard() {
  return (
    <InstagramGradientBorder>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 9,
          overflow: 'hidden',
          aspectRatio: 1,
        }}
      >
        <SkeletonLine width="100%" height={120} borderRadius={0} />
      </View>
    </InstagramGradientBorder>
  );
}

function PostCard({ post }: { post: SocialPost }) {
  const handleViewPost = () => {
    if (post.post_url) {
      console.log('[Social] View post pressed:', post.post_url);
      Linking.openURL(post.post_url);
    }
  };

  return (
    <InstagramGradientBorder>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 9,
          overflow: 'hidden',
        }}
      >
        {post.image_url ? (
          <Image
            source={resolveImageSource(post.image_url)}
            style={{ width: '100%', aspectRatio: 1 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={24} color={COLORS.primary} />
          </View>
        )}
        {post.caption ? (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              lineHeight: 15,
              padding: 6,
            }}
            numberOfLines={2}
          >
            {post.caption}
          </Text>
        ) : null}
        {post.post_url ? (
          <AnimatedPressable onPress={handleViewPost} style={{ padding: 6, paddingTop: 0 }}>
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 6,
                paddingVertical: 5,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                View Post
              </Text>
            </View>
          </AnimatedPressable>
        ) : null}
      </View>
    </InstagramGradientBorder>
  );
}

function ArtistSocialSection({
  artist,
  posts,
  showPlaceholder,
}: {
  artist: ArtistSection;
  posts: SocialPost[];
  showPlaceholder: boolean;
}) {
  const handleFollow = () => {
    console.log('[Social] Follow on Instagram pressed for:', artist.name, artist.profileUrl);
    Linking.openURL(artist.profileUrl);
  };

  const artistPosts = posts.filter(
    (p) => p.artist_name?.toLowerCase() === artist.name.toLowerCase()
  );
  const hasPosts = artistPosts.length > 0;
  const gridItems = hasPosts ? artistPosts : [0, 1, 2, 3, 4, 5];

  return (
    <View style={{ marginBottom: 32 }}>
      {/* Artist header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 18,
              fontWeight: '700',
              letterSpacing: -0.3,
            }}
          >
            {artist.name}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
            {artist.handle}
          </Text>
        </View>
        <AnimatedPressable onPress={handleFollow}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: INSTAGRAM_GRADIENT_COLORS[1],
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}
          >
            <Share2 size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
              Follow on Instagram
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Placeholder message when no posts */}
      {showPlaceholder && !hasPosts ? (
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 13,
            textAlign: 'center',
            marginBottom: 12,
            paddingHorizontal: 16,
          }}
        >
          Tap Follow to see the latest posts on Instagram
        </Text>
      ) : null}

      {/* Grid */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: 12,
          gap: 6,
        }}
      >
        {gridItems.map((item, index) => {
          const itemWidth = '31.5%';
          if (hasPosts) {
            const post = item as SocialPost;
            return (
              <View key={post.id} style={{ width: itemWidth }}>
                <PostCard post={post} />
              </View>
            );
          }
          return (
            <View key={index} style={{ width: itemWidth }}>
              <SkeletonPostCard />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      console.log('[Social] Loading social_posts from Supabase');
      const { data, error: dbError } = await dbPublic
        .from('social_posts')
        .select('*')
        .eq('is_published', true)
        .order('post_date', { ascending: false });

      if (dbError) {
        const code = (dbError.code ?? '') as string;
        const msg = (dbError.message ?? '').toLowerCase();
        const isTableMissing =
          code === 'PGRST200' ||
          code === 'PGRST204' ||
          code === '42P01' ||
          msg.includes('schema cache') ||
          msg.includes('does not exist') ||
          msg.includes('relation') ||
          msg.includes('not found');
        if (isTableMissing) {
          console.log('[Social] social_posts table not ready — showing placeholder layout');
          setShowPlaceholder(true);
          return;
        }
        console.error('[Social] Supabase error:', dbError.message);
        setShowPlaceholder(true);
        return;
      }

      const loaded = (data ?? []) as unknown as SocialPost[];
      console.log('[Social] Loaded', loaded.length, 'social posts');
      setPosts(loaded);
      setShowPlaceholder(loaded.length === 0);
    } catch (err) {
      console.error('[Social] Failed to load posts:', err);
      setShowPlaceholder(true);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = async () => {
    console.log('[Social] Pull-to-refresh triggered');
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <Text
          style={{
            color: COLORS.text,
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.5,
          }}
        >
          SOCIAL
        </Text>
        <View
          style={{
            width: 40,
            height: 3,
            backgroundColor: COLORS.primary,
            borderRadius: 2,
            marginTop: 6,
            ...Platform.select({
              native: {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 6,
              },
              default: {},
            }),
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {ARTISTS.map((artist) => (
          <ArtistSocialSection
            key={artist.name}
            artist={artist}
            posts={posts}
            showPlaceholder={showPlaceholder}
          />
        ))}
      </ScrollView>
    </View>
  );
}
