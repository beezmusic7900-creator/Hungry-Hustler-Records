
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
  ImageSourcePropType,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingBag } from 'lucide-react-native';
import { colors } from '@/styles/commonStyles';
import { SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

const STRIPE_URL = 'https://buy.stripe.com/3cIfZjajP3pu35z8hL6Na08';
const HOODIE_STRIPE_URL = 'https://buy.stripe.com/cNiaEZ9fLf8c9tXapT6Na0b';
const SHIRT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

const LOCAL_MERCH_ITEMS = [
  {
    id: 'afroman-tshirt-white',
    name: 'Official Afroman T-Shirt',
    color: 'White',
    image: require('@/assets/images/eeb1ec34-93d3-4cd5-929e-357a7b1e2578.jpeg'),
    stripeUrl: STRIPE_URL,
  },
  {
    id: 'afroman-tshirt-black',
    name: 'Official Afroman T-Shirt',
    color: 'Black',
    image: require('@/assets/images/29bf2a31-d9fb-4a8b-9527-1a9535714d67.jpeg'),
    stripeUrl: STRIPE_URL,
  },
  {
    id: 'afroman-hoody-white',
    name: 'Official Afroman Hoody',
    color: 'White',
    image: require('@/assets/images/f70f1547-d85a-49a9-bdc1-8e4ae78f7693.jpeg'),
    stripeUrl: HOODIE_STRIPE_URL,
  },
  {
    id: 'afroman-hoody-black',
    name: 'Official Afroman Hoody',
    color: 'Black',
    image: require('@/assets/images/69cdc091-c353-4334-8f52-c2af80a59029.jpeg'),
    stripeUrl: HOODIE_STRIPE_URL,
  },
];

type MerchItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock: number;
  is_published: boolean;
  sort_order: number;
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function LocalMerchCard({ item }: { item: typeof LOCAL_MERCH_ITEMS[0] }) {
  const [selectedSize, setSelectedSize] = useState('M');

  const handleSizePress = (size: string) => {
    console.log(`[MerchScreen] Size selected: ${size} for ${item.name} (${item.color})`);
    setSelectedSize(size);
  };

  const handleBuyNow = () => {
    console.log(`[MerchScreen] Buy Now pressed for ${item.name} (${item.color}), size: ${selectedSize}`);
    Linking.openURL(item.stripeUrl);
  };

  return (
    <View style={localStyles.card}>
      <Image
        source={resolveImageSource(item.image)}
        style={localStyles.cardImage}
        resizeMode="cover"
      />
      <View style={localStyles.cardBody}>
        <Text style={localStyles.cardName}>{item.name}</Text>
        <Text style={localStyles.cardColor}>{item.color}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={localStyles.sizesRow}
        >
          {SHIRT_SIZES.map((size) => {
            const isSelected = selectedSize === size;
            const chipStyle = isSelected ? localStyles.sizeChipSelected : localStyles.sizeChipUnselected;
            const textStyle = isSelected ? localStyles.sizeChipTextSelected : localStyles.sizeChipTextUnselected;
            return (
              <TouchableOpacity
                key={size}
                style={[localStyles.sizeChip, chipStyle]}
                onPress={() => handleSizePress(size)}
              >
                <Text style={[localStyles.sizeChipText, textStyle]}>{size}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={localStyles.buyButton} onPress={handleBuyNow}>
          <Text style={localStyles.buyButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ApiMerchCard({ item }: { item: MerchItem }) {
  const priceText = `$${Number(item.price).toFixed(2)}`;
  const stockText = item.stock > 0 ? `${item.stock} in stock` : 'Out of stock';
  const isOutOfStock = item.stock === 0;
  const imageSource = resolveImageSource(item.image_url);

  const handleAddToCart = () => {
    console.log(`[MerchScreen] Add to cart pressed for: ${item.name} ($${Number(item.price).toFixed(2)})`);
    // API merch items link to the label's general store page
    Linking.openURL('https://buy.stripe.com/3cIfZjajP3pu35z8hL6Na08');
  };

  return (
    <View style={styles.apiCard}>
      {item.image_url ? (
        <Image source={imageSource} style={styles.apiCardImage} resizeMode="cover" />
      ) : (
        <View style={styles.apiCardImagePlaceholder}>
          <ShoppingBag size={32} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.apiCardBody}>
        <Text style={styles.apiCardName} numberOfLines={2}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.apiCardDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <Text style={styles.apiCardPrice}>{priceText}</Text>
        <Text style={[styles.apiCardStock, isOutOfStock && styles.apiCardStockOut]}>
          {stockText}
        </Text>
        <TouchableOpacity
          style={[styles.apiCardBtn, isOutOfStock && styles.apiCardBtnDisabled]}
          disabled={isOutOfStock}
          onPress={handleAddToCart}
        >
          <Text style={[styles.apiCardBtnText, isOutOfStock && styles.apiCardBtnTextDisabled]}>
            {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MerchScreen() {
  const [apiMerch, setApiMerch] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMerch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${SUPABASE_FUNCTIONS_URL}/merch`;
      console.log('[merch] Fetching merch from:', url);

      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      });

      console.log('[merch] Response status:', res.status);
      const text = await res.text();
      console.log('[merch] Response body:', text.substring(0, 300));

      if (!res.ok) {
        throw new Error(`Failed to load merch (${res.status})`);
      }

      const data = JSON.parse(text);
      const merchList: MerchItem[] = Array.isArray(data)
        ? data
        : (data.merch ?? data.items ?? data.data ?? []);
      console.log('[merch] Loaded', merchList.length, 'items');
      setApiMerch(merchList);
    } catch (err: any) {
      console.error('[merch] fetchMerch error:', err);
      setError(err.message ?? 'Failed to load merch');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMerch();
    }, [fetchMerch])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={[]}
        keyExtractor={() => 'dummy'}
        renderItem={null}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>MERCH STORE</Text>
              <Text style={styles.headerSubtitle}>Official Hungry Hustler Records Merchandise</Text>
            </View>

            {/* Local Afroman merch — always shown */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>MERCHANDISE</Text>
              </View>
              {LOCAL_MERCH_ITEMS.map((item) => (
                <LocalMerchCard key={item.id} item={item} />
              ))}
            </View>

            {/* API merch */}
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading more items...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorRow}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => { console.log('[MerchScreen] Retry pressed'); fetchMerch(); }}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : apiMerch.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionTitle}>MORE ITEMS</Text>
                </View>
                <View style={styles.apiGrid}>
                  {apiMerch.map((item) => (
                    <ApiMerchCard key={item.id} item={item} />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ height: 120 }} />
          </>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 250,
  },
  cardBody: {
    padding: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardColor: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  sizesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 16,
  },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sizeChipSelected: {
    backgroundColor: '#00FF66',
    borderColor: '#00FF66',
  },
  sizeChipUnselected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#3A3A3A',
  },
  sizeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sizeChipTextSelected: {
    color: '#111111',
  },
  sizeChipTextUnselected: {
    color: '#CCCCCC',
  },
  buyButton: {
    backgroundColor: '#00FF66',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorRow: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '700',
  },
  apiGrid: {
    gap: 16,
  },
  apiCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  apiCardImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.secondary,
  },
  apiCardImagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiCardBody: {
    padding: 14,
  },
  apiCardName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  apiCardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  apiCardPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 4,
  },
  apiCardStock: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  apiCardStockOut: {
    color: colors.error,
  },
  apiCardBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(0,255,102,0.3)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  apiCardBtnDisabled: {
    backgroundColor: colors.secondary,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: { shadowOpacity: 0, elevation: 0 },
    }),
  },
  apiCardBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.5,
  },
  apiCardBtnTextDisabled: {
    color: colors.textTertiary,
  },
});
