
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@/styles/commonStyles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = Math.round(Math.min(SCREEN_WIDTH, 800) * (9 / 16));

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
    if (match) return match[1].substring(0, 11);
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// ─── YouTube Player (web — uses <iframe>) ─────────────────────────────────────

function YouTubePlayerWeb({ videoId, title, description }: { videoId: string; title: string; description: string }) {
  const [loading, setLoading] = useState(true);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&autoplay=0`;
  console.log(`[VideoPlayer] YouTubePlayerWeb rendering, id: ${videoId}, embedUrl: ${embedUrl}`);

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {/* @ts-expect-error — iframe is valid on web */}
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          onLoad={() => { console.log('[VideoPlayer] iframe loaded'); setLoading(false); }}
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

// ─── Uploaded Video Player (web — uses <video> element) ───────────────────────

function UploadedVideoPlayerWeb({ videoUrl, title, description }: { videoUrl: string; title: string; description: string }) {
  console.log(`[VideoPlayer] UploadedVideoPlayerWeb url: ${videoUrl}`);

  if (!videoUrl || videoUrl.trim() === '') {
    return (
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }, styles.errorContainer]}>
        <Text style={styles.errorText}>Video unavailable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
        {/* @ts-expect-error — video is valid on web */}
        <video
          src={videoUrl}
          controls
          style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
          onError={() => console.warn('[VideoPlayer] video element error for url:', videoUrl)}
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
          <YouTubePlayerWeb videoId={youtubeId} title={title} description={description} />
        ) : (
          <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }, styles.errorContainer]}>
            <Text style={styles.errorText}>Invalid YouTube URL.</Text>
          </View>
        )
      ) : (
        <UploadedVideoPlayerWeb videoUrl={videoUrl} title={title} description={description} />
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
