import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const BEARER_TOKEN_KEY = 'hungryhustler_bearer_token';

// Better Auth / Specular backend removed — app uses Supabase auth directly.
// These stubs preserve import compatibility with auth-popup.tsx.
export const authClient = {
  signIn: { social: async (_opts?: Record<string, unknown>) => ({ error: new Error('Not supported') }) },
  signOut: async () => {},
  useSession: () => ({ data: null, isPending: false }),
} as const;

export async function setBearerToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

export const API_URL = '';
