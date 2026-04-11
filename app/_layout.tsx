
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import * as Font from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { MusicPurchaseProvider } from "@/contexts/MusicPurchaseContext";
import { colors } from "@/styles/commonStyles";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({
          SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
        });
      } catch (e) {
        console.warn('[Layout] Font load failed:', e);
      } finally {
        setLoaded(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!loaded) {
    return null;
  }

  const HungryHustlerTheme: Theme = {
    dark: true,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400',
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700',
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '900',
      },
    },
  };

  return (
    <>
      <StatusBar style="light" animated />
      <ThemeProvider value={HungryHustlerTheme}>
        <AuthProvider>
          <MusicPurchaseProvider>
            <AdminProvider>
              <GestureHandlerRootView>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                  <Stack.Screen name="admin-setup" options={{ headerShown: false }} />
                  <Stack.Screen name="add-artists-helper" options={{ headerShown: false }} />
                  <Stack.Screen name="purchase-success" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
              </GestureHandlerRootView>
            </AdminProvider>
          </MusicPurchaseProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
