/**
 * Patches @react-native-async-storage/async-storage with a safe in-memory
 * (+ localStorage on web) implementation so Supabase's internal auto-refresh
 * timer never hits the unlinked native module in Expo Go, which would throw
 * "Native module is null, cannot access legacy storage".
 *
 * All real auth/session persistence uses the SecureStore-backed chunked
 * adapter in lib/supabase.ts — this shim is only a crash-prevention layer.
 */
import { Platform } from 'react-native';

const _mem: Record<string, string> = {};

const shim = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    return _mem[key] ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch { /* ignore */ }
      return;
    }
    _mem[key] = value;
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      return;
    }
    delete _mem[key];
  },
  mergeItem: async (key: string, value: string): Promise<void> => { _mem[key] = value; },
  clear: async (): Promise<void> => { Object.keys(_mem).forEach(k => delete _mem[k]); },
  getAllKeys: async (): Promise<string[]> => Object.keys(_mem),
  multiGet: async (keys: string[]): Promise<[string, string | null][]> =>
    keys.map(k => [k, _mem[k] ?? null]),
  multiSet: async (pairs: [string, string][]): Promise<void> => {
    pairs.forEach(([k, v]) => { _mem[k] = v; });
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    keys.forEach(k => delete _mem[k]);
  },
  multiMerge: async (pairs: [string, string][]): Promise<void> => {
    pairs.forEach(([k, v]) => { _mem[k] = v; });
  },
  flushGetRequests: (): void => {},
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-async-storage/async-storage');
  const target = mod?.default ?? mod;
  if (target && typeof target === 'object') {
    Object.assign(target, shim);
  }
} catch {
  // Package not installed — nothing to patch.
}
