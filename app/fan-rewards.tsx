import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Trophy, Star, Lock, CheckCircle, Zap, Flame, Calendar, Gift, Brain } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { TYPOGRAPHY, LAYOUT } from '@/constants/Typography';
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
  current_streak: number;
  last_check_in: string | null;
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

function formatLastCheckIn(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const dateLocalStr = date.toLocaleDateString();
  if (dateLocalStr === todayStr) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateLocalStr === yesterday.toLocaleDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isCheckedInToday(lastCheckIn: string | null): boolean {
  if (!lastCheckIn) return false;
  const last = new Date(lastCheckIn);
  const now = new Date();
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

export default function FanRewardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

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

  const handleCheckIn = async () => {
    if (!user || checkingIn) return;
    console.log('[FanRewards] Daily check-in button pressed');
    setCheckingIn(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('[FanRewards] No session for check-in');
        return;
      }

      console.log('[FanRewards] Calling award-points with daily_login');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/award-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action_type: 'daily_login' }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[FanRewards] award-points error:', res.status, text);
        Alert.alert('Check-In Failed', 'Could not record your check-in. Please try again.');
        return;
      }

      const result = await res.json();
      console.log('[FanRewards] Check-in result:', result);

      if (!result.awarded) {
        console.log('[FanRewards] Already checked in today (server confirmed)');
        // Optimistically mark as checked in
        setData(prev => prev ? {
          ...prev,
          last_check_in: new Date().toISOString(),
        } : prev);
        return;
      }

      const pointsEarned = result.points_earned ?? 0;
      const newTotal = result.total_points ?? ((data?.total_points ?? 0) + pointsEarned);
      const newStreak = result.current_streak ?? ((data?.current_streak ?? 0) + 1);

      // Optimistic update
      setData(prev => prev ? {
        ...prev,
        total_points: newTotal,
        current_streak: newStreak,
        last_check_in: new Date().toISOString(),
      } : prev);

      // Surface new badges
      const badges = (result.new_badges ?? []) as { name: string; icon: string; description: string }[];
      badges.forEach((badge) => {
        console.log('[FanRewards] New badge unlocked:', badge.name);
        Alert.alert('Badge Unlocked!', `${badge.icon} ${badge.name}\n${badge.description}`);
      });

      if (badges.length === 0) {
        Alert.alert(
          'Checked In!',
          `+${pointsEarned} pts earned\n🔥 ${newStreak} day streak`
        );
      }

      // Reload to get fresh activity list
      await loadRewards();
    } catch (err) {
      console.error('[FanRewards] handleCheckIn error:', err);
      Alert.alert('Error', 'Could not complete check-in.');
    } finally {
      setCheckingIn(false);
    }
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
        <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.text, textAlign: 'center' }}>
          Fan Rewards
        </Text>
        <Text
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.textSecondary,
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
              minHeight: LAYOUT.minTapTarget,
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...TYPOGRAPHY.button, color: COLORS.background }}>
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

  const currentStreak = data?.current_streak ?? 0;
  const lastCheckIn = data?.last_check_in ?? null;
  const alreadyCheckedIn = isCheckedInToday(lastCheckIn);
  const lastCheckInText = formatLastCheckIn(lastCheckIn);
  const streakText = currentStreak > 0 ? `${currentStreak} day${currentStreak !== 1 ? 's' : ''}` : '0 days';
  const checkInButtonLabel = checkingIn ? 'Checking In...' : alreadyCheckedIn ? 'Checked In ✓' : 'Check In';
  const checkInSubLabel = alreadyCheckedIn ? 'Come back tomorrow' : 'Earn points & keep your streak';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: 80,
        paddingHorizontal: 20,
        maxWidth: LAYOUT.feedMaxWidth,
        alignSelf: 'center',
        width: '100%',
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
      {/* ── Daily Check-In Card ── */}
      {loading ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 12,
          }}
        >
          <SkeletonLine width={140} height={18} borderRadius={8} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <SkeletonLine width={80} height={48} borderRadius={10} />
            <SkeletonLine width={80} height={48} borderRadius={10} />
          </View>
          <SkeletonLine width="100%" height={48} borderRadius={12} />
        </View>
      ) : (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: alreadyCheckedIn ? COLORS.primary : COLORS.border,
          }}
        >
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Flame size={18} color={COLORS.primary} fill={COLORS.primary} />
            <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.text }}>
              Daily Check-In
            </Text>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {/* Points */}
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.primary }}>
                {totalPointsText}
              </Text>
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>
                Total Points
              </Text>
            </View>

            {/* Streak */}
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.warning }}>
                {streakText}
              </Text>
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>
                🔥 Streak
              </Text>
            </View>

            {/* Last check-in */}
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.text, textAlign: 'center' }}>
                {lastCheckInText}
              </Text>
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>
                Last Check-In
              </Text>
            </View>
          </View>

          {/* Check-In button */}
          <AnimatedPressable
            onPress={handleCheckIn}
            disabled={alreadyCheckedIn || checkingIn}
          >
            <View
              style={{
                backgroundColor: alreadyCheckedIn ? COLORS.surfaceSecondary : COLORS.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: alreadyCheckedIn ? COLORS.primary : COLORS.primary,
                opacity: checkingIn ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  ...TYPOGRAPHY.button,
                  color: alreadyCheckedIn ? COLORS.primary : COLORS.background,
                }}
              >
                {checkInButtonLabel}
              </Text>
              <Text
                style={{
                  ...TYPOGRAPHY.caption,
                  color: alreadyCheckedIn ? COLORS.textSecondary : COLORS.textSecondary,
                  marginTop: 2,
                }}
              >
                {checkInSubLabel}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      )}

      {/* ── Spin & Trivia CTAs ── */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[FanRewards] Spin to Win pressed');
            router.push('/spin');
          }}
          style={{ flex: 1 }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(245,158,11,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.3)',
              }}
            >
              <Gift size={22} color="#F59E0B" />
            </View>
            <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.text, textAlign: 'center' }}>
              Spin to Win
            </Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' }}>
              Daily free spin
            </Text>
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => {
            console.log('[FanRewards] Trivia pressed');
            router.push('/trivia');
          }}
          style={{ flex: 1 }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(6,182,212,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(6,182,212,0.3)',
              }}
            >
              <Brain size={22} color="#06B6D4" />
            </View>
            <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.text, textAlign: 'center' }}>
              Trivia
            </Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' }}>
              Earn points
            </Text>
          </View>
        </AnimatedPressable>
      </View>

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
            <Text style={{ ...TYPOGRAPHY.display, color: COLORS.text }}>
              {totalPointsText}
            </Text>
            <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.textSecondary }}>
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
          <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary }}>
            {progressLabel}
          </Text>
        </View>
      )}

      {/* ── Recent Activity ── */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Zap size={18} color={COLORS.primary} fill={COLORS.primary} />
          <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.text }}>
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
                      style={{ ...TYPOGRAPHY.caption, fontWeight: '600', color: COLORS.text }}
                      numberOfLines={1}
                    >
                      {descText}
                    </Text>
                    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>
                      {timeText}
                    </Text>
                  </View>
                  <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.primary }}>
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
          <Text style={{ ...TYPOGRAPHY.h2, color: COLORS.text }}>
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
              const achBorderColor = ach.earned ? COLORS.primary : COLORS.border;
              return (
                <View
                  key={ach.id}
                  style={{
                    width: '47%',
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: achBorderColor,
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
                    style={{ ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}
                    numberOfLines={1}
                  >
                    {ach.name}
                  </Text>
                  <Text
                    style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, lineHeight: 16 }}
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
