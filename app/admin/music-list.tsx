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
import { Plus, Pencil, Trash2, Eye, EyeOff, Music } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Song {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  category: string;
  price: number | null;
  is_published: boolean;
  display_order: number;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function AdminMusicListScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    loadSongs();
  }, [user, authLoading]);

  const loadSongs = async () => {
    try {
      console.log('[AdminMusic] Loading songs from Supabase');
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('songs')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('[AdminMusic] Supabase error:', dbError.message);
        setError("Couldn't load songs.");
        return;
      }
      setSongs(((data as any[]) ?? []) as Song[]);
    } catch (err) {
      console.error('[AdminMusic] Failed to load songs:', err);
      setError("Couldn't load songs.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (song: Song) => {
    console.log(`[AdminMusic] Delete pressed: ${song.title}`);
    Alert.alert(
      `Delete "${song.title}"?`,
      'This will permanently delete the song and its audio file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`[AdminMusic] Deleting song: ${song.id}`);

              // Delete from storage if it's a Supabase URL
              if (song.audio_url.includes('supabase')) {
                const urlParts = song.audio_url.split('/audio/');
                if (urlParts.length > 1) {
                  const filePath = urlParts[1];
                  console.log(`[AdminMusic] Deleting audio file from storage: ${filePath}`);
                  await supabase.storage.from('audio').remove([filePath]);
                }
              }

              const { error: dbError } = await supabase
                .from('songs')
                .delete()
                .eq('id', song.id);

              if (dbError) {
                console.error('[AdminMusic] Delete failed:', dbError.message);
                Alert.alert('Error', dbError.message);
                return;
              }
              console.log('[AdminMusic] Song deleted, reloading list');
              await loadSongs();
            } catch (err) {
              console.error('[AdminMusic] Delete failed:', err);
              Alert.alert('Error', 'Failed to delete song.');
            }
          },
        },
      ]
    );
  };

  const handleTogglePublish = async (song: Song) => {
    const newValue = !song.is_published;
    console.log(`[AdminMusic] Toggle publish: ${song.title} → ${newValue}`);
    try {
      const { error: dbError } = await (supabase as any)
        .from('songs')
        .update({ is_published: newValue, updated_at: new Date().toISOString() })
        .eq('id', song.id);

      if (dbError) {
        console.error('[AdminMusic] Toggle publish failed:', dbError.message);
        Alert.alert('Error', dbError.message);
        return;
      }
      await loadSongs();
    } catch (err) {
      console.error('[AdminMusic] Toggle publish failed:', err);
      Alert.alert('Error', 'Failed to update song.');
    }
  };

  const handleEdit = (song: Song) => {
    console.log(`[AdminMusic] Edit pressed: ${song.title}`);
    router.push(`/admin/music-form?id=${song.id}`);
  };

  const handleAdd = () => {
    console.log('[AdminMusic] Add song pressed');
    router.push('/admin/music-form');
  };

  const renderItem = ({ item }: { item: Song }) => (
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
      {item.cover_url ? (
        <Image
          source={resolveImageSource(item.cover_url)}
          style={{ width: 52, height: 52, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 8,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          <Music size={22} color={COLORS.primary} />
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
          {item.artist}
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
            {item.category}
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
              Add Song
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
              console.log('[AdminMusic] Retry loading');
              loadSongs();
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
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>
                No songs yet. Add one!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
