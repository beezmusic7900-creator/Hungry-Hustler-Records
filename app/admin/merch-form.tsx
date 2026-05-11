import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Switch,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'url' | 'numeric' | 'email-address' | 'decimal-pad';
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [inStock, setInStock] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    if (isEditing) loadItem();
  }, [user, authLoading]);

  const loadItem = async () => {
    try {
      console.log(`[MerchForm] Loading merch item: ${id}`);
      const result = await supabase
        .from('merch')
        .select('*')
        .eq('id', id as string)
        .single();
      const data = result.data as any;
      const dbError = result.error;

      if (dbError) {
        console.error('[MerchForm] Load failed:', dbError.message);
        Alert.alert('Error', 'Could not load item data.');
        router.back();
        return;
      }

      setName(data.name ?? '');
      setDescription(data.description ?? '');
      setPrice(String(data.price ?? ''));
      setImageUrl(data.image_url ?? '');
      setCategory(data.category ?? '');
      setCheckoutUrl(data.checkout_url ?? '');
      setInStock(data.in_stock ?? true);
      setIsPublished(data.is_published ?? true);
      setIsFeatured(data.is_featured ?? false);
      setDisplayOrder('0');
    } catch (err) {
      console.error('[MerchForm] Load failed:', err);
      Alert.alert('Error', 'Could not load item data.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    console.log('[MerchForm] Upload image pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `merch-${Date.now()}.${ext}`;

      try {
        setUploading(true);
        console.log(`[MerchForm] Uploading image: ${fileName}`);

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, blob, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });

        if (uploadError) {
          console.error('[MerchForm] Upload failed:', uploadError.message);
          Alert.alert('Upload failed', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        setImageUrl(urlData.publicUrl);
        console.log('[MerchForm] Image uploaded:', urlData.publicUrl);
      } catch (err) {
        console.error('[MerchForm] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the image.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Item name is required.');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Validation', 'Please enter a valid price.');
      return;
    }

    console.log(`[MerchForm] Save pressed: ${name}`);
    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice,
      image_url: imageUrl.trim() || null,
      category: category.trim() || null,
      checkout_url: checkoutUrl.trim() || null,
      in_stock: inStock,
      is_published: isPublished,
      is_featured: isFeatured,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isEditing) {
        console.log(`[MerchForm] Updating merch item: ${id}`);
        const { error: dbError } = await supabase
          .from('merch')
          .update(payload)
          .eq('id', id as string);

        if (dbError) {
          console.error('[MerchForm] Update failed:', dbError.message);
          Alert.alert('Error', dbError.message);
          return;
        }
        console.log('[MerchForm] Merch item updated successfully');
      } else {
        console.log('[MerchForm] Inserting new merch item');
        const { error: dbError } = await supabase
          .from('merch')
          .insert(payload);

        if (dbError) {
          console.error('[MerchForm] Insert failed:', dbError.message);
          Alert.alert('Error', dbError.message);
          return;
        }
        console.log('[MerchForm] Merch item created successfully');
      }

      router.replace('/admin/merch-list');
    } catch (err) {
      console.error('[MerchForm] Save failed:', err);
      Alert.alert('Error', 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
            style={{ width: 160, height: 160, borderRadius: 12, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 160,
              height: 160,
              borderRadius: 12,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Camera size={40} color={COLORS.textTertiary} />
          </View>
        )}
        <AnimatedPressable onPress={handleUploadImage} disabled={uploading}>
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
        label="Item Name *"
        value={name}
        onChangeText={setName}
        placeholder="Product name"
      />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Product description..."
        multiline
      />
      <FormField
        label="Price *"
        value={price}
        onChangeText={setPrice}
        placeholder="0.00"
        keyboardType="decimal-pad"
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
      <FormField
        label="Display Order"
        value={displayOrder}
        onChangeText={setDisplayOrder}
        placeholder="0"
        keyboardType="numeric"
      />

      {/* Toggles */}
      {[
        { label: 'In Stock', value: inStock, setter: setInStock, key: 'inStock' },
        { label: 'Published', value: isPublished, setter: setIsPublished, key: 'isPublished' },
        { label: 'Featured', value: isFeatured, setter: setIsFeatured, key: 'isFeatured' },
      ].map(({ label, value, setter, key }) => (
        <View
          key={key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '500' }}>
            {label}
          </Text>
          <Switch
            value={value}
            onValueChange={(v) => {
              console.log(`[MerchForm] ${label} toggle: ${v}`);
              setter(v);
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={value ? COLORS.background : COLORS.textSecondary}
          />
        </View>
      ))}

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
            {saving ? 'Saving...' : isEditing ? 'Update Item' : 'Add Item'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
