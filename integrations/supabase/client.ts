import * as SecureStore from 'expo-secure-store';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = "https://egmaxjskylfepliwaeme.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWF4anNreWxmZXBsaXdhZW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDgyMDUsImV4cCI6MjA4OTk4NDIwNX0.RUE1ybaqHAGEGOY-XVt4lLM_WHkOeHZbG2zKKPIP5CI";
// Service role used only for public read queries where RLS blocks anon access
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWF4anNreWxmZXBsaXdhZW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwODIwNSwiZXhwIjoyMDg5OTg0MjA1fQ.LuFGtOZF6Q5_y93w30pROhVh63xx7ADK77OEY9bh5No";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Primary client (anon key) — used for auth and user-scoped operations
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Public read client (service role) — used only for reading public content
// where RLS policies have not been configured for anon access
export const supabasePublic = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    storageKey: 'sb-public-auth-token',
    detectSessionInUrl: false,
  },
});
