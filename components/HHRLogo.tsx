import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface HHRLogoProps {
  size?: 'small' | 'medium' | 'large';
  showGlow?: boolean;
}

export function HHRLogo({ size = 'medium', showGlow = true }: HHRLogoProps) {
  const sizes = {
    small: { top: 14, bottom: 10, letterSpacing: 2 },
    medium: { top: 20, bottom: 14, letterSpacing: 3 },
    large: { top: 28, bottom: 18, letterSpacing: 4 },
  };

  const s = sizes[size];

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontSize: s.top,
          fontWeight: '700',
          color: COLORS.primary,
          letterSpacing: s.letterSpacing,
          textTransform: 'uppercase',
          ...(showGlow
            ? {
                textShadowColor: 'rgba(0, 255, 102, 0.6)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 12,
              }
            : {}),
        }}
      >
        HUNGRY HUSTLER
      </Text>
      <Text
        style={{
          fontSize: s.bottom,
          fontWeight: '700',
          color: COLORS.white,
          letterSpacing: s.letterSpacing + 4,
          textTransform: 'uppercase',
          marginTop: -2,
        }}
      >
        RECORDS
      </Text>
    </View>
  );
}
