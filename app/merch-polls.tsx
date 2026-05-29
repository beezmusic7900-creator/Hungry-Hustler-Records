import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  merch_id: string | null;
  vote_count: number;
  position: number;
}

interface MerchPoll {
  id: string;
  title: string;
  poll_type: string;
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
  options: PollOption[];
  userVoteOptionId: string | null;
}

function VoteBar({ pct, animated }: { pct: number; animated: boolean }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: animated ? 600 : 0,
      useNativeDriver: false,
    }).start();
  }, [pct, animated]);

  return (
    <View
      style={{
        height: 6,
        backgroundColor: COLORS.surfaceTertiary,
        borderRadius: 3,
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          backgroundColor: COLORS.primary,
          borderRadius: 3,
        }}
      />
    </View>
  );
}

export default function MerchPollsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [polls, setPolls] = useState<MerchPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  const loadPolls = useCallback(async () => {
    try {
      console.log('[MerchPolls] Loading active merch polls');
      const { data: pollData, error } = await db
        .from('merch_polls')
        .select('id, title, poll_type, is_active, ends_at, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MerchPolls] Load error:', error.message);
        return;
      }

      const pollIds = ((pollData ?? []) as MerchPoll[]).map((p) => p.id);
      if (pollIds.length === 0) {
        setPolls([]);
        return;
      }

      const { data: optionData } = await db
        .from('merch_poll_options')
        .select('id, poll_id, label, merch_id, vote_count, position')
        .in('poll_id', pollIds)
        .order('position', { ascending: true });

      let userVotes: Record<string, string> = {};
      if (user) {
        const { data: voteData } = await db
          .from('merch_poll_votes')
          .select('poll_id, option_id')
          .eq('user_id', user.id)
          .in('poll_id', pollIds);
        ((voteData ?? []) as { poll_id: string; option_id: string }[]).forEach((v) => {
          userVotes[v.poll_id] = v.option_id;
        });
      }

      const optionsByPoll: Record<string, PollOption[]> = {};
      ((optionData ?? []) as PollOption[]).forEach((o) => {
        if (!optionsByPoll[o.poll_id]) optionsByPoll[o.poll_id] = [];
        optionsByPoll[o.poll_id].push(o);
      });

      const merged: MerchPoll[] = ((pollData ?? []) as MerchPoll[]).map((p) => ({
        ...p,
        options: optionsByPoll[p.id] ?? [],
        userVoteOptionId: userVotes[p.id] ?? null,
      }));

      console.log('[MerchPolls] Loaded', merged.length, 'polls');
      setPolls(merged);
    } catch (err) {
      console.error('[MerchPolls] loadPolls error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPolls();
    setRefreshing(false);
  };

  const handleVote = async (poll: MerchPoll, optionId: string) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to vote.');
      return;
    }
    console.log('[MerchPolls] Vote pressed — poll:', poll.id, 'option:', optionId);
    setVoting(poll.id);

    try {
      const prevVoteId = poll.userVoteOptionId;

      // Optimistic update
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== poll.id) return p;
          const updatedOptions = p.options.map((o) => {
            if (o.id === prevVoteId) return { ...o, vote_count: Math.max(0, o.vote_count - 1) };
            if (o.id === optionId) return { ...o, vote_count: o.vote_count + 1 };
            return o;
          });
          return { ...p, options: updatedOptions, userVoteOptionId: optionId };
        })
      );

      // Remove old vote if exists
      if (prevVoteId) {
        await db
          .from('merch_poll_votes')
          .delete()
          .eq('poll_id', poll.id)
          .eq('user_id', user.id);
      }

      // Insert new vote
      const { error } = await db.from('merch_poll_votes').insert({
        poll_id: poll.id,
        option_id: optionId,
        user_id: user.id,
      });

      if (error) {
        console.error('[MerchPolls] Vote insert error:', error.message);
        // Revert
        await loadPolls();
        Alert.alert('Error', 'Could not record your vote. Please try again.');
      } else {
        console.log('[MerchPolls] Vote recorded successfully');
      }
    } catch (err) {
      console.error('[MerchPolls] handleVote error:', err);
      await loadPolls();
    } finally {
      setVoting(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: 80,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <BarChart2 size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>
          Merch Polls
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 16 }}>
          {[0, 1].map((k) => (
            <View
              key={k}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 12,
              }}
            >
              <SkeletonLine width="70%" height={18} />
              {[0, 1, 2, 3].map((j) => (
                <SkeletonLine key={j} width="100%" height={40} borderRadius={10} />
              ))}
            </View>
          ))}
        </View>
      ) : polls.length === 0 ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 40,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <BarChart2 size={40} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
            No active polls
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            Check back soon for new merch polls
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {polls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.vote_count, 0);
            const hasVoted = poll.userVoteOptionId !== null;
            const isVoting = voting === poll.id;

            return (
              <View
                key={poll.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 4, lineHeight: 24 }}>
                  {poll.title}
                </Text>
                <Text style={{ color: COLORS.textTertiary, fontSize: 12, marginBottom: 14 }}>
                  {String(totalVotes)}
                  {' votes'}
                  {poll.ends_at ? ` · Ends ${new Date(poll.ends_at).toLocaleDateString()}` : ''}
                </Text>

                <View style={{ gap: 10 }}>
                  {poll.options.map((option) => {
                    const pct = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
                    const isSelected = poll.userVoteOptionId === option.id;

                    return (
                      <AnimatedPressable
                        key={option.id}
                        onPress={() => handleVote(poll, option.id)}
                        disabled={isVoting}
                      >
                        <View
                          style={{
                            backgroundColor: isSelected ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                            borderRadius: 10,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: isSelected ? COLORS.primary : COLORS.border,
                            opacity: isVoting ? 0.7 : 1,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasVoted ? 8 : 0 }}>
                            <Text
                              style={{
                                color: isSelected ? COLORS.primary : COLORS.text,
                                fontSize: 14,
                                fontWeight: isSelected ? '700' : '400',
                                flex: 1,
                              }}
                              numberOfLines={2}
                            >
                              {option.label}
                            </Text>
                            {hasVoted && (
                              <Text style={{ color: isSelected ? COLORS.primary : COLORS.textSecondary, fontSize: 13, fontWeight: '700', marginLeft: 8 }}>
                                {String(pct)}
                                {'%'}
                              </Text>
                            )}
                          </View>
                          {hasVoted && (
                            <VoteBar pct={pct} animated />
                          )}
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
