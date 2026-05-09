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
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MerchItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  is_published: boolean;
  in_stock: boolean;
}

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
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    loadItems();
  }, [user, authLoading]);

  const loadItems = async () => {
    try {
      console.log('[AdminMerch] Loading merch items from Supabase');
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('merch')
        .select('*')
        .order('display_order');

      if (dbError) {
        console.error('[AdminMerch] Supabase error:', dbError.message);
        setError("Couldn't load merch items.");
        return;
      }
      setItems(((data as any[]) ?? []) as MerchItem[]);
    } catch (err) {
      console.error('[AdminMerch] Failed to load merch:', err);
      setError("Couldn't load merch items.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item: MerchItem) => {
    console.log(`[AdminMerch] Delete pressed: ${item.name}`);
    Alert.alert(
      `Delete "${item.name}"?`,
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`[AdminMerch] Deleting merch item: ${item.id}`);
              const { error: dbError } = await supabase
                .from('merch')
                .delete()
                .eq('id', item.id);

              if (dbError) {
                console.error('[AdminMerch] Delete failed:', dbError.message);
                Alert.alert('Error', dbError.message);
                return;
              }
              console.log('[AdminMerch] Merch item deleted, reloading list');
              await loadItems();
            } catch (err) {
              console.error('[AdminMerch] Delete failed:', err);
              Alert.alert('Error', 'Failed to delete item.');
            }
          },
        },
      ]
    );
  };

  const handleTogglePublish = async (item: MerchItem) => {
    const newValue = !item.is_published;
    console.log(`[AdminMerch] Toggle publish: ${item.name} → ${newValue}`);
    try {
      const { error: dbError } = await supabase
        .from('merch')
        .update({ is_published: newValue, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (dbError) {
        console.error('[AdminMerch] Toggle publish failed:', dbError.message);
        Alert.alert('Error', dbError.message);
        return;
      }
      await loadItems();
    } catch (err) {
      console.error('[AdminMerch] Toggle publish failed:', err);
      Alert.alert('Error', 'Failed to update item.');
    }
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
            <Text style={{ color: COLORS.textTertiary, fontSize: 20 }}>{'🛍'}</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
            {priceDisplay}
          </Text>
          <View
            style={{
              backgroundColor: item.is_published
                ? 'rgba(0, 255, 102, 0.12)'
                : COLORS.surfaceSecondary,
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
              alignSelf: 'flex-start',
              marginTop: 4,
              borderWidth: 1,
              borderColor: item.is_published ? COLORS.primary : COLORS.border,
            }}
          >
            <Text
              style={{
                color: item.is_published ? COLORS.primary : COLORS.textSecondary,
                fontSize: 10,
                fontWeight: '600',
              }}
            >
              {item.is_published ? 'LIVE' : 'DRAFT'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AnimatedPressable onPress={() => handleTogglePublish(item)}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              {item.is_published ? (
                <EyeOff size={16} color={COLORS.textSecondary} />
              ) : (
                <Eye size={16} color={COLORS.textSecondary} />
              )}
            </View>
          </AnimatedPressable>
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
              loadItems();
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
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>
                No merch items yet. Add one!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
