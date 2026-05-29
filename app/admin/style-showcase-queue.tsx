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
import { Camera } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type TabKey = 'pending' | 'approved' | 'featured' | 'fan_of_week' | 'rejected';

interface ShowcasePost {
  id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  status: string;
  is_featured: boolean;
  is_fan_of_week: boolean;
  like_count: number;
  created_at: string;
  fan_profiles?: { display_name: string | null; username: string | null } | null;
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
  { key: 'fan_of_week', label: 'Fan of Week' },
  { key: 'rejected', label: 'Rejected' },
];

export default function StyleShowcaseQueueScreen() {
  const insets = useSafeAreaInsets();
  useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPosts = useCallback(async (tab: TabKey) => {
    try {
      console.log('[StyleShowcaseQueue] Loading tab:', tab);
      let query = db
        .from('fan_style_showcase')
        .select('id, user_id, photo_url, caption, status, is_featured, is_fan_of_week, like_count, created_at, fan_profiles(display_name, username)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (tab === 'pending') query = query.eq('status', 'pending');
      else if (tab === 'approved') query = query.eq('status', 'approved').eq('is_featured', false).eq('is_fan_of_week', false);
      else if (tab === 'featured') query = query.eq('is_featured', true);
      else if (tab === 'fan_of_week') query = query.eq('is_fan_of_week', true);
      else if (tab === 'rejected') query = query.eq('status', 'rejected');

      const { data, error } = await query;
      if (error) { console.error('[StyleShowcaseQueue] Load error:', error.message); return; }
      setPosts((data ?? []) as ShowcasePost[]);
      console.log('[StyleShowcaseQueue] Loaded', (data ?? []).length, 'posts');
    } catch (err) {
      console.error('[StyleShowcaseQueue] loadPosts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPosts(activeTab);
      intervalRef.current = setInterval(() => loadPosts(activeTab), 30000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [activeTab, loadPosts])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts(activeTab);
    setRefreshing(false);
  };

  const handleAction = async (postId: string, action: 'approve' | 'reject' | 'feature' | 'unfeature' | 'fan_of_week' | 'remove') => {
    console.log('[StyleShowcaseQueue] Action:', action, 'on post:', postId);
    setActioning(postId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/moderate-fan-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ showcase_id: postId, action }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[StyleShowcaseQueue] moderate-fan-style error:', res.status, text);
        Alert.alert('Error', 'Could not perform action.');
        return;
      }
      console.log('[StyleShowcaseQueue] Action successful');
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('[StyleShowcaseQueue] handleAction error:', err);
      Alert.alert('Error', 'Could not perform action.');
    } finally {
      setActioning(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Style Showcase Queue</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <AnimatedPressable key={tab.key} onPress={() => {
                console.log('[StyleShowcaseQueue] Tab changed:', tab.key);
                setActiveTab(tab.key);
                setLoading(true);
              }}>
                <View style={{ backgroundColor: isActive ? COLORS.primary : COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: isActive ? COLORS.primary : COLORS.border }}>
                  <Text style={{ color: isActive ? COLORS.background : COLORS.textSecondary, fontSize: 12, fontWeight: isActive ? '700' : '400' }}>{tab.label}</Text>
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
              <View key={k} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', gap: 12 }}>
                <SkeletonLine width={80} height={80} borderRadius={10} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonLine width="60%" height={13} />
                  <SkeletonLine width="40%" height={11} />
                  <SkeletonLine width="100%" height={32} borderRadius={8} />
                </View>
              </View>
            ))}
          </View>
        ) : posts.length === 0 ? (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
            <Camera size={32} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12 }}>
              No
              {' '}
              {activeTab}
              {' '}
              posts
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {posts.map((post) => {
              const poster = post.fan_profiles?.display_name ?? post.fan_profiles?.username ?? 'Fan';
              const isActioning = actioning === post.id;

              return (
                <View key={post.id} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, opacity: isActioning ? 0.6 : 1 }}>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                    <Image source={resolveImageSource(post.photo_url)} style={{ width: 80, height: 80, borderRadius: 10 }} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{poster}</Text>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 2 }}>{timeAgo(post.created_at)}</Text>
                      {post.caption && (
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{post.caption}</Text>
                      )}
                    </View>
                  </View>

                  {isActioning ? (
                    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {activeTab === 'pending' && (
                        <>
                          <ActionButton label="Approve" color="#00C864" onPress={() => handleAction(post.id, 'approve')} />
                          <ActionButton label="Reject" color={COLORS.danger} onPress={() => handleAction(post.id, 'reject')} />
                          <ActionButton label="Feature" color={COLORS.primary} onPress={() => handleAction(post.id, 'feature')} />
                          <ActionButton label="Fan of Week" color="#F59E0B" onPress={() => handleAction(post.id, 'fan_of_week')} />
                        </>
                      )}
                      {activeTab === 'approved' && (
                        <>
                          <ActionButton label="Feature" color={COLORS.primary} onPress={() => handleAction(post.id, 'feature')} />
                          <ActionButton label="Fan of Week" color="#F59E0B" onPress={() => handleAction(post.id, 'fan_of_week')} />
                          <ActionButton label="Remove" color={COLORS.danger} onPress={() => handleAction(post.id, 'remove')} />
                        </>
                      )}
                      {(activeTab === 'featured' || activeTab === 'fan_of_week') && (
                        <>
                          <ActionButton label="Unfeature" color={COLORS.textSecondary} onPress={() => handleAction(post.id, 'unfeature')} />
                          <ActionButton label="Remove" color={COLORS.danger} onPress={() => handleAction(post.id, 'remove')} />
                        </>
                      )}
                      {activeTab === 'rejected' && (
                        <ActionButton label="Approve" color="#00C864" onPress={() => handleAction(post.id, 'approve')} />
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
      <View style={{ backgroundColor: `${color}20`, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: `${color}50` }}>
        <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      </View>
    </AnimatedPressable>
  );
}
