import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export async function uploadToSupabase(
  fileUri: string,
  bucket: string,
  mimeType: string
): Promise<string> {
  const filename = `${Date.now()}-${fileUri.split('/').pop()}`;
  console.log(`[uploadToSupabase] Uploading to bucket="${bucket}" filename="${filename}" mimeType="${mimeType}"`);

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: 'base64' as any,
  });

  const bytes = decode(base64);
  console.log(`[uploadToSupabase] File size: ${bytes.length} bytes`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, bytes, { contentType: mimeType, upsert: false });

  if (error) {
    console.error(`[uploadToSupabase] Upload error:`, error);
    throw error;
  }

  const publicUrl = `https://egmaxjskylfepliwaeme.supabase.co/storage/v1/object/public/${bucket}/${data.path}`;
  console.log(`[uploadToSupabase] Upload success, public URL:`, publicUrl);
  return publicUrl;
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
