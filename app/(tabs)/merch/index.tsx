import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ScrollView,
  Animated,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonMerchCard } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

interface MerchItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  in_stock: boolean;
  checkout_url: string | null;
  display_order: number;
  is_featured: boolean;
  is_published: boolean;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const ALL_CATEGORY = 'All';

function MerchCard({ item, index }: { item: MerchItem; index: number }) {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const priceDisplay = `$${Number(item.price).toFixed(2)}`;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    console.log(`[Merch] Tapped merch item: ${item.name} (${item.id})`);
    router.push(`/merch-detail/${item.id}`);
  };

  const handleShopNow = () => {
    console.log(`[Merch] Shop Now pressed: ${item.name}`);
    router.push(`/merch-detail/${item.id}`);
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
      <AnimatedPressable onPress={handlePress}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
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
          <View style={{ padding: 12 }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 13,
                fontWeight: '600',
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <Text
              style={{
                color: COLORS.primary,
                fontSize: 16,
                fontWeight: '700',
                marginTop: 4,
              }}
            >
              {priceDisplay}
            </Text>
            <AnimatedPressable onPress={handleShopNow} style={{ marginTop: 10 }}>
              <View
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: COLORS.background,
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                  }}
                >
                  SHOP NOW
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function MerchScreen() {
  const insets = useSafeAreaInsets();
  const [merch, setMerch] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);

  useEffect(() => {
    loadMerch();
  }, []);

  const loadMerch = async () => {
    try {
      console.log('[Merch] Loading merch items from Supabase');
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('merch_items')
        .select('*')
        .eq('is_published', true)
        .order('display_order');

      if (dbError) {
        console.error('[Merch] Supabase error:', dbError.message);
        setError("Couldn't load merch.");
        return;
      }
      console.log(`[Merch] Loaded ${data?.length ?? 0} merch items`);
      setMerch(data ?? []);
    } catch (err) {
      console.error('[Merch] Failed to load merch:', err);
      setError("Couldn't load merch. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    ALL_CATEGORY,
    ...Array.from(new Set(merch.map((m) => m.category).filter(Boolean) as string[])),
  ];

  const filteredMerch =
    selectedCategory === ALL_CATEGORY
      ? merch
      : merch.filter((m) => m.category === selectedCategory);

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
            color: COLORS.text,
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.5,
          }}
        >
          Merch
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            marginTop: 4,
          }}
        >
          Official HHR merchandise
        </Text>
      </View>

      {/* Category Filter */}
      {!loading && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <AnimatedPressable
                key={cat}
                onPress={() => {
                  console.log(`[Merch] Filter category: ${cat}`);
                  setSelectedCategory(cat);
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? COLORS.background : COLORS.textSecondary,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {cat}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      )}

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
              color: COLORS.danger,
              fontSize: 16,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Couldn't load merch
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 14,
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
      ) : filteredMerch.length === 0 ? (
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
              color: COLORS.text,
              fontSize: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            No merch yet
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 14,
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
          data={filteredMerch}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
          renderItem={({ item, index }) => (
            <MerchCard item={item} index={index} />
          )}
        />
      )}
    </View>
  );
}
