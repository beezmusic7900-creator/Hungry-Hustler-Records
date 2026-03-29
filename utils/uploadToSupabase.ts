import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

export async function uploadToSupabase(
  fileUri: string,
  bucket: string,
  mimeType: string
): Promise<string> {
  const filename = `${Date.now()}-${fileUri.split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'file'}`;

  console.log(`[upload] Starting upload to bucket "${bucket}", file: ${filename}`);

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = decode(base64);
  console.log(`[upload] File size: ${bytes.length} bytes`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, bytes, { contentType: mimeType, upsert: false });

  if (error) {
    console.error(`[upload] Storage upload failed for bucket "${bucket}":`, error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  console.log(`[upload] Success. Public URL: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
