import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://egmaxjskylfepliwaeme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWF4anNreWxmZXBsaXdhZW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDgyMDUsImV4cCI6MjA4OTk4NDIwNX0.RUE1ybaqHAGEGOY-XVt4lLM_WHkOeHZbG2zKKPIP5CI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
