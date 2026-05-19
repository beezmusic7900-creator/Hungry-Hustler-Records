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

function buildYouTubeHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
#player { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="player"></div>
<script>
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  var player;
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      videoId: '${videoId}',
      playerVars: {
        playsinline: 1,
        autoplay: 0,
        controls: 1,
        rel: 0,
        fs: 1,
        iv_load_policy: 3,
        modestbranding: 0
      },
      events: {
        onReady: function(e) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        },
        onError: function(e) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', code: e.data }));
        },
        onStateChange: function(e) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'state', state: e.data }));
        }
      }
    });
  }

  // Safety timeout — if IFrame API doesn't load in 10s, try direct embed fallback
  setTimeout(function() {
    if (!player) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'timeout' }));
    }
  }, 10000);
</script>
</body>
</html>`;
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
  const youtubeHtml = resolvedYoutubeId ? buildYouTubeHtml(resolvedYoutubeId) : null;

  const videoTitle = video?.title ?? '';
  const videoDescription = video?.description ?? '';
  const directVideoUrl = video?.video_url ?? null;

  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);

  const handleYTMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        console.log('[VideoPlayer] YouTube player ready');
        setPlayerLoaded(true);
        setPlayerError(null);
      } else if (msg.type === 'error') {
        console.error('[VideoPlayer] YouTube player error code:', msg.code);
        const embedBlockedCodes = [150, 151, 152, 153];
        if (embedBlockedCodes.includes(Number(msg.code)) && resolvedYoutubeId) {
          // Video blocked for in-app embedding — open in YouTube app automatically
          console.log('[VideoPlayer] Embed blocked, auto-opening in YouTube');
          Linking.openURL('https://www.youtube.com/watch?v=' + resolvedYoutubeId);
        } else {
          setPlayerError('youtube_error_' + String(msg.code));
        }
      } else if (msg.type === 'timeout') {
        console.warn('[VideoPlayer] YouTube IFrame API timed out');
        setPlayerError('youtube_error_timeout');
      } else if (msg.type === 'state') {
        if (msg.state === 1) { // playing
          setPlayerLoaded(true);
          setPlayerError(null);
        }
      }
    } catch {
      // non-JSON messages, ignore
    }
  };

  const playerErrorMessage = playerError
    ? (playerError.startsWith('youtube_error_')
        ? 'This video cannot be played in the app.'
        : 'Video unavailable.')
    : null;

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
        ) : isYouTube && youtubeHtml ? (
          <View style={{ flex: 1 }}>
            {!playerError ? (
              <WebView
                key={playerKey}
                source={{ html: youtubeHtml, baseUrl: 'https://www.youtube.com' }}
                style={{ flex: 1, backgroundColor: '#000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                mixedContentMode="always"
                setSupportMultipleWindows={false}
                userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                onMessage={handleYTMessage}
                onLoadStart={() => {
                  console.log('[VideoPlayer] YouTube WebView load start');
                  setPlayerLoaded(false);
                }}
                onLoadEnd={() => {
                  console.log('[VideoPlayer] YouTube WebView DOM loaded (waiting for player ready)');
                }}
                onError={(e) => {
                  console.error('[VideoPlayer] YouTube WebView error:', e.nativeEvent.description);
                  setPlayerError(e.nativeEvent.description);
                }}
                onHttpError={(e) => {
                  const status = e.nativeEvent.statusCode;
                  if (status >= 400) {
                    console.error('[VideoPlayer] YouTube WebView HTTP error:', status);
                    setPlayerError('HTTP ' + String(status));
                  }
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
                  {playerErrorMessage}
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
