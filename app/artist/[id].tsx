import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Play, Pause, Video } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface Artist {
  id: string;
  name: string;
  genre: string | null;
  bio: string | null;
  image_url: string | null;
  apple_music_url: string | null;
}

interface SongItem {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string | null;
}

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_id: string | null;
  youtube_url: string | null;
  video_url: string | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function ArtistSongRow({ item }: { item: SongItem }) {
  const { currentSong, isPlaying, playSong } = useAudioPlayer();
  const isCurrentSong = currentSong?.id === item.id;
  const isThisPlaying = isCurrentSong && isPlaying;

  const handlePlay = () => {
    console.log('[ArtistDetail] Play song:', item.title);
    playSong({
      id: item.id,
      title: item.title,
      artist: item.artist,
      cover_url: item.cover_url,
      audio_url: item.audio_url,
    });
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
      {item.cover_url ? (
        <Image
          source={resolveImageSource(item.cover_url)}
          style={{ width: 48, height: 48, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <AnimatedPressable onPress={handlePlay}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: isCurrentSong ? COLORS.primary : COLORS.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isCurrentSong ? COLORS.primary : COLORS.border,
          }}
        >
          {isThisPlaying ? (
            <Pause size={13} color={COLORS.background} fill={COLORS.background} />
          ) : (
            <Play
              size={13}
              color={isCurrentSong ? COLORS.background : COLORS.primary}
              fill={isCurrentSong ? COLORS.background : COLORS.primary}
            />
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
}

function ArtistVideoCard({ item, cardWidth }: { item: VideoItem; cardWidth: number }) {
  const router = useRouter();
  const resolvedUrl = item.video_url ?? item.youtube_url ?? '';
  const derivedYoutubeId =
    item.youtube_id ??
    (resolvedUrl ? getYouTubeId(resolvedUrl) : null);
  const thumbnailUri = item.thumbnail_url
    ? item.thumbnail_url
    : derivedYoutubeId
    ? `https://img.youtube.com/vi/${derivedYoutubeId}/hqdefault.jpg`
    : '';

  const handlePress = () => {
    console.log('[ArtistDetail] Video pressed:', item.title, '— navigating to video-player');
    router.push(`/video-player?id=${item.id}`);
  };

  return (
    <AnimatedPressable onPress={handlePress} style={{ width: cardWidth }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 10,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <View style={{ aspectRatio: 16 / 9, position: 'relative' }}>
          {thumbnailUri ? (
            <Image
              source={resolveImageSource(thumbnailUri)}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Video size={24} color={COLORS.primary} />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play size={14} color="#FFF" fill="#FFF" />
            </View>
          </View>
        </View>
        <View style={{ padding: 8 }}>
          <Text
            style={{ color: COLORS.text, fontSize: 12, fontWeight: '600' }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
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

      // Load songs and videos in parallel
      const [songRes, videoRes] = await Promise.all([
        supabasePublic
          .from('songs')
          .select('id, title, artist, cover_url, audio_url')
          .ilike('artist', `%${data.name}%`)
          .eq('is_published', true)
          .limit(5),
        supabasePublic
          .from('videos')
          .select('id, title, thumbnail_url, youtube_id, youtube_url, video_url')
          .eq('artist_id', id as string)
          .eq('is_published', true)
          .limit(4),
      ]);

      setSongs((songRes.data ?? []) as SongItem[]);
      setVideos((videoRes.data ?? []) as VideoItem[]);
      console.log(`[ArtistDetail] Loaded ${songRes.data?.length ?? 0} songs, ${videoRes.data?.length ?? 0} videos`);
    } catch (err) {
      console.error('[ArtistDetail] Failed to load artist:', err);
      setError("Couldn't load artist profile.");
    } finally {
      setLoading(false);
    }
  };

  // Card width for 2-column video grid
  const videoCardWidth = 160;

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

        {/* Songs section */}
        {!loading && songs.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 4,
              }}
            >
              Songs
            </Text>
            <View
              style={{
                width: 32,
                height: 3,
                backgroundColor: COLORS.primary,
                borderRadius: 2,
                marginBottom: 14,
                ...Platform.select({
                  native: {
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                  },
                  default: {},
                }),
              }}
            />
            {songs.map((song) => (
              <ArtistSongRow key={song.id} item={song} />
            ))}
          </View>
        )}

        {/* Videos section */}
        {!loading && videos.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 4,
              }}
            >
              Videos
            </Text>
            <View
              style={{
                width: 32,
                height: 3,
                backgroundColor: COLORS.primary,
                borderRadius: 2,
                marginBottom: 14,
                ...Platform.select({
                  native: {
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                  },
                  default: {},
                }),
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {videos.map((video) => (
                <ArtistVideoCard key={video.id} item={video} cardWidth={videoCardWidth} />
              ))}
            </View>
          </View>
        )}

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
