import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
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
  | 'view_exclusive'
  | 'comment'
  | 'like_post'
  | 'complete_listen'
  | 'vote_song'
  | 'ask_artist'
  | 'vote_poll'
  | 'follow_user'
  | 'attend_event';

interface BadgeDetail {
  name: string;
  icon: string;
  description: string;
}

interface AwardResult {
  awarded: boolean;
  points_earned?: number;
  total_points?: number;
  level?: string;
  new_achievements?: { name: string; icon: string; description: string }[];
  new_badges?: BadgeDetail[];
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
      const result = await res.json() as AwardResult;
      console.log('[Rewards] Award result:', result);

      // Surface new badges via Alert
      const badges = result.new_badges ?? [];
      badges.forEach((badge) => {
        console.log('[Rewards] New badge unlocked:', badge.name);
        Alert.alert(
          'Badge Unlocked!',
          `${badge.icon} ${badge.name}\n${badge.description}`
        );
      });

      return result;
    } catch (err) {
      console.error('[Rewards] awardPoints error:', err);
      return null;
    } finally {
      setAwarding(false);
    }
  }, []);

  return { awardPoints, awarding };
}
