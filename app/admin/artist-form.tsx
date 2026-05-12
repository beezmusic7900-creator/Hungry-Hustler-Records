import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase, supabasePublic } from '@/integrations/supabase/client';
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
  keyboardType?: 'default' | 'url' | 'numeric' | 'email-address';
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

export default function ArtistFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    if (isEditing) loadArtist();
  }, [user, authLoading]);

  const loadArtist = async () => {
    try {
      console.log(`[ArtistForm] Loading artist: ${id}`);
      const { data, error: dbError } = await supabasePublic
        .from('artists')
        .select('*')
        .eq('id', id as string)
        .maybeSingle();

      if (dbError) {
        console.error('[ArtistForm] Load failed:', dbError.message);
        Alert.alert('Error', 'Could not load artist data.');
        router.back();
        return;
      }

      if (!dbError && !data) {
        console.warn('[ArtistForm] Artist not found:', id);
        Alert.alert('Artist not found');
        router.back();
        return;
      }

      const row = data as any;
      setName(row.name ?? '');
      setGenre(row.genre ?? '');
      setBio(row.bio ?? '');
      setImageUrl(row.image_url ?? '');
      setAppleMusicUrl(row.apple_music_url ?? '');
    } catch (err) {
      console.error('[ArtistForm] Load failed:', err);
      Alert.alert('Error', 'Could not load artist data.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
    console.log('[ArtistForm] Upload photo pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `artist-${Date.now()}.${ext}`;

      try {
        setUploading(true);
        console.log(`[ArtistForm] Uploading photo: ${fileName}`);

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, blob, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });

        if (uploadError) {
          console.error('[ArtistForm] Upload failed:', uploadError.message);
          Alert.alert('Upload failed', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        setImageUrl(urlData.publicUrl);
        console.log('[ArtistForm] Photo uploaded:', urlData.publicUrl);
      } catch (err) {
        console.error('[ArtistForm] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the photo.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Artist name is required.');
      return;
    }

    console.log(`[ArtistForm] Save pressed: ${name}`);
    setSaving(true);

    const payload = {
      name: name.trim(),
      genre: genre.trim() || null,
      bio: bio.trim() || null,
      image_url: imageUrl.trim() || null,
      apple_music_url: appleMusicUrl.trim() || null,
    };

    try {
      if (isEditing) {
        console.log(`[ArtistForm] Updating artist: ${id}`);
        const { error: dbError } = await supabase
          .from('artists')
          .update(payload as any)
          .eq('id', id as string);

        if (dbError) {
          console.error('[ArtistForm] Update failed:', dbError.message);
          Alert.alert('Error', dbError.message);
          return;
        }
        console.log('[ArtistForm] Artist updated successfully');
      } else {
        console.log('[ArtistForm] Inserting new artist');
        const { error: dbError } = await supabase
          .from('artists')
          .insert({ ...payload, is_published: true, created_by: user?.id ?? null } as any);

        if (dbError) {
          console.error('[ArtistForm] Insert failed:', dbError.message);
          Alert.alert('Error', dbError.message);
          return;
        }
        console.log('[ArtistForm] Artist created successfully');
      }

      router.replace('/admin/artists');
    } catch (err) {
      console.error('[ArtistForm] Save failed:', err);
      Alert.alert('Error', 'Failed to save artist.');
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
      {/* Photo Upload */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        {imageUrl ? (
          <Image
            source={resolveImageSource(imageUrl)}
            style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
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
        <AnimatedPressable onPress={handleUploadPhoto} disabled={uploading}>
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
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      <FormField
        label="Artist Name *"
        value={name}
        onChangeText={setName}
        placeholder="Artist name"
      />
      <FormField
        label="Genre"
        value={genre}
        onChangeText={setGenre}
        placeholder="e.g. Hip-Hop, R&B, Pop"
      />
      <FormField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Artist biography..."
        multiline
      />
      <FormField
        label="Image URL"
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="https://..."
        keyboardType="url"
      />
      <FormField
        label="Apple Music URL"
        value={appleMusicUrl}
        onChangeText={setAppleMusicUrl}
        placeholder="https://music.apple.com/artist/..."
        keyboardType="url"
      />

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
            {saving ? 'Saving...' : isEditing ? 'Update Artist' : 'Add Artist'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
