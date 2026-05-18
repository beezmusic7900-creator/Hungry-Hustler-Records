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
import { Share2, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface SocialPostItem {
  id: string;
  artist_name: string | null;
  caption: string | null;
  post_url: string | null;
  post_date: string | null;
  is_published: boolean;
}

function formatPostDate(dateStr: string | null): string {
  if (!dateStr) return 'No date';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function SocialListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      console.log('[AdminSocialList] Loading social_posts');
      const { data, error } = await db
        .from('social_posts')
        .select('id, artist_name, caption, post_url, post_date, is_published')
        .order('post_date', { ascending: false });

      if (error) {
        console.error('[AdminSocialList] Error:', error.message);
        return;
      }
      setPosts((data ?? []) as unknown as SocialPostItem[]);
      console.log('[AdminSocialList] Loaded', data?.length ?? 0, 'posts');
    } catch (err) {
      console.error('[AdminSocialList] Failed:', err);
    }
  }, []);

  useEffect(() => {
    loadPosts().finally(() => setLoading(false));
  }, [loadPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleDelete = (post: SocialPostItem) => {
    const label = post.artist_name ?? 'this post';
    console.log('[AdminSocialList] Delete pressed for:', post.id);
    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete this post by ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[AdminSocialList] Confirming delete:', post.id);
            const { error } = await db.from('social_posts').delete().eq('id', post.id);
            if (error) {
              console.error('[AdminSocialList] Delete error:', error.message);
            } else {
              console.log('[AdminSocialList] Deleted post:', post.id);
              setPosts((prev) => prev.filter((p) => p.id !== post.id));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 8,
                }}
              >
                <SkeletonLine width="50%" height={16} />
                <SkeletonLine width="80%" height={13} />
                <SkeletonLine width="35%" height={12} />
              </View>
            ))}
          </View>
        ) : posts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Share2 size={48} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 16, marginTop: 16 }}>
              No social posts yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {posts.map((post) => {
              const dateText = formatPostDate(post.post_date);
              const captionText = post.caption ?? '';
              return (
                <View
                  key={post.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}
                        numberOfLines={1}
                      >
                        {post.artist_name ?? 'Unknown Artist'}
                      </Text>
                      {post.is_published ? (
                        <View
                          style={{
                            backgroundColor: 'rgba(0, 255, 102, 0.12)',
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderWidth: 1,
                            borderColor: 'rgba(0, 255, 102, 0.3)',
                          }}
                        >
                          <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '600' }}>
                            LIVE
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            backgroundColor: COLORS.surfaceSecondary,
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: COLORS.textTertiary, fontSize: 10, fontWeight: '600' }}>
                            DRAFT
                          </Text>
                        </View>
                      )}
                    </View>
                    {captionText ? (
                      <Text
                        style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 3 }}
                        numberOfLines={1}
                      >
                        {captionText}
                      </Text>
                    ) : null}
                    <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 3 }}>
                      {dateText}
                    </Text>
                  </View>

                  {/* Edit */}
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[AdminSocialList] Edit post:', post.id);
                      router.push(`/admin/social-form?id=${post.id}`);
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                      }}
                    >
                      <Pencil size={16} color={COLORS.primary} />
                    </View>
                  </AnimatedPressable>

                  {/* Delete */}
                  <AnimatedPressable onPress={() => handleDelete(post)}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 68, 68, 0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 68, 68, 0.3)',
                      }}
                    >
                      <Trash2 size={16} color={COLORS.danger} />
                    </View>
                  </AnimatedPressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <AnimatedPressable
        onPress={() => {
          console.log('[AdminSocialList] Add new social post');
          router.push('/admin/social-form');
        }}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 24,
          right: 20,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={26} color={COLORS.background} />
        </View>
      </AnimatedPressable>
    </View>
  );
}
