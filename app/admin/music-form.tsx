import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  ImageSourcePropType,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, FileAudio, Music } from 'lucide-react-native';
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
  keyboardType,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'url' | 'numeric' | 'decimal-pad';
  required?: boolean;
}) {
  const labelText = required ? `${label} *` : label;
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
        {labelText}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: COLORS.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      />
    </View>
  );
}

export default function MusicFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState('Exclusive Songs');
  const [price, setPrice] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  // Local file selections (not yet uploaded)
  const [pendingAudioUri, setPendingAudioUri] = useState<string | null>(null);
  const [pendingAudioName, setPendingAudioName] = useState<string | null>(null);
  const [pendingCoverUri, setPendingCoverUri] = useState<string | null>(null);
  const [pendingCoverMime, setPendingCoverMime] = useState<string>('image/jpeg');

  const [saving, setSaving] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    if (isEditing) loadSong();
  }, [user, authLoading]);

  const loadSong = async () => {
    try {
      console.log(`[MusicForm] Loading song: ${id}`);
      const { data, error: dbError } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[MusicForm] Load failed:', dbError.message);
        Alert.alert('Error', 'Could not load song data.');
        router.back();
        return;
      }

      setTitle(data.title ?? '');
      setArtist(data.artist ?? '');
      setCategory(data.category ?? 'Exclusive Songs');
      setPrice(data.price != null ? String(data.price) : '');
      setIsPublished(data.is_published ?? true);
      setAudioUrl(data.audio_url ?? '');
      setCoverUrl(data.cover_url ?? '');
    } catch (err) {
      console.error('[MusicForm] Load failed:', err);
      Alert.alert('Error', 'Could not load song data.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePickAudio = async () => {
    console.log('[MusicForm] Pick audio pressed');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac', 'audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log(`[MusicForm] Audio selected: ${asset.name}`);
        setPendingAudioUri(asset.uri);
        setPendingAudioName(asset.name);
      }
    } catch (err) {
      console.error('[MusicForm] Audio pick failed:', err);
      Alert.alert('Error', 'Could not pick audio file.');
    }
  };

  const handlePickCover = async () => {
    console.log('[MusicForm] Pick cover image pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log(`[MusicForm] Cover selected: ${asset.uri}`);
      setPendingCoverUri(asset.uri);
      setPendingCoverMime(asset.mimeType ?? 'image/jpeg');
    }
  };

  const uploadAudio = async (): Promise<string | null> => {
    if (!pendingAudioUri || !pendingAudioName) return audioUrl || null;

    const ext = pendingAudioName.split('.').pop() ?? 'mp3';
    const fileName = `song-${Date.now()}.${ext}`;
    console.log(`[MusicForm] Uploading audio: ${fileName}`);
    setUploadingAudio(true);

    try {
      const response = await fetch(pendingAudioUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(fileName, blob, { upsert: true, contentType: blob.type || 'audio/mpeg' });

      if (uploadError) {
        console.error('[MusicForm] Audio upload failed:', uploadError.message);
        Alert.alert('Upload failed', uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage.from('audio').getPublicUrl(fileName);
      console.log('[MusicForm] Audio uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('[MusicForm] Audio upload failed:', err);
      Alert.alert('Upload failed', 'Could not upload audio file.');
      return null;
    } finally {
      setUploadingAudio(false);
    }
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!pendingCoverUri) return coverUrl || null;

    const ext = pendingCoverUri.split('.').pop() ?? 'jpg';
    const fileName = `cover-${Date.now()}.${ext}`;
    console.log(`[MusicForm] Uploading cover: ${fileName}`);
    setUploadingCover(true);

    try {
      const response = await fetch(pendingCoverUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, blob, { upsert: true, contentType: pendingCoverMime });

      if (uploadError) {
        console.error('[MusicForm] Cover upload failed:', uploadError.message);
        Alert.alert('Upload failed', uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);
      console.log('[MusicForm] Cover uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('[MusicForm] Cover upload failed:', err);
      Alert.alert('Upload failed', 'Could not upload cover image.');
      return null;
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Song title is required.');
      return;
    }
    if (!artist.trim()) {
      Alert.alert('Validation', 'Artist name is required.');
      return;
    }
    if (!isEditing && !pendingAudioUri && !audioUrl) {
      Alert.alert('Validation', 'Please select an audio file.');
      return;
    }

    console.log(`[MusicForm] Save pressed: ${title}`);
    setSaving(true);

    try {
      // Upload files first
      const [finalAudioUrl, finalCoverUrl] = await Promise.all([
        uploadAudio(),
        uploadCover(),
      ]);

      if (!finalAudioUrl) {
        Alert.alert('Error', 'Audio file is required.');
        setSaving(false);
        return;
      }

      const parsedPrice = price.trim() ? parseFloat(price) : null;

      const payload = {
        title: title.trim(),
        artist: artist.trim(),
        category: category.trim() || 'Exclusive Songs',
        price: parsedPrice,
        is_published: isPublished,
        audio_url: finalAudioUrl,
        cover_url: finalCoverUrl,
      };

      if (isEditing) {
        console.log(`[MusicForm] Updating song: ${id}`);
        const { error: dbError } = await (supabase as any)
          .from('songs')
          .update(payload)
          .eq('id', id as string);

        if (dbError) {
          console.error('[MusicForm] Update failed:', dbError.message);
          Alert.alert('Error', dbError.message);
          return;
        }
        console.log('[MusicForm] Song updated successfully');
      } else {
        console.log('[MusicForm] Inserting new song');
        const { error: dbError } = await (supabase as any)
          .from('songs')
          .insert(payload);

        if (dbError) {
          console.error('[MusicForm] Insert failed:', dbError.message);
          Alert.alert('Error', dbError.message);
          return;
        }
        console.log('[MusicForm] Song created successfully');
      }

      router.replace('/admin/music-list');
    } catch (err) {
      console.error('[MusicForm] Save failed:', err);
      Alert.alert('Error', 'Failed to save song.');
    } finally {
      setSaving(false);
    }
  };

  const isUploading = uploadingAudio || uploadingCover;

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
      {/* Cover Image */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        {pendingCoverUri ? (
          <Image
            source={resolveImageSource(pendingCoverUri)}
            style={{ width: 120, height: 120, borderRadius: 12, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : coverUrl ? (
          <Image
            source={resolveImageSource(coverUrl)}
            style={{ width: 120, height: 120, borderRadius: 12, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 12,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Music size={40} color={COLORS.primary} />
          </View>
        )}
        <AnimatedPressable onPress={handlePickCover} disabled={uploadingCover}>
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 20,
              borderWidth: 1,
              borderColor: COLORS.primary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Camera size={14} color={COLORS.primary} />
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
              {uploadingCover ? 'Uploading...' : 'Cover Image'}
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      <FormField
        label="Song Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Song title"
        required
      />
      <FormField
        label="Artist Name"
        value={artist}
        onChangeText={setArtist}
        placeholder="Artist name"
        required
      />
      <FormField
        label="Category"
        value={category}
        onChangeText={setCategory}
        placeholder="Exclusive Songs"
      />
      <FormField
        label="Price"
        value={price}
        onChangeText={setPrice}
        placeholder="Leave blank for FREE"
        keyboardType="decimal-pad"
      />

      {/* Published toggle */}
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
          Published
        </Text>
        <Switch
          value={isPublished}
          onValueChange={(v) => {
            console.log(`[MusicForm] Published toggle: ${v}`);
            setIsPublished(v);
          }}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={isPublished ? COLORS.background : COLORS.textSecondary}
        />
      </View>

      {/* Audio File Picker */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 13,
            fontWeight: '500',
            marginBottom: 8,
          }}
        >
          Audio File *
        </Text>
        <AnimatedPressable onPress={handlePickAudio} disabled={uploadingAudio}>
          <View
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: pendingAudioUri ? COLORS.primary : COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: pendingAudioUri ? COLORS.primaryMuted : COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: pendingAudioUri ? COLORS.primary : COLORS.border,
              }}
            >
              <FileAudio size={20} color={pendingAudioUri ? COLORS.primary : COLORS.textTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: pendingAudioUri ? COLORS.primary : COLORS.textSecondary,
                  fontSize: 14,
                  fontWeight: '500',
                }}
                numberOfLines={1}
              >
                {pendingAudioName ?? (audioUrl ? 'Audio file uploaded' : 'Select audio file (MP3, M4A, WAV, AAC)')}
              </Text>
              {audioUrl && !pendingAudioUri ? (
                <Text
                  style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 2 }}
                  numberOfLines={1}
                >
                  Current: {audioUrl.split('/').pop()}
                </Text>
              ) : null}
            </View>
          </View>
        </AnimatedPressable>
      </View>

      {/* Upload progress */}
      {isUploading && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: COLORS.primaryMuted,
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '500' }}>
            {uploadingAudio ? 'Uploading audio...' : 'Uploading cover...'}
          </Text>
        </View>
      )}

      <AnimatedPressable
        onPress={handleSave}
        disabled={saving || isUploading}
        style={{ marginTop: 8 }}
      >
        <View
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: saving || isUploading ? 0.7 : 1,
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
            {saving ? 'Saving...' : isEditing ? 'Update Song' : 'Add Song'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
