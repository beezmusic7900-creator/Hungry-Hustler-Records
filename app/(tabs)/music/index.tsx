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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, Play, ExternalLink } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';
import { apiGet } from '@/utils/api';

// ─── Types ───────────────────────────────────────────────────────────────────

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
            color: COLORS.text,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 6,
            width: 140,
          }}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
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
          style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{ color: '#888', fontSize: 12, marginTop: 2 }}
          numberOfLines={1}
        >
          {item.album}
        </Text>
        <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
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
      {/* Albums skeleton */}
      <Text
        style={{
          color: '#888',
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.5,
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

      {/* Songs skeleton */}
      <Text
        style={{
          color: '#888',
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.5,
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MusicScreen() {
  const insets = useSafeAreaInsets();

  // Artists with Apple Music links
  const [artists, setArtists] = useState<ArtistLink[]>([]);

  // Apple Music state
  const [amData, setAmData] = useState<AppleMusicData | null>(null);
  const [amLoading, setAmLoading] = useState(true);
  const [amError, setAmError] = useState<string | null>(null);

  // Shared refresh state
  const [refreshing, setRefreshing] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadArtists = useCallback(async () => {
    try {
      console.log('[Music] Loading artists with Apple Music URLs');
      const { data, error: dbError } = await supabasePublic
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
    try {
      setAmError(null);
      const data = await apiGet<AppleMusicData>('/api/apple-music/artist');
      setAmData(data);
      console.log(
        '[Music] Apple Music loaded:',
        data.albums.length,
        'albums,',
        data.topSongs.length,
        'songs'
      );
    } catch {
      // Backend route not available — hide section silently
      setAmData(null);
      setAmError(null);
    } finally {
      setAmLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      loadAppleMusic(),
      loadArtists(),
    ]);
  }, [loadAppleMusic, loadArtists]);

  const handleRefresh = async () => {
    console.log('[Music] Pull-to-refresh triggered');
    setRefreshing(true);
    setAmLoading(true);
    await Promise.all([loadAppleMusic(), loadArtists()]);
    setRefreshing(false);
  };

  const handleAmRetry = () => {
    console.log('[Music] Retry Apple Music loading');
    setAmLoading(true);
    loadAppleMusic();
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const artistPillText = amData
    ? `${amData.artist.name} • ${amData.artist.genre}`
    : '';

  // ── Render ─────────────────────────────────────────────────────────────────

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
              color: COLORS.text,
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.5,
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
        {/* ARTISTS SECTION — artists with Apple Music links                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {artists.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 22,
                fontWeight: '700',
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
                        color: COLORS.text,
                        fontSize: 18,
                        fontWeight: '700',
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
                        }}
                      >
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 15,
                            fontWeight: '700',
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
        {/* APPLE MUSIC SECTION — only shown when data loaded successfully    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {amData !== null && (
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            {/* Section label */}
            <Text
              style={{
                color: COLORS.text,
                fontSize: 22,
                fontWeight: '700',
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
                <Text style={{ color: '#888', fontSize: 14 }}>
                  {amError}
                </Text>
                <AnimatedPressable onPress={handleAmRetry} style={{ marginTop: 8 }}>
                  <Text style={{ color: AM_RED, fontSize: 14, fontWeight: '600' }}>
                    Retry
                  </Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View>
                {/* Artist pill */}
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
                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>
                    {artistPillText}
                  </Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>
                    •
                  </Text>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Music] Open artist in Apple Music:', amData.artist.artistUrl);
                      Linking.openURL(amData.artist.artistUrl);
                    }}
                  >
                    <Text style={{ color: AM_RED, fontSize: 13, fontWeight: '600' }}>
                      Open in Apple Music →
                    </Text>
                  </AnimatedPressable>
                </View>

                {/* Albums sub-label */}
                <Text
                  style={{
                    color: '#888',
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.5,
                    marginBottom: 10,
                    marginTop: 16,
                  }}
                >
                  ALBUMS
                </Text>

                {/* Albums horizontal scroll */}
                <FlatList
                  data={amData.albums}
                  keyExtractor={(item) => String(item.id)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => <AlbumCard item={item} />}
                  scrollEnabled
                />

                {/* Top Songs sub-label */}
                <Text
                  style={{
                    color: '#888',
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1.5,
                    marginBottom: 10,
                    marginTop: 16,
                  }}
                >
                  TOP SONGS
                </Text>

                {/* Top Songs list */}
                <View>
                  {amData.topSongs.map((song) => (
                    <AMSongRow key={String(song.id)} item={song} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}
