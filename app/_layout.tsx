import "react-native-reanimated";
import React, { useEffect } from "react";
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
import { COLORS } from "@/constants/Colors";

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
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.background }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: COLORS.background },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="artist/[id]"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    headerBackButtonDisplayMode: 'minimal',
                  }}
                />
                <Stack.Screen
                  name="merch-detail/[id]"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    headerBackButtonDisplayMode: 'minimal',
                  }}
                />
                <Stack.Screen
                  name="admin/dashboard"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Admin Dashboard',
                  }}
                />
                <Stack.Screen
                  name="admin/artists"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Manage Artists',
                  }}
                />
                <Stack.Screen
                  name="admin/artist-form"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Artist',
                  }}
                />
                <Stack.Screen
                  name="admin/merch-list"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Manage Merch',
                  }}
                />
                <Stack.Screen
                  name="admin/merch-form"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Merch Item',
                  }}
                />
                <Stack.Screen
                  name="admin/home-editor"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Edit Home Page',
                  }}
                />
                <Stack.Screen
                  name="admin/about-editor"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Edit About Page',
                  }}
                />
                <Stack.Screen
                  name="admin/music-list"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Manage Music',
                  }}
                />
                <Stack.Screen
                  name="admin/music-form"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Song',
                  }}
                />
                <Stack.Screen
                  name="admin/videos-list"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Manage Videos',
                  }}
                />
                <Stack.Screen
                  name="admin/video-form"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
                    title: 'Video',
                  }}
                />
                <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
              </Stack>
              <SystemBars style="light" />
            </GestureHandlerRootView>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
