import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Music, Video, ShoppingBag, Users } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic: any = supabasePublic;

interface ArtistResult {
  id: string;
  name: string;
  genre: string | null;
  image_url: string | null;
}

interface SongResult {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string | null;
}

interface VideoResult {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_id: string | null;
}

interface MerchResult {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 20 }}>
      {icon}
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { playSong } = useAudioPlayer();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [merch, setMerch] = useState<MerchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setArtists([]);
      setSongs([]);
      setVideos([]);
      setMerch([]);
      return;
    }

    console.log('[Search] Searching for:', q);
    setSearching(true);

    try {
      const pattern = `%${q}%`;
      const [artistRes, songRes, videoRes, merchRes] = await Promise.all([
        dbPublic
          .from('artists')
          .select('id, name, genre, image_url')
          .ilike('name', pattern)
          .eq('is_published', true)
          .limit(5),
        dbPublic
          .from('songs')
          .select('id, title, artist, cover_url, audio_url')
          .or(`title.ilike.${pattern},artist.ilike.${pattern}`)
          .eq('is_published', true)
          .limit(5),
        dbPublic
          .from('videos')
          .select('id, title, thumbnail_url, youtube_id')
          .ilike('title', pattern)
          .eq('is_published', true)
          .limit(5),
        dbPublic
          .from('merch')
          .select('id, name, price, image_url')
          .ilike('name', pattern)
          .eq('is_published', true)
          .limit(5),
      ]);

      setArtists((artistRes.data ?? []) as ArtistResult[]);
      setSongs((songRes.data ?? []) as SongResult[]);
      setVideos((videoRes.data ?? []) as VideoResult[]);
      setMerch((merchRes.data ?? []) as MerchResult[]);

      console.log(
        '[Search] Results — artists:', artistRes.data?.length ?? 0,
        'songs:', songRes.data?.length ?? 0,
        'videos:', videoRes.data?.length ?? 0,
        'merch:', merchRes.data?.length ?? 0
      );
    } catch (err) {
      console.error('[Search] Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(text);
    }, 300);
  };

  const hasResults = artists.length > 0 || songs.length > 0 || videos.length > 0 || merch.length > 0;
  const showEmpty = query.trim().length > 0 && !searching && !hasResults;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Search input */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 10,
          }}
        >
          <Search size={18} color={COLORS.textSecondary} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search artists, songs, videos, merch..."
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{
              flex: 1,
              color: COLORS.text,
              fontSize: 15,
            }}
          />
          {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Empty query state */}
        {!query.trim() && (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Search size={48} color={COLORS.textTertiary} />
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 16,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              Search across all HHR content
            </Text>
          </View>
        )}

        {/* Loading skeleton */}
        {searching && query.trim() && (
          <View style={{ marginTop: 20, gap: 12 }}>
            {[0, 1, 2, 3].map((k) => (
              <View
                key={k}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <SkeletonLine width={44} height={44} borderRadius={8} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLine width="70%" height={14} />
                  <SkeletonLine width="50%" height={12} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* No results */}
        {showEmpty && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>
              No results for
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 4 }}>
              {query}
            </Text>
          </View>
        )}

        {/* Artists */}
        {!searching && artists.length > 0 && (
          <View>
            <SectionHeader icon={<Users size={14} color={COLORS.textSecondary} />} label="Artists" />
            {artists.map((artist) => (
              <AnimatedPressable
                key={artist.id}
                onPress={() => {
                  console.log('[Search] Tap artist:', artist.name);
                  router.push(`/artist/${artist.id}`);
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    marginBottom: 8,
                  }}
                >
                  {artist.image_url ? (
                    <Image
                      source={resolveImageSource(artist.image_url)}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users size={20} color={COLORS.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                      {artist.name}
                    </Text>
                    {artist.genre ? (
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {artist.genre}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        )}

        {/* Songs */}
        {!searching && songs.length > 0 && (
          <View>
            <SectionHeader icon={<Music size={14} color={COLORS.textSecondary} />} label="Songs" />
            {songs.map((song) => (
              <AnimatedPressable
                key={song.id}
                onPress={() => {
                  console.log('[Search] Tap song:', song.title);
                  playSong({
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    cover_url: song.cover_url,
                    audio_url: song.audio_url,
                  });
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    marginBottom: 8,
                  }}
                >
                  {song.cover_url ? (
                    <Image
                      source={resolveImageSource(song.cover_url)}
                      style={{ width: 44, height: 44, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Music size={20} color={COLORS.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {song.artist}
                    </Text>
                  </View>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        )}

        {/* Videos */}
        {!searching && videos.length > 0 && (
          <View>
            <SectionHeader icon={<Video size={14} color={COLORS.textSecondary} />} label="Videos" />
            {videos.map((video) => {
              const thumbUri = video.thumbnail_url
                ? video.thumbnail_url
                : video.youtube_id
                ? `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`
                : '';
              return (
                <AnimatedPressable
                  key={video.id}
                  onPress={() => {
                    console.log('[Search] Tap video:', video.title);
                    router.push(`/video-player?id=${video.id}`);
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      marginBottom: 8,
                    }}
                  >
                    {thumbUri ? (
                      <Image
                        source={resolveImageSource(thumbUri)}
                        style={{ width: 64, height: 44, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 64,
                          height: 44,
                          borderRadius: 8,
                          backgroundColor: COLORS.primaryMuted,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Video size={20} color={COLORS.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={2}>
                        {video.title}
                      </Text>
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        )}

        {/* Merch */}
        {!searching && merch.length > 0 && (
          <View>
            <SectionHeader icon={<ShoppingBag size={14} color={COLORS.textSecondary} />} label="Merch" />
            {merch.map((item) => {
              const priceDisplay = `$${Number(item.price).toFixed(2)}`;
              return (
                <AnimatedPressable
                  key={item.id}
                  onPress={() => {
                    console.log('[Search] Tap merch:', item.name);
                    router.push(`/merch-detail/${item.id}`);
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      marginBottom: 8,
                    }}
                  >
                    {item.image_url ? (
                      <Image
                        source={resolveImageSource(item.image_url)}
                        style={{ width: 44, height: 44, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          backgroundColor: COLORS.surfaceSecondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShoppingBag size={20} color={COLORS.textTertiary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                        {priceDisplay}
                      </Text>
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
