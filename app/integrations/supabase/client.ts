// Re-use the shared Supabase client that uses SecureStore-backed chunked storage.
// Do NOT create a second client here — duplicate clients cause "Native module is null"
// crashes because @react-native-async-storage/async-storage is not properly linked
// in Expo Go / bare workflow without additional native setup.
export { supabase } from '@/lib/supabase';
