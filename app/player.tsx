import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  PanResponder,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Pause, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

function formatTime(ms: number): string {
  if (!ms || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentSong, isPlaying, position, duration, togglePlayPause, seekTo } = useAudioPlayer();

  const seekBarRef = useRef<View>(null);
  const seekBarWidth = useRef(0);

  const progress = duration > 0 ? position / duration : 0;
  const positionText = formatTime(position);
  const durationText = formatTime(duration);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (seekBarWidth.current > 0) {
          const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / seekBarWidth.current));
          const ms = ratio * (seekBarWidth.current > 0 ? duration : 0);
          console.log('[Player] Seek to:', ms);
          seekTo(ms);
        }
      },
      onPanResponderMove: (evt) => {
        if (seekBarWidth.current > 0) {
          const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / seekBarWidth.current));
          const ms = ratio * duration;
          seekTo(ms);
        }
      },
    })
  ).current;

  const handleBack = () => {
    console.log('[Player] Back pressed');
    router.back();
  };

  const handlePlayPause = () => {
    console.log('[Player] Toggle play/pause');
    togglePlayPause();
  };

  if (!currentSong) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>No song playing</Text>
      </View>
    );
  }

  const songTitle = currentSong.title;
  const artistName = currentSong.artist;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 32,
      }}
    >
      {/* Back button */}
      <AnimatedPressable onPress={handleBack} style={{ alignSelf: 'flex-start', marginBottom: 24 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: COLORS.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <ChevronDown size={22} color={COLORS.text} />
        </View>
      </AnimatedPressable>

      {/* Cover art */}
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        {currentSong.cover_url ? (
          <Image
            source={resolveImageSource(currentSong.cover_url)}
            style={{
              width: 300,
              height: 300,
              borderRadius: 20,
              ...Platform.select({
                native: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                },
                default: {},
              }),
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 300,
              height: 300,
              borderRadius: 20,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          />
        )}
      </View>

      {/* Song info */}
      <View style={{ marginBottom: 32 }}>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: -0.3,
          }}
          numberOfLines={2}
        >
          {songTitle}
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 16,
            marginTop: 6,
          }}
          numberOfLines={1}
        >
          {artistName}
        </Text>
      </View>

      {/* Seek bar */}
      <View style={{ marginBottom: 12 }}>
        <View
          ref={seekBarRef}
          onLayout={(e) => {
            seekBarWidth.current = e.nativeEvent.layout.width;
          }}
          style={{
            height: 36,
            justifyContent: 'center',
          }}
          {...panResponder.panHandlers}
        >
          {/* Track */}
          <View
            style={{
              height: 4,
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {/* Fill */}
            <View
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: COLORS.primary,
                borderRadius: 2,
              }}
            />
          </View>
          {/* Thumb */}
          <View
            style={{
              position: 'absolute',
              left: `${progress * 100}%`,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: COLORS.primary,
              marginLeft: -7,
              top: 11,
            }}
          />
        </View>

        {/* Time labels */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
            {positionText}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
            {durationText}
          </Text>
        </View>
      </View>

      {/* Play/Pause button */}
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <AnimatedPressable onPress={handlePlayPause}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              ...Platform.select({
                native: {
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 16,
                },
                default: {},
              }),
            }}
          >
            {isPlaying ? (
              <Pause size={30} color={COLORS.background} fill={COLORS.background} />
            ) : (
              <Play size={30} color={COLORS.background} fill={COLORS.background} />
            )}
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}
