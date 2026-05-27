import React, { useEffect, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRewards } from '@/hooks/useRewards';
import { useActivity } from '@/hooks/useActivity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type ReactionType = 'like' | 'fire' | 'heart' | 'clap';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'heart', emoji: '❤️', label: 'Heart' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
];

interface ReactionCounts {
  like: number;
  fire: number;
  heart: number;
  clap: number;
}

interface Props {
  targetType: 'song' | 'video' | 'news' | 'social_post';
  targetId: string;
  compact?: boolean;
}

export function ReactionBar({ targetType, targetId, compact = false }: Props) {
  const { user } = useAuth();
  const { awardPoints } = useRewards();
  const { recordActivity } = useActivity();

  const [counts, setCounts] = useState<ReactionCounts>({ like: 0, fire: 0, heart: 0, clap: 0 });
  const [userReactions, setUserReactions] = useState<Set<ReactionType>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadReactions = useCallback(async () => {
    try {
      console.log('[ReactionBar] Loading reactions for', targetType, targetId);
      const { data, error } = await db
        .from('reactions')
        .select('reaction_type, user_id')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (error) {
        console.error('[ReactionBar] Load error:', error.message);
        return;
      }

      const newCounts: ReactionCounts = { like: 0, fire: 0, heart: 0, clap: 0 };
      const myReactions = new Set<ReactionType>();

      for (const row of (data ?? [])) {
        const rt = row.reaction_type as ReactionType;
        if (rt in newCounts) newCounts[rt]++;
        if (user && row.user_id === user.id) myReactions.add(rt);
      }

      setCounts(newCounts);
      setUserReactions(myReactions);
    } catch (err) {
      console.error('[ReactionBar] loadReactions error:', err);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, user]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  const handleReaction = useCallback(async (reactionType: ReactionType) => {
    if (!user) return;
    console.log('[ReactionBar] Toggle reaction:', reactionType, 'for', targetType, targetId);

    const alreadyReacted = userReactions.has(reactionType);

    // Optimistic update
    setCounts((prev) => ({
      ...prev,
      [reactionType]: alreadyReacted ? Math.max(0, prev[reactionType] - 1) : prev[reactionType] + 1,
    }));
    setUserReactions((prev) => {
      const next = new Set(prev);
      if (alreadyReacted) {
        next.delete(reactionType);
      } else {
        next.add(reactionType);
      }
      return next;
    });

    try {
      if (alreadyReacted) {
        const { error } = await db
          .from('reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .eq('reaction_type', reactionType);
        if (error) {
          console.error('[ReactionBar] Delete reaction error:', error.message);
          loadReactions(); // revert
        }
      } else {
        const { error } = await db
          .from('reactions')
          .insert({
            user_id: user.id,
            target_type: targetType,
            target_id: targetId,
            reaction_type: reactionType,
          });
        if (error) {
          console.error('[ReactionBar] Insert reaction error:', error.message);
          loadReactions(); // revert
        } else {
          awardPoints('like_post', { reference_id: targetId });
          recordActivity('reacted', targetType, targetId, targetId).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[ReactionBar] handleReaction error:', err);
      loadReactions();
    }
  }, [user, userReactions, targetType, targetId, loadReactions, awardPoints, recordActivity]);

  if (loading) return null;

  if (compact) {
    const total = counts.like + counts.fire + counts.heart + counts.clap;
    const topReaction = REACTIONS.reduce((best, r) =>
      counts[r.type] > counts[best.type] ? r : best
    , REACTIONS[0]);
    const totalText = String(total);
    const topEmoji = topReaction.emoji;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 14 }}>{topEmoji}</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{totalText}</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {REACTIONS.map((r) => {
        const count = counts[r.type];
        const active = userReactions.has(r.type);
        const countText = String(count);
        const borderColor = active ? COLORS.primary : COLORS.border;
        const bgColor = active ? COLORS.primaryMuted : COLORS.surfaceSecondary;

        return (
          <AnimatedPressable
            key={r.type}
            onPress={() => handleReaction(r.type)}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor,
                backgroundColor: bgColor,
              }}
            >
              <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
              {count > 0 && (
                <Text style={{ color: active ? COLORS.primary : COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {countText}
                </Text>
              )}
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
