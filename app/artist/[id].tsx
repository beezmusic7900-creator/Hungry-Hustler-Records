import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  Linking,
  Alert,
} from 'react-native';
import { Music2 } from 'lucide-react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/app/integrations/supabase/client';

interface Artist {
  id: string;
  name: string;
  genre: string | null;
  bio: string | null;
  image_url: string | null;
  apple_music_url: string | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadArtist();
  }, [id]);

  const loadArtist = async () => {
    try {
      console.log(`[ArtistDetail] Loading artist: ${id}`);
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabasePublic
        .from('artists')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[ArtistDetail] Supabase error:', dbError.message);
        setError("Couldn't load artist profile.");
        return;
      }
      setArtist(data);
      navigation.setOptions({ title: data.name });
    } catch (err) {
      console.error('[ArtistDetail] Failed to load artist:', err);
      setError("Couldn't load artist profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Photo */}
      {loading ? (
        <SkeletonLine width="100%" height={250} borderRadius={0} />
      ) : artist?.image_url ? (
        <Image
          source={resolveImageSource(artist.image_url)}
          style={{ width: '100%', height: 250 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 250,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: COLORS.primary,
              fontSize: 80,
              fontWeight: '700',
            }}
          >
            {artist?.name?.charAt(0) ?? '?'}
          </Text>
        </View>
      )}

      <View style={{ padding: 20 }}>
        {/* Name */}
        {loading ? (
          <SkeletonLine width="60%" height={28} style={{ marginBottom: 16 }} />
        ) : (
          <Text
            style={{
              color: COLORS.text,
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.5,
              marginBottom: 16,
            }}
          >
            {artist?.name}
          </Text>
        )}

        {/* Bio */}
        {loading ? (
          <View style={{ gap: 8, marginBottom: 28 }}>
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="95%" height={14} />
            <SkeletonLine width="80%" height={14} />
            <SkeletonLine width="90%" height={14} />
          </View>
        ) : artist?.bio ? (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 15,
              lineHeight: 24,
              marginBottom: 28,
            }}
          >
            {artist.bio}
          </Text>
        ) : null}

        {/* Genre */}
        {artist?.genre ? (
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Genre
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 15 }}>
              {artist.genre}
            </Text>
          </View>
        ) : null}

        {/* Apple Music Button */}
        {!loading && artist?.apple_music_url && isValidUrl(artist.apple_music_url) ? (
          <View style={{ marginBottom: 28 }}>
            <AnimatedPressable
              onPress={() => {
                console.log('[ArtistDetail] Listen on Apple Music pressed:', artist.apple_music_url);
                if (artist.apple_music_url) {
                  Linking.openURL(artist.apple_music_url).catch(() => {
                    Alert.alert('Error', 'Could not open Apple Music link.');
                  });
                }
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  backgroundColor: '#FC3C44',
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                }}
              >
                <Music2 size={20} color="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  Listen on Apple Music
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        ) : null}

        {/* Error */}
        {error && !loading && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text
              style={{
                color: COLORS.danger,
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Couldn't load artist
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
                console.log('[ArtistDetail] Retry loading');
                loadArtist();
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
        )}
      </View>
    </ScrollView>
  );
}
