import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface SkeletonLineProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLine({
  width = '100%',
  height = 14,
  borderRadius,
  style,
}: SkeletonLineProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const widthStyle = typeof width === 'string' && width.endsWith('%')
    ? { width: width as `${number}%` }
    : { width: width as number };

  return (
    <Animated.View
      style={[
        {
          ...widthStyle,
          height,
          borderRadius: borderRadius ?? height / 2,
          backgroundColor: COLORS.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        style,
      ]}
    >
      <SkeletonLine width="100%" height={160} borderRadius={12} />
      <View style={{ marginTop: 12, gap: 8 }}>
        <SkeletonLine width="70%" height={16} />
        <SkeletonLine width="50%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonArtistCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <SkeletonLine width="100%" height={160} borderRadius={0} />
      <View style={{ padding: 12, gap: 6 }}>
        <SkeletonLine width="80%" height={14} />
        <SkeletonLine width="50%" height={11} />
      </View>
    </View>
  );
}

export function SkeletonMerchCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <SkeletonLine width="100%" height={180} borderRadius={0} />
      <View style={{ padding: 12, gap: 6 }}>
        <SkeletonLine width="80%" height={14} />
        <SkeletonLine width="40%" height={16} />
        <SkeletonLine width="100%" height={36} borderRadius={8} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}
