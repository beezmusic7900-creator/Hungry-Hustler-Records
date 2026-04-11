import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.backendUrl || "";

export const BEARER_TOKEN_KEY = "hungry-hustler_bearer_token";

// Use SecureStore on native and localStorage on web.
// Values are stored directly (auth tokens are small enough for SecureStore's 2 KB limit).
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === "web") {
        return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (e: any) {
      console.warn("[auth] storage getItem error:", e?.message);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e: any) {
      console.warn("[auth] storage setItem error:", e?.message);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e: any) {
      console.warn("[auth] storage removeItem error:", e?.message);
    }
  },
};

export let authClient: ReturnType<typeof createAuthClient> | null = null;
try {
  if (API_URL) {
    authClient = createAuthClient({
      baseURL: API_URL,
      plugins: [
        expoClient({
          scheme: "hungryhustlerrecords",
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
  console.log("[auth] setBearerToken");
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(BEARER_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
    }
  } catch (e: any) {
    console.warn("[auth] setBearerToken error:", e?.message);
  }
}

export async function clearAuthTokens() {
  console.log("[auth] clearAuthTokens");
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(BEARER_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (e: any) {
    console.warn("[auth] clearAuthTokens error:", e?.message);
  }
}

export { API_URL };
