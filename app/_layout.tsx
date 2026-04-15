
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import * as Font from "expo-font";
import { Stack, Redirect, usePathname, useRouter } from "expo-router";
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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { MusicPurchaseProvider } from "@/contexts/MusicPurchaseContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { colors } from "@/styles/commonStyles";
import { isOnboardingComplete } from "@/utils/onboardingStorage";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function SubscriptionRedirect() {
  const { isSubscribed, loading } = useSubscription();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || authLoading) return;
    // Do not auto-redirect to auth — user must tap a login button explicitly
    if (!user) return;

    const onAuthScreen = pathname === "/auth";
    if (onAuthScreen) return;
    const onOnboarding = pathname.startsWith("/onboarding");
    if (onOnboarding) return;

    let cancelled = false;
    isOnboardingComplete().then((done) => {
      if (cancelled) return;
      if (!done) {
        router.replace("/onboarding");
        return;
      }
      const onPaywall = pathname === "/paywall";
      if (onPaywall) return;
      if (!isSubscribed) {
        router.replace("/paywall");
      }
    }).catch(() => {
      if (cancelled) return;
      const onPaywall = pathname === "/paywall";
      if (onPaywall) return;
      if (!isSubscribed) {
        router.replace("/paywall");
      }
    });
    return () => { cancelled = true; };
  }, [isSubscribed, loading, authLoading, pathname, user, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, setLoaded] = useState(false);

  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    isOnboardingComplete().then((complete) => {
      setOnboardingComplete(complete);
    });
  }, [pathname]);

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
        <SubscriptionProvider>
          <SubscriptionRedirect />
          <MusicPurchaseProvider>
            <AdminProvider>
              <GestureHandlerRootView>

                <Stack>
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />

                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                  <Stack.Screen name="admin-setup" options={{ headerShown: false }} />
                  <Stack.Screen name="add-artists-helper" options={{ headerShown: false }} />
                  <Stack.Screen name="purchase-success" options={{ headerShown: false }} />
                  <Stack.Screen name="paywall" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
              </GestureHandlerRootView>
            </AdminProvider>
          </MusicPurchaseProvider>
        </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
