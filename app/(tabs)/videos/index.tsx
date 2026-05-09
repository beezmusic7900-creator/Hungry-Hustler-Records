import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ImageSourcePropType,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, Play } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

interface VideoItem {
  id: string;
  title: string;
  video_url: string | null;
  youtube_url: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  artist_id: string | null;
  source_type: string | null;
  description: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function VideoCard({ item, cardWidth }: { item: VideoItem; cardWidth: number }) {
  const resolvedUrl = item.video_url ?? item.youtube_url ?? '';
  const derivedYoutubeId =
    item.youtube_id ??
    (resolvedUrl ? getYouTubeId(resolvedUrl) : null);
  const thumbnailUri = item.thumbnail_url
    ? item.thumbnail_url
    : derivedYoutubeId
    ? `https://img.youtube.com/vi/${derivedYoutubeId}/hqdefault.jpg`
    : '';

  const handlePress = () => {
    console.log(`[Videos] Card pressed: ${item.title} - ${resolvedUrl}`);
    if (resolvedUrl) Linking.openURL(resolvedUrl);
  };

  return (
    <AnimatedPressable onPress={handlePress} style={{ width: cardWidth }} disabled={!resolvedUrl}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* Thumbnail */}
        <View style={{ aspectRatio: 16 / 9, position: 'relative' }}>
          {thumbnailUri ? (
            <Image
              source={resolveImageSource(thumbnailUri)}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Video size={32} color={COLORS.primary} />
            </View>
          )}
          {/* Play overlay */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
              }}
            >
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={{ padding: 10 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 14,
              fontWeight: '700',
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.description ? (
            <Text
              style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 3 }}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

function SkeletonVideoCard({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={{ width: cardWidth }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <SkeletonLine width="100%" height={undefined} borderRadius={0} style={{ aspectRatio: 16 / 9 }} />
        <View style={{ padding: 10, gap: 6 }}>
          <SkeletonLine width={60} height={20} borderRadius={20} />
          <SkeletonLine width="85%" height={14} />
          <SkeletonLine width="60%" height={12} />
        </View>
      </View>
    </View>
  );
}

const SKELETON_KEYS = [0, 1, 2, 3, 4, 5];
const H_PADDING = 16;
const GAP = 12;
const NUM_COLUMNS = 2;

export default function VideosScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - H_PADDING * 2 - GAP) / NUM_COLUMNS;

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    try {
      console.log('[Videos] Loading videos from Supabase');
      setError(null);
      const { data, error: dbError } = await supabase
        .from('videos')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (dbError) {
        console.error('[Videos] Supabase error:', dbError.message);
        setError("Couldn't load videos.");
        return;
      }
      console.log(`[Videos] Loaded ${data?.length ?? 0} videos`);
      setVideos(data ?? []);
    } catch (err) {
      console.error('[Videos] Failed to load videos:', err);
      setError("Couldn't load videos. Check your connection.");
    }
  }, []);

  useEffect(() => {
    loadVideos().finally(() => setLoading(false));
  }, [loadVideos]);

  const handleRefresh = async () => {
    console.log('[Videos] Pull-to-refresh triggered');
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  const renderItem = ({ item, index }: { item: VideoItem; index: number }) => {
    const isLeftColumn = index % 2 === 0;
    return (
      <View style={{ marginRight: isLeftColumn ? GAP : 0 }}>
        <VideoCard item={item} cardWidth={cardWidth} />
      </View>
    );
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
          VIDEOS
        </Text>
        <View
          style={{
            width: 40,
            height: 3,
            backgroundColor: COLORS.primary,
            borderRadius: 2,
            marginTop: 6,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
          }}
        />
      </View>

      {loading ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: H_PADDING,
            gap: GAP,
          }}
        >
          {SKELETON_KEYS.map((k, i) => (
            <View key={k} style={{ marginRight: i % 2 === 0 ? 0 : 0 }}>
              <SkeletonVideoCard cardWidth={cardWidth} />
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontSize: 15, textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Videos] Retry loading');
              setLoading(true);
              loadVideos().finally(() => setLoading(false));
            }}
            style={{ marginTop: 16 }}
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
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={{ paddingHorizontal: H_PADDING, gap: GAP }}
          contentContainerStyle={{ paddingBottom: 120, gap: GAP }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                <Video size={32} color={COLORS.primary} />
              </View>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                No videos yet
              </Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 8,
                  maxWidth: 260,
                }}
              >
                Check back soon for new content.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
