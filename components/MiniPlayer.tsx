import React from 'react';
import {
  View,
  Text,
  Image,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Pause, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const BOTTOM_IOS = 90;
const BOTTOM_ANDROID = 80;

export function MiniPlayer() {
  const router = useRouter();
  const { currentSong, isPlaying, togglePlayPause, stop } = useAudioPlayer();

  if (!currentSong) return null;

  const bottomOffset = Platform.OS === 'ios' ? BOTTOM_IOS : BOTTOM_ANDROID;

  const handleBodyPress = () => {
    console.log('[MiniPlayer] Expand player for:', currentSong.title);
    router.push('/player');
  };

  const handlePlayPause = () => {
    console.log('[MiniPlayer] Toggle play/pause for:', currentSong.title);
    togglePlayPause();
  };

  const handleClose = () => {
    console.log('[MiniPlayer] Close player for:', currentSong.title);
    stop();
  };

  const songTitle = currentSong.title;
  const artistName = currentSong.artist;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: 12,
        right: 12,
        zIndex: 999,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        ...Platform.select({
          native: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          },
          web: {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.4)',
          },
          default: {},
        }),
      }}
    >
      {/* Tappable body */}
      <AnimatedPressable onPress={handleBodyPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {/* Cover art */}
        {currentSong.cover_url ? (
          <Image
            source={resolveImageSource(currentSong.cover_url)}
            style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: COLORS.primaryMuted,
              marginRight: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          />
        )}

        {/* Song info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}
            numberOfLines={1}
          >
            {songTitle}
          </Text>
          <Text
            style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}
            numberOfLines={1}
          >
            {artistName}
          </Text>
        </View>
      </AnimatedPressable>

      {/* Play/Pause button */}
      <AnimatedPressable onPress={handlePlayPause} style={{ marginLeft: 12 }}>
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
          {isPlaying ? (
            <Pause size={16} color={COLORS.background} fill={COLORS.background} />
          ) : (
            <Play size={16} color={COLORS.background} fill={COLORS.background} />
          )}
        </View>
      </AnimatedPressable>

      {/* Close button */}
      <AnimatedPressable onPress={handleClose} style={{ marginLeft: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} color={COLORS.textSecondary} />
        </View>
      </AnimatedPressable>
    </View>
  );
}
