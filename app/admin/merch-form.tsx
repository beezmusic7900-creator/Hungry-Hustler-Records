import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Switch,
  Image,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getMerchItem, createMerch, updateMerch, uploadImage, getBearerToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { MerchInput } from '@/types';

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'url' | 'numeric' | 'email-address';
  required?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 13,
          fontWeight: '500',
          marginBottom: 8,
        }}
      >
        {label}
        {required ? <Text style={{ color: COLORS.danger }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 12 : 14,
          color: COLORS.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: COLORS.border,
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export default function MerchFormScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [inStock, setInStock] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Merch Item' : 'Add Merch Item' });
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    if (isEdit && id) loadItem();
  }, [user, authLoading]);

  const loadItem = async () => {
    try {
      console.log(`[MerchForm] Loading merch for edit: ${id}`);
      const data = await getMerchItem(id as string);
      setName(data.name ?? '');
      setDescription(data.description ?? '');
      setPrice(String(data.price ?? ''));
      setImageUrl(data.image_url ?? '');
      setCategory(data.category ?? '');
      setCheckoutUrl(data.checkout_url ?? '');
      setInStock(data.in_stock !== false);
      setIsFeatured(data.is_featured ?? false);
      setDisplayOrder(String(data.display_order ?? 0));
    } catch (err) {
      console.error('[MerchForm] Failed to load merch item:', err);
      Alert.alert('Error', 'Failed to load item data.');
    } finally {
      setLoadingData(false);
    }
  };

  const handlePickImage = async () => {
    console.log('[MerchForm] Pick image pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() ?? 'image.jpg';
      const fileType = asset.mimeType ?? 'image/jpeg';

      try {
        setUploading(true);
        console.log('[MerchForm] Uploading image:', fileName);
        const token = await getBearerToken();
        if (!token) throw new Error('Not authenticated');
        const { url } = await uploadImage(
          { uri: asset.uri, name: fileName, type: fileType },
          token
        );
        setImageUrl(url);
        console.log('[MerchForm] Image uploaded:', url);
      } catch (err) {
        console.error('[MerchForm] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the image. Try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Item name is required.');
      return;
    }

    console.log(`[MerchForm] Save pressed: ${isEdit ? 'update' : 'create'} ${name}`);
    setSaving(true);

    const data: MerchInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: parseFloat(price) || 0,
      image_url: imageUrl.trim() || undefined,
      category: category.trim() || undefined,
      checkout_url: checkoutUrl.trim() || undefined,
      in_stock: inStock,
      is_featured: isFeatured,
      display_order: parseInt(displayOrder, 10) || 0,
    };

    try {
      const token = await getBearerToken();
      if (!token) throw new Error('Not authenticated');

      if (isEdit) {
        await updateMerch(id as string, data, token);
        console.log('[MerchForm] Merch updated successfully');
      } else {
        await createMerch(data, token);
        console.log('[MerchForm] Merch created successfully');
      }

      router.back();
    } catch (err) {
      console.error('[MerchForm] Save failed:', err);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: COLORS.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Image Upload */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        {imageUrl ? (
          <Image
            source={resolveImageSource(imageUrl)}
            style={{ width: 120, height: 120, borderRadius: 12, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 12,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Camera size={32} color={COLORS.textTertiary} />
          </View>
        )}
        <AnimatedPressable onPress={handlePickImage} disabled={uploading}>
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 20,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      <FormField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Item name"
        required
      />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Item description..."
        multiline
      />
      <FormField
        label="Price"
        value={price}
        onChangeText={setPrice}
        placeholder="29.99"
        keyboardType="numeric"
      />
      <FormField
        label="Image URL"
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="https://..."
        keyboardType="url"
      />
      <FormField
        label="Category"
        value={category}
        onChangeText={setCategory}
        placeholder="e.g. Apparel, Accessories"
      />
      <FormField
        label="Checkout URL"
        value={checkoutUrl}
        onChangeText={setCheckoutUrl}
        placeholder="https://..."
        keyboardType="url"
      />

      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginTop: 8,
        }}
      >
        Settings
      </Text>

      {/* In Stock toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: COLORS.text, fontSize: 15 }}>In Stock</Text>
        <Switch
          value={inStock}
          onValueChange={(v) => {
            console.log(`[MerchForm] In stock toggle: ${v}`);
            setInStock(v);
          }}
          trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryDark }}
          thumbColor={inStock ? COLORS.primary : COLORS.textTertiary}
        />
      </View>

      {/* Featured toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: COLORS.text, fontSize: 15 }}>Featured Item</Text>
        <Switch
          value={isFeatured}
          onValueChange={(v) => {
            console.log(`[MerchForm] Featured toggle: ${v}`);
            setIsFeatured(v);
          }}
          trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryDark }}
          thumbColor={isFeatured ? COLORS.primary : COLORS.textTertiary}
        />
      </View>

      <FormField
        label="Display Order"
        value={displayOrder}
        onChangeText={setDisplayOrder}
        placeholder="0"
        keyboardType="numeric"
      />

      {/* Save Button */}
      <AnimatedPressable onPress={handleSave} disabled={saving} style={{ marginTop: 8 }}>
        <View
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              color: COLORS.background,
              fontSize: 16,
              fontWeight: '700',
              letterSpacing: 0.5,
            }}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
