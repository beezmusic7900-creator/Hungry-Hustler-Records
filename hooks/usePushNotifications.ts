import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/integrations/supabase/client';

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

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] Notification received:', notification.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const deepLink = response.notification.request.content.data?.deep_link as string | undefined;
      console.log('[Push] Notification tapped, deep_link:', deepLink);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

async function registerForPushNotifications() {
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
    if (!session?.user) return;

    await (supabase as any)
      .from('push_tokens')
      .upsert({
        user_id: session.user.id,
        token,
        platform: Platform.OS,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'token' });

    console.log('[Push] Token saved to Supabase');
  } catch (err) {
    console.error('[Push] Registration error:', err);
  }
}
