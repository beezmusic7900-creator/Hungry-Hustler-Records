import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.backendUrl || "";

export const BEARER_TOKEN_KEY = "hungry-hustler_bearer_token";

// Platform-specific storage: localStorage for web, SecureStore for native
// NOTE: Do NOT use AsyncStorage — its native module is not available in Expo Go
const secureStorage = {
  getItem: (key: string) => {
    if (Platform.OS === "web") return Promise.resolve(localStorage.getItem(key));
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === "web") { localStorage.setItem(key, value); return Promise.resolve(); }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === "web") { localStorage.removeItem(key); return Promise.resolve(); }
    return SecureStore.deleteItemAsync(key);
  },
};

let authClient: ReturnType<typeof createAuthClient> | null = null;
try {
  if (API_URL) {
    authClient = createAuthClient({
      baseURL: API_URL,
      plugins: [
        expoClient({
          scheme: "hungry-hustler",
          storagePrefix: "hungry-hustler",
          storage: secureStorage,
        }),
      ],
      // On web, use cookies (credentials: include) and fallback to bearer token
      ...(Platform.OS === "web" && {
        fetchOptions: {
          credentials: "include",
          auth: {
            type: "Bearer" as const,
            token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
          },
        },
      }),
    });
  } else {
    console.warn('[auth] API_URL is empty — skipping better-auth client initialization');
  }
} catch (e) {
  console.warn('[auth] Failed to initialize auth client:', e);
}

export async function setBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

export { API_URL };
