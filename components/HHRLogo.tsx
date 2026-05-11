import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';

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
    ? {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      }
    : {};

  return (
    <View style={[{ width: dimension, height: dimension }, glowStyle]}>
      <Image
        source={logoSource}
        style={{ width: dimension, height: dimension }}
        resizeMode="contain"
      />
    </View>
  );
}
