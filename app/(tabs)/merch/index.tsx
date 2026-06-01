import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ScrollView,
  Animated,
  ImageSourcePropType,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Heart, BarChart2, Package } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { TYPOGRAPHY, LAYOUT } from '@/constants/Typography';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonMerchCard } from '@/components/SkeletonLoader';
import { supabase, supabasePublic } from '@/integrations/supabase/client';
import { useFavorite } from '@/hooks/useFavorite';

interface MerchItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  in_stock: boolean;
  stripe_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

function MerchFavoriteButton({ itemId }: { itemId: string }) {
  const { isFavorited, toggleFavorite } = useFavorite('merch', itemId);

  const handlePress = () => {
    console.log('[Merch] Toggle favorite for item:', itemId, '— currently:', isFavorited);
    toggleFavorite();
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Heart
          size={15}
          color={isFavorited ? '#FF4444' : '#FFFFFF'}
          fill={isFavorited ? '#FF4444' : 'transparent'}
        />
      </View>
    </AnimatedPressable>
  );
}

function MerchCard({ item, index, onPress }: { item: MerchItem; index: number; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const priceDisplay = `$${Number(item.price).toFixed(2)}`;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSizePress = (size: string) => {
    console.log(`[Merch] Size selected: ${size} for ${item.name}`);
    setSelectedSize(size);
  };

  const handleBuyNow = () => {
    console.log(`[Merch] BUY NOW pressed: ${item.name} (id=${item.id}, size=${selectedSize ?? 'none'}, stripe_url=${item.stripe_url})`);
    if (item.stripe_url) {
      Linking.openURL(item.stripe_url);
    }
  };

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        flex: 1,
        margin: 6,
      }}
    >
      <AnimatedPressable onPress={onPress}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* Image with favorite overlay */}
        <View style={{ position: 'relative' }}>
          {item.image_url ? (
            <Image
              source={resolveImageSource(item.image_url)}
              style={{ width: '100%', height: 180 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 180,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={40} color={COLORS.textTertiary} />
            </View>
          )}
          <MerchFavoriteButton itemId={item.id} />
        </View>

        <View style={{ padding: 12 }}>
          <Text
            style={{
              ...TYPOGRAPHY.caption,
              fontWeight: '600',
              color: COLORS.text,
            }}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text
            style={{
              ...TYPOGRAPHY.body,
              fontWeight: '700',
              color: COLORS.primary,
              marginTop: 4,
            }}
          >
            {priceDisplay}
          </Text>

          {/* Size selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ paddingRight: 4 }}
          >
            {SIZES.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <AnimatedPressable
                  key={size}
                  onPress={() => handleSizePress(size)}
                >
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      borderWidth: 1,
                      marginRight: 6,
                      backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        ...TYPOGRAPHY.tabLabel,
                        color: isSelected ? COLORS.background : COLORS.textSecondary,
                      }}
                    >
                      {size}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {/* BUY NOW button */}
          {(() => {
            const isOutOfStock = !item.in_stock;
            const isUnavailable = item.in_stock && !item.stripe_url;
            const isDisabled = isOutOfStock || isUnavailable;
            const buttonLabel = isOutOfStock ? 'Out of Stock' : isUnavailable ? 'Unavailable' : 'BUY NOW';
            const buttonBg = isDisabled ? COLORS.surfaceSecondary : COLORS.primary;
            const buttonBorder = isDisabled ? COLORS.border : COLORS.primary;
            const buttonTextColor = isDisabled ? COLORS.textSecondary : COLORS.background;
            return (
              <AnimatedPressable onPress={handleBuyNow} disabled={isDisabled} style={{ marginTop: 10 }}>
                <View
                  style={{
                    backgroundColor: buttonBg,
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: buttonBorder,
                  }}
                >
                  <Text
                    style={{
                      ...TYPOGRAPHY.caption,
                      fontWeight: '700',
                      color: buttonTextColor,
                    }}
                  >
                    {buttonLabel}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })()}
        </View>
      </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

interface ActivePoll {
  id: string;
  title: string;
}

interface CollectionPreview {
  id: string;
  name: string;
  image_url: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function MerchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [merch, setMerch] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null);
  const [collections, setCollections] = useState<CollectionPreview[]>([]);

  useEffect(() => {
    loadMerch();
    loadPollsAndCollections();
  }, []);

  const loadPollsAndCollections = async () => {
    try {
      const [pollRes, colRes] = await Promise.all([
        db.from('merch_polls').select('id, title').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('collections').select('id, name, image_url').eq('is_active', true).order('display_order', { ascending: true }).limit(8),
      ]);
      if (pollRes.data) setActivePoll(pollRes.data as ActivePoll);
      if (colRes.data) setCollections((colRes.data ?? []) as CollectionPreview[]);
    } catch (err) {
      console.error('[Merch] loadPollsAndCollections error:', err);
    }
  };

  const handleRefresh = async () => {
    console.log('[Merch] Pull-to-refresh triggered');
    setRefreshing(true);
    await loadMerch();
    setRefreshing(false);
  };

  const loadMerch = async () => {
    try {
      console.log('[Merch] Loading merch items from Supabase');
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabasePublic
        .from('merch')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (dbError) {
        console.warn('[Merch] Supabase error:', dbError.message);
        setMerch([]);
        return;
      }
      console.log(`[Merch] Loaded ${data?.length ?? 0} merch items`);
      setMerch((data ?? []) as unknown as MerchItem[]);
    } catch (err) {
      console.error('[Merch] Failed to load merch:', err);
      setError("Couldn't load merch. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const skeletonData = [0, 1, 2, 3];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{
            ...TYPOGRAPHY.display,
            color: COLORS.text,
          }}
        >
          Merch
        </Text>
        <Text
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.textSecondary,
            marginTop: 4,
          }}
        >
          Official HHR merchandise
        </Text>
      </View>

      {loading ? (
        <FlatList
          data={skeletonData}
          numColumns={2}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
          renderItem={() => (
            <View style={{ flex: 1, margin: 6 }}>
              <SkeletonMerchCard />
            </View>
          )}
        />
      ) : error ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
        >
          <Text
            style={{
              ...TYPOGRAPHY.h3,
              color: COLORS.danger,
              textAlign: 'center',
            }}
          >
            Couldn't load merch
          </Text>
          <Text
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Merch] Retry loading');
              loadMerch();
            }}
            style={{ marginTop: 20 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 28,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                Try Again
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : merch.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
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
            }}
          >
            <ShoppingBag size={32} color={COLORS.primary} />
          </View>
          <Text
            style={{
              ...TYPOGRAPHY.h3,
              color: COLORS.text,
              textAlign: 'center',
            }}
          >
            No merch yet
          </Text>
          <Text
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginTop: 8,
              maxWidth: 280,
            }}
          >
            Official HHR merchandise will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={merch}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Active poll banner */}
              {activePoll && (
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Merch] Poll banner tapped — navigating to merch-polls');
                    router.push('/merch-polls');
                  }}
                  style={{ marginBottom: 12 }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1,
                      borderColor: COLORS.primary,
                      marginHorizontal: 6,
                    }}
                  >
                    <BarChart2 size={20} color={COLORS.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...TYPOGRAPHY.tabLabel, color: COLORS.primary, fontWeight: '700' }}>
                        ACTIVE POLL
                      </Text>
                      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                        {activePoll.title}
                      </Text>
                    </View>
                    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '700' }}>
                      Vote now →
                    </Text>
                  </View>
                </AnimatedPressable>
              )}

              {/* Collections row */}
              {collections.length > 0 && (
                <View style={{ marginBottom: 12, marginHorizontal: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Package size={16} color={COLORS.primary} />
                      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '700' }}>Collections</Text>
                    </View>
                    <AnimatedPressable onPress={() => {
                      console.log('[Merch] See all collections pressed');
                      router.push('/collections');
                    }}>
                      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '600' }}>See all →</Text>
                    </AnimatedPressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {collections.map((col) => (
                      <AnimatedPressable
                        key={col.id}
                        onPress={() => {
                          console.log('[Merch] Collection tile tapped:', col.id);
                          router.push(`/collections/${col.id}`);
                        }}
                      >
                        <View
                          style={{
                            width: 100,
                            backgroundColor: COLORS.surface,
                            borderRadius: 12,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: COLORS.border,
                          }}
                        >
                          {col.image_url ? (
                            <Image
                              source={resolveImageSource(col.image_url)}
                              style={{ width: 100, height: 80 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{ width: 100, height: 80, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={24} color={COLORS.textTertiary} />
                            </View>
                          )}
                          <View style={{ padding: 8 }}>
                            <Text style={{ ...TYPOGRAPHY.tabLabel, color: COLORS.text, fontWeight: '600' }} numberOfLines={2}>{col.name}</Text>
                          </View>
                        </View>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          }
          renderItem={({ item, index }) => (
            <MerchCard
              item={item}
              index={index}
              onPress={() => {
                console.log('[Merch] Card tapped, navigating to merch-detail:', item.id);
                router.push(`/merch-detail/${item.id}`);
              }}
            />
          )}
        />
      )}
    </View>
  );
}
