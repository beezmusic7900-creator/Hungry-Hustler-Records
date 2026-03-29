
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Play, Video as VideoIcon } from 'lucide-react-native';
import { colors } from '@/styles/commonStyles';
import { SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

type Video = {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const sStr = s < 10 ? `0${s}` : `${s}`;
  return `${m}:${sStr}`;
}

function VideoCard({ video, onPress }: { video: Video; onPress: () => void }) {
  const thumbSource = resolveImageSource(video.thumbnail_url);
  const durationText = formatDuration(video.duration);
  const hasThumb = !!video.thumbnail_url;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.thumbnailContainer}>
        {hasThumb ? (
          <Image source={thumbSource} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <VideoIcon size={40} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.playButton}>
          <Play size={22} color="#fff" fill="#fff" />
        </View>
        {durationText !== '' && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{durationText}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        {video.description ? (
          <Text style={styles.videoDescription} numberOfLines={2}>{video.description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function VideosScreen() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${SUPABASE_FUNCTIONS_URL}/videos`;
      console.log('[videos] Fetching videos from:', url);

      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      });

      console.log('[videos] Response status:', res.status);
      const text = await res.text();
      console.log('[videos] Response body:', text.substring(0, 300));

      if (!res.ok) {
        throw new Error(`Failed to load videos (${res.status})`);
      }

      const data = JSON.parse(text);
      const videoList: Video[] = Array.isArray(data) ? data : (data.videos ?? data.data ?? []);
      console.log('[videos] Loaded', videoList.length, 'videos');
      setVideos(videoList);
    } catch (err: any) {
      console.error('[videos] fetchVideos error:', err);
      setError(err.message ?? 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVideos();
    }, [fetchVideos])
  );

  const handleVideoPress = (video: Video) => {
    console.log(`[VideosScreen] Video pressed: ${video.title}`);
    router.push({
      pathname: '/video-player',
      params: {
        video_url: video.video_url,
        title: video.title,
        description: video.description ?? '',
      },
    });
  };

  const renderVideo = ({ item }: { item: Video }) => (
    <VideoCard video={item} onPress={() => handleVideoPress(item)} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VIDEOS</Text>
        <Text style={styles.headerSubtitle}>Watch the latest music videos and exclusive content</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <VideoIcon size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchVideos}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : videos.length === 0 ? (
        <View style={styles.centered}>
          <VideoIcon size={56} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Videos Yet</Text>
          <Text style={styles.emptySubtitle}>Check back soon for new content.</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideo}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.secondary,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -22,
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  cardBody: {
    padding: 14,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  videoDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
