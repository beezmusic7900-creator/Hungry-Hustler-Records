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

interface VideoLyricsData {
  lyrics: string | null;
  lyrics_label: string | null;
  lyrics_is_approved: boolean;
}

export default function VideoLyricsScreen() {
  const { videoId, videoTitle } = useLocalSearchParams<{
    videoId: string;
    videoTitle: string;
  }>();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<VideoLyricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!videoId) return;
    loadLyrics();
  }, [videoId]);

  const loadLyrics = async () => {
    try {
      console.log('[VideoLyrics] Loading lyrics for video:', videoId);
      const { data: result, error } = await dbPublic
        .from('videos')
        .select('lyrics, lyrics_label, lyrics_is_approved')
        .eq('id', videoId)
        .maybeSingle();

      if (error) {
        console.error('[VideoLyrics] Load error:', error.message);
      } else {
        console.log('[VideoLyrics] Loaded, approved:', result?.lyrics_is_approved);
        setData(result as VideoLyricsData);
      }
    } catch (err) {
      console.error('[VideoLyrics] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const decodedTitle = videoTitle ? decodeURIComponent(String(videoTitle)) : '';
  const isApproved = data?.lyrics_is_approved ?? false;
  const lyricsLabel = data?.lyrics_label ?? 'AI Generated Lyrics';

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
        {/* Video header */}
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
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonLine width="90%" height={16} />
            <SkeletonLine width="75%" height={16} />
            <SkeletonLine width="85%" height={16} />
          </View>
        ) : !isApproved || !data?.lyrics ? (
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
              Lyrics coming soon
            </Text>
          </View>
        ) : (
          <View>
            {/* Badge */}
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 5,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.3,
                }}
              >
                {lyricsLabel}
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
