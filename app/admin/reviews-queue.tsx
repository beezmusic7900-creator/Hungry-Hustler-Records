import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type TabKey = 'pending' | 'approved' | 'featured' | 'rejected';

interface Review {
  id: string;
  user_id: string;
  merch_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  photo_urls: string[] | null;
  status: string;
  is_featured: boolean;
  like_count: number;
  created_at: string;
  fan_profiles?: { display_name: string | null; username: string | null } | null;
  merch?: { name: string; image_url: string | null } | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'featured', label: 'Featured' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_MAP: Record<TabKey, string> = {
  pending: 'pending',
  approved: 'approved',
  featured: 'featured',
  rejected: 'rejected',
};

export default function ReviewsQueueScreen() {
  const insets = useSafeAreaInsets();
  useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadReviews = useCallback(async (tab: TabKey) => {
    try {
      console.log('[ReviewsQueue] Loading tab:', tab);
      const status = STATUS_MAP[tab];
      const query = tab === 'featured'
        ? db.from('product_reviews').select('id, user_id, merch_id, rating, title, body, photo_urls, status, is_featured, like_count, created_at, fan_profiles(display_name, username)').eq('is_featured', true).in('status', ['approved', 'featured'])
        : db.from('product_reviews').select('id, user_id, merch_id, rating, title, body, photo_urls, status, is_featured, like_count, created_at, fan_profiles(display_name, username)').eq('status', status);

      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
      if (error) { console.error('[ReviewsQueue] Load error:', error.message); return; }

      const rows = (data ?? []) as Review[];
      const merchIds = [...new Set(rows.map((r) => r.merch_id))];
      if (merchIds.length > 0) {
        const { data: merchData } = await db.from('merch').select('id, name, image_url').in('id', merchIds);
        const merchMap: Record<string, { name: string; image_url: string | null }> = {};
        ((merchData ?? []) as { id: string; name: string; image_url: string | null }[]).forEach((m) => { merchMap[m.id] = m; });
        setReviews(rows.map((r) => ({ ...r, merch: merchMap[r.merch_id] ?? null })));
      } else {
        setReviews(rows);
      }
      console.log('[ReviewsQueue] Loaded', rows.length, 'reviews');
    } catch (err) {
      console.error('[ReviewsQueue] loadReviews error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReviews(activeTab);
      intervalRef.current = setInterval(() => loadReviews(activeTab), 30000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [activeTab, loadReviews])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReviews(activeTab);
    setRefreshing(false);
  };

  const handleAction = async (reviewId: string, action: 'approve' | 'reject' | 'feature' | 'unfeature') => {
    console.log('[ReviewsQueue] Action:', action, 'on review:', reviewId);
    setActioning(reviewId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/moderate-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ review_id: reviewId, action }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[ReviewsQueue] moderate-review error:', res.status, text);
        Alert.alert('Error', 'Could not perform action.');
        return;
      }
      console.log('[ReviewsQueue] Action successful');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      console.error('[ReviewsQueue] handleAction error:', err);
      Alert.alert('Error', 'Could not perform action.');
    } finally {
      setActioning(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Tabs */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
          Reviews Queue
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <AnimatedPressable
                key={tab.key}
                onPress={() => {
                  console.log('[ReviewsQueue] Tab changed:', tab.key);
                  setActiveTab(tab.key);
                  setLoading(true);
                }}
              >
                <View
                  style={{
                    backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text style={{ color: isActive ? COLORS.background : COLORS.textSecondary, fontSize: 13, fontWeight: isActive ? '700' : '400' }}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View key={k} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <SkeletonLine width={48} height={48} borderRadius={8} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonLine width="60%" height={13} />
                    <SkeletonLine width="40%" height={11} />
                  </View>
                </View>
                <SkeletonLine width="100%" height={40} />
                <SkeletonLine width="100%" height={36} borderRadius={8} />
              </View>
            ))}
          </View>
        ) : reviews.length === 0 ? (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
            <Star size={32} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12 }}>
              No
              {' '}
              {activeTab}
              {' '}
              reviews
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {reviews.map((review) => {
              const reviewer = review.fan_profiles?.display_name ?? review.fan_profiles?.username ?? 'Fan';
              const isActioning = actioning === review.id;

              return (
                <View
                  key={review.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    opacity: isActioning ? 0.6 : 1,
                  }}
                >
                  {/* Product + reviewer */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: COLORS.surfaceSecondary, overflow: 'hidden' }}>
                      {review.merch?.image_url ? (
                        <Image source={resolveImageSource(review.merch.image_url)} style={{ width: 48, height: 48 }} resizeMode="cover" />
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                        {review.merch?.name ?? 'Unknown product'}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                        by
                        {' '}
                        {reviewer}
                        {' · '}
                        {timeAgo(review.created_at)}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={12} color="#F59E0B" fill={s <= review.rating ? '#F59E0B' : 'transparent'} />
                        ))}
                      </View>
                    </View>
                  </View>

                  {review.title && (
                    <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                      {review.title}
                    </Text>
                  )}
                  {review.body && (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 8 }} numberOfLines={3}>
                      {review.body}
                    </Text>
                  )}

                  {/* Photo thumbnails */}
                  {review.photo_urls && review.photo_urls.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      {review.photo_urls.map((url, idx) => (
                        <Image key={idx} source={resolveImageSource(url)} style={{ width: 56, height: 56, borderRadius: 6, marginRight: 6 }} resizeMode="cover" />
                      ))}
                    </ScrollView>
                  )}

                  {/* Action buttons */}
                  {isActioning ? (
                    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {activeTab === 'pending' && (
                        <>
                          <ActionButton label="Approve" color="#00C864" onPress={() => handleAction(review.id, 'approve')} />
                          <ActionButton label="Reject" color={COLORS.danger} onPress={() => handleAction(review.id, 'reject')} />
                          <ActionButton label="Feature" color={COLORS.primary} onPress={() => handleAction(review.id, 'feature')} />
                        </>
                      )}
                      {activeTab === 'approved' && (
                        <>
                          <ActionButton label="Feature" color={COLORS.primary} onPress={() => handleAction(review.id, 'feature')} />
                          <ActionButton label="Reject" color={COLORS.danger} onPress={() => handleAction(review.id, 'reject')} />
                        </>
                      )}
                      {activeTab === 'featured' && (
                        <ActionButton label="Unfeature" color={COLORS.textSecondary} onPress={() => handleAction(review.id, 'unfeature')} />
                      )}
                      {activeTab === 'rejected' && (
                        <ActionButton label="Approve" color="#00C864" onPress={() => handleAction(review.id, 'approve')} />
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActionButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress}>
      <View
        style={{
          backgroundColor: `${color}20`,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderWidth: 1,
          borderColor: `${color}50`,
        }}
      >
        <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      </View>
    </AnimatedPressable>
  );
}
