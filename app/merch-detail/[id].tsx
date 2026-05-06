import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Linking,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ShoppingBag, ExternalLink, CheckCircle, XCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { getMerchItem } from '@/utils/api';
import type { MerchItem } from '@/types';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function MerchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [item, setItem] = useState<MerchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      console.log(`[MerchDetail] Loading merch item: ${id}`);
      setLoading(true);
      setError(null);
      const data = await getMerchItem(id as string);
      setItem(data);
      navigation.setOptions({ title: data.name });
    } catch (err) {
      console.error('[MerchDetail] Failed to load merch item:', err);
      setError("Couldn't load this item.");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (item?.checkout_url) {
      console.log(`[MerchDetail] Buy Now pressed: ${item.name} - ${item.checkout_url}`);
      Linking.openURL(item.checkout_url);
    }
  };

  const priceDisplay = item ? `$${Number(item.price).toFixed(2)}` : '';
  const inStockText = item?.in_stock === false ? 'Out of Stock' : 'In Stock';
  const inStockColor = item?.in_stock === false ? COLORS.danger : COLORS.success;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Product Image */}
      {loading ? (
        <SkeletonLine width="100%" height={300} borderRadius={0} />
      ) : item?.image_url ? (
        <Image
          source={resolveImageSource(item.image_url)}
          style={{ width: '100%', height: 300 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 300,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShoppingBag size={64} color={COLORS.textTertiary} />
        </View>
      )}

      <View style={{ padding: 20 }}>
        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonLine width="70%" height={28} />
            <SkeletonLine width="30%" height={24} />
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="90%" height={14} />
            <SkeletonLine width="80%" height={14} />
          </View>
        ) : item ? (
          <>
            {/* Name */}
            <Text
              style={{
                color: COLORS.text,
                fontSize: 26,
                fontWeight: '700',
                letterSpacing: -0.3,
                marginBottom: 8,
              }}
            >
              {item.name}
            </Text>

            {/* Price */}
            <Text
              style={{
                color: COLORS.primary,
                fontSize: 28,
                fontWeight: '700',
                marginBottom: 16,
                textShadowColor: 'rgba(0, 255, 102, 0.4)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              }}
            >
              {priceDisplay}
            </Text>

            {/* Stock + Category row */}
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginBottom: 20,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: COLORS.surface,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                {item.in_stock === false ? (
                  <XCircle size={14} color={COLORS.danger} />
                ) : (
                  <CheckCircle size={14} color={COLORS.success} />
                )}
                <Text
                  style={{
                    color: inStockColor,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {inStockText}
                </Text>
              </View>

              {item.category ? (
                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {item.category}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {item.description ? (
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 15,
                  lineHeight: 24,
                  marginBottom: 28,
                }}
              >
                {item.description}
              </Text>
            ) : null}

            {/* Buy Now Button */}
            {item.checkout_url ? (
              <AnimatedPressable onPress={handleBuyNow}>
                <View
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  }}
                >
                  <ExternalLink size={18} color={COLORS.background} />
                  <Text
                    style={{
                      color: COLORS.background,
                      fontSize: 16,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                    }}
                  >
                    Buy Now
                  </Text>
                </View>
              </AnimatedPressable>
            ) : (
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 15,
                    fontWeight: '500',
                  }}
                >
                  Contact us to purchase
                </Text>
              </View>
            )}
          </>
        ) : null}

        {/* Error */}
        {error && !loading && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text
              style={{
                color: COLORS.danger,
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Couldn't load this item
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
                console.log('[MerchDetail] Retry loading');
                loadItem();
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
        )}
      </View>
    </ScrollView>
  );
}
