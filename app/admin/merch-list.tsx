import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { getMerch, deleteMerch, getBearerToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { MerchItem } from '@/types';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function AdminMerchListScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [merch, setMerch] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    loadMerch();
  }, [user, authLoading]);

  const loadMerch = async () => {
    try {
      console.log('[AdminMerch] Loading merch items');
      setLoading(true);
      setError(null);
      const data = await getMerch();
      setMerch(data);
    } catch (err) {
      console.error('[AdminMerch] Failed to load merch:', err);
      setError("Couldn't load merch.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item: MerchItem) => {
    console.log(`[AdminMerch] Delete pressed: ${item.name}`);
    Alert.alert(
      `Delete ${item.name}?`,
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete item',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`[AdminMerch] Deleting merch: ${item.id}`);
              const token = await getBearerToken();
              if (!token) throw new Error('Not authenticated');
              await deleteMerch(item.id, token);
              setMerch((prev) => prev.filter((m) => m.id !== item.id));
            } catch (err) {
              console.error('[AdminMerch] Delete failed:', err);
              Alert.alert('Error', 'Failed to delete item.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (item: MerchItem) => {
    console.log(`[AdminMerch] Edit pressed: ${item.name}`);
    router.push(`/admin/merch-form?id=${item.id}`);
  };

  const handleAdd = () => {
    console.log('[AdminMerch] Add merch pressed');
    router.push('/admin/merch-form');
  };

  const renderItem = ({ item }: { item: MerchItem }) => {
    const priceDisplay = `$${Number(item.price).toFixed(2)}`;
    const inStock = item.in_stock !== false;

    return (
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          padding: 14,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {item.image_url ? (
          <Image
            source={resolveImageSource(item.image_url)}
            style={{ width: 52, height: 52, borderRadius: 8 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: COLORS.textTertiary, fontSize: 20 }}>👕</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
              {priceDisplay}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {inStock ? (
                <CheckCircle size={12} color={COLORS.success} />
              ) : (
                <XCircle size={12} color={COLORS.danger} />
              )}
              <Text
                style={{
                  color: inStock ? COLORS.success : COLORS.danger,
                  fontSize: 11,
                  fontWeight: '500',
                }}
              >
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AnimatedPressable onPress={() => handleEdit(item)}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Pencil size={16} color={COLORS.primary} />
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => handleDelete(item)}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 68, 68, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 68, 68, 0.3)',
              }}
            >
              <Trash2 size={16} color={COLORS.danger} />
            </View>
          </AnimatedPressable>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.divider,
        }}
      >
        <AnimatedPressable onPress={handleAdd}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: COLORS.primary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Plus size={16} color={COLORS.background} />
            <Text
              style={{
                color: COLORS.background,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              Add Item
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonLine key={i} width="100%" height={80} borderRadius={12} />
          ))}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontSize: 15, textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[AdminMerch] Retry loading');
              loadMerch();
            }}
            style={{ marginTop: 16 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 24,
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
      ) : (
        <FlatList
          data={merch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>
                No merch yet. Add some!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
