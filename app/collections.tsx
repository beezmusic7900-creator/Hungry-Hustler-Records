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
import { Package } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Collection {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  badge_label: string | null;
  reward_points: number | null;
  is_active: boolean;
  display_order: number;
}

interface CollectionProgress {
  collection_id: string;
  owned: number;
  total: number;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function CollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [progress, setProgress] = useState<Record<string, CollectionProgress>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCollections = useCallback(async () => {
    try {
      console.log('[Collections] Loading active collections');
      const { data, error } = await db
        .from('collections')
        .select('id, name, description, image_url, badge_label, reward_points, is_active, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[Collections] Load error:', error.message);
        return;
      }

      const cols = (data ?? []) as Collection[];
      setCollections(cols);

      // Load progress if user is logged in
      if (user && cols.length > 0) {
        const colIds = cols.map((c) => c.id);

        // Get total items per collection
        const { data: itemData } = await db
          .from('collection_items')
          .select('collection_id, merch_id')
          .in('collection_id', colIds);

        const totalByCol: Record<string, number> = {};
        ((itemData ?? []) as { collection_id: string; merch_id: string }[]).forEach((item) => {
          totalByCol[item.collection_id] = (totalByCol[item.collection_id] ?? 0) + 1;
        });

        // Get user's wishlist to approximate "owned" (or use merch_wishlists as proxy)
        const { data: wishData } = await db
          .from('merch_wishlists')
          .select('merch_id')
          .eq('user_id', user.id);

        const ownedMerchIds = new Set(
          ((wishData ?? []) as { merch_id: string }[]).map((w) => w.merch_id)
        );

        const progressMap: Record<string, CollectionProgress> = {};
        cols.forEach((col) => {
          const colItems = ((itemData ?? []) as { collection_id: string; merch_id: string }[])
            .filter((i) => i.collection_id === col.id);
          const owned = colItems.filter((i) => ownedMerchIds.has(i.merch_id)).length;
          progressMap[col.id] = {
            collection_id: col.id,
            owned,
            total: totalByCol[col.id] ?? 0,
          };
        });

        setProgress(progressMap);
      }

      console.log('[Collections] Loaded', cols.length, 'collections');
    } catch (err) {
      console.error('[Collections] loadCollections error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCollections();
    setRefreshing(false);
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Package size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>
          Collections
        </Text>
      </View>

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
              <View style={{ padding: 14, gap: 8 }}>
                <SkeletonLine width="60%" height={16} />
                <SkeletonLine width="40%" height={12} />
                <SkeletonLine width="100%" height={8} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
      ) : collections.length === 0 ? (
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
          <Package size={40} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
            No collections yet
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            Check back soon for curated merch collections
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {collections.map((col) => {
            const prog = progress[col.id];
            const pct = prog && prog.total > 0 ? Math.round((prog.owned / prog.total) * 100) : 0;
            const isComplete = prog && prog.total > 0 && prog.owned >= prog.total;

            return (
              <AnimatedPressable
                key={col.id}
                onPress={() => {
                  console.log('[Collections] Navigate to collection detail:', col.id);
                  router.push(`/collections/${col.id}`);
                }}
              >
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: isComplete ? COLORS.primary : COLORS.border,
                  }}
                >
                  {col.image_url ? (
                    <Image
                      source={resolveImageSource(col.image_url)}
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
                      <Package size={40} color={COLORS.textTertiary} />
                    </View>
                  )}

                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
                        {col.name}
                      </Text>
                      {col.badge_label && (
                        <View
                          style={{
                            backgroundColor: COLORS.primaryMuted,
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                          }}
                        >
                          <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '700' }}>
                            {col.badge_label}
                          </Text>
                        </View>
                      )}
                    </View>

                    {col.description && (
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 }} numberOfLines={2}>
                        {col.description}
                      </Text>
                    )}

                    {prog && prog.total > 0 && (
                      <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                            {String(prog.owned)}
                            /
                            {String(prog.total)}
                            {' items'}
                          </Text>
                          <Text style={{ color: isComplete ? COLORS.primary : COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
                            {isComplete ? '✓ Complete' : `${String(pct)}%`}
                          </Text>
                        </View>
                        <View
                          style={{
                            height: 6,
                            backgroundColor: COLORS.surfaceSecondary,
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              backgroundColor: isComplete ? COLORS.primary : COLORS.primary,
                              borderRadius: 3,
                            }}
                          />
                        </View>
                      </View>
                    )}

                    {col.reward_points && col.reward_points > 0 && (
                      <Text style={{ color: COLORS.textTertiary, fontSize: 12, marginTop: 8 }}>
                        🏆 Complete to earn
                        {' '}
                        {String(col.reward_points)}
                        {' pts'}
                      </Text>
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
