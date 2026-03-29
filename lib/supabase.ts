import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWF4anNreWxmZXBsaXdhZW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDgyMDUsImV4cCI6MjA4OTk4NDIwNX0.RUE1ybaqHAGEGOY-XVt4lLM_WHkOeHZbG2zKKPIP5CI';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    try {
      if (Platform.OS === 'web') {
        return Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null);
      }
      return SecureStore.getItemAsync(key).catch((e) => {
        console.warn('[Supabase] SecureStore getItem error:', e?.message);
        return null;
      });
    } catch (e: any) {
      console.warn('[Supabase] SecureStore getItem threw:', e?.message);
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return Promise.resolve();
      }
      return SecureStore.setItemAsync(key, value).catch((e) => {
        console.warn('[Supabase] SecureStore setItem error:', e?.message);
      });
    } catch (e: any) {
      console.warn('[Supabase] SecureStore setItem threw:', e?.message);
      return Promise.resolve();
    }
  },
  removeItem: (key: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return Promise.resolve();
      }
      return SecureStore.deleteItemAsync(key).catch((e) => {
        console.warn('[Supabase] SecureStore removeItem error:', e?.message);
      });
    } catch (e: any) {
      console.warn('[Supabase] SecureStore removeItem threw:', e?.message);
      return Promise.resolve();
    }
  },
};

let supabaseInstance: ReturnType<typeof createClient>;
try {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Suppress non-fatal auto-refresh errors
  supabaseInstance.auth.onAuthStateChange((_event, _session) => {
    // Silently handle auth state changes - prevents unhandled rejection warnings
  });
} catch (e: any) {
  console.warn('[Supabase] Client initialization error:', e?.message);
  // Fallback: create a client without storage to prevent crash
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = supabaseInstance;


export { SUPABASE_URL, SUPABASE_ANON_KEY };
export const SUPABASE_FUNCTIONS_URL = 'https://egmaxjskylfepliwaeme.supabase.co/functions/v1';
