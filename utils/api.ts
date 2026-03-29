
/**
 * utils/api.ts — Legacy stub. Backend has been migrated to Supabase.
 * BACKEND_URL is intentionally empty. Use utils/supabaseApi.ts instead.
 */

export const BACKEND_URL = '';

export const isBackendConfigured = (): boolean => false;

export const getBearerToken = async (): Promise<string | null> => null;

const noopError = () => {
  throw new Error('Use Supabase API instead (utils/supabaseApi.ts)');
};

export const apiCall = async <T = any>(_endpoint: string, _options?: RequestInit): Promise<T> => {
  noopError();
  return undefined as any;
};

export const apiGet = async <T = any>(_endpoint: string): Promise<T> => {
  noopError();
  return undefined as any;
};

export const apiPost = async <T = any>(_endpoint: string, _data: any): Promise<T> => {
  noopError();
  return undefined as any;
};

export const apiPut = async <T = any>(_endpoint: string, _data: any): Promise<T> => {
  noopError();
  return undefined as any;
};

export const apiPatch = async <T = any>(_endpoint: string, _data: any): Promise<T> => {
  noopError();
  return undefined as any;
};

export const apiDelete = async <T = any>(_endpoint: string, _data?: any): Promise<T> => {
  noopError();
  return undefined as any;
};

export const authenticatedApiCall = async <T = any>(_endpoint: string, _options?: RequestInit): Promise<T> => {
  noopError();
  return undefined as any;
};

export const authenticatedGet = async <T = any>(_endpoint: string): Promise<T> => {
  noopError();
  return undefined as any;
};

export const authenticatedPost = async <T = any>(_endpoint: string, _data: any): Promise<T> => {
  noopError();
  return undefined as any;
};

export const authenticatedPut = async <T = any>(_endpoint: string, _data: any): Promise<T> => {
  noopError();
  return undefined as any;
};

export const authenticatedPatch = async <T = any>(_endpoint: string, _data: any): Promise<T> => {
  noopError();
  return undefined as any;
};

export const authenticatedDelete = async <T = any>(_endpoint: string, _data?: any): Promise<T> => {
  noopError();
  return undefined as any;
};

export const authenticatedUpload = async <T = any>(
  _endpoint: string,
  _uri: string,
  _filename: string,
  _mimeType: string
): Promise<T> => {
  noopError();
  return undefined as any;
};
