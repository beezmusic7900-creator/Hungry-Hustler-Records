import "react-native-reanimated";
import React, { useEffect } from "react";
import { LogBox, Platform } from 'react-native';

if (Platform.OS === 'web') {
  LogBox.ignoreLogs(['useNativeDriver']);
}
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { COLORS } from "@/constants/Colors";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

const HHRDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.danger,
  },
};

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.text,
  headerTitleStyle: { color: COLORS.text, fontWeight: '700' as const },
  headerBackButtonDisplayMode: 'minimal' as const,
};

function PushNotificationRegistrar() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={HHRDarkTheme}>
        <SafeAreaProvider>
          <AuthProvider>
            <AudioPlayerProvider>
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.background }}>
                <PushNotificationRegistrar />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLORS.background },
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="artist/[id]"
                    options={{ headerShown: true, title: 'Artist', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="merch-detail/[id]"
                    options={{ headerShown: true, title: 'Merch', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/dashboard"
                    options={{ headerShown: true, title: 'Admin Dashboard', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/artists"
                    options={{ headerShown: true, title: 'Manage Artists', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/artist-form"
                    options={{ headerShown: true, title: 'Artist', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/merch-list"
                    options={{ headerShown: true, title: 'Manage Merch', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/merch-form"
                    options={{ headerShown: true, title: 'Merch Item', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/home-editor"
                    options={{ headerShown: true, title: 'Edit Home Page', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/about-editor"
                    options={{ headerShown: true, title: 'Edit About Page', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/music-list"
                    options={{ headerShown: true, title: 'Manage Music', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/music-form"
                    options={{ headerShown: true, title: 'Song', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/videos-list"
                    options={{ headerShown: true, title: 'Manage Videos', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/video-form"
                    options={{ headerShown: true, title: 'Video', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/events-list"
                    options={{ headerShown: true, title: 'Manage Events', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/event-form"
                    options={{ headerShown: true, title: 'Event', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/social-list"
                    options={{ headerShown: true, title: 'Social Posts', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/social-form"
                    options={{ headerShown: true, title: 'Social Post', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/news-list"
                    options={{ headerShown: true, title: 'Manage News', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/news-form"
                    options={{ headerShown: true, title: 'Article', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="fan-auth"
                    options={{ headerShown: true, title: 'Fan Account', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="fan-profile"
                    options={{ headerShown: true, title: 'My Profile', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="search"
                    options={{ headerShown: true, title: 'Search', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="player"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="video-player"
                    options={{ headerShown: true, title: 'Video', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="lyrics"
                    options={{ headerShown: true, title: 'Lyrics', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="video-lyrics"
                    options={{ headerShown: true, title: 'Lyrics', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="fan-rewards"
                    options={{ headerShown: true, title: 'Fan Rewards', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/notifications"
                    options={{ headerShown: true, title: 'Notifications', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="admin/rewards-config"
                    options={{ headerShown: true, title: 'Rewards Config', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="notification-preferences"
                    options={{ headerShown: true, title: 'Notifications', ...HEADER_OPTIONS }}
                  />
                  <Stack.Screen
                    name="exclusive-content"
                    options={{ headerShown: true, title: 'Exclusive Content', ...HEADER_OPTIONS }}
                  />
                </Stack>
                <SystemBars style="light" />
              </GestureHandlerRootView>
            </AudioPlayerProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
