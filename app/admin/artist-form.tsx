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
      const { data, error: dbError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[ArtistForm] Load failed:', dbError.message);
        Alert.alert('Error', 'Could not load artist data.');
        router.back();
        return;
      }

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
        setPhotoUrl(urlData.publicUrl);
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
      bio: bio.trim() || null,
      photo_url: photoUrl.trim() || null,
      spotify_url: spotifyUrl.trim() || null,
      apple_music_url: appleMusicUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      soundcloud_url: soundcloudUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      twitter_url: twitterUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      is_featured: isFeatured,
      display_order: parseInt(displayOrder, 10) || 0,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isEditing) {
        console.log(`[ArtistForm] Updating artist: ${id}`);
        const { error: dbError } = await supabase
          .from('artists')
          .update(payload)
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
          .insert(payload);

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
        {photoUrl ? (
          <Image
            source={resolveImageSource(photoUrl)}
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
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Artist biography..."
        multiline
      />
      <FormField
        label="Display Order"
        value={displayOrder}
        onChangeText={setDisplayOrder}
        placeholder="0"
        keyboardType="numeric"
      />

      {/* Featured toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          paddingVertical: 4,
        }}
      >
        <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '500' }}>
          Featured Artist
        </Text>
        <Switch
          value={isFeatured}
          onValueChange={(v) => {
            console.log(`[ArtistForm] Featured toggle: ${v}`);
            setIsFeatured(v);
          }}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={isFeatured ? COLORS.background : COLORS.textSecondary}
        />
      </View>

      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 12,
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
          marginTop: 4,
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
