import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  RefreshControl,
  ImageSourcePropType,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, Play, Heart } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { TYPOGRAPHY, LAYOUT } from '@/constants/Typography';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';

import { useFavorite } from '@/hooks/useFavorite';
import { useRewards } from '@/hooks/useRewards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic = supabasePublic as any;

interface VideoItem {
  id: string;
  title: string;
  video_url: string | null;
  youtube_url: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  artist_id: string | null;
  artists: { id: string; name: string; image_url: string | null } | null;
  source_type: string | null;
  description: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

interface ArtistSection {
  artistId: string | null;
  artistName: string;
  artistImage: string | null;
  videos: VideoItem[];
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

function VideoFavoriteButton({ videoId }: { videoId: string }) {
  const { isFavorited, toggleFavorite } = useFavorite('video', videoId);

  const handlePress = () => {
    console.log('[Videos] Toggle favorite for video:', videoId, '— currently:', isFavorited);
    toggleFavorite();
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Heart
          size={15}
          color={isFavorited ? '#FF4444' : '#FFFFFF'}
          fill={isFavorited ? '#FF4444' : 'transparent'}
        />
      </View>
    </AnimatedPressable>
  );
}

function VideoCard({ item, cardWidth }: { item: VideoItem; cardWidth: number }) {
  const router = useRouter();
  const { awardPoints } = useRewards();
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
    console.log(`[Videos] Card pressed: ${item.title} — navigating to video-player id=${item.id}`);
    router.push(`/video-player?id=${item.id}`);
    awardPoints('watch_video', { reference_id: item.id, description: `Watched: ${item.title}` });
  };

  return (
    <AnimatedPressable onPress={handlePress} style={{ width: cardWidth }}>
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
                ...Platform.select({
                  native: {
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                  },
                  web: {
                    boxShadow: '0px 0px 10px rgba(0,255,102,0.5)',
                  },
                  default: {},
                }),
              }}
            >
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
          {/* Favorite button overlay */}
          <View style={{ position: 'absolute', top: 6, right: 6 }}>
            <VideoFavoriteButton videoId={item.id} />
          </View>
        </View>

        {/* Info */}
        <View style={{ padding: 10 }}>
          <Text
            style={{
              ...TYPOGRAPHY.caption,
              fontWeight: '700',
              color: COLORS.text,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.description ? (
            <Text
              style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 3 }}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}
          <View style={{ marginTop: 8 }}>
            <AnimatedPressable
              onPress={(e) => {
                e.stopPropagation?.();
                console.log('[Videos] Lyrics button pressed for:', item.title);
                router.push(`/video-lyrics?videoId=${item.id}&videoTitle=${encodeURIComponent(item.title)}`);
              }}
            >
              <View
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ ...TYPOGRAPHY.tabLabel, color: COLORS.textSecondary }}>LYRICS</Text>
              </View>
            </AnimatedPressable>
          </View>
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

function groupVideosByArtist(videos: VideoItem[]): ArtistSection[] {
  const grouped: ArtistSection[] = [];
  const seen = new Map<string | null, number>();

  for (const v of videos) {
    const key = v.artist_id ?? null;
    const name = v.artists?.name ?? 'Other Videos';
    const img = v.artists?.image_url ?? null;
    if (!seen.has(key)) {
      seen.set(key, grouped.length);
      grouped.push({ artistId: key, artistName: name, artistImage: img, videos: [v] });
    } else {
      grouped[seen.get(key)!].videos.push(v);
    }
  }

  const nullIdx = grouped.findIndex(g => g.artistId === null);
  if (nullIdx > 0) {
    const [nullGroup] = grouped.splice(nullIdx, 1);
    grouped.push(nullGroup);
  }

  return grouped;
}

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
      const { data, error: dbError } = await dbPublic
        .from('videos')
        .select('*, artists(id, name, image_url)')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (dbError) {
        console.error('[Videos] Supabase error:', dbError.message);
        setError("Couldn't load videos.");
        return;
      }
      console.log(`[Videos] Loaded ${data?.length ?? 0} videos`);
      setVideos((data as unknown as VideoItem[]) ?? []);
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

  const grouped = groupVideosByArtist(videos);

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
            ...TYPOGRAPHY.display,
            color: COLORS.text,
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
            ...Platform.select({
              native: {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 6,
              },
              web: {
                boxShadow: '0px 0px 6px rgba(0,255,102,0.6)',
              },
              default: {},
            }),
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
          {SKELETON_KEYS.map((k) => (
            <SkeletonVideoCard key={k} cardWidth={cardWidth} />
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ ...TYPOGRAPHY.body, color: COLORS.danger, textAlign: 'center' }}>
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
      ) : videos.length === 0 ? (
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
              ...TYPOGRAPHY.h3,
              color: COLORS.text,
              textAlign: 'center',
            }}
          >
            No videos yet
          </Text>
          <Text
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginTop: 8,
              maxWidth: 260,
            }}
          >
            Check back soon for new content.
          </Text>
        </View>
      ) : (
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
          <View style={{ width: '100%', maxWidth: LAYOUT.feedMaxWidth, alignSelf: 'center' }}>
          {grouped.map((section) => {
            const rows: VideoItem[][] = [];
            for (let i = 0; i < section.videos.length; i += 2) {
              rows.push(section.videos.slice(i, i + 2));
            }

            return (
              <View key={section.artistId ?? 'null'} style={{ marginBottom: 24 }}>
                {/* Section header */}
                <View style={{ paddingHorizontal: H_PADDING, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {section.artistImage ? (
                      <Image
                        source={resolveImageSource(section.artistImage)}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text
                      style={{
                        ...TYPOGRAPHY.h2,
                        color: COLORS.text,
                      }}
                    >
                      {section.artistName}
                    </Text>
                  </View>
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
                        web: {
                          boxShadow: '0px 0px 6px rgba(0,255,102,0.6)',
                        },
                        default: {},
                      }),
                    }}
                  />
                </View>

                {/* Video grid */}
                {rows.map((row, rowIdx) => (
                  <View
                    key={rowIdx}
                    style={{
                      flexDirection: 'row',
                      paddingHorizontal: H_PADDING,
                      gap: GAP,
                      marginBottom: GAP,
                    }}
                  >
                    {row.map((item) => (
                      <VideoCard key={item.id} item={item} cardWidth={cardWidth} />
                    ))}
                  </View>
                ))}
              </View>
            );
          })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
