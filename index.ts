// Initialize Natively console log capture before anything else.
import './utils/errorLogger';

// Polyfill @react-native-async-storage/async-storage with a no-op in-memory
// implementation. Supabase's internal auto-refresh timer references AsyncStorage
// directly even when a custom storage adapter is provided, causing
// "Native module is null" crashes in Expo Go where the native module is not
// linked. We use SecureStore-backed chunked storage (lib/supabase.ts) for all
// real persistence — this shim just prevents the crash.
import './utils/asyncStorageShim';

import 'expo-router/entry';
