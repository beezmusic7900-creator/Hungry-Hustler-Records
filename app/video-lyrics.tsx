import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Share,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, Heart, Share2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic, supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic = supabasePublic as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface VideoLyricsData {
  lyrics: string | null;
  lyrics_label: string | null;
  lyrics_is_approved: boolean;
}

interface LyricFavorite {
  id: string;
  lyric_snippet: string;
}

export default function VideoLyricsScreen() {
  const { videoId, videoTitle } = useLocalSearchParams<{
    videoId: string;
    videoTitle: string;
  }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [data, setData] = useState<VideoLyricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedLines, setSavedLines] = useState<Set<string>>(new Set());
  const [lyricFavorites, setLyricFavorites] = useState<LyricFavorite[]>([]);
  const [savingLine, setSavingLine] = useState<string | null>(null);

  const decodedTitle = videoTitle ? decodeURIComponent(String(videoTitle)) : '';

  useEffect(() => {
    if (!videoId) return;
    loadLyrics();
    if (user) loadLyricFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, user]);

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

  const loadLyricFavorites = useCallback(async () => {
    if (!user || !videoId) return;
    try {
      console.log('[VideoLyrics] Loading lyric favorites for video:', videoId);
      const { data: favData, error } = await db
        .from('lyric_favorites')
        .select('id, lyric_snippet')
        .eq('user_id', user.id)
        .eq('song_id', videoId);

      if (error) {
        console.error('[VideoLyrics] Load favorites error:', error.message);
      } else {
        const favs = (favData ?? []) as LyricFavorite[];
        setLyricFavorites(favs);
        setSavedLines(new Set(favs.map((f) => f.lyric_snippet)));
        console.log('[VideoLyrics] Loaded', favs.length, 'lyric favorites');
      }
    } catch (err) {
      console.error('[VideoLyrics] loadLyricFavorites error:', err);
    }
  }, [user, videoId]);

  const handleFavoriteLine = async (line: string) => {
    if (!user) return;
    console.log('[VideoLyrics] Favorite line pressed:', line.slice(0, 40));
    setSavingLine(line);

    const alreadySaved = savedLines.has(line);

    if (alreadySaved) {
      setSavedLines((prev) => {
        const next = new Set(prev);
        next.delete(line);
        return next;
      });
      try {
        const fav = lyricFavorites.find((f) => f.lyric_snippet === line);
        if (fav) {
          await db.from('lyric_favorites').delete().eq('id', fav.id);
          setLyricFavorites((prev) => prev.filter((f) => f.id !== fav.id));
        }
      } catch (err) {
        console.error('[VideoLyrics] Remove favorite error:', err);
        setSavedLines((prev) => new Set([...prev, line]));
      }
    } else {
      setSavedLines((prev) => new Set([...prev, line]));
      try {
        const { data: inserted, error } = await db
          .from('lyric_favorites')
          .insert({
            user_id: user.id,
            song_id: videoId,
            lyric_snippet: line,
          })
          .select('id, lyric_snippet')
          .single();

        if (error) {
          console.error('[VideoLyrics] Save favorite error:', error.message);
          setSavedLines((prev) => {
            const next = new Set(prev);
            next.delete(line);
            return next;
          });
        } else {
          setLyricFavorites((prev) => [...prev, inserted as LyricFavorite]);
        }
      } catch (err) {
        console.error('[VideoLyrics] handleFavoriteLine error:', err);
      }
    }

    setSavingLine(null);
  };

  const handleShareLine = async (line: string) => {
    console.log('[VideoLyrics] Share line pressed:', line.slice(0, 40));
    try {
      await Share.share({
        message: `"${line}" — ${decodedTitle}\n\n#HHR`,
      });
    } catch (err) {
      console.error('[VideoLyrics] Share error:', err);
    }
  };

  const isApproved = data?.lyrics_is_approved ?? false;
  const lyricsLabel = data?.lyrics_label ?? 'AI Generated Lyrics';

  const lyricsLines = data?.lyrics && isApproved
    ? data.lyrics.split('\n')
    : [];

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

        {/* Saved lyric favorites */}
        {lyricFavorites.length > 0 && (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 14,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Heart size={14} color={COLORS.primary} fill={COLORS.primary} />
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>
                MY SAVED LINES
              </Text>
            </View>
            {lyricFavorites.map((fav) => (
              <Text
                key={fav.id}
                style={{
                  color: COLORS.text,
                  fontSize: 13,
                  lineHeight: 20,
                  fontStyle: 'italic',
                  marginBottom: 4,
                }}
                numberOfLines={2}
              >
                {'"'}
                {fav.lyric_snippet}
                {'"'}
              </Text>
            ))}
          </View>
        )}

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

            {/* Lyrics lines with heart + share */}
            <View>
              {lyricsLines.map((line, index) => {
                const trimmed = line.trim();
                const isSaved = savedLines.has(trimmed);
                const isSaving = savingLine === trimmed;
                const isEmpty = trimmed.length === 0;

                if (isEmpty) {
                  return <View key={index} style={{ height: 12 }} />;
                }

                return (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 3,
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.text,
                        fontSize: 15,
                        lineHeight: 26,
                        flex: 1,
                      }}
                    >
                      {trimmed}
                    </Text>
                    {user && (
                      <AnimatedPressable
                        onPress={() => handleFavoriteLine(trimmed)}
                        disabled={isSaving}
                      >
                        <Heart
                          size={16}
                          color={isSaved ? '#FF4444' : COLORS.textTertiary}
                          fill={isSaved ? '#FF4444' : 'transparent'}
                        />
                      </AnimatedPressable>
                    )}
                    <AnimatedPressable onPress={() => handleShareLine(trimmed)}>
                      <Share2 size={14} color={COLORS.textTertiary} />
                    </AnimatedPressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
