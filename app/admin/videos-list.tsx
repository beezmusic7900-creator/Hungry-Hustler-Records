import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Pencil, Trash2, Eye, EyeOff, Video } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function AdminVideosListScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    loadVideos();
  }, [user, authLoading]);

  const loadVideos = async () => {
    try {
      console.log('[AdminVideos] Loading videos from Supabase');
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('videos')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('[AdminVideos] Supabase error:', dbError.message);
        setError("Couldn't load videos.");
        return;
      }
      setVideos((data as any[] ?? []) as VideoItem[]);
    } catch (err) {
      console.error('[AdminVideos] Failed to load videos:', err);
      setError("Couldn't load videos.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (video: VideoItem) => {
    console.log(`[AdminVideos] Delete pressed: ${video.title}`);
    Alert.alert(
      `Delete "${video.title}"?`,
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`[AdminVideos] Deleting video: ${video.id}`);

              // Delete from storage if it's a Supabase URL
              const safeVideoUrl = video.video_url ?? '';
              if (safeVideoUrl.includes('supabase')) {
                const urlParts = safeVideoUrl.split('/videos/');
                if (urlParts.length > 1) {
                  const filePath = urlParts[1];
                  console.log(`[AdminVideos] Deleting video file from storage: ${filePath}`);
                  await supabase.storage.from('videos').remove([filePath]);
                }
              }

              const { error: dbError } = await supabase
                .from('videos')
                .delete()
                .eq('id', video.id);

              if (dbError) {
                console.error('[AdminVideos] Delete failed:', dbError.message);
                Alert.alert('Error', dbError.message);
                return;
              }
              console.log('[AdminVideos] Video deleted, reloading list');
              await loadVideos();
            } catch (err) {
              console.error('[AdminVideos] Delete failed:', err);
              Alert.alert('Error', 'Failed to delete video.');
            }
          },
        },
      ]
    );
  };

  const handleTogglePublish = async (video: VideoItem) => {
    const newValue = !video.is_published;
    console.log(`[AdminVideos] Toggle publish: ${video.title} → ${newValue}`);
    try {
      const { error: dbError } = await supabase
        .from('videos')
        .update({ is_published: newValue })
        .eq('id', video.id);

      if (dbError) {
        console.error('[AdminVideos] Toggle publish failed:', dbError.message);
        Alert.alert('Error', dbError.message);
        return;
      }
      await loadVideos();
    } catch (err) {
      console.error('[AdminVideos] Toggle publish failed:', err);
      Alert.alert('Error', 'Failed to update video.');
    }
  };

  const handleEdit = (video: VideoItem) => {
    console.log(`[AdminVideos] Edit pressed: ${video.title}`);
    router.push(`/admin/video-form?id=${video.id}`);
  };

  const handleAdd = () => {
    console.log('[AdminVideos] Add video pressed');
    router.push('/admin/video-form');
  };

  const renderItem = ({ item }: { item: VideoItem }) => (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {item.thumbnail_url ? (
        <Image
          source={resolveImageSource(item.thumbnail_url)}
          style={{ width: 52, height: 52, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 8,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Video size={22} color={COLORS.textTertiary} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}
          numberOfLines={1}
        >
          {item.description ?? item.source_type ?? ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: item.is_published
                ? 'rgba(0, 255, 102, 0.12)'
                : COLORS.surfaceSecondary,
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: item.is_published ? COLORS.primary : COLORS.border,
            }}
          >
            <Text
              style={{
                color: item.is_published ? COLORS.primary : COLORS.textSecondary,
                fontSize: 10,
                fontWeight: '600',
              }}
            >
              {item.is_published ? 'LIVE' : 'DRAFT'}
            </Text>
          </View>
          <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
            {item.source_type ?? 'Video'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <AnimatedPressable onPress={() => handleTogglePublish(item)}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {item.is_published ? (
              <EyeOff size={16} color={COLORS.textSecondary} />
            ) : (
              <Eye size={16} color={COLORS.textSecondary} />
            )}
          </View>
        </AnimatedPressable>
        <AnimatedPressable onPress={() => handleEdit(item)}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Pencil size={16} color={COLORS.primary} />
          </View>
        </AnimatedPressable>
        <AnimatedPressable onPress={() => handleDelete(item)}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 68, 68, 0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 68, 68, 0.3)',
            }}
          >
            <Trash2 size={16} color={COLORS.danger} />
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.divider,
        }}
      >
        <AnimatedPressable onPress={handleAdd}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: COLORS.primary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Plus size={16} color={COLORS.background} />
            <Text
              style={{
                color: COLORS.background,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              Add Video
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonLine key={i} width="100%" height={80} borderRadius={12} />
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontSize: 15, textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[AdminVideos] Retry loading');
              loadVideos();
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
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>
                No videos yet. Add one!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
