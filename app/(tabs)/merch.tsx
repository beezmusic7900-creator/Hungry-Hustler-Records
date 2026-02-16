
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface MerchItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock: number;
}

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function MerchScreen() {
  const [loading, setLoading] = useState(true);
  const [merchItems, setMerchItems] = useState<MerchItem[]>([]);

  useEffect(() => {
    console.log('[MerchScreen] Fetching merch items');
    fetchMerchItems();
  }, []);

  const fetchMerchItems = async () => {
    try {
      setLoading(true);
      console.log('[MerchScreen] Fetching merch items from /api/merch');
      
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<MerchItem[]>('/api/merch');
      
      console.log('[MerchScreen] Merch items received:', data);
      setMerchItems(data || []);
    } catch (error) {
      console.error('[MerchScreen] Error fetching merch items:', error);
      setMerchItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 0;

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop }}>
        <View style={styles.header}>
          <Text style={styles.title}>MERCH STORE</Text>
        </View>

        {merchItems.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="bag"
              android_material_icon_name="shopping-bag"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No merch available yet</Text>
          </View>
        ) : (
          <View style={styles.merchGrid}>
            {merchItems.map((item) => (
              <View key={item.id} style={commonStyles.card}>
                {item.image_url && (
                  <Image
                    source={resolveImageSource(item.image_url)}
                    style={styles.merchImage}
                    resizeMode="cover"
                  />
                )}
                
                <Text style={styles.merchName}>{item.name}</Text>
                
                {item.description && (
                  <Text style={styles.merchDescription}>{item.description}</Text>
                )}

                <View style={styles.merchFooter}>
                  <Text style={styles.merchPrice}>${item.price.toFixed(2)}</Text>
                  <Text style={styles.merchStock}>
                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    commonStyles.button,
                    item.stock === 0 && styles.buttonDisabled,
                  ]}
                  disabled={item.stock === 0}
                >
                  <Text style={commonStyles.buttonText}>
                    {item.stock > 0 ? 'Add to Cart' : 'Sold Out'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  merchGrid: {
    paddingHorizontal: 16,
  },
  merchImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  merchName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  merchDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  merchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  merchPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  merchStock: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  bottomPadding: {
    height: 100,
  },
});
