import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Heart, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_SIZE = (SCREEN_WIDTH - 40 - 8) / 2;

interface ShowcasePost {
  id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  is_featured: boolean;
  is_fan_of_week: boolean;
  like_count: number;
  created_at: string;
  fan_profiles?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function StyleShowcaseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [fanOfWeek, setFanOfWeek] = useState<ShowcasePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ShowcasePost | null>(null);
  const [liking, setLiking] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      console.log('[StyleShowcase] Loading showcase posts');
      const { data, error } = await db
        .from('fan_style_showcase')
        .select('id, user_id, photo_url, caption, is_featured, is_fan_of_week, like_count, created_at, fan_profiles(display_name, username, avatar_url)')
        .in('status', ['approved', 'featured'])
        .order('is_fan_of_week', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) {
        console.error('[StyleShowcase] Load error:', error.message);
        return;
      }

      const all = (data ?? []) as ShowcasePost[];
      const fotw = all.find((p) => p.is_fan_of_week) ?? null;
      const rest = all.filter((p) => !p.is_fan_of_week);

      setFanOfWeek(fotw);
      setPosts(rest);
      console.log('[StyleShowcase] Loaded', all.length, 'posts');
    } catch (err) {
      console.error('[StyleShowcase] loadPosts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLike = async (post: ShowcasePost) => {
    if (!user) return;
    console.log('[StyleShowcase] Like post:', post.id);
    setLiking(post.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/like-showcase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ showcase_id: post.id }),
      });
      if (res.ok) {
        const json = await res.json() as { like_count: number };
        const updater = (p: ShowcasePost) => p.id === post.id ? { ...p, like_count: json.like_count } : p;
        setPosts((prev) => prev.map(updater));
        if (selectedPost?.id === post.id) setSelectedPost((prev) => prev ? updater(prev) : prev);
        if (fanOfWeek?.id === post.id) setFanOfWeek((prev) => prev ? updater(prev) : prev);
      }
    } catch (err) {
      console.error('[StyleShowcase] handleLike error:', err);
    } finally {
      setLiking(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
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
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Camera size={22} color={COLORS.primary} />
            <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>
              Style Showcase
            </Text>
          </View>
          <AnimatedPressable
            onPress={() => {
              console.log('[StyleShowcase] Upload pressed');
              router.push('/style-showcase/upload');
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: COLORS.background, fontSize: 13, fontWeight: '700' }}>
                + Post
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            {fanOfWeek === null && (
              <SkeletonLine width="100%" height={200} borderRadius={16} />
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[0, 1, 2, 3].map((k) => (
                <SkeletonLine key={k} width={TILE_SIZE} height={TILE_SIZE} borderRadius={12} />
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* Fan of the Week */}
            {fanOfWeek && (
              <AnimatedPressable
                onPress={() => {
                  console.log('[StyleShowcase] Fan of week post tapped:', fanOfWeek.id);
                  setSelectedPost(fanOfWeek);
                }}
                style={{ marginBottom: 20 }}
              >
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Image
                    source={resolveImageSource(fanOfWeek.photo_url)}
                    style={{ width: '100%', height: 220 }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      backgroundColor: COLORS.primary,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: COLORS.background, fontSize: 11, fontWeight: '800' }}>
                      ⭐ FAN OF THE WEEK
                    </Text>
                  </View>
                  <View style={{ padding: 14 }}>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
                      {fanOfWeek.fan_profiles?.display_name ?? fanOfWeek.fan_profiles?.username ?? 'Fan'}
                    </Text>
                    {fanOfWeek.caption && (
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                        {fanOfWeek.caption}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                      <Heart size={14} color={COLORS.primary} fill={COLORS.primary} />
                      <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                        {String(fanOfWeek.like_count)}
                      </Text>
                    </View>
                  </View>
                </View>
              </AnimatedPressable>
            )}

            {/* Grid */}
            {posts.length === 0 && !fanOfWeek ? (
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
                <Camera size={40} color={COLORS.textTertiary} />
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                  No posts yet
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                  Be the first to show off your style!
                </Text>
                <AnimatedPressable
                  onPress={() => router.push('/style-showcase/upload')}
                  style={{ marginTop: 16 }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.primary,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                    }}
                  >
                    <Text style={{ color: COLORS.background, fontWeight: '700' }}>Post Your Style</Text>
                  </View>
                </AnimatedPressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {posts.map((post) => {
                  const name = post.fan_profiles?.display_name ?? post.fan_profiles?.username ?? 'Fan';
                  return (
                    <AnimatedPressable
                      key={post.id}
                      onPress={() => {
                        console.log('[StyleShowcase] Post tapped:', post.id);
                        setSelectedPost(post);
                      }}
                    >
                      <View
                        style={{
                          width: TILE_SIZE,
                          height: TILE_SIZE,
                          borderRadius: 12,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: post.is_featured ? COLORS.primary : COLORS.border,
                        }}
                      >
                        <Image
                          source={resolveImageSource(post.photo_url)}
                          style={{ width: TILE_SIZE, height: TILE_SIZE }}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            padding: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                            {name}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Heart size={10} color="#fff" fill="#fff" />
                            <Text style={{ color: '#fff', fontSize: 10 }}>
                              {String(post.like_count)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Detail modal */}
      <Modal
        visible={selectedPost !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 20,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
              <AnimatedPressable onPress={() => setSelectedPost(null)}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} color="#fff" />
                </View>
              </AnimatedPressable>
            </View>

            {selectedPost && (
              <>
                <Image
                  source={resolveImageSource(selectedPost.photo_url)}
                  style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
                  resizeMode="cover"
                />
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                      {selectedPost.fan_profiles?.display_name ?? selectedPost.fan_profiles?.username ?? 'Fan'}
                    </Text>
                    <AnimatedPressable
                      onPress={() => handleLike(selectedPost)}
                      disabled={liking === selectedPost.id}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Heart size={20} color={COLORS.primary} fill={COLORS.primary} />
                        <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '700' }}>
                          {String(selectedPost.like_count)}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  </View>
                  {selectedPost.caption && (
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8, lineHeight: 20 }}>
                      {selectedPost.caption}
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
