
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function YouTubePlayer({ videoId, title, description }: { videoId: string; title: string; description: string }) {
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  console.log(`[VideoPlayer] Rendering YouTube embed for ID: ${videoId}, url: ${embedUrl}`);

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
        <WebView
          source={{ uri: embedUrl }}
          style={styles.webview}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
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

function UploadedVideoPlayer({ videoUrl, title, description }: { videoUrl: string; title: string; description: string }) {
  console.log(`[VideoPlayer] Rendering uploaded video player for url: ${videoUrl}`);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
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
      {isYouTube && youtubeId ? (
        <YouTubePlayer videoId={youtubeId} title={title} description={description} />
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
