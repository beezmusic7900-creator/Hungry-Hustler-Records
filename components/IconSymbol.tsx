// This file is a fallback for using MaterialIcons on Android and web.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  ios_icon_name = undefined,
  android_material_icon_name,
  size = 24,
  color,
  style,
  // Forward only the event handlers we inject from EditableElement_ (and a few common RN/web props).
  onPress,
  onClick,
  onMouseOver,
  onMouseLeave,
  testID,
  accessibilityLabel,
}: {
  ios_icon_name?: string | undefined;
  android_material_icon_name: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
  onPress?: any;
  onClick?: any;
  onMouseOver?: any;
  onMouseLeave?: any;
  testID?: any;
  accessibilityLabel?: any;
}) {
  const hasInteraction = onPress || onClick || onMouseOver || onMouseLeave;

  const flatStyle = style ? StyleSheet.flatten(style) : undefined;
  const safeStyle = Platform.OS === 'web' && flatStyle
    ? Object.fromEntries(
        Object.entries(flatStyle).filter(([k]) =>
          !['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation', 'includeFontPadding', 'textAlignVertical'].includes(k)
        )
      )
    : flatStyle;

  const icon = (
    <MaterialIcons
      color={color}
      size={size}
      name={android_material_icon_name}
      style={safeStyle as StyleProp<TextStyle>}
    />
  );

  if (hasInteraction) {
    return (
      <Pressable
        onPress={onPress ?? onClick}
        // @ts-expect-error — onMouseOver/onMouseLeave are valid on web Pressable
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        style={{ alignSelf: 'flex-start' }}
      >
        {icon}
      </Pressable>
    );
  }

  return icon;
}
