import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, User, ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';
type Category = 'listeners' | 'supporters' | 'streaks' | 'spenders';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  score: number;
  rank: number;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'all_time', label: 'All Time' },
];

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'listeners', label: 'Listeners', emoji: '🎧' },
  { key: 'supporters', label: 'Supporters', emoji: '💎' },
  { key: 'streaks', label: 'Streaks', emoji: '🔥' },
  { key: 'spenders', label: 'Spenders', emoji: '💰' },
];

function RankBadge({ rank }: { rank: number }) {
  const isGold = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;

  const bg = isGold
    ? 'rgba(245,158,11,0.2)'
    : isSilver
    ? 'rgba(156,163,175,0.2)'
    : isBronze
    ? 'rgba(180,83,9,0.2)'
    : COLORS.surfaceSecondary;

  const color = isGold
    ? '#F59E0B'
    : isSilver
    ? '#9CA3AF'
    : isBronze
    ? '#B45309'
    : COLORS.textTertiary;

  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '800' }}>
        {String(rank)}
      </Text>
    </View>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
  onPress,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  onPress: () => void;
}) {
  const displayName = entry.display_name ?? entry.username ?? 'Fan';
  const usernameText = entry.username ? `@${entry.username}` : null;
  const scoreText = entry.score.toLocaleString();

  return (
    <AnimatedPressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: isCurrentUser ? COLORS.primaryMuted : COLORS.surface,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: isCurrentUser ? COLORS.primary : COLORS.border,
        }}
      >
        <RankBadge rank={entry.rank} />

        {/* Avatar */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isCurrentUser ? COLORS.primary : COLORS.border,
          }}
        >
          {entry.avatar_url ? (
            <Image
              source={resolveImageSource(entry.avatar_url)}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              resizeMode="cover"
            />
          ) : (
            <User size={18} color={isCurrentUser ? COLORS.primary : COLORS.textSecondary} />
          )}
        </View>

        {/* Name */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: isCurrentUser ? COLORS.primary : COLORS.text,
              fontSize: 14,
              fontWeight: '700',
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {usernameText ? (
            <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 1 }}>
              {usernameText}
            </Text>
          ) : null}
        </View>

        {/* Score */}
        <Text
          style={{
            color: isCurrentUser ? COLORS.primary : COLORS.textSecondary,
            fontSize: 13,
            fontWeight: '700',
          }}
        >
          {scoreText}
        </Text>

        <ChevronRight size={14} color={COLORS.textTertiary} />
      </View>
    </AnimatedPressable>
  );
}

export default function LeaderboardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [period, setPeriod] = useState<Period>('weekly');
  const [category, setCategory] = useState<Category>('listeners');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      console.log('[Leaderboards] Loading:', period, category);
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-leaderboard`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ period, category, limit: 50 }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[Leaderboards] Error:', res.status, text);
        setEntries([]);
        return;
      }

      const json = await res.json();
      console.log('[Leaderboards] Loaded', (json.entries ?? []).length, 'entries');
      setEntries((json.entries ?? []) as LeaderboardEntry[]);
      setSnapshotDate(json.snapshot_date ?? null);
    } catch (err) {
      console.error('[Leaderboards] loadLeaderboard error:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [period, category]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const handleRowPress = (entry: LeaderboardEntry) => {
    console.log('[Leaderboards] Row pressed:', entry.user_id, entry.display_name);
    router.push(`/profile/${entry.user_id}`);
  };

  const snapshotText = snapshotDate
    ? `Updated ${new Date(snapshotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Trophy size={22} color={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>
            Leaderboards
          </Text>
        </View>
        {snapshotText ? (
          <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>{snapshotText}</Text>
        ) : null}
      </View>

      {/* Period selector */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: COLORS.surface,
          borderRadius: 10,
          padding: 4,
          marginHorizontal: 20,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {PERIODS.map((p) => (
          <AnimatedPressable
            key={p.key}
            onPress={() => {
              console.log('[Leaderboards] Period selected:', p.key);
              setPeriod(p.key);
            }}
            style={{ flex: 1 }}
          >
            <View
              style={{
                paddingVertical: 7,
                borderRadius: 7,
                alignItems: 'center',
                backgroundColor: period === p.key ? COLORS.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  color: period === p.key ? COLORS.background : COLORS.textSecondary,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {p.label}
              </Text>
            </View>
          </AnimatedPressable>
        ))}
      </View>

      {/* Category selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        style={{ marginBottom: 16, flexGrow: 0 }}
      >
        {CATEGORIES.map((c) => (
          <AnimatedPressable
            key={c.key}
            onPress={() => {
              console.log('[Leaderboards] Category selected:', c.key);
              setCategory(c.key);
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: category === c.key ? COLORS.primary : COLORS.surface,
                borderWidth: 1,
                borderColor: category === c.key ? COLORS.primary : COLORS.border,
              }}
            >
              <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
              <Text
                style={{
                  color: category === c.key ? COLORS.background : COLORS.textSecondary,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {c.label}
              </Text>
            </View>
          </AnimatedPressable>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <SkeletonLine width={32} height={32} borderRadius={8} />
              <SkeletonLine width={40} height={40} borderRadius={20} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonLine width="50%" height={14} />
                <SkeletonLine width="30%" height={11} />
              </View>
              <SkeletonLine width={50} height={13} />
            </View>
          ))
        ) : entries.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 40,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
              marginTop: 20,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Trophy size={28} color={COLORS.primary} />
            </View>
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
              No rankings yet
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                textAlign: 'center',
                marginTop: 8,
                maxWidth: 260,
                lineHeight: 20,
              }}
            >
              Leaderboards update daily — check back soon!
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <LeaderboardRow
              key={entry.user_id}
              entry={entry}
              isCurrentUser={user?.id === entry.user_id}
              onPress={() => handleRowPress(entry)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
