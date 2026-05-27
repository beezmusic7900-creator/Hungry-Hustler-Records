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

interface LyricsData {
  lyrics: string | null;
  lyrics_is_official: boolean;
}

interface LyricFavorite {
  id: string;
  lyric_snippet: string;
}

export default function LyricsScreen() {
  const { songId, songTitle, artist } = useLocalSearchParams<{
    songId: string;
    songTitle: string;
    artist: string;
  }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [data, setData] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedLines, setSavedLines] = useState<Set<string>>(new Set());
  const [lyricFavorites, setLyricFavorites] = useState<LyricFavorite[]>([]);
  const [savingLine, setSavingLine] = useState<string | null>(null);

  const decodedTitle = songId ? decodeURIComponent(String(songTitle ?? '')) : '';
  const decodedArtist = artist ? decodeURIComponent(String(artist)) : '';

  useEffect(() => {
    if (!songId) return;
    loadLyrics();
    if (user) loadLyricFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, user]);

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

  const loadLyricFavorites = useCallback(async () => {
    if (!user || !songId) return;
    try {
      console.log('[Lyrics] Loading lyric favorites for song:', songId);
      const { data: favData, error } = await db
        .from('lyric_favorites')
        .select('id, lyric_snippet')
        .eq('user_id', user.id)
        .eq('song_id', songId);

      if (error) {
        console.error('[Lyrics] Load favorites error:', error.message);
      } else {
        const favs = (favData ?? []) as LyricFavorite[];
        setLyricFavorites(favs);
        setSavedLines(new Set(favs.map((f) => f.lyric_snippet)));
        console.log('[Lyrics] Loaded', favs.length, 'lyric favorites');
      }
    } catch (err) {
      console.error('[Lyrics] loadLyricFavorites error:', err);
    }
  }, [user, songId]);

  const handleFavoriteLine = async (line: string) => {
    if (!user) return;
    console.log('[Lyrics] Favorite line pressed:', line.slice(0, 40));
    setSavingLine(line);

    const alreadySaved = savedLines.has(line);

    if (alreadySaved) {
      // Remove
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
          console.log('[Lyrics] Removed lyric favorite');
        }
      } catch (err) {
        console.error('[Lyrics] Remove favorite error:', err);
        setSavedLines((prev) => new Set([...prev, line]));
      }
    } else {
      // Add
      setSavedLines((prev) => new Set([...prev, line]));
      try {
        const { data: inserted, error } = await db
          .from('lyric_favorites')
          .insert({
            user_id: user.id,
            song_id: songId,
            lyric_snippet: line,
          })
          .select('id, lyric_snippet')
          .single();

        if (error) {
          console.error('[Lyrics] Save favorite error:', error.message);
          setSavedLines((prev) => {
            const next = new Set(prev);
            next.delete(line);
            return next;
          });
        } else {
          setLyricFavorites((prev) => [...prev, inserted as LyricFavorite]);
          console.log('[Lyrics] Saved lyric favorite');
        }
      } catch (err) {
        console.error('[Lyrics] handleFavoriteLine error:', err);
      }
    }

    setSavingLine(null);
  };

  const handleShareLine = async (line: string) => {
    console.log('[Lyrics] Share line pressed:', line.slice(0, 40));
    try {
      await Share.share({
        message: `"${line}" — ${decodedTitle} by ${decodedArtist}\n\n#HHR`,
      });
    } catch (err) {
      console.error('[Lyrics] Share error:', err);
    }
  };

  const isOfficial = data?.lyrics_is_official ?? false;
  const badgeLabel = isOfficial ? 'Official Lyrics' : 'Fan Lyrics';
  const badgeBg = isOfficial ? COLORS.primary : COLORS.surfaceSecondary;
  const badgeText = isOfficial ? COLORS.background : COLORS.textSecondary;

  const lyricsLines = data?.lyrics
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

        {/* Saved lyric favorites for this song */}
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
