import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";
import type {
  Artist,
  MerchItem,
  HomeContent,
  AboutContent,
  ArtistInput,
  MerchInput,
  HomeContentInput,
  AboutContentInput,
} from "@/types";

export const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  "https://zh8kuu2uzjgumzgbwmaa3fb5a3dwbes5.app.specular.dev";

export const isBackendConfigured = (): boolean => {
  return !!BACKEND_URL && BACKEND_URL.length > 0;
};

export const getBearerToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(BEARER_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (error) {
    console.error("[API] Error retrieving bearer token:", error);
    return null;
  }
};

export const apiCall = async <T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  if (!isBackendConfigured()) {
    throw new Error("Backend URL not configured. Please rebuild the app.");
  }

  const url = `${BACKEND_URL}${endpoint}`;
  console.log(`[API] ${options?.method || "GET"} ${url}`);

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  };

  const token = await getBearerToken();
  if (token) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    console.warn(`[API] Error ${response.status}: ${text}`);
    throw new Error(`API error: ${response.status} - ${text}`);
  }

  return response.json();
};

export const apiGet = async <T = unknown>(endpoint: string): Promise<T> => {
  return apiCall<T>(endpoint, { method: "GET" });
};

export const apiPost = async <T = unknown>(
  endpoint: string,
  data: unknown
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const apiPut = async <T = unknown>(
  endpoint: string,
  data: unknown
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const apiPatch = async <T = unknown>(
  endpoint: string,
  data: unknown
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const apiDelete = async <T = unknown>(
  endpoint: string,
  data: unknown = {}
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

export const authenticatedApiCall = async <T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getBearerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please sign in.");
  }

  return apiCall<T>(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const authenticatedGet = async <T = unknown>(
  endpoint: string
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, { method: "GET" });
};

export const authenticatedPost = async <T = unknown>(
  endpoint: string,
  data: unknown
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const authenticatedPut = async <T = unknown>(
  endpoint: string,
  data: unknown
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const authenticatedPatch = async <T = unknown>(
  endpoint: string,
  data: unknown
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const authenticatedDelete = async <T = unknown>(
  endpoint: string,
  data: unknown = {}
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getHome(): Promise<HomeContent> {
  return apiGet<HomeContent>("/api/home");
}

export async function getArtists(): Promise<Artist[]> {
  return apiGet<Artist[]>("/api/artists");
}

export async function getArtist(id: string): Promise<Artist> {
  return apiGet<Artist>(`/api/artists/${id}`);
}

export async function getMerch(): Promise<MerchItem[]> {
  return apiGet<MerchItem[]>("/api/merch");
}

export async function getMerchItem(id: string): Promise<MerchItem> {
  return apiGet<MerchItem>(`/api/merch/${id}`);
}

export async function getAbout(): Promise<AboutContent> {
  return apiGet<AboutContent>("/api/about");
}

// ─── Admin API ───────────────────────────────────────────────────────────────

export async function createArtist(
  data: ArtistInput,
  token: string
): Promise<Artist> {
  return apiCall<Artist>("/api/admin/artists", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateArtist(
  id: string,
  data: ArtistInput,
  token: string
): Promise<Artist> {
  return apiCall<Artist>(`/api/admin/artists/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteArtist(id: string, token: string): Promise<void> {
  return apiCall<void>(`/api/admin/artists/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createMerch(
  data: MerchInput,
  token: string
): Promise<MerchItem> {
  return apiCall<MerchItem>("/api/admin/merch", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateMerch(
  id: string,
  data: MerchInput,
  token: string
): Promise<MerchItem> {
  return apiCall<MerchItem>(`/api/admin/merch/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteMerch(id: string, token: string): Promise<void> {
  return apiCall<void>(`/api/admin/merch/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function upsertHome(
  data: HomeContentInput,
  token: string
): Promise<HomeContent> {
  return apiCall<HomeContent>("/api/admin/home", {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function upsertAbout(
  data: AboutContentInput,
  token: string
): Promise<AboutContent> {
  return apiCall<AboutContent>("/api/admin/about", {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function uploadImage(
  file: { uri: string; name: string; type: string },
  token: string
): Promise<{ url: string }> {
  console.log("[API] Uploading image:", file.name);
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  const url = `${BACKEND_URL}/api/admin/upload`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${text}`);
  }

  return response.json();
}
