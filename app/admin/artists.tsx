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
import { Plus, Pencil, Trash2, Star } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { getArtists, deleteArtist } from '@/utils/api';
import { getBearerToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Artist } from '@/types';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function AdminArtistsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    loadArtists();
  }, [user, authLoading]);

  const loadArtists = async () => {
    try {
      console.log('[AdminArtists] Loading artists');
      setLoading(true);
      setError(null);
      const data = await getArtists();
      setArtists(data);
    } catch (err) {
      console.error('[AdminArtists] Failed to load artists:', err);
      setError("Couldn't load artists.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (artist: Artist) => {
    console.log(`[AdminArtists] Delete pressed: ${artist.name}`);
    Alert.alert(
      `Delete ${artist.name}?`,
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete artist',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`[AdminArtists] Deleting artist: ${artist.id}`);
              const token = await getBearerToken();
              if (!token) throw new Error('Not authenticated');
              await deleteArtist(artist.id, token);
              setArtists((prev) => prev.filter((a) => a.id !== artist.id));
            } catch (err) {
              console.error('[AdminArtists] Delete failed:', err);
              Alert.alert('Error', 'Failed to delete artist.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (artist: Artist) => {
    console.log(`[AdminArtists] Edit pressed: ${artist.name}`);
    router.push(`/admin/artist-form?id=${artist.id}`);
  };

  const handleAdd = () => {
    console.log('[AdminArtists] Add artist pressed');
    router.push('/admin/artist-form');
  };

  const renderItem = ({ item }: { item: Artist }) => (
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
      {item.photo_url ? (
        <Image
          source={resolveImageSource(item.photo_url)}
          style={{ width: 52, height: 52, borderRadius: 26 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: COLORS.primary, fontSize: 20, fontWeight: '700' }}>
            {item.name.charAt(0)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{ color: COLORS.text, fontSize: 15, fontWeight: '600' }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.is_featured ? (
            <Star size={14} color={COLORS.primary} fill={COLORS.primary} />
          ) : null}
        </View>
        {item.bio ? (
          <Text
            style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}
            numberOfLines={1}
          >
            {item.bio}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
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
      {/* Add button in header */}
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
              Add Artist
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
              console.log('[AdminArtists] Retry loading');
              loadArtists();
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
          data={artists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>
                No artists yet. Add one!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
