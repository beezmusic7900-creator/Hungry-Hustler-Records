import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { BEARER_TOKEN_KEY } from '@/lib/auth';

const SUPABASE_FUNCTIONS_URL = 'https://egmaxjskylfepliwaeme.supabase.co/functions/v1';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWF4anNreWxmZXBsaXdhZW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDgyMDUsImV4cCI6MjA4OTk4NDIwNX0.RUE1ybaqHAGEGOY-XVt4lLM_WHkOeHZbG2zKKPIP5CI';

async function getBearerToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(BEARER_TOKEN_KEY) : null;
    }
    return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
  } catch {
    return null;
  }
}

function resolveEdgeFunctionUrl(endpoint: string): string {
  // Strip /api prefix and map to edge function name
  const path = endpoint.replace(/^\/api/, '');

  if (path.startsWith('/admin')) return `${SUPABASE_FUNCTIONS_URL}/admin${path.replace('/admin', '')}`;
  if (path.startsWith('/artists')) return `${SUPABASE_FUNCTIONS_URL}/artists${path.replace('/artists', '')}`;
  if (path.startsWith('/releases')) return `${SUPABASE_FUNCTIONS_URL}/releases${path.replace('/releases', '')}`;
  if (path.startsWith('/videos')) return `${SUPABASE_FUNCTIONS_URL}/videos${path.replace('/videos', '')}`;
  if (path.startsWith('/events')) return `${SUPABASE_FUNCTIONS_URL}/events${path.replace('/events', '')}`;
  if (path.startsWith('/news')) return `${SUPABASE_FUNCTIONS_URL}/news${path.replace('/news', '')}`;

  throw new Error(`No Supabase Edge Function mapped for endpoint: ${endpoint}`);
}

export async function supabaseApiCall<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = resolveEdgeFunctionUrl(endpoint);
  console.log(`[supabaseApi] ${options?.method ?? 'GET'} ${url}`);

  const token = await getBearerToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    ...((options?.headers as Record<string, string>) ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[supabaseApi] Error ${res.status} for ${url}:`, text);
    throw new Error(`Supabase API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  console.log(`[supabaseApi] Response from ${url}:`, json);
  return json;
}

export const supabaseGet = <T = any>(endpoint: string) =>
  supabaseApiCall<T>(endpoint, { method: 'GET' });

export const supabasePost = <T = any>(endpoint: string, data?: any) =>
  supabaseApiCall<T>(endpoint, { method: 'POST', body: JSON.stringify(data ?? {}) });

export const supabasePut = <T = any>(endpoint: string, data?: any) =>
  supabaseApiCall<T>(endpoint, { method: 'PUT', body: JSON.stringify(data ?? {}) });

export const supabaseDelete = <T = any>(endpoint: string) =>
  supabaseApiCall<T>(endpoint, { method: 'DELETE' });
