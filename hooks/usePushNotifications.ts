import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerPushToken() {
  if (Platform.OS === 'web') return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'bed6240c-fb94-4caa-8672-9be1fc91e091',
    });
    const token = tokenData.data;
    console.log('[Push] Expo push token:', token);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    // Register via edge function
    const res = await fetch(`${SUPABASE_URL}/functions/v1/register-push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('[Push] register-push-token non-ok:', res.status, text);
    } else {
      console.log('[Push] Token registered via edge function');
    }
  } catch (err) {
    console.error('[Push] Registration error:', err);
  }
}

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    registerPushToken();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] Notification received:', notification.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const target = data?.target as string | undefined;
      const targetId = data?.target_id as string | undefined;
      console.log('[Push] Notification tapped, target:', target, 'id:', targetId);

      if (!target) return;

      if (target === 'song' && targetId) {
        console.log('[Push] Navigating to player for song:', targetId);
        router.push('/player');
      } else if (target === 'video' && targetId) {
        console.log('[Push] Navigating to video:', targetId);
        router.push(`/video-player?id=${targetId}`);
      } else if (target === 'event' && targetId) {
        console.log('[Push] Navigating to events tab');
        router.push('/(tabs)/events');
      } else if (target === 'exclusive') {
        console.log('[Push] Navigating to exclusive content');
        router.push('/exclusive-content');
      } else if (target === 'merch' && targetId) {
        console.log('[Push] Navigating to merch detail:', targetId);
        router.push(`/merch-detail/${targetId}`);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);
}
