import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, CheckCircle, Star } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface ExclusiveItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string | null;
  media_url: string | null;
  cover_url: string | null;
  unlock_method: string | null;
  unlock_cost: number | null;
  required_rank: string | null;
  is_published: boolean;
  unlocked?: boolean;
}

export default function ExclusiveContentScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { playSong } = useAudioPlayer();

  const [items, setItems] = useState<ExclusiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    try {
      console.log('[ExclusiveContent] Loading exclusive content');
      const { data: contentData, error: contentErr } = await db
        .from('exclusive_content')
        .select('id, title, description, content_type, media_url, cover_url, unlock_method, unlock_cost, required_rank, is_published')
        .eq('is_published', true)
        .order('id', { ascending: true });

      if (contentErr) {
        console.error('[ExclusiveContent] Load error:', contentErr.message);
        return;
      }

      const content = (contentData ?? []) as ExclusiveItem[];

      if (user && content.length > 0) {
        const ids = content.map((c) => c.id);
        const { data: unlockData } = await db
          .from('content_unlocks')
          .select('content_id')
          .eq('user_id', user.id)
          .in('content_id', ids);

        const unlockedIds = new Set((unlockData ?? []).map((u: { content_id: string }) => u.content_id));
        const merged = content.map((c) => ({ ...c, unlocked: unlockedIds.has(c.id) }));
        setItems(merged);
        console.log('[ExclusiveContent] Loaded', merged.length, 'items,', unlockedIds.size, 'unlocked');
      } else {
        setItems(content);
      }
    } catch (err) {
      console.error('[ExclusiveContent] loadContent error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  const handleUnlock = async (item: ExclusiveItem) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to unlock exclusive content.');
      return;
    }
    console.log('[ExclusiveContent] Unlock pressed for:', item.title);
    setUnlocking(item.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/unlock-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content_id: item.id }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[ExclusiveContent] unlock-content error:', res.status, text);
        Alert.alert('Error', 'Could not unlock content. Please try again.');
        return;
      }

      const json = await res.json();
      console.log('[ExclusiveContent] Unlock result:', json);

      if (json.ok) {
        Alert.alert('Unlocked!', `You now have access to "${item.title}"`);
        setItems((prev) => prev.map((c) => c.id === item.id ? { ...c, unlocked: true } : c));
      } else {
        const reason = json.reason ?? 'Not enough points or wrong rank.';
        Alert.alert('Cannot Unlock', reason);
      }
    } catch (err) {
      console.error('[ExclusiveContent] handleUnlock error:', err);
      Alert.alert('Error', 'Could not unlock content.');
    } finally {
      setUnlocking(null);
    }
  };

  const handleView = (item: ExclusiveItem) => {
    if (!item.media_url) return;
    console.log('[ExclusiveContent] View pressed for:', item.title, 'type:', item.content_type);
    if (item.content_type === 'song' || item.content_type === 'audio') {
      playSong({
        id: item.id,
        title: item.title,
        artist: 'HHR Exclusive',
        cover_url: item.cover_url,
        audio_url: item.media_url,
      });
    } else {
      Alert.alert('Opening Content', `Playing: ${item.title}`);
    }
  };

  const getUnlockLabel = (item: ExclusiveItem) => {
    if (item.unlock_method === 'points' && item.unlock_cost) {
      return `Unlock for ${item.unlock_cost} pts`;
    }
    if (item.unlock_method === 'rank' && item.required_rank) {
      return `${item.required_rank} members only`;
    }
    return 'Unlock';
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
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
          }}
        >
          <Star size={22} color="#F59E0B" />
        </View>
        <View>
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
            Exclusive Content
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
            Unlock with points or fan rank
          </Text>
        </View>
      </View>

      {/* Content list */}
      {loading ? (
        <View style={{ gap: 16 }}>
          {[0, 1, 2].map((k) => (
            <View
              key={k}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <SkeletonLine width="100%" height={160} borderRadius={0} />
              <View style={{ padding: 16, gap: 8 }}>
                <SkeletonLine width="70%" height={16} />
                <SkeletonLine width="50%" height={13} />
                <SkeletonLine width="40%" height={36} borderRadius={10} />
              </View>
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
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
          <Text style={{ color: COLORS.textSecondary, fontSize: 15, marginTop: 12, textAlign: 'center' }}>
            No exclusive content available yet
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {items.map((item) => {
            const isUnlocking = unlocking === item.id;
            const unlockLabel = getUnlockLabel(item);

            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: item.unlocked ? COLORS.primary : COLORS.border,
                }}
              >
                {/* Cover */}
                {item.cover_url ? (
                  <Image
                    source={resolveImageSource(item.cover_url)}
                    style={{ width: '100%', height: 160 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: '100%',
                      height: 120,
                      backgroundColor: COLORS.surfaceSecondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Star size={40} color={COLORS.textTertiary} />
                  </View>
                )}

                <View style={{ padding: 16 }}>
                  <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 12 }} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {item.unlocked ? (
                    <AnimatedPressable onPress={() => handleView(item)}>
                      <View
                        style={{
                          backgroundColor: COLORS.primaryMuted,
                          borderRadius: 10,
                          paddingVertical: 12,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 8,
                          borderWidth: 1,
                          borderColor: COLORS.primary,
                        }}
                      >
                        <CheckCircle size={16} color={COLORS.primary} />
                        <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                          Unlocked — Tap to View
                        </Text>
                      </View>
                    </AnimatedPressable>
                  ) : (
                    <AnimatedPressable onPress={() => handleUnlock(item)} disabled={isUnlocking}>
                      <View
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          borderRadius: 10,
                          paddingVertical: 12,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 8,
                          borderWidth: 1,
                          borderColor: 'rgba(245, 158, 11, 0.3)',
                          opacity: isUnlocking ? 0.6 : 1,
                        }}
                      >
                        <Lock size={16} color="#F59E0B" />
                        <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '700' }}>
                          {isUnlocking ? 'Unlocking...' : unlockLabel}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
