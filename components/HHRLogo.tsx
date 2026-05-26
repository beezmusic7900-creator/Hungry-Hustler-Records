import React from 'react';
import { View, Image, ImageSourcePropType, Platform } from 'react-native';

const logoSource: ImageSourcePropType = require('../assets/images/cc665abf-a02b-4ce3-85e6-492dfdf3ec20.jpeg');

const SIZE_MAP = {
  small: 80,
  medium: 120,
  large: 160,
};

interface HHRLogoProps {
  size?: 'small' | 'medium' | 'large';
  showGlow?: boolean;
}

export function HHRLogo({ size = 'medium', showGlow = true }: HHRLogoProps) {
  const dimension = SIZE_MAP[size];

  const glowStyle = showGlow
    ? Platform.select({
        native: {
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        },
        web: {
          filter: 'drop-shadow(0px 0px 8px rgba(255,215,0,0.5))',
        },
        default: {},
      })
    : {};

  return (
    <View style={[{ width: dimension, height: dimension }, glowStyle]}>
      <Image
        source={logoSource}
        style={{ width: 279, height: 232 }}
        resizeMode="contain"
      />
    </View>
  );
}
