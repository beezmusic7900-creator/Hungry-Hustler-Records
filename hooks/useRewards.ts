import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

export type ActionType =
  | 'watch_video'
  | 'stream_song'
  | 'save_favorite'
  | 'purchase_merch'
  | 'rsvp_event'
  | 'share_content'
  | 'daily_login'
  | 'complete_profile'
  | 'view_exclusive';

interface AwardResult {
  awarded: boolean;
  points_earned?: number;
  total_points?: number;
  level?: string;
  new_achievements?: { name: string; icon: string; description: string }[];
  reason?: string;
}

export function useRewards() {
  const [awarding, setAwarding] = useState(false);

  const awardPoints = useCallback(async (
    action_type: ActionType,
    options?: { reference_id?: string; description?: string }
  ): Promise<AwardResult | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      console.log('[Rewards] Awarding points for action:', action_type, options);
      setAwarding(true);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/award-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action_type, ...options }),
      });
      if (!res.ok) {
        console.warn('[Rewards] award-points returned non-ok status:', res.status);
        return null;
      }
      const result = await res.json();
      console.log('[Rewards] Award result:', result);
      return result as AwardResult;
    } catch (err) {
      console.error('[Rewards] awardPoints error:', err);
      return null;
    } finally {
      setAwarding(false);
    }
  }, []);

  return { awardPoints, awarding };
}
