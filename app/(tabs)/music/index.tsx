import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, Play, Pause, ExternalLink, Heart, Clock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { TYPOGRAPHY, LAYOUT } from '@/constants/Typography';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useFavorite } from '@/hooks/useFavorite';
import { useRewards } from '@/hooks/useRewards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic: any = supabasePublic;

// ─── Types ───────────────────────────────────────────────────────────────────

interface SongItem {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string | null;
  created_at: string;
}

interface AppleMusicArtist {
  id: number;
  name: string;
  genre: string;
  artistUrl: string;
}

interface AppleMusicAlbum {
  id: number;
  name: string;
  artwork: string;
  releaseYear: string;
  trackCount: number;
  url: string;
  genre: string;
}

interface AppleMusicSong {
  id: number;
  title: string;
  album: string;
  artwork: string;
  previewUrl: string | null;
  trackUrl: string;
  releaseYear: string;
  durationMs: number;
}

interface AppleMusicData {
  artist: AppleMusicArtist;
  albums: AppleMusicAlbum[];
  topSongs: AppleMusicSong[];
}

interface ArtistLink {
  id: string;
  name: string;
  apple_music_url: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AM_RED = '#FC3C44';
const SKELETON_KEYS_AM_ALBUMS = [0, 1, 2];
const SKELETON_KEYS_AM_SONGS = [0, 1, 2, 3];
const SKELETON_KEYS_SONGS = [0, 1, 2, 3];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getArtistImage(name: string): number | null {
  const lower = name.toLowerCase();
  if (lower.includes('afroman')) return require('@/assets/images/f7235853-2a4a-4d3e-8682-224dbc43b61f.jpeg');
  if (lower.includes('og') || lower.includes('daddy')) return require('@/assets/images/db286256-0b13-43cc-bf89-1c671fe61f2b.png');
  return null;
}

function formatDuration(ms: number): string {
  if (!ms) return '';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// ─── Native Song Row ──────────────────────────────────────────────────────────

function SongFavoriteButton({ songId }: { songId: string }) {
  const { isFavorited, toggleFavorite } = useFavorite('song', songId);

  const handlePress = () => {
    console.log('[Music] Toggle favorite for song:', songId, '— currently:', isFavorited);
    toggleFavorite();
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <Heart
        size={18}
        color={isFavorited ? '#FF4444' : COLORS.textTertiary}
        fill={isFavorited ? '#FF4444' : 'transparent'}
      />
    </AnimatedPressable>
  );
}

function NativeSongRow({ item }: { item: SongItem }) {
  const router = useRouter();
  const { currentSong, isPlaying, playSong } = useAudioPlayer();
  const { awardPoints } = useRewards();
  const isCurrentSong = currentSong?.id === item.id;
  const isThisPlaying = isCurrentSong && isPlaying;

  const handlePlay = () => {
    console.log('[Music] Native song row pressed:', item.title, item.audio_url);
    playSong({
      id: item.id,
      title: item.title,
      artist: item.artist,
      cover_url: item.cover_url,
      audio_url: item.audio_url,
    });
    awardPoints('stream_song', { reference_id: item.id, description: `Streamed: ${item.title}` });
  };

  return (
    <View
      style={{
        backgroundColor: isCurrentSong ? COLORS.primaryMuted : COLORS.surface,
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: isCurrentSong ? COLORS.primary : COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Cover art */}
      {item.cover_url ? (
        <Image
          source={resolveImageSource(item.cover_url)}
          style={{ width: 56, height: 56, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Music size={22} color={COLORS.primary} />
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '700' }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}
          numberOfLines={1}
        >
          {item.artist}
        </Text>
      </View>

      {/* Favorite */}
      <SongFavoriteButton songId={item.id} />

      {/* Lyrics button */}
      <AnimatedPressable
        onPress={() => {
          console.log('[Music] Lyrics button pressed for:', item.title);
          router.push(`/lyrics?songId=${item.id}&songTitle=${encodeURIComponent(item.title)}&artist=${encodeURIComponent(item.artist)}`);
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ ...TYPOGRAPHY.tabLabel, color: COLORS.textSecondary }}>LYRICS</Text>
        </View>
      </AnimatedPressable>

      {/* Play button */}
      <AnimatedPressable onPress={handlePlay}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isCurrentSong ? COLORS.primary : COLORS.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isCurrentSong ? COLORS.primary : COLORS.border,
            ...Platform.select({
              native: isCurrentSong
                ? {
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 6,
                  }
                : {},
              default: {},
            }),
          }}
        >
          {isThisPlaying ? (
            <Pause size={14} color={COLORS.background} fill={COLORS.background} />
          ) : (
            <Play
              size={14}
              color={isCurrentSong ? COLORS.background : COLORS.primary}
              fill={isCurrentSong ? COLORS.background : COLORS.primary}
            />
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
}

// ─── Apple Music Components ───────────────────────────────────────────────────

function AlbumCard({ item }: { item: AppleMusicAlbum }) {
  const handlePress = () => {
    console.log(`[Music] Apple Music album pressed: ${item.name} - ${item.url}`);
    Linking.openURL(item.url);
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View style={{ marginRight: 12, width: 140 }}>
        <Image
          source={resolveImageSource(item.artwork)}
          style={{ width: 140, height: 140, borderRadius: 12 }}
          resizeMode="cover"
        />
        <Text
          style={{
            ...TYPOGRAPHY.caption,
            fontWeight: '700',
            color: COLORS.text,
            marginTop: 6,
            width: 140,
          }}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>
          {item.releaseYear}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function AMSongRow({ item }: { item: AppleMusicSong }) {
  const durationText = formatDuration(item.durationMs);
  const hasPreview = !!item.previewUrl;

  const handleAction = () => {
    if (hasPreview && item.previewUrl) {
      console.log(`[Music] Apple Music preview pressed: ${item.title} - ${item.previewUrl}`);
      Linking.openURL(item.previewUrl);
    } else {
      console.log(`[Music] Apple Music track link pressed: ${item.title} - ${item.trackUrl}`);
      Linking.openURL(item.trackUrl);
    }
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Image
        source={resolveImageSource(item.artwork)}
        style={{ width: 56, height: 56, borderRadius: 8 }}
        resizeMode="cover"
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '700' }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}
          numberOfLines={1}
        >
          {item.album}
        </Text>
        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>
          {durationText}
        </Text>
      </View>

      <AnimatedPressable onPress={handleAction}>
        {hasPreview ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              ...Platform.select({
                native: {
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                },
                default: {},
              }),
            }}
          >
            <Play size={14} color={COLORS.background} fill={COLORS.background} />
          </View>
        ) : (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: AM_RED,
            }}
          >
            <ExternalLink size={14} color={AM_RED} />
          </View>
        )}
      </AnimatedPressable>
    </View>
  );
}

function AppleMusicSkeleton() {
  return (
    <View>
      <Text
        style={{
          ...TYPOGRAPHY.captionBold,
          color: COLORS.textSecondary,
          marginBottom: 10,
          marginTop: 16,
        }}
      >
        ALBUMS
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {SKELETON_KEYS_AM_ALBUMS.map((k) => (
          <View key={k} style={{ marginRight: 12 }}>
            <SkeletonLine width={140} height={140} borderRadius={12} />
            <View style={{ marginTop: 6, gap: 4 }}>
              <SkeletonLine width={120} height={12} />
              <SkeletonLine width={60} height={11} />
            </View>
          </View>
        ))}
      </ScrollView>

      <Text
        style={{
          ...TYPOGRAPHY.captionBold,
          color: COLORS.textSecondary,
          marginBottom: 10,
          marginTop: 16,
        }}
      >
        TOP SONGS
      </Text>
      {SKELETON_KEYS_AM_SONGS.map((k) => (
        <View
          key={k}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 10,
            padding: 10,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <SkeletonLine width={56} height={56} borderRadius={8} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonLine width="65%" height={14} />
            <SkeletonLine width="50%" height={12} />
            <SkeletonLine width="30%" height={11} />
          </View>
          <SkeletonLine width={36} height={36} borderRadius={18} />
        </View>
      ))}
    </View>
  );
}

// ─── Recently Played Card ─────────────────────────────────────────────────────

function RecentlyPlayedCard({ item }: { item: SongItem }) {
  const { playSong } = useAudioPlayer();

  const handlePress = () => {
    console.log('[Music] Recently played card pressed:', item.title);
    playSong({
      id: item.id,
      title: item.title,
      artist: item.artist,
      cover_url: item.cover_url,
      audio_url: item.audio_url,
    });
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View style={{ marginRight: 12, width: 120 }}>
        {item.cover_url ? (
          <Image
            source={resolveImageSource(item.cover_url)}
            style={{ width: 120, height: 120, borderRadius: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 12,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Music size={32} color={COLORS.primary} />
          </View>
        )}
        <Text
          style={{
            ...TYPOGRAPHY.caption,
            fontWeight: '700',
            color: COLORS.text,
            marginTop: 6,
            width: 120,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MusicScreen() {
  const insets = useSafeAreaInsets();
  const { recentlyPlayed } = useAudioPlayer();

  // Native songs
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);

  // Artists with Apple Music links
  const [artists, setArtists] = useState<ArtistLink[]>([]);

  // Apple Music state
  const [amData, setAmData] = useState<AppleMusicData | null>(null);
  const [amLoading, setAmLoading] = useState(true);
  const [amError, setAmError] = useState<string | null>(null);

  // Shared refresh state
  const [refreshing, setRefreshing] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadSongs = useCallback(async () => {
    try {
      console.log('[Music] Loading native songs from Supabase');
      const { data, error: dbError } = await dbPublic
        .from('songs')
        .select('id, title, artist, cover_url, audio_url, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('[Music] Failed to load songs:', dbError.message);
        return;
      }
      console.log(`[Music] Loaded ${data?.length ?? 0} native songs`);
      setSongs((data as SongItem[]) ?? []);
    } catch (err) {
      console.error('[Music] Error loading songs:', err);
    } finally {
      setSongsLoading(false);
    }
  }, []);

  const loadArtists = useCallback(async () => {
    try {
      console.log('[Music] Loading artists with Apple Music URLs');
      const { data, error: dbError } = await dbPublic
        .from('artists')
        .select('id, name, apple_music_url')
        .not('apple_music_url', 'is', null)
        .order('name', { ascending: true });
      if (dbError) {
        console.error('[Music] Failed to load artists:', dbError.message);
        return;
      }
      console.log(`[Music] Loaded ${data?.length ?? 0} artists with Apple Music URLs`);
      setArtists((data as ArtistLink[]) ?? []);
    } catch (err) {
      console.error('[Music] Error loading artists:', err);
    }
  }, []);

  const loadAppleMusic = useCallback(async () => {
    setAmData(null);
    setAmLoading(false);
  }, []);

  useEffect(() => {
    Promise.all([
      loadSongs(),
      loadAppleMusic(),
      loadArtists(),
    ]);
  }, [loadSongs, loadAppleMusic, loadArtists]);

  const handleRefresh = async () => {
    console.log('[Music] Pull-to-refresh triggered');
    setRefreshing(true);
    setSongsLoading(true);
    setAmLoading(true);
    await Promise.all([loadSongs(), loadAppleMusic(), loadArtists()]);
    setRefreshing(false);
  };

  const handleAmRetry = () => {
    console.log('[Music] Retry Apple Music loading');
    setAmLoading(true);
    loadAppleMusic();
  };

  const artistPillText = amData
    ? `${amData.artist.name} • ${amData.artist.genre}`
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: LAYOUT.feedMaxWidth, alignSelf: 'center' }}>
        {/* ── Page Header ── */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 16,
          }}
        >
          <Text
            style={{
              ...TYPOGRAPHY.display,
              color: COLORS.text,
            }}
          >
            MUSIC
          </Text>
          <View
            style={{
              width: 40,
              height: 3,
              backgroundColor: COLORS.primary,
              borderRadius: 2,
              marginTop: 6,
              ...Platform.select({
                native: {
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                },
                default: {},
              }),
            }}
          />
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* RECENTLY PLAYED SECTION                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {recentlyPlayed.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
              <Clock size={16} color={COLORS.textSecondary} />
              <Text
                style={{
                  ...TYPOGRAPHY.captionBold,
                  color: COLORS.textSecondary,
                }}
              >
                Recently Played
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {recentlyPlayed.slice(0, 10).map((song) => (
                <RecentlyPlayedCard key={song.id} item={song as SongItem} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* NATIVE SONGS SECTION                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {(songsLoading || songs.length > 0) && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text
              style={{
                ...TYPOGRAPHY.h2,
                color: COLORS.text,
              }}
            >
              SONGS
            </Text>
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: COLORS.primary,
                borderRadius: 2,
                marginTop: 6,
                marginBottom: 16,
              }}
            />

            {songsLoading ? (
              SKELETON_KEYS_SONGS.map((k) => (
                <View
                  key={k}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <SkeletonLine width={56} height={56} borderRadius={8} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonLine width="65%" height={14} />
                    <SkeletonLine width="50%" height={12} />
                  </View>
                  <SkeletonLine width={36} height={36} borderRadius={18} />
                </View>
              ))
            ) : (
              songs.map((song) => <NativeSongRow key={song.id} item={song} />)
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ARTISTS SECTION — artists with Apple Music links                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {artists.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <Text
              style={{
                ...TYPOGRAPHY.h2,
                color: COLORS.text,
              }}
            >
              ARTISTS
            </Text>
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: AM_RED,
                borderRadius: 2,
                marginTop: 6,
                marginBottom: 16,
              }}
            />
            {artists.map((artist) => {
              const artistImage = getArtistImage(artist.name);
              return (
                <View
                  key={artist.id}
                  style={{
                    marginBottom: 24,
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  {artistImage !== null && (
                    <Image
                      source={artistImage}
                      style={{ width: '100%', height: 220 }}
                      resizeMode="cover"
                    />
                  )}
                  <View style={{ padding: 16 }}>
                    <Text
                      style={{
                        ...TYPOGRAPHY.h3,
                        color: COLORS.text,
                        marginBottom: 12,
                      }}
                    >
                      {artist.name}
                    </Text>
                    <AnimatedPressable
                      onPress={() => {
                        console.log(`[Music] Opening Apple Music for artist: ${artist.name}`, artist.apple_music_url);
                        Linking.openURL(artist.apple_music_url);
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: AM_RED,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: LAYOUT.minTapTarget,
                        }}
                      >
                        <Text
                          style={{
                            ...TYPOGRAPHY.button,
                            color: '#FFFFFF',
                          }}
                        >
                          Listen on Apple Music
                        </Text>
                      </View>
                    </AnimatedPressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* APPLE MUSIC SECTION                                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {amData !== null && (
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <Text
              style={{
                ...TYPOGRAPHY.h2,
                color: COLORS.text,
              }}
            >
              APPLE MUSIC
            </Text>
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: AM_RED,
                borderRadius: 2,
                marginTop: 6,
              }}
            />

            {amLoading ? (
              <AppleMusicSkeleton />
            ) : amError ? (
              <View style={{ marginTop: 16 }}>
                <Text style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary }}>
                  {amError}
                </Text>
                <AnimatedPressable onPress={handleAmRetry} style={{ marginTop: 8 }}>
                  <Text style={{ ...TYPOGRAPHY.body, color: AM_RED, fontWeight: '600' }}>
                    Retry
                  </Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 14,
                    backgroundColor: COLORS.surface,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    alignSelf: 'flex-start',
                    gap: 8,
                  }}
                >
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '600' }}>
                    {artistPillText}
                  </Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary }}>
                    •
                  </Text>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Music] Open artist in Apple Music:', amData.artist.artistUrl);
                      Linking.openURL(amData.artist.artistUrl);
                    }}
                  >
                    <Text style={{ ...TYPOGRAPHY.caption, color: AM_RED, fontWeight: '600' }}>
                      Open in Apple Music →
                    </Text>
                  </AnimatedPressable>
                </View>

                <Text
                  style={{
                    ...TYPOGRAPHY.captionBold,
                    color: COLORS.textSecondary,
                    marginBottom: 10,
                    marginTop: 16,
                  }}
                >
                  ALBUMS
                </Text>

                <FlatList
                  data={amData.albums}
                  keyExtractor={(item) => String(item.id)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => <AlbumCard item={item} />}
                  scrollEnabled
                />

                <Text
                  style={{
                    ...TYPOGRAPHY.captionBold,
                    color: COLORS.textSecondary,
                    marginBottom: 10,
                    marginTop: 16,
                  }}
                >
                  TOP SONGS
                </Text>

                <View>
                  {amData.topSongs.map((song) => (
                    <AMSongRow key={String(song.id)} item={song} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        </View>
      </ScrollView>
    </View>
  );
}
