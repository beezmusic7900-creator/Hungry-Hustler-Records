import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWF4anNreWxmZXBsaXdhZW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDgyMDUsImV4cCI6MjA4OTk4NDIwNX0.RUE1ybaqHAGEGOY-XVt4lLM_WHkOeHZbG2zKKPIP5CI';

// SecureStore has a 2 KB per-value limit. Supabase session tokens can exceed
// this, so we chunk large values across multiple keys.
const CHUNK_SIZE = 1800; // bytes, safely under the 2048 limit

function chunkKey(key: string, index: number) {
  return `${key}_chunk_${index}`;
}

async function secureSetItem(key: string, value: string): Promise<void> {
  // Remove any previous chunks first
  let i = 0;
  while (true) {
    const existing = await SecureStore.getItemAsync(chunkKey(key, i));
    if (existing === null) break;
    await SecureStore.deleteItemAsync(chunkKey(key, i));
    i++;
  }
  // Write new chunks
  const chunks = Math.ceil(value.length / CHUNK_SIZE);
  for (let c = 0; c < chunks; c++) {
    await SecureStore.setItemAsync(chunkKey(key, c), value.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE));
  }
  // Store chunk count
  await SecureStore.setItemAsync(`${key}_chunks`, String(chunks));
}

async function secureGetItem(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
  if (countStr === null) {
    // Fallback: try reading as a single (unchunked) value for backwards compat
    return SecureStore.getItemAsync(key);
  }
  const count = parseInt(countStr, 10);
  const parts: string[] = [];
  for (let c = 0; c < count; c++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, c));
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function secureRemoveItem(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
  if (countStr !== null) {
    const count = parseInt(countStr, 10);
    for (let c = 0; c < count; c++) {
      await SecureStore.deleteItemAsync(chunkKey(key, c));
    }
    await SecureStore.deleteItemAsync(`${key}_chunks`);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// Use SecureStore on native and localStorage on web.
const StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      }
      return await secureGetItem(key);
    } catch (e: any) {
      console.warn('[Supabase] StorageAdapter getItem error:', e?.message);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      await secureSetItem(key, value);
    } catch (e: any) {
      console.warn('[Supabase] StorageAdapter setItem error:', e?.message);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }
      await secureRemoveItem(key);
    } catch (e: any) {
      console.warn('[Supabase] StorageAdapter removeItem error:', e?.message);
    }
  },
};

let supabaseInstance: ReturnType<typeof createClient>;
try {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: StorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
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

// Supabase's internal token-refresh timer catches its own errors and re-throws
// them as unhandled promise rejections with the message "auto refresh tick failed".
// Intercept and suppress that specific noise so it doesn't spam the console.
if (typeof global !== 'undefined') {
  const _origHandler = (global as any)._supabaseRefreshErrorHandlerInstalled;
  if (!_origHandler) {
    (global as any)._supabaseRefreshErrorHandlerInstalled = true;
    const origConsoleError = console.error.bind(console);
    console.error = (...args: any[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (msg.includes('auto refresh tick failed')) {
        console.warn('[Supabase] Token refresh failed (session may be expired). Will retry.');
        return;
      }
      origConsoleError(...args);
    };
  }
}

export const supabase = supabaseInstance;

export { SUPABASE_URL, SUPABASE_ANON_KEY };
export const SUPABASE_FUNCTIONS_URL = 'https://egmaxjskylfepliwaeme.supabase.co/functions/v1';
