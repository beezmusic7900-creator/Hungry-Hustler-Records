import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageSourcePropType,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, MoreHorizontal, Star } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { ReportModal } from '@/components/ReportModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Submission {
  id: string;
  user_id: string;
  title: string;
  submission_type: string;
  media_type: string;
  thumbnail_url: string | null;
  status: string;
  is_featured: boolean;
  like_count: number;
  view_count: number;
  created_at: string;
  fan_profiles?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const TYPE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'dance_challenge', label: 'Dance' },
  { key: 'rap_challenge', label: 'Rap' },
  { key: 'fan_art', label: 'Fan Art' },
  { key: 'performance_clip', label: 'Performance' },
  { key: 'remix', label: 'Remix' },
  { key: 'beat', label: 'Beat' },
  { key: 'talent', label: 'Talent' },
];

const SORT_OPTIONS = [
  { key: 'trending', label: 'Trending' },
  { key: 'recent', label: 'Recent' },
  { key: 'top', label: 'Top' },
];

const TYPE_EMOJIS: Record<string, string> = {
  dance_challenge: '🕺',
  rap_challenge: '🎤',
  fan_art: '🎨',
  performance_clip: '🎬',
  remix: '🔁',
  beat: '🥁',
  talent: '⭐',
  contest_entry: '🏆',
  other: '✨',
};

export default function SubmissionsFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ contest_id?: string }>();
  const contestId = params.contest_id ?? null;
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort] = useState('trending');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ id: string } | null>(null);
  const [menuTarget, setMenuTarget] = useState<Submission | null>(null);
  const offsetRef = useRef(0);

  const loadSubmissions = useCallback(async (reset = false) => {
    try {
      const offset = reset ? 0 : offsetRef.current;
      console.log('[Submissions] Loading feed, type:', typeFilter, 'sort:', sort, 'offset:', offset);

      const url = new URL(`${SUPABASE_URL}/functions/v1/submission-feed`);
      if (typeFilter) url.searchParams.set('type', typeFilter);
      if (contestId) url.searchParams.set('contest_id', contestId);
      url.searchParams.set('sort', sort);
      url.searchParams.set('limit', '20');
      url.searchParams.set('offset', String(offset));

      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        console.error('[Submissions] Feed error:', res.status, text);
        return;
      }

      const json = await res.json();
      const items = (json.submissions ?? json ?? []) as Submission[];
      const filtered = items.filter((s) => !blockedIds.has(s.user_id));

      if (reset) {
        setSubmissions(filtered);
        offsetRef.current = filtered.length;
      } else {
        setSubmissions((prev) => [...prev, ...filtered]);
        offsetRef.current += filtered.length;
      }

      setHasMore(items.length === 20);
      console.log('[Submissions] Loaded', items.length, 'submissions');
    } catch (err) {
      console.error('[Submissions] loadSubmissions error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [typeFilter, sort, contestId, blockedIds]);

  useEffect(() => {
    setLoading(true);
    offsetRef.current = 0;
    loadSubmissions(true);
  }, [typeFilter, sort, loadSubmissions]);

  // Load user's liked submissions
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        const { data } = await db
          .from('submission_votes')
          .select('submission_id')
          .eq('user_id', user.id);
        const ids = new Set<string>((data ?? []).map((r: { submission_id: string }) => r.submission_id));
        setLikedIds(ids);
      } catch (err) {
        console.error('[Submissions] loadLikedIds error:', err);
      }
    })();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    await loadSubmissions(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadSubmissions(false);
  };

  const handleLike = async (submission: Submission) => {
    if (!user) {
      router.push('/fan-auth');
      return;
    }
    console.log('[Submissions] Like toggled for:', submission.id);
    const isLiked = likedIds.has(submission.id);

    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(submission.id);
      else next.add(submission.id);
      return next;
    });
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submission.id
          ? { ...s, like_count: s.like_count + (isLiked ? -1 : 1) }
          : s
      )
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      if (isLiked) {
        await db.from('submission_votes').delete().eq('user_id', user.id).eq('submission_id', submission.id);
      } else {
        await db.from('submission_votes').insert({ user_id: user.id, submission_id: submission.id });
      }
    } catch (err) {
      console.error('[Submissions] handleLike error:', err);
      // Revert
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(submission.id);
        else next.delete(submission.id);
        return next;
      });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id
            ? { ...s, like_count: s.like_count + (isLiked ? 1 : -1) }
            : s
        )
      );
    }
  };

  const handleBlock = async (targetUserId: string, username: string) => {
    if (!user) return;
    const displayName = username || 'this user';
    Alert.alert(
      `Block ${displayName}?`,
      "You won't see their content anymore.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            console.log('[Submissions] Blocking user:', targetUserId);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) return;
              await fetch(`${SUPABASE_URL}/functions/v1/block-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ blocked_id: targetUserId, action: 'block' }),
              });
              setSubmissions((prev) => prev.filter((s) => s.user_id !== targetUserId));
              setMenuTarget(null);
            } catch (err) {
              console.error('[Submissions] handleBlock error:', err);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Submission }) => {
    const isLiked = likedIds.has(item.id);
    const isOwn = user?.id === item.user_id;
    const emoji = TYPE_EMOJIS[item.submission_type] ?? '✨';
    const ownerName = item.fan_profiles?.display_name ?? item.fan_profiles?.username ?? 'Fan';
    const likeText = String(item.like_count);

    return (
      <AnimatedPressable
        onPress={() => {
          console.log('[Submissions] Card tapped:', item.id);
          router.push(`/submissions/${item.id}`);
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 12,
          }}
        >
          {/* Thumbnail */}
          <View style={{ width: '100%', height: 200, backgroundColor: COLORS.surfaceSecondary }}>
            {item.thumbnail_url ? (
              <Image
                source={resolveImageSource(item.thumbnail_url)}
                style={{ width: '100%', height: 200 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 48 }}>{emoji}</Text>
              </View>
            )}
            {item.is_featured && (
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  backgroundColor: COLORS.primary,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: COLORS.background, fontSize: 10, fontWeight: '800' }}>⭐ FEATURED</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={{ fontSize: 12 }}>{emoji}</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{ownerName}</Text>
                </View>
              </View>

              {/* Three-dot menu */}
              {!isOwn && (
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Submissions] Menu pressed for:', item.id);
                    setMenuTarget(item);
                  }}
                >
                  <View style={{ padding: 4 }}>
                    <MoreHorizontal size={18} color={COLORS.textSecondary} />
                  </View>
                </AnimatedPressable>
              )}
            </View>

            {/* Like button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <AnimatedPressable
                onPress={() => handleLike(item)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Heart
                    size={18}
                    color={isLiked ? COLORS.danger : COLORS.textSecondary}
                    fill={isLiked ? COLORS.danger : 'transparent'}
                  />
                  <Text style={{ color: isLiked ? COLORS.danger : COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>
                    {likeText}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 14 }}>
          Fan Submissions
        </Text>

        {/* Type filter chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TYPE_FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isActive = typeFilter === item.key;
            return (
              <AnimatedPressable
                onPress={() => {
                  console.log('[Submissions] Type filter:', item.key);
                  setTypeFilter(item.key);
                }}
                style={{ marginRight: 8 }}
              >
                <View
                  style={{
                    backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? COLORS.background : COLORS.textSecondary,
                      fontSize: 13,
                      fontWeight: isActive ? '700' : '400',
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          }}
          style={{ marginBottom: 10 }}
        />

        {/* Sort */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sort === opt.key;
            return (
              <AnimatedPressable
                key={opt.key}
                onPress={() => {
                  console.log('[Submissions] Sort changed:', opt.key);
                  setSort(opt.key);
                }}
              >
                <View
                  style={{
                    backgroundColor: isActive ? COLORS.primaryMuted : 'transparent',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? COLORS.primary : COLORS.textSecondary,
                      fontSize: 12,
                      fontWeight: isActive ? '700' : '400',
                    }}
                  >
                    {opt.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {[0, 1, 2].map((k) => (
            <View key={k} style={{ backgroundColor: COLORS.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              <SkeletonLine width="100%" height={200} borderRadius={0} />
              <View style={{ padding: 12, gap: 8 }}>
                <SkeletonLine width="70%" height={14} />
                <SkeletonLine width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
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
              <Star size={32} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
                No submissions yet
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', maxWidth: 260 }}>
                Be the first to share your talent with the HHR community!
              </Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Submissions] Submit CTA pressed');
                  router.push('/submit');
                }}
                style={{ marginTop: 16 }}
              >
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}>
                  <Text style={{ color: COLORS.background, fontSize: 14, fontWeight: '700' }}>Submit Your Content</Text>
                </View>
              </AnimatedPressable>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Three-dot menu modal */}
      <Modal
        visible={menuTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuTarget(null)}
      >
        <AnimatedPressable
          onPress={() => setMenuTarget(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 40,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <AnimatedPressable
              onPress={() => {
                if (!menuTarget) return;
                setReportTarget({ id: menuTarget.id });
                setMenuTarget(null);
              }}
            >
              <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
                <Text style={{ color: COLORS.danger, fontSize: 15, fontWeight: '600' }}>🚩 Report</Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => {
                if (!menuTarget) return;
                const name = menuTarget.fan_profiles?.display_name ?? menuTarget.fan_profiles?.username ?? 'this user';
                handleBlock(menuTarget.user_id, name);
              }}
            >
              <View style={{ paddingVertical: 14 }}>
                <Text style={{ color: COLORS.danger, fontSize: 15, fontWeight: '600' }}>🚫 Block creator</Text>
              </View>
            </AnimatedPressable>
          </View>
        </AnimatedPressable>
      </Modal>

      {/* Report modal */}
      <ReportModal
        targetType="submission"
        targetId={reportTarget?.id ?? ''}
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
      />
    </View>
  );
}
