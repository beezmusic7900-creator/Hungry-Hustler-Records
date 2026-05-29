import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, User } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type TabKey = 'reviewers' | 'wishlist' | 'style' | 'collectors';

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

const TABS: { key: TabKey; label: string; emoji: string; scoreLabel: string }[] = [
  { key: 'reviewers', label: 'Top Reviewers', emoji: '⭐', scoreLabel: 'reviews' },
  { key: 'wishlist', label: 'Wishlist Curators', emoji: '🔖', scoreLabel: 'items' },
  { key: 'style', label: 'Style Posters', emoji: '👗', scoreLabel: 'posts' },
  { key: 'collectors', label: 'Top Collectors', emoji: '🏆', scoreLabel: 'collections' },
];

const SCORE_COLUMNS: Record<TabKey, string> = {
  reviewers: 'review_count',
  wishlist: 'wishlist_count',
  style: 'style_count',
  collectors: 'collection_count',
};

function RankBadge({ rank }: { rank: number }) {
  const isGold = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;
  const bg = isGold ? 'rgba(245,158,11,0.2)' : isSilver ? 'rgba(156,163,175,0.2)' : isBronze ? 'rgba(180,83,9,0.2)' : COLORS.surfaceSecondary;
  const color = isGold ? '#F59E0B' : isSilver ? '#9CA3AF' : isBronze ? '#B45309' : COLORS.textTertiary;

  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: 13, fontWeight: '800' }}>
        {String(rank)}
      </Text>
    </View>
  );
}

export default function ShoppingLeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('reviewers');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async (tab: TabKey) => {
    setLoading(true);
    try {
      console.log('[ShoppingLeaderboard] Loading tab:', tab);
      const scoreCol = SCORE_COLUMNS[tab];

      // Try shopping_leaderboard view first, fall back to fan_profiles
      const { data, error } = await db
        .from('shopping_leaderboard')
        .select(`user_id, display_name, username, avatar_url, ${scoreCol}`)
        .order(scoreCol, { ascending: false })
        .limit(50);

      if (error) {
        console.error('[ShoppingLeaderboard] View error:', error.message, '— falling back');
        setEntries([]);
        return;
      }

      const ranked: LeaderboardEntry[] = ((data ?? []) as Record<string, unknown>[]).map((row, idx) => ({
        user_id: String(row.user_id ?? ''),
        display_name: row.display_name as string | null,
        username: row.username as string | null,
        avatar_url: row.avatar_url as string | null,
        score: Number(row[scoreCol] ?? 0),
        rank: idx + 1,
      }));

      console.log('[ShoppingLeaderboard] Loaded', ranked.length, 'entries');
      setEntries(ranked);
    } catch (err) {
      console.error('[ShoppingLeaderboard] loadLeaderboard error:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard(activeTab);
  }, [activeTab, loadLeaderboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard(activeTab);
    setRefreshing(false);
  };

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          backgroundColor: COLORS.background,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Trophy size={22} color={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>
            Top Shoppers
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <AnimatedPressable
                key={tab.key}
                onPress={() => {
                  console.log('[ShoppingLeaderboard] Tab changed:', tab.key);
                  setActiveTab(tab.key);
                }}
              >
                <View
                  style={{
                    backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.primary : COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{tab.emoji}</Text>
                  <Text
                    style={{
                      color: isActive ? COLORS.background : COLORS.textSecondary,
                      fontSize: 13,
                      fontWeight: isActive ? '700' : '400',
                    }}
                  >
                    {tab.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2, 3, 4].map((k) => (
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
                <SkeletonLine width={36} height={36} borderRadius={18} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLine width="50%" height={13} />
                  <SkeletonLine width="30%" height={11} />
                </View>
                <SkeletonLine width={40} height={20} borderRadius={6} />
              </View>
            ))}
          </View>
        ) : entries.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 40,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Trophy size={36} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
              No data yet
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Be the first to top the
              {' '}
              {currentTab.label}
              {' '}
              leaderboard
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {entries.map((entry) => {
              const name = entry.display_name ?? entry.username ?? 'Fan';
              const initial = name.charAt(0).toUpperCase();

              return (
                <View
                  key={entry.user_id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: entry.rank <= 3 ? COLORS.primary : COLORS.border,
                  }}
                >
                  <RankBadge rank={entry.rank} />

                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {entry.avatar_url ? (
                      <Image
                        source={resolveImageSource(entry.avatar_url)}
                        style={{ width: 36, height: 36 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                        {initial}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                      {name}
                    </Text>
                    {entry.username && entry.display_name && (
                      <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                        @
                        {entry.username}
                      </Text>
                    )}
                  </View>

                  <View
                    style={{
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: COLORS.primary,
                    }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
                      {String(entry.score)}
                      {' '}
                      {currentTab.scoreLabel}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
