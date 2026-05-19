import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Trophy, Star, Lock, CheckCircle, Zap } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

interface RewardActivity {
  id: string;
  action_type: string;
  points_earned: number;
  description: string | null;
  created_at: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at?: string | null;
}

interface RewardsData {
  total_points: number;
  level: string;
  next_level: string | null;
  points_to_next: number | null;
  next_level_threshold: number | null;
  recent_activity: RewardActivity[];
  achievements: Achievement[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatPoints(pts: number): string {
  return pts.toLocaleString();
}

export default function FanRewardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[FanRewards] Fetching rewards data for user:', user.id);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-rewards`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[FanRewards] get-rewards error:', res.status, text);
        setError('Could not load rewards. Please try again.');
        return;
      }
      const json = await res.json();
      console.log('[FanRewards] Rewards data loaded:', json);
      setData(json as RewardsData);
    } catch (err) {
      console.error('[FanRewards] loadRewards error:', err);
      setError('Could not load rewards. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRewards();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, loadRewards]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRewards();
    setRefreshing(false);
  };

  // Not logged in
  if (!authLoading && !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          <Trophy size={32} color={COLORS.primary} />
        </View>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700', textAlign: 'center' }}>
          Fan Rewards
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
            maxWidth: 260,
          }}
        >
          Sign in to earn points, unlock achievements, and level up as a fan
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[FanRewards] Navigate to fan-auth');
            router.push('/fan-auth');
          }}
          style={{ marginTop: 28, width: '100%' }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
              Sign In
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  const totalPointsText = data ? formatPoints(data.total_points) : '0';
  const levelText = data?.level ?? '';
  const nextLevelText = data?.next_level ?? null;
  const pointsToNext = data?.points_to_next ?? null;
  const nextThreshold = data?.next_level_threshold ?? null;
  const progressPct = nextThreshold && pointsToNext !== null
    ? Math.max(0, Math.min(1, 1 - pointsToNext / nextThreshold))
    : 1;
  const progressLabel = nextLevelText && pointsToNext !== null && nextThreshold !== null
    ? `${formatPoints(nextThreshold - pointsToNext)} / ${formatPoints(nextThreshold)} pts to ${nextLevelText}`
    : 'Max level reached';

  const recentActivity = data?.recent_activity ?? [];
  const achievements = data?.achievements ?? [];
  const earnedAchievements = achievements.filter(a => a.earned);
  const lockedAchievements = achievements.filter(a => !a.earned);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: 80,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header / Points Card ── */}
      {loading ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 12,
          }}
        >
          <SkeletonLine width={120} height={20} borderRadius={10} />
          <SkeletonLine width={160} height={40} borderRadius={8} />
          <SkeletonLine width="100%" height={8} borderRadius={4} />
          <SkeletonLine width={200} height={14} borderRadius={6} />
        </View>
      ) : error ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[FanRewards] Retry loading');
              setLoading(true);
              loadRewards();
            }}
            style={{ marginTop: 12 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Try Again</Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          {/* Level badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Star size={16} color={COLORS.primary} fill={COLORS.primary} />
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: COLORS.primary,
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: COLORS.primaryMuted,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
                {levelText}
              </Text>
            </View>
          </View>

          {/* Points */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 20 }}>
            <Text style={{ color: COLORS.text, fontSize: 48, fontWeight: '800', letterSpacing: -1 }}>
              {totalPointsText}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 18, fontWeight: '600' }}>
              pts
            </Text>
          </View>

          {/* Progress bar */}
          <View
            style={{
              height: 8,
              backgroundColor: COLORS.surfaceTertiary,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progressPct * 100}%`,
                backgroundColor: COLORS.primary,
                borderRadius: 4,
              }}
            />
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
            {progressLabel}
          </Text>
        </View>
      )}

      {/* ── Recent Activity ── */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Zap size={18} color={COLORS.primary} fill={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
            Recent Activity
          </Text>
        </View>

        {loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2, 3].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <SkeletonLine width={32} height={32} borderRadius={16} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLine width="70%" height={13} />
                  <SkeletonLine width="40%" height={11} />
                </View>
                <SkeletonLine width={50} height={13} />
              </View>
            ))}
          </View>
        ) : recentActivity.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 28,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Zap size={28} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10, textAlign: 'center' }}>
              No activity yet — start earning points!
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {recentActivity.map((item) => {
              const timeText = timeAgo(item.created_at);
              const pointsText = `+${item.points_earned} pts`;
              const descText = item.description ?? item.action_type.replace(/_/g, ' ');
              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>⚡</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}
                      numberOfLines={1}
                    >
                      {descText}
                    </Text>
                    <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 2 }}>
                      {timeText}
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
                    {pointsText}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Achievements ── */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Trophy size={18} color={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
            Achievements
          </Text>
          {!loading && achievements.length > 0 && (
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                {earnedAchievements.length}
                /
                {achievements.length}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[0, 1, 2, 3].map((k) => (
              <View
                key={k}
                style={{
                  width: '47%',
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 8,
                }}
              >
                <SkeletonLine width={48} height={48} borderRadius={24} />
                <SkeletonLine width="80%" height={13} />
                <SkeletonLine width="100%" height={11} />
              </View>
            ))}
          </View>
        ) : achievements.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 28,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Trophy size={28} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10, textAlign: 'center' }}>
              No achievements defined yet
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {achievements.map((ach) => {
              const cardOpacity = ach.earned ? 1 : 0.4;
              const borderColor = ach.earned ? COLORS.primary : COLORS.border;
              return (
                <View
                  key={ach.id}
                  style={{
                    width: '47%',
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor,
                    opacity: cardOpacity,
                    position: 'relative',
                  }}
                >
                  {/* Icon */}
                  <View style={{ marginBottom: 10, position: 'relative', alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 36 }}>{ach.icon}</Text>
                    {ach.earned ? (
                      <View style={{ position: 'absolute', bottom: -4, right: -4 }}>
                        <CheckCircle size={16} color={COLORS.primary} fill={COLORS.primaryMuted} />
                      </View>
                    ) : (
                      <View style={{ position: 'absolute', bottom: -4, right: -4 }}>
                        <Lock size={14} color={COLORS.textTertiary} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={{ color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}
                    numberOfLines={1}
                  >
                    {ach.name}
                  </Text>
                  <Text
                    style={{ color: COLORS.textSecondary, fontSize: 11, lineHeight: 15 }}
                    numberOfLines={2}
                  >
                    {ach.description}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
