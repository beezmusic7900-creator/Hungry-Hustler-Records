import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, ShoppingBag, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface WishlistRow {
  id: string;
  merch_id: string;
  notify_sale: boolean;
  notify_restock: boolean;
  notify_low_inventory: boolean;
  created_at: string;
}

interface MerchItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  in_stock: boolean;
}

interface WishlistEntry extends WishlistRow {
  merch: MerchItem | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[Wishlist] Loading wishlist for user:', user.id);
      const { data: wishlistData, error } = await db
        .from('merch_wishlists')
        .select('id, merch_id, notify_sale, notify_restock, notify_low_inventory, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Wishlist] Load error:', error.message);
        return;
      }

      const rows = (wishlistData ?? []) as WishlistRow[];
      const merchIds = rows.map((r) => r.merch_id);

      if (merchIds.length === 0) {
        setEntries([]);
        return;
      }

      const { data: merchData } = await db
        .from('merch')
        .select('id, name, price, image_url, in_stock')
        .in('id', merchIds);

      const merchMap: Record<string, MerchItem> = {};
      ((merchData ?? []) as MerchItem[]).forEach((m) => { merchMap[m.id] = m; });

      const merged: WishlistEntry[] = rows.map((r) => ({
        ...r,
        merch: merchMap[r.merch_id] ?? null,
      }));

      console.log('[Wishlist] Loaded', merged.length, 'wishlist items');
      setEntries(merged);
    } catch (err) {
      console.error('[Wishlist] loadWishlist error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadWishlist();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, loadWishlist]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWishlist();
    setRefreshing(false);
  };

  const handleRemove = async (entry: WishlistEntry) => {
    console.log('[Wishlist] Remove pressed for merch:', entry.merch_id);
    setRemoving(entry.merch_id);
    try {
      const res = await supabase.functions.invoke('toggle-wishlist', {
        body: { merch_id: entry.merch_id },
      });
      if (res.error) {
        console.error('[Wishlist] toggle-wishlist error:', res.error);
        Alert.alert('Error', 'Could not remove from wishlist.');
        return;
      }
      setEntries((prev) => prev.filter((e) => e.merch_id !== entry.merch_id));
    } catch (err) {
      console.error('[Wishlist] handleRemove error:', err);
      Alert.alert('Error', 'Could not remove from wishlist.');
    } finally {
      setRemoving(null);
    }
  };

  const handleToggleAlert = async (
    entry: WishlistEntry,
    field: 'notify_sale' | 'notify_restock' | 'notify_low_inventory',
    value: boolean
  ) => {
    console.log('[Wishlist] Toggle alert:', field, value, 'for merch:', entry.merch_id);
    setEntries((prev) =>
      prev.map((e) => (e.merch_id === entry.merch_id ? { ...e, [field]: value } : e))
    );
    try {
      await db
        .from('merch_wishlists')
        .update({ [field]: value })
        .eq('id', entry.id);
    } catch (err) {
      console.error('[Wishlist] handleToggleAlert error:', err);
      // Revert
      setEntries((prev) =>
        prev.map((e) => (e.merch_id === entry.merch_id ? { ...e, [field]: !value } : e))
      );
    }
  };

  if (!authLoading && !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Bookmark size={40} color={COLORS.textTertiary} />
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
          Sign in to view your wishlist
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[Wishlist] Navigate to fan-auth');
            router.push('/fan-auth');
          }}
          style={{ marginTop: 20 }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ color: COLORS.background, fontWeight: '700', fontSize: 15 }}>
              Sign In
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

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
        <Bookmark size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>
          My Wishlist
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 12 }}>
          {[0, 1, 2].map((k) => (
            <View
              key={k}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <SkeletonLine width={72} height={72} borderRadius={10} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonLine width="70%" height={14} />
                  <SkeletonLine width="30%" height={12} />
                </View>
              </View>
              <SkeletonLine width="100%" height={40} borderRadius={8} />
            </View>
          ))}
        </View>
      ) : entries.length === 0 ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 40,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            marginTop: 20,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Bookmark size={32} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
            Your wishlist is empty
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
            Tap the bookmark on any product to save it and get alerts on sales and restocks
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Wishlist] Browse merch pressed');
              router.push('/(tabs)/merch');
            }}
            style={{ marginTop: 20 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 28,
              }}
            >
              <Text style={{ color: COLORS.background, fontWeight: '700', fontSize: 14 }}>
                Browse Merch
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {entries.map((entry) => {
            const m = entry.merch;
            const priceDisplay = m ? `$${Number(m.price).toFixed(2)}` : '';
            const isRemoving = removing === entry.merch_id;

            return (
              <View
                key={entry.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                {/* Product row */}
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Wishlist] Navigate to merch detail:', entry.merch_id);
                    router.push(`/merch-detail/${entry.merch_id}`);
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 10,
                        backgroundColor: COLORS.surfaceSecondary,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {m?.image_url ? (
                        <Image
                          source={resolveImageSource(m.image_url)}
                          style={{ width: 72, height: 72 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <ShoppingBag size={28} color={COLORS.textTertiary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}
                        numberOfLines={2}
                      >
                        {m?.name ?? 'Unknown product'}
                      </Text>
                      <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
                        {priceDisplay}
                      </Text>
                      {m && (
                        <View
                          style={{
                            marginTop: 4,
                            backgroundColor: m.in_stock ? 'rgba(0,255,102,0.12)' : 'rgba(255,68,68,0.12)',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            alignSelf: 'flex-start',
                            borderWidth: 1,
                            borderColor: m.in_stock ? COLORS.primary : COLORS.danger,
                          }}
                        >
                          <Text
                            style={{
                              color: m.in_stock ? COLORS.primary : COLORS.danger,
                              fontSize: 11,
                              fontWeight: '600',
                            }}
                          >
                            {m.in_stock ? 'In Stock' : 'Out of Stock'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </AnimatedPressable>

                {/* Alert toggles */}
                <View
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 10,
                    padding: 12,
                    gap: 10,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>
                    MANAGE ALERTS
                  </Text>
                  {(
                    [
                      { field: 'notify_sale' as const, label: 'Sale alerts' },
                      { field: 'notify_restock' as const, label: 'Restock alerts' },
                      { field: 'notify_low_inventory' as const, label: 'Low inventory alerts' },
                    ] as const
                  ).map(({ field, label }) => (
                    <View
                      key={field}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Text style={{ color: COLORS.text, fontSize: 13 }}>{label}</Text>
                      <Switch
                        value={entry[field]}
                        onValueChange={(v) => {
                          console.log('[Wishlist] Alert toggle:', field, v);
                          handleToggleAlert(entry, field, v);
                        }}
                        trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryMuted }}
                        thumbColor={entry[field] ? COLORS.primary : COLORS.textTertiary}
                      />
                    </View>
                  ))}
                </View>

                {/* Remove button */}
                <AnimatedPressable
                  onPress={() => handleRemove(entry)}
                  disabled={isRemoving}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255,68,68,0.08)',
                      borderRadius: 8,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(255,68,68,0.2)',
                      opacity: isRemoving ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={14} color={COLORS.danger} />
                    <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600' }}>
                      {isRemoving ? 'Removing...' : 'Remove from wishlist'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
