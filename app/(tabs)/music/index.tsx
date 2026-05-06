import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, Play } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

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
  created_at: string;
  updated_at: string;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function SongCard({ item }: { item: Song }) {
  const priceText = item.price && Number(item.price) > 0
    ? `$${Number(item.price).toFixed(2)}`
    : 'FREE';

  const handlePlay = () => {
    console.log(`[Music] Play pressed: ${item.title} - ${item.audio_url}`);
    Linking.openURL(item.audio_url);
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Cover art */}
      {item.cover_url ? (
        <Image
          source={resolveImageSource(item.cover_url)}
          style={{ width: 60, height: 60, borderRadius: 10 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 10,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          <Music size={24} color={COLORS.primary} />
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}
          numberOfLines={1}
        >
          {item.artist}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '600' }}>
              {item.category}
            </Text>
          </View>
          <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>
            {priceText}
          </Text>
        </View>
      </View>

      {/* Play button */}
      <AnimatedPressable onPress={handlePlay}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
          }}
        >
          <Play size={18} color={COLORS.background} fill={COLORS.background} />
        </View>
      </AnimatedPressable>
    </View>
  );
}

function SkeletonSongCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <SkeletonLine width={60} height={60} borderRadius={10} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonLine width="70%" height={15} />
        <SkeletonLine width="50%" height={13} />
        <SkeletonLine width="40%" height={12} />
      </View>
      <SkeletonLine width={44} height={44} borderRadius={22} />
    </View>
  );
}

export default function MusicScreen() {
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSongs = useCallback(async () => {
    try {
      console.log('[Music] Loading songs from Supabase');
      setError(null);
      const { data, error: dbError } = await supabase
        .from('songs')
        .select('*')
        .eq('is_published', true)
        .order('display_order')
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('[Music] Supabase error:', dbError.message);
        setError("Couldn't load songs.");
        return;
      }
      console.log(`[Music] Loaded ${data?.length ?? 0} songs`);
      setSongs(data ?? []);
    } catch (err) {
      console.error('[Music] Failed to load songs:', err);
      setError("Couldn't load songs. Check your connection.");
    }
  }, []);

  useEffect(() => {
    loadSongs().finally(() => setLoading(false));
  }, [loadSongs]);

  const handleRefresh = async () => {
    console.log('[Music] Pull-to-refresh triggered');
    setRefreshing(true);
    await loadSongs();
    setRefreshing(false);
  };

  const skeletonKeys = [0, 1, 2, 3];

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.5,
            }}
          >
            EXCLUSIVE SONGS
          </Text>
        </View>
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
        <View style={{ paddingHorizontal: 20 }}>
          {skeletonKeys.map((k) => (
            <SkeletonSongCard key={k} />
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontSize: 15, textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Music] Retry loading');
              setLoading(true);
              loadSongs().finally(() => setLoading(false));
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          renderItem={({ item }) => <SongCard item={item} />}
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
                <Music size={32} color={COLORS.primary} />
              </View>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                No songs yet
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
                No songs yet. Check back soon.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
