import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function callEdgeFunction<T = any>(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  queryParams?: Record<string, string>
): Promise<T> {
  const token = await getAccessToken();
  let url = `${SUPABASE_FUNCTIONS_URL}/${functionName}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  console.log(`[supabaseApi] ${method} ${url}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options: RequestInit = { method, headers };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    console.error(`[supabaseApi] Error ${res.status} for ${url}:`, text);
    throw new Error(`Edge function error ${res.status}: ${text}`);
  }
  const json = await res.json();
  console.log(`[supabaseApi] Response from ${url}:`, json);
  return json;
}

export const supabaseGet = <T = any>(fn: string, params?: Record<string, string>) =>
  callEdgeFunction<T>(fn, 'GET', undefined, params);

export const supabasePost = <T = any>(fn: string, data?: any) =>
  callEdgeFunction<T>(fn, 'POST', data);

export const supabasePut = <T = any>(fn: string, data?: any) =>
  callEdgeFunction<T>(fn, 'PUT', data);

export const supabaseDelete = <T = any>(fn: string) =>
  callEdgeFunction<T>(fn, 'DELETE');
