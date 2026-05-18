import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { WebView } from 'react-native-webview';
import { VideoView, useVideoPlayer } from 'expo-video';
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
  const player = useVideoPlayer({ uri: url }, (p) => {
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ flex: 1 }}
      contentFit="contain"
      nativeControls
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
    ? `https://www.youtube.com/embed/${resolvedYoutubeId}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=https://hungry-hustler.app`
    : null;

  const videoTitle = video?.title ?? '';
  const videoDescription = video?.description ?? '';
  const directVideoUrl = video?.video_url ?? null;

  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);

  const injectedJS = `
    window.onYouTubeIframeAPIReady = function() {
      var player = new YT.Player('player', {
        events: { 'onError': function(e) { window.ReactNativeWebView.postMessage(JSON.stringify({type:'ytError',code:e.data})); } }
      });
    };
    true;
  `;

  const handleYTMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ytError') {
        console.error('[VideoPlayer] YouTube player error code:', msg.code);
        setPlayerError('Video unavailable (YouTube error ' + String(msg.code) + ')');
      }
    } catch {
      // non-JSON messages from the page, ignore
    }
  };

  const handleOpenInYouTube = () => {
    const ytUrl = 'https://www.youtube.com/watch?v=' + resolvedYoutubeId;
    console.log('[VideoPlayer] Opening in YouTube:', ytUrl);
    Linking.openURL(ytUrl);
  };

  const handleRetry = () => {
    console.log('[VideoPlayer] Retrying YouTube player');
    setPlayerError(null);
    setPlayerLoaded(false);
    setPlayerKey((k) => k + 1);
  };

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
          <SkeletonLine width="100%" borderRadius={0} style={{ flex: 1 }} />
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.danger, fontSize: 14 }}>{error}</Text>
          </View>
        ) : isYouTube && youtubeEmbedUrl ? (
          <View style={{ flex: 1 }}>
            {!playerError ? (
              <WebView
                key={playerKey}
                source={{ uri: youtubeEmbedUrl }}
                style={{ flex: 1, backgroundColor: '#000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                injectedJavaScript={injectedJS}
                onMessage={handleYTMessage}
                onLoadStart={() => {
                  console.log('[VideoPlayer] YouTube WebView load start:', youtubeEmbedUrl);
                  setPlayerError(null);
                  setPlayerLoaded(false);
                }}
                onLoadEnd={() => {
                  console.log('[VideoPlayer] YouTube WebView loaded');
                  setPlayerLoaded(true);
                }}
                onError={(e) => {
                  console.error('[VideoPlayer] YouTube WebView error:', e.nativeEvent.description);
                  setPlayerError(e.nativeEvent.description);
                }}
                onHttpError={(e) => {
                  console.error('[VideoPlayer] YouTube WebView HTTP error:', e.nativeEvent.statusCode);
                  setPlayerError('HTTP ' + String(e.nativeEvent.statusCode));
                }}
              />
            ) : null}
            {!playerLoaded && !playerError ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: '#000',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <SkeletonLine width="100%" borderRadius={0} style={{ flex: 1 }} />
              </View>
            ) : null}
            {playerError ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: '#000',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: 20,
                }}
              >
                <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center' }}>
                  Video unavailable
                </Text>
                <TouchableOpacity
                  onPress={handleOpenInYouTube}
                  style={{
                    backgroundColor: COLORS.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                    Open in YouTube
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRetry}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.textSecondary,
                  }}
                >
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
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
