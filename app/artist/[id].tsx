import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Linking,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Instagram,
  Twitter,
  Facebook,
  Music,
  Play,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/app/integrations/supabase/client';

interface Artist {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  video_urls: string[] | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  );
  return match ? match[1] : null;
}

function PlatformPill({
  label,
  color,
  url,
}: {
  label: string;
  color: string;
  url: string;
}) {
  const handlePress = () => {
    console.log(`[ArtistDetail] Opening platform: ${label} - ${url}`);
    Linking.openURL(url);
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Music size={14} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function SocialIcon({
  icon,
  url,
  label,
}: {
  icon: React.ReactNode;
  url: string;
  label: string;
}) {
  const handlePress = () => {
    console.log(`[ArtistDetail] Opening social: ${label} - ${url}`);
    Linking.openURL(url);
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
    </AnimatedPressable>
  );
}

function VideoCard({ url }: { url: string }) {
  const videoId = extractYouTubeId(url);
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  const handlePress = () => {
    console.log(`[ArtistDetail] Opening video: ${url}`);
    Linking.openURL(url);
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          width: 220,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
          marginRight: 12,
          position: 'relative',
        }}
      >
        {thumbnailUrl ? (
          <Image
            source={resolveImageSource(thumbnailUrl)}
            style={{ width: 220, height: 130 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 220,
              height: 130,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={32} color={COLORS.textTertiary} />
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
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(0,0,0,0.6)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={20} color="#fff" fill="#fff" />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
      const { data, error: dbError } = await supabase
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

  const hasMusicPlatforms =
    artist?.spotify_url ||
    artist?.apple_music_url ||
    artist?.youtube_url ||
    artist?.soundcloud_url;

  const hasSocials =
    artist?.instagram_url ||
    artist?.twitter_url ||
    artist?.facebook_url ||
    artist?.tiktok_url;

  const hasVideos = artist?.video_urls && artist.video_urls.length > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Photo */}
      {loading ? (
        <SkeletonLine width="100%" height={250} borderRadius={0} />
      ) : artist?.photo_url ? (
        <Image
          source={resolveImageSource(artist.photo_url)}
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

        {/* Music Platforms */}
        {(loading || hasMusicPlatforms) && (
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Listen On
            </Text>
            {loading ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <SkeletonLine width={100} height={38} borderRadius={19} />
                <SkeletonLine width={120} height={38} borderRadius={19} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {artist?.spotify_url ? (
                  <PlatformPill
                    label="Spotify"
                    color="#1DB954"
                    url={artist.spotify_url}
                  />
                ) : null}
                {artist?.apple_music_url ? (
                  <PlatformPill
                    label="Apple Music"
                    color="#FC3C44"
                    url={artist.apple_music_url}
                  />
                ) : null}
                {artist?.youtube_url ? (
                  <PlatformPill
                    label="YouTube"
                    color="#FF0000"
                    url={artist.youtube_url}
                  />
                ) : null}
                {artist?.soundcloud_url ? (
                  <PlatformPill
                    label="SoundCloud"
                    color="#FF5500"
                    url={artist.soundcloud_url}
                  />
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* Social Media */}
        {(loading || hasSocials) && (
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Follow
            </Text>
            {loading ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <SkeletonLine key={i} width={48} height={48} borderRadius={12} />
                ))}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {artist?.instagram_url ? (
                  <SocialIcon
                    icon={<Instagram size={22} color="#E1306C" />}
                    url={artist.instagram_url}
                    label="Instagram"
                  />
                ) : null}
                {artist?.twitter_url ? (
                  <SocialIcon
                    icon={<Twitter size={22} color="#1DA1F2" />}
                    url={artist.twitter_url}
                    label="Twitter"
                  />
                ) : null}
                {artist?.facebook_url ? (
                  <SocialIcon
                    icon={<Facebook size={22} color="#1877F2" />}
                    url={artist.facebook_url}
                    label="Facebook"
                  />
                ) : null}
                {artist?.tiktok_url ? (
                  <SocialIcon
                    icon={<Music size={22} color={COLORS.text} />}
                    url={artist.tiktok_url}
                    label="TikTok"
                  />
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* Videos */}
        {hasVideos && (
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Videos
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {artist!.video_urls!.map((url, i) => (
                <VideoCard key={i} url={url} />
              ))}
            </ScrollView>
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
