import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Animated,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonArtistCard } from '@/components/SkeletonLoader';
import { getArtists } from '@/utils/api';
import type { Artist } from '@/types';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function ArtistCard({ artist, index }: { artist: Artist; index: number }) {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    console.log(`[Artists] Tapped artist: ${artist.name} (${artist.id})`);
    router.push(`/artist/${artist.id}`);
  };

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        flex: 1,
        margin: 6,
      }}
    >
      <AnimatedPressable onPress={handlePress}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          {artist.photo_url ? (
            <Image
              source={resolveImageSource(artist.photo_url)}
              style={{ width: '100%', height: 160 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 160,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 48,
                  fontWeight: '700',
                }}
              >
                {artist.name.charAt(0)}
              </Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              justifyContent: 'flex-end',
              padding: 12,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                fontSize: 14,
                fontWeight: '700',
              }}
              numberOfLines={1}
            >
              {artist.name}
            </Text>
            {artist.is_featured ? (
              <View
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                  }}
                >
                  FEATURED
                </Text>
              </View>
            ) : null}
          </LinearGradient>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function ArtistsScreen() {
  const insets = useSafeAreaInsets();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      console.log('[Artists] Loading artists');
      setLoading(true);
      setError(null);
      const data = await getArtists();
      setArtists(data);
    } catch (err) {
      console.error('[Artists] Failed to load artists:', err);
      setError("Couldn't load artists. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: Artist; index: number }) => (
    <ArtistCard artist={item} index={index} />
  );

  const skeletonData = [0, 1, 2, 3];

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
          Artists
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            marginTop: 4,
          }}
        >
          Our roster of talented artists
        </Text>
      </View>

      {loading ? (
        <FlatList
          data={skeletonData}
          numColumns={2}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
          renderItem={() => (
            <View style={{ flex: 1, margin: 6 }}>
              <SkeletonArtistCard />
            </View>
          )}
        />
      ) : error ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
        >
          <Text
            style={{
              color: COLORS.danger,
              fontSize: 16,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Couldn't load artists
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 14,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Artists] Retry loading');
              loadArtists();
            }}
            style={{ marginTop: 20 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 28,
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
      ) : artists.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Users size={32} color={COLORS.primary} />
          </View>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            No artists yet
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 14,
              textAlign: 'center',
              marginTop: 8,
              maxWidth: 280,
            }}
          >
            Artist profiles will appear here once they're added to the roster.
          </Text>
        </View>
      ) : (
        <FlatList
          data={artists}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
