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
import { getArtist, createArtist, updateArtist, uploadImage } from '@/utils/api';
import { getBearerToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ArtistInput } from '@/types';

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
        {required ? (
          <Text style={{ color: COLORS.danger }}> *</Text>
        ) : null}
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
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Artist' : 'Add Artist' });
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    if (isEdit && id) loadArtist();
  }, [user, authLoading]);

  const loadArtist = async () => {
    try {
      console.log(`[ArtistForm] Loading artist for edit: ${id}`);
      const data = await getArtist(id as string);
      setName(data.name ?? '');
      setBio(data.bio ?? '');
      setPhotoUrl(data.photo_url ?? '');
      setSpotifyUrl(data.spotify_url ?? '');
      setAppleMusicUrl(data.apple_music_url ?? '');
      setYoutubeUrl(data.youtube_url ?? '');
      setSoundcloudUrl(data.soundcloud_url ?? '');
      setInstagramUrl(data.instagram_url ?? '');
      setTwitterUrl(data.twitter_url ?? '');
      setFacebookUrl(data.facebook_url ?? '');
      setTiktokUrl(data.tiktok_url ?? '');
      setIsFeatured(data.is_featured ?? false);
      setDisplayOrder(String(data.display_order ?? 0));
    } catch (err) {
      console.error('[ArtistForm] Failed to load artist:', err);
      Alert.alert('Error', 'Failed to load artist data.');
    } finally {
      setLoadingData(false);
    }
  };

  const handlePickPhoto = async () => {
    console.log('[ArtistForm] Pick photo pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() ?? 'photo.jpg';
      const fileType = asset.mimeType ?? 'image/jpeg';

      try {
        setUploading(true);
        console.log('[ArtistForm] Uploading photo:', fileName);
        const token = await getBearerToken();
        if (!token) throw new Error('Not authenticated');
        const { url } = await uploadImage(
          { uri: asset.uri, name: fileName, type: fileType },
          token
        );
        setPhotoUrl(url);
        console.log('[ArtistForm] Photo uploaded:', url);
      } catch (err) {
        console.error('[ArtistForm] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the photo. Try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Artist name is required.');
      return;
    }

    console.log(`[ArtistForm] Save pressed: ${isEdit ? 'update' : 'create'} ${name}`);
    setSaving(true);

    const data: ArtistInput = {
      name: name.trim(),
      bio: bio.trim() || undefined,
      photo_url: photoUrl.trim() || undefined,
      spotify_url: spotifyUrl.trim() || undefined,
      apple_music_url: appleMusicUrl.trim() || undefined,
      youtube_url: youtubeUrl.trim() || undefined,
      soundcloud_url: soundcloudUrl.trim() || undefined,
      instagram_url: instagramUrl.trim() || undefined,
      twitter_url: twitterUrl.trim() || undefined,
      facebook_url: facebookUrl.trim() || undefined,
      tiktok_url: tiktokUrl.trim() || undefined,
      is_featured: isFeatured,
      display_order: parseInt(displayOrder, 10) || 0,
    };

    try {
      const token = await getBearerToken();
      if (!token) throw new Error('Not authenticated');

      if (isEdit) {
        await updateArtist(id as string, data, token);
        console.log('[ArtistForm] Artist updated successfully');
      } else {
        await createArtist(data, token);
        console.log('[ArtistForm] Artist created successfully');
      }

      router.back();
    } catch (err) {
      console.error('[ArtistForm] Save failed:', err);
      Alert.alert('Error', 'Failed to save artist. Please try again.');
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
      {/* Photo Upload */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        {photoUrl ? (
          <Image
            source={resolveImageSource(photoUrl)}
            style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
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
        <AnimatedPressable onPress={handlePickPhoto} disabled={uploading}>
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
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Artist name"
        required
      />
      <FormField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Artist biography..."
        multiline
      />
      <FormField
        label="Photo URL"
        value={photoUrl}
        onChangeText={setPhotoUrl}
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
        Music Platforms
      </Text>
      <FormField
        label="Spotify URL"
        value={spotifyUrl}
        onChangeText={setSpotifyUrl}
        placeholder="https://open.spotify.com/..."
        keyboardType="url"
      />
      <FormField
        label="Apple Music URL"
        value={appleMusicUrl}
        onChangeText={setAppleMusicUrl}
        placeholder="https://music.apple.com/..."
        keyboardType="url"
      />
      <FormField
        label="YouTube URL"
        value={youtubeUrl}
        onChangeText={setYoutubeUrl}
        placeholder="https://youtube.com/..."
        keyboardType="url"
      />
      <FormField
        label="SoundCloud URL"
        value={soundcloudUrl}
        onChangeText={setSoundcloudUrl}
        placeholder="https://soundcloud.com/..."
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
        Social Media
      </Text>
      <FormField
        label="Instagram URL"
        value={instagramUrl}
        onChangeText={setInstagramUrl}
        placeholder="https://instagram.com/..."
        keyboardType="url"
      />
      <FormField
        label="Twitter URL"
        value={twitterUrl}
        onChangeText={setTwitterUrl}
        placeholder="https://twitter.com/..."
        keyboardType="url"
      />
      <FormField
        label="Facebook URL"
        value={facebookUrl}
        onChangeText={setFacebookUrl}
        placeholder="https://facebook.com/..."
        keyboardType="url"
      />
      <FormField
        label="TikTok URL"
        value={tiktokUrl}
        onChangeText={setTiktokUrl}
        placeholder="https://tiktok.com/..."
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
        <Text style={{ color: COLORS.text, fontSize: 15 }}>Featured Artist</Text>
        <Switch
          value={isFeatured}
          onValueChange={(v) => {
            console.log(`[ArtistForm] Featured toggle: ${v}`);
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
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Artist'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
