import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://egmaxjskylfepliwaeme.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
