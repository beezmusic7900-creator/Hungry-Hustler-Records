
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WebView } from 'react-native-webview';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@/styles/commonStyles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * (9 / 16));

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// ─── YouTube Player ───────────────────────────────────────────────────────────

function YouTubePlayer({ videoId, title, description }: { videoId: string; title: string; description: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  console.log(`[VideoPlayer] YouTubePlayer rendering, id: ${videoId}, embedUrl: ${embedUrl}`);

  const retry = useCallback(() => {
    console.log('[VideoPlayer] YouTubePlayer retry pressed');
    setError(false);
    setLoading(true);
    setRetryKey(k => k + 1);
  }, []);

  if (error) {
    return (
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }, styles.errorContainer]}>
        <Text style={styles.errorText}>Video unavailable. Please try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        <WebView
          key={retryKey}
          source={{ uri: embedUrl }}
          style={styles.webview}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          onLoad={() => { console.log('[VideoPlayer] WebView loaded'); setLoading(false); }}
          onError={() => { console.warn('[VideoPlayer] WebView error'); setLoading(false); setError(true); }}
          onHttpError={(e) => { console.warn('[VideoPlayer] WebView HTTP error:', e.nativeEvent.statusCode); setLoading(false); setError(true); }}
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.videoTitle}>{title}</Text>
        {description !== '' && (
          <Text style={styles.videoDescription}>{description}</Text>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Uploaded Video Player (inner — owns the player instance) ─────────────────

function UploadedVideoPlayerInner({
  url,
  title,
  description,
  onError,
  onReady,
  playerStatus,
  onRetry,
}: {
  url: string;
  title: string;
  description: string;
  onError: () => void;
  onReady: () => void;
  playerStatus: 'loading' | 'ready' | 'error';
  onRetry: () => void;
}) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  React.useEffect(() => {
    if (!player) {
      console.warn('[VideoPlayer] useVideoPlayer returned null for url:', url);
      onError();
      return;
    }
    console.log('[VideoPlayer] Attaching statusChange listener for url:', url);
    const sub = player.addListener('statusChange', (event) => {
      console.log('[VideoPlayer] statusChange event:', event.status);
      if (event.status === 'readyToPlay') {
        onReady();
        try { player.play(); } catch (e) { console.warn('[VideoPlayer] play() error:', e); }
      } else if (event.status === 'error') {
        console.warn('[VideoPlayer] Player error event');
        onError();
      }
    });
    return () => {
      try { sub?.remove(); } catch (e) { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  if (playerStatus === 'error') {
    return (
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }, styles.errorContainer]}>
        <Text style={styles.errorText}>Video unavailable. Please try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
        {playerStatus === 'loading' && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen
          allowsPictureInPicture
          contentFit="contain"
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.videoTitle}>{title}</Text>
        {description !== '' && (
          <Text style={styles.videoDescription}>{description}</Text>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Uploaded Video Player (outer — guards URL, manages retry key) ────────────

function UploadedVideoPlayer({ videoUrl, title, description }: { videoUrl: string; title: string; description: string }) {
  const [playerStatus, setPlayerStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);

  console.log(`[VideoPlayer] UploadedVideoPlayer url: ${videoUrl}`);

  if (!videoUrl || videoUrl.trim() === '') {
    console.warn('[VideoPlayer] No video URL provided, showing error state');
    return (
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }, styles.errorContainer]}>
        <Text style={styles.errorText}>Video unavailable.</Text>
      </View>
    );
  }

  const handleRetry = () => {
    console.log('[VideoPlayer] UploadedVideoPlayer retry pressed');
    setPlayerStatus('loading');
    setRetryKey(k => k + 1);
  };

  return (
    <UploadedVideoPlayerInner
      key={retryKey}
      url={videoUrl}
      title={title}
      description={description}
      onError={() => setPlayerStatus('error')}
      onReady={() => setPlayerStatus('ready')}
      playerStatus={playerStatus}
      onRetry={handleRetry}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VideoPlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    video_url: string;
    title: string;
    description: string;
    source_type: string;
  }>();

  const videoUrl = params.video_url ?? '';
  const title = params.title ?? 'Video';
  const description = params.description ?? '';
  const sourceType = params.source_type ?? 'upload';

  console.log(`[VideoPlayer] Opening video: "${title}", source_type: ${sourceType}, url: ${videoUrl}`);

  const isYouTube = sourceType === 'youtube' || isYouTubeUrl(videoUrl);
  const youtubeId = isYouTube ? extractYouTubeId(videoUrl) : null;

  console.log(`[VideoPlayer] isYouTube: ${isYouTube}, youtubeId: ${youtubeId}`);

  const handleBack = useCallback(() => {
    console.log('[VideoPlayer] Back button pressed');
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Player */}
      {isYouTube ? (
        youtubeId ? (
          <YouTubePlayer videoId={youtubeId} title={title} description={description} />
        ) : (
          <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }, styles.errorContainer]}>
            <Text style={styles.errorText}>Invalid YouTube URL.</Text>
          </View>
        )
      ) : (
        <UploadedVideoPlayer videoUrl={videoUrl} title={title} description={description} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  headerRight: {
    width: 32,
  },
  videoContainer: {
    width: '100%',
    backgroundColor: '#000',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
      default: {},
    }),
  },
  video: {
    width: '100%',
    height: '100%',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    zIndex: 10,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  errorText: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 20,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 26,
  },
  videoDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
