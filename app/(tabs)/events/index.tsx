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
import { WebView } from 'react-native-webview';
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
  embedUrl: string;
}

const ARTISTS: ArtistSection[] = [
  {
    name: 'Afroman',
    handle: '@ogafroman',
    profileUrl: 'https://www.instagram.com/ogafroman/',
    embedUrl: 'https://www.instagram.com/ogafroman/embed/',
  },
  {
    name: 'OG Daddy V',
    handle: '@ogdaddy_vee',
    profileUrl: 'https://www.instagram.com/ogdaddy_vee/',
    embedUrl: 'https://www.instagram.com/ogdaddy_vee/embed/',
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

function InstagramEmbed({ artist }: { artist: ArtistSection }) {
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(false);

  const handleOpenInstagram = () => {
    console.log('[Social] Open on Instagram pressed for:', artist.name, artist.profileUrl);
    Linking.openURL(artist.profileUrl);
  };

  if (webViewError) {
    return (
      <View
        style={{
          marginHorizontal: 16,
          height: 200,
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
          Could not load Instagram feed
        </Text>
        <AnimatedPressable onPress={handleOpenInstagram}>
          <View
            style={{
              backgroundColor: INSTAGRAM_GRADIENT_COLORS[1],
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
              Open on Instagram
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        height: 500,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {webViewLoading ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <SkeletonLine width="100%" height={500} borderRadius={12} />
        </View>
      ) : null}
      <WebView
        source={{ uri: artist.embedUrl }}
        style={{ flex: 1, backgroundColor: COLORS.surface }}
        onLoadStart={() => {
          console.log('[Social] WebView loading:', artist.embedUrl);
          setWebViewLoading(true);
          setWebViewError(false);
        }}
        onLoad={() => {
          console.log('[Social] WebView loaded:', artist.name);
          setWebViewLoading(false);
        }}
        onError={() => {
          console.log('[Social] WebView error for:', artist.name);
          setWebViewLoading(false);
          setWebViewError(true);
        }}
        onHttpError={() => {
          console.log('[Social] WebView HTTP error for:', artist.name);
          setWebViewLoading(false);
          setWebViewError(true);
        }}
        scrollEnabled
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        mixedContentMode="always"
      />
    </View>
  );
}

function ArtistSocialSection({
  artist,
  posts,
}: {
  artist: ArtistSection;
  posts: SocialPost[];
}) {
  const handleFollow = () => {
    console.log('[Social] Follow on Instagram pressed for:', artist.name, artist.profileUrl);
    Linking.openURL(artist.profileUrl);
  };

  const artistPosts = posts.filter(
    (p) => p.artist_name?.toLowerCase() === artist.name.toLowerCase()
  );
  const hasPosts = artistPosts.length > 0;

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

      {/* Published posts grid (shown above WebView when available) */}
      {hasPosts ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: 12,
            gap: 6,
            marginBottom: 12,
          }}
        >
          {artistPosts.map((post) => (
            <View key={post.id} style={{ width: '31.5%' }}>
              <PostCard post={post} />
            </View>
          ))}
        </View>
      ) : null}

      {/* Instagram embed WebView */}
      <InstagramEmbed artist={artist} />
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
          />
        ))}
      </ScrollView>
    </View>
  );
}
