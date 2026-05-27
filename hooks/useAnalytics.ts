import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
const SESSION_KEY = 'analytics_session_id';
const SESSION_EXPIRY_KEY = 'analytics_session_expiry';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

let sessionIdCache: string | null = null;

async function getOrCreateSessionId(): Promise<string> {
  if (sessionIdCache) return sessionIdCache;

  try {
    const [storedId, storedExpiry] = await Promise.all([
      AsyncStorage.getItem(SESSION_KEY),
      AsyncStorage.getItem(SESSION_EXPIRY_KEY),
    ]);

    const now = Date.now();
    const expiry = storedExpiry ? parseInt(storedExpiry, 10) : 0;

    if (storedId && expiry > now) {
      sessionIdCache = storedId;
      return storedId;
    }

    // Create new session
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newExpiry = now + SESSION_DURATION_MS;
    await Promise.all([
      AsyncStorage.setItem(SESSION_KEY, newId),
      AsyncStorage.setItem(SESSION_EXPIRY_KEY, String(newExpiry)),
    ]);
    sessionIdCache = newId;
    return newId;
  } catch {
    return `fallback-${Date.now()}`;
  }
}

async function refreshSessionExpiry(): Promise<void> {
  try {
    const newExpiry = Date.now() + SESSION_DURATION_MS;
    await AsyncStorage.setItem(SESSION_EXPIRY_KEY, String(newExpiry));
  } catch {
    // ignore
  }
}

export function useAnalytics() {
  const pendingRef = useRef(false);

  const trackEvent = useCallback(async (
    event_name: string,
    properties?: Record<string, unknown>
  ) => {
    // Fire and forget — never block UI
    (async () => {
      try {
        const [sessionId, { data: { session } }] = await Promise.all([
          getOrCreateSessionId(),
          supabase.auth.getSession(),
        ]);

        await refreshSessionExpiry();
        sessionIdCache = null; // force re-read next time to get fresh expiry

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        console.log('[Analytics] trackEvent:', event_name, properties);

        await fetch(`${SUPABASE_URL}/functions/v1/track-event`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event_name,
            properties,
            session_id: sessionId,
            platform: Platform.OS,
          }),
        });
      } catch (err) {
        // Silently fail — analytics should never crash the app
        console.warn('[Analytics] trackEvent failed silently:', err);
      }
    })();
  }, []);

  return { trackEvent };
}
