import { Dimensions, TextStyle } from 'react-native';

export const TYPOGRAPHY = {
  display: { fontSize: 32, fontWeight: '700', lineHeight: 38, letterSpacing: -0.5 } as TextStyle,
  h1: { fontSize: 26, fontWeight: '700', lineHeight: 32, letterSpacing: -0.3 } as TextStyle,
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.2 } as TextStyle,
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 } as TextStyle,
  bodyLarge: { fontSize: 17, fontWeight: '500', lineHeight: 24 } as TextStyle,
  body: { fontSize: 15, fontWeight: '500', lineHeight: 22 } as TextStyle,
  bodyBold: { fontSize: 15, fontWeight: '700', lineHeight: 22 } as TextStyle,
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 } as TextStyle,
  captionBold: { fontSize: 13, fontWeight: '700', lineHeight: 18, letterSpacing: 0.3, textTransform: 'uppercase' } as TextStyle,
  button: { fontSize: 16, fontWeight: '700', lineHeight: 22, letterSpacing: 0.2 } as TextStyle,
  tabLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 } as TextStyle,
};

export const LAYOUT = {
  contentMaxWidth: 720,   // for narrow content screens (forms, profiles)
  feedMaxWidth: 900,      // for feeds and grids
  isTablet: Dimensions.get('window').width >= 768,
  minTapTarget: 44,
};
