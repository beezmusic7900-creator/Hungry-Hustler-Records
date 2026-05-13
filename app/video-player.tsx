import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '@/constants/Colors';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';

interface VideoItem {
  id: string;
  title: string;
  video_url: string | null;
  youtube_url: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  description: string | null;
  source_type: string | null;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function NativeVideoPlayer({ url }: { url: string }) {
  console.log('[VideoPlayer] NativeVideoPlayer rendering for:', url);
  return (
    <Video
      source={{ uri: url }}
      style={{ flex: 1 }}
      resizeMode={ResizeMode.CONTAIN}
      useNativeControls
      shouldPlay
    />
  );
}

// Web fallback using WebView for direct video files
function WebVideoPlayer({ url }: { url: string }) {
  console.log('[VideoPlayer] WebVideoPlayer rendering for:', url);
  return (
    <WebView
      source={{ uri: url }}
      style={{ flex: 1, backgroundColor: '#000' }}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      onLoadStart={() => console.log('[VideoPlayer] WebView loading direct video:', url)}
    />
  );
}

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadVideo();
  }, [id]);

  const loadVideo = async () => {
    try {
      console.log('[VideoPlayer] Loading video id:', id);
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabasePublic
        .from('videos')
        .select('id, title, video_url, youtube_url, youtube_id, thumbnail_url, description, source_type')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[VideoPlayer] Supabase error:', dbError.message);
        setError("Couldn't load video.");
        return;
      }
      console.log('[VideoPlayer] Loaded video:', data?.title);
      setVideo(data as VideoItem);
      navigation.setOptions({ title: data?.title ?? 'Video' });
    } catch (err) {
      console.error('[VideoPlayer] Failed to load video:', err);
      setError("Couldn't load video.");
    } finally {
      setLoading(false);
    }
  };

  const resolvedYoutubeId = video
    ? video.youtube_id ??
      (video.youtube_url ? getYouTubeId(video.youtube_url) : null) ??
      (video.video_url ? getYouTubeId(video.video_url) : null)
    : null;

  const isYouTube = !!resolvedYoutubeId;
  const youtubeEmbedUrl = resolvedYoutubeId
    ? `https://www.youtube.com/embed/${resolvedYoutubeId}?autoplay=1&playsinline=1`
    : null;

  const videoTitle = video?.title ?? '';
  const videoDescription = video?.description ?? '';
  const directVideoUrl = video?.video_url ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Video player area */}
      <View
        style={{
          width: '100%',
          aspectRatio: 16 / 9,
          backgroundColor: '#000',
        }}
      >
        {loading ? (
          <SkeletonLine width="100%" height={undefined} borderRadius={0} style={{ flex: 1 }} />
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.danger, fontSize: 14 }}>{error}</Text>
          </View>
        ) : isYouTube && youtubeEmbedUrl ? (
          <WebView
            source={{ uri: youtubeEmbedUrl }}
            style={{ flex: 1, backgroundColor: '#000' }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onLoadStart={() => console.log('[VideoPlayer] WebView loading YouTube:', youtubeEmbedUrl)}
            onLoadEnd={() => console.log('[VideoPlayer] WebView loaded')}
            onError={(e) => console.error('[VideoPlayer] WebView error:', e.nativeEvent.description)}
          />
        ) : directVideoUrl ? (
          Platform.OS === 'web' ? (
            <WebVideoPlayer url={directVideoUrl} />
          ) : (
            <NativeVideoPlayer url={directVideoUrl} />
          )
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>No video available</Text>
          </View>
        )}
      </View>

      {/* Info below player */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 10 }}>
            <SkeletonLine width="80%" height={22} />
            <SkeletonLine width="60%" height={14} />
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="90%" height={14} />
          </View>
        ) : (
          <>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 20,
                fontWeight: '700',
                letterSpacing: -0.3,
                marginBottom: 8,
              }}
            >
              {videoTitle}
            </Text>
            {videoDescription ? (
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                {videoDescription}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
