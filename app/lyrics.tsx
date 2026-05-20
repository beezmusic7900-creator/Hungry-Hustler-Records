import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic = supabasePublic as any;

interface LyricsData {
  lyrics: string | null;
  lyrics_is_official: boolean;
}

export default function LyricsScreen() {
  const { songId, songTitle, artist } = useLocalSearchParams<{
    songId: string;
    songTitle: string;
    artist: string;
  }>();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!songId) return;
    loadLyrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  const loadLyrics = async () => {
    try {
      console.log('[Lyrics] Loading lyrics for song:', songId);
      const { data: result, error } = await dbPublic
        .from('songs')
        .select('lyrics, lyrics_is_official')
        .eq('id', songId)
        .maybeSingle();

      if (error) {
        console.error('[Lyrics] Load error:', error.message);
      } else {
        console.log('[Lyrics] Loaded lyrics, has content:', !!result?.lyrics);
        setData(result as LyricsData);
      }
    } catch (err) {
      console.error('[Lyrics] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const decodedTitle = songTitle ? decodeURIComponent(String(songTitle)) : '';
  const decodedArtist = artist ? decodeURIComponent(String(artist)) : '';
  const isOfficial = data?.lyrics_is_official ?? false;
  const badgeLabel = isOfficial ? 'Official Lyrics' : 'Fan Lyrics';
  const badgeBg = isOfficial ? COLORS.primary : COLORS.surfaceSecondary;
  const badgeText = isOfficial ? COLORS.background : COLORS.textSecondary;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Song header */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 22,
              fontWeight: '700',
              letterSpacing: -0.3,
            }}
          >
            {decodedTitle}
          </Text>
          {decodedArtist ? (
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                marginTop: 4,
              }}
            >
              {decodedArtist}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonLine width="90%" height={16} />
            <SkeletonLine width="75%" height={16} />
            <SkeletonLine width="85%" height={16} />
          </View>
        ) : !data?.lyrics ? (
          <View
            style={{
              alignItems: 'center',
              paddingTop: 60,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Music size={28} color={COLORS.textTertiary} />
            </View>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 15,
                textAlign: 'center',
              }}
            >
              No lyrics available for this song
            </Text>
          </View>
        ) : (
          <View>
            {/* Badge */}
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: badgeBg,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 5,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: badgeText,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.3,
                }}
              >
                {badgeLabel}
              </Text>
            </View>

            {/* Lyrics text */}
            <Text
              style={{
                color: COLORS.text,
                fontSize: 15,
                lineHeight: 26,
              }}
            >
              {data.lyrics}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
