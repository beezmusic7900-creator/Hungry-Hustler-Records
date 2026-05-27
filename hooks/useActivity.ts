import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

export function useActivity() {
  const recordActivity = useCallback(async (
    activity_type: string,
    target_type: string,
    target_id: string,
    target_label: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      console.log('[Activity] Recording:', activity_type, target_type, target_id, target_label);
      fetch(`${SUPABASE_URL}/functions/v1/record-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ activity_type, target_type, target_id, target_label, metadata }),
      }).catch((err) => {
        console.warn('[Activity] record-activity fire-and-forget error:', err);
      });
    } catch (err) {
      console.warn('[Activity] recordActivity error:', err);
    }
  }, []);

  return { recordActivity };
}
