
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors } from '@/styles/commonStyles';

const { width: screenWidth } = Dimensions.get('window');
const VIDEO_WIDTH = screenWidth - 32;
const VIDEO_HEIGHT = VIDEO_WIDTH * (9 / 16);

interface VideoItem {
  id: string;
  videoId: string;
  title: string;
}

const VIDEOS: VideoItem[] = [
  { id: '1', videoId: 'WeYsTmIzjkw', title: 'Video 1' },
  { id: '2', videoId: 'SIMcktul77c', title: 'Video 2' },
  { id: '3', videoId: '9xxK5yyecRo', title: 'Video 3' },
  { id: '4', videoId: '9ubDXueOU4c', title: 'Video 4' },
  { id: '5', videoId: 'HlO6GGcBePw', title: 'Video 5' },
  { id: '6', videoId: 'VA8_XpZE4Sw', title: 'Video 6' },
];

function buildEmbedHtml(videoId: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
          iframe { width: 100%; height: 100%; border: none; display: block; }
        </style>
      </head>
      <body>
        <iframe
          src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0"
          frameborder="0"
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </body>
    </html>
  `;
}

function AnimatedVideoCard({ item, index }: { item: VideoItem; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const embedHtml = buildEmbedHtml(item.videoId);
  const embedUrl = `https://www.youtube.com/embed/${item.videoId}`;

  const handleLoadStart = () => {
    console.log(`[VideosScreen] WebView loading video: ${item.videoId} (index ${index})`);
  };

  const handleLoadEnd = () => {
    console.log(`[VideosScreen] WebView loaded video: ${item.videoId}`);
  };

  const handleError = (e: any) => {
    console.error(`[VideosScreen] WebView error for video ${item.videoId}:`, e.nativeEvent);
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.videoWrapper}>
        <WebView
          source={{ html: embedHtml, baseUrl: 'https://www.youtube.com' }}
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          onLoadStart={handleLoadStart}
          onLoad={handleLoadEnd}
          onError={handleError}
          scrollEnabled={false}
          bounces={false}
          originWhitelist={['*']}
        />
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.youtubeTag}>
          <Text style={styles.youtubeTagText}>▶ YouTube</Text>
        </View>
        <Text style={styles.videoUrl} numberOfLines={1} ellipsizeMode="tail">
          {embedUrl}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function VideosScreen() {
  useEffect(() => {
    console.log('[VideosScreen] Screen mounted, displaying', VIDEOS.length, 'videos');
  }, []);

  const paddingTop = Platform.OS === 'android' ? 48 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>VIDEOS</Text>
          <Text style={styles.headerSubtitle}>
            Watch the latest music videos and exclusive content
          </Text>
          <Text style={styles.headerSubtitle}>
            from Hungry Hustler Records artists.
          </Text>
        </View>

        {/* Video Cards */}
        <View style={styles.videoList}>
          {VIDEOS.map((item, index) => (
            <AnimatedVideoCard key={item.id} item={item} index={index} />
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  videoList: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 16px rgba(0, 255, 102, 0.08)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
      },
    }),
  },
  videoWrapper: {
    width: VIDEO_WIDTH - 2, // account for border
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  youtubeTag: {
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  youtubeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  videoUrl: {
    flex: 1,
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 120,
  },
});
