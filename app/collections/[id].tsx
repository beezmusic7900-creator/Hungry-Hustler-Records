import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, CheckCircle, Plus } from 'lucide-react-native';
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
  reward_unlock_id: string | null;
}

interface CollectionItem {
  id: string;
  collection_id: string;
  merch_id: string;
  position: number;
}

interface MerchItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  in_stock: boolean;
}

interface Completion {
  completed_at: string;
  points_awarded: number | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<(CollectionItem & { merch: MerchItem | null })[]>([]);
  const [ownedMerchIds, setOwnedMerchIds] = useState<Set<string>>(new Set());
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      console.log('[CollectionDetail] Loading collection:', id);
      const [colRes, itemsRes] = await Promise.all([
        db.from('collections').select('id, name, description, image_url, badge_label, reward_points, reward_unlock_id').eq('id', id).single(),
        db.from('collection_items').select('id, collection_id, merch_id, position').eq('collection_id', id).order('position', { ascending: true }),
      ]);

      if (colRes.error) {
        console.error('[CollectionDetail] Collection load error:', colRes.error.message);
        return;
      }

      setCollection(colRes.data as Collection);
      navigation.setOptions({ title: (colRes.data as Collection).name });

      const colItems = (itemsRes.data ?? []) as CollectionItem[];
      const merchIds = colItems.map((i) => i.merch_id);

      if (merchIds.length > 0) {
        const { data: merchData } = await db
          .from('merch')
          .select('id, name, price, image_url, in_stock')
          .in('id', merchIds);

        const merchMap: Record<string, MerchItem> = {};
        ((merchData ?? []) as MerchItem[]).forEach((m) => { merchMap[m.id] = m; });

        setItems(colItems.map((ci) => ({ ...ci, merch: merchMap[ci.merch_id] ?? null })));
      } else {
        setItems([]);
      }

      // Load user's owned items (via wishlist as proxy)
      if (user) {
        const [wishRes, completionRes] = await Promise.all([
          db.from('merch_wishlists').select('merch_id').eq('user_id', user.id),
          db.from('user_collection_completions').select('completed_at, points_awarded').eq('user_id', user.id).eq('collection_id', id).maybeSingle(),
        ]);

        const owned = new Set(
          ((wishRes.data ?? []) as { merch_id: string }[]).map((w) => w.merch_id)
        );
        setOwnedMerchIds(owned);
        setCompletion(completionRes.data as Completion | null);
      }

      console.log('[CollectionDetail] Loaded', colItems.length, 'items');
    } catch (err) {
      console.error('[CollectionDetail] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const ownedCount = items.filter((i) => i.merch && ownedMerchIds.has(i.merch_id)).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && ownedCount >= totalCount;

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 80, paddingHorizontal: 20 }}
      >
        <SkeletonLine width="100%" height={200} borderRadius={16} />
        <View style={{ marginTop: 16, gap: 10 }}>
          <SkeletonLine width="60%" height={22} />
          <SkeletonLine width="80%" height={14} />
          <SkeletonLine width="100%" height={8} borderRadius={4} />
        </View>
      </ScrollView>
    );
  }

  if (!collection) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSecondary }}>Collection not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Hero image */}
      {collection.image_url ? (
        <Image
          source={resolveImageSource(collection.image_url)}
          style={{ width: '100%', height: 220 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 160,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Package size={48} color={COLORS.textTertiary} />
        </View>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4, flex: 1 }}>
            {collection.name}
          </Text>
          {collection.badge_label && (
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: COLORS.primary,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                {collection.badge_label}
              </Text>
            </View>
          )}
        </View>

        {collection.description && (
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
            {collection.description}
          </Text>
        )}

        {/* Progress */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isComplete ? COLORS.primary : COLORS.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
              {String(ownedCount)}
              /
              {String(totalCount)}
              {' items owned'}
            </Text>
            <Text style={{ color: isComplete ? COLORS.primary : COLORS.textSecondary, fontSize: 14, fontWeight: '700' }}>
              {isComplete ? '✓ Complete!' : `${String(pct)}%`}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${pct}%`,
                backgroundColor: COLORS.primary,
                borderRadius: 4,
              }}
            />
          </View>
        </View>

        {/* Completion info */}
        {completion ? (
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: COLORS.primary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 24 }}>🏆</Text>
            <View>
              <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                Completed!
              </Text>
              <Text style={{ color: COLORS.primary, fontSize: 12 }}>
                {new Date(completion.completed_at).toLocaleDateString()}
                {completion.points_awarded ? ` · +${String(completion.points_awarded)} pts earned` : ''}
              </Text>
            </View>
          </View>
        ) : collection.reward_points && collection.reward_points > 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 20 }}>🏆</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
              Complete this collection to earn
              {' '}
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>
                {String(collection.reward_points)}
                {' pts'}
              </Text>
            </Text>
          </View>
        ) : null}

        {/* Items grid */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 }}>
          COLLECTION ITEMS
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          {items.map((item) => {
            const m = item.merch;
            const owned = m ? ownedMerchIds.has(item.merch_id) : false;

            return (
              <AnimatedPressable
                key={item.id}
                onPress={() => {
                  console.log('[CollectionDetail] Navigate to merch:', item.merch_id);
                  router.push(`/merch-detail/${item.merch_id}`);
                }}
                style={{ width: '47%' }}
              >
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: owned ? COLORS.primary : COLORS.border,
                    opacity: owned ? 1 : 0.7,
                  }}
                >
                  <View style={{ position: 'relative' }}>
                    {m?.image_url ? (
                      <Image
                        source={resolveImageSource(m.image_url)}
                        style={{ width: '100%', height: 120 }}
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
                        <Package size={28} color={COLORS.textTertiary} />
                      </View>
                    )}
                    {owned && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: COLORS.primary,
                          borderRadius: 12,
                          padding: 2,
                        }}
                      >
                        <CheckCircle size={16} color={COLORS.background} />
                      </View>
                    )}
                    {!owned && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: COLORS.surface,
                          borderRadius: 12,
                          padding: 2,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      >
                        <Plus size={14} color={COLORS.textSecondary} />
                      </View>
                    )}
                  </View>
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '600' }} numberOfLines={2}>
                      {m?.name ?? 'Unknown'}
                    </Text>
                    {m && (
                      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                        $
                        {Number(m.price).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
