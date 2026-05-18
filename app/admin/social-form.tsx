import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const ARTIST_OPTIONS = ['Afroman', 'OG Daddy V'] as const;
type ArtistOption = (typeof ARTIST_OPTIONS)[number];

export default function SocialFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isEdit = !!id;

  const [artistName, setArtistName] = useState<ArtistOption>('Afroman');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [postDate, setPostDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Post' : 'New Post' });
    if (isEdit) loadPost();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadPost = async () => {
    try {
      console.log('[SocialForm] Loading post:', id);
      const { data, error: dbError } = await db
        .from('social_posts')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[SocialForm] Load error:', dbError.message);
        return;
      }
      if (data) {
        const artist = ARTIST_OPTIONS.includes(data.artist_name)
          ? (data.artist_name as ArtistOption)
          : 'Afroman';
        setArtistName(artist);
        setCaption(data.caption ?? '');
        setImageUrl(data.image_url ?? '');
        setPostUrl(data.post_url ?? '');
        setPostDate(data.post_date ? new Date(data.post_date) : new Date());
        setIsPublished(data.is_published ?? false);
      }
    } catch (err) {
      console.error('[SocialForm] Failed to load post:', err);
    }
  };

  const handleSave = async () => {
    if (!artistName.trim()) {
      setError('Artist is required.');
      return;
    }
    if (!user) {
      setError('You must be logged in.');
      return;
    }

    console.log('[SocialForm] Saving post, artist:', artistName, 'isEdit:', isEdit);
    setSaving(true);
    setError(null);

    const payload = {
      artist_name: artistName,
      caption: caption.trim() || null,
      image_url: imageUrl.trim() || null,
      post_url: postUrl.trim() || null,
      post_date: postDate.toISOString(),
      is_published: isPublished,
    };

    try {
      if (isEdit) {
        const { error: updateErr } = await db
          .from('social_posts')
          .update(payload)
          .eq('id', id as string);
        if (updateErr) throw updateErr;
        console.log('[SocialForm] Post updated:', id);
      } else {
        const { error: insertErr } = await db
          .from('social_posts')
          .insert({ ...payload, created_by: user.id });
        if (insertErr) throw insertErr;
        console.log('[SocialForm] Post created');
      }
      router.back();
    } catch (err: unknown) {
      console.error('[SocialForm] Save error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save post.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async () => {
    console.log('[SocialForm] Upload image pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `social-${Date.now()}.${ext}`;

      try {
        setUploading(true);
        console.log(`[SocialForm] Uploading image: ${fileName}`);

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, blob, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });

        if (uploadError) {
          console.error('[SocialForm] Upload failed:', uploadError.message);
          Alert.alert('Upload failed', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        setImageUrl(urlData.publicUrl);
        console.log('[SocialForm] Image uploaded:', urlData.publicUrl);
      } catch (err) {
        console.error('[SocialForm] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the image.');
      } finally {
        setUploading(false);
      }
    }
  };

  const dateLabel = postDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const saveLabel = saving ? 'Saving...' : isEdit ? 'Update Post' : 'Create Post';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 18 }}>
          {/* Artist picker */}
          <View>
            <Text style={labelStyle}>Artist *</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {ARTIST_OPTIONS.map((option) => {
                const isSelected = artistName === option;
                return (
                  <AnimatedPressable
                    key={option}
                    onPress={() => {
                      console.log('[SocialForm] Artist selected:', option);
                      setArtistName(option);
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                        borderWidth: 1,
                        borderColor: isSelected ? COLORS.primary : COLORS.border,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? COLORS.background : COLORS.textSecondary,
                          fontSize: 14,
                          fontWeight: '600',
                        }}
                      >
                        {option}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Caption */}
          <View>
            <Text style={labelStyle}>Caption</Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Post caption..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
              style={[inputStyle, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
            />
          </View>

          {/* Post Image */}
          <View>
            <Text style={labelStyle}>Post Image</Text>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 10 }}
                resizeMode="cover"
              />
            ) : null}
            <AnimatedPressable onPress={handleUploadImage} disabled={uploading}>
              <View style={[inputStyle, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }]}>
                <Text style={{ color: uploading ? COLORS.textTertiary : COLORS.primary, fontSize: 14, fontWeight: '600' }}>
                  {uploading ? 'Uploading...' : imageUrl ? 'Change Image' : 'Upload Image'}
                </Text>
              </View>
            </AnimatedPressable>
          </View>

          {/* Post URL */}
          <View>
            <Text style={labelStyle}>Post URL</Text>
            <TextInput
              value={postUrl}
              onChangeText={setPostUrl}
              placeholder="https://www.instagram.com/p/..."
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
              style={inputStyle}
            />
          </View>

          {/* Post Date */}
          <View>
            <Text style={labelStyle}>Post Date</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[SocialForm] Open date picker');
                setShowDatePicker(true);
              }}
            >
              <View style={[inputStyle, { justifyContent: 'center' }]}>
                <Text style={{ color: COLORS.text, fontSize: 15 }}>{dateLabel}</Text>
              </View>
            </AnimatedPressable>
            {showDatePicker && (
              <DateTimePicker
                value={postDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    console.log('[SocialForm] Date selected:', date.toISOString());
                    setPostDate(date);
                  }
                }}
                themeVariant="dark"
              />
            )}
          </View>

          {/* Published toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600' }}>Published</Text>
            <Switch
              value={isPublished}
              onValueChange={(val) => {
                console.log('[SocialForm] Published toggle:', val);
                setIsPublished(val);
              }}
              trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>

          {/* Error */}
          {error ? (
            <Text style={{ color: COLORS.danger, fontSize: 13, textAlign: 'center' }}>
              {error}
            </Text>
          ) : null}

          {/* Save button */}
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
                {saveLabel}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const labelStyle = {
  color: COLORS.textSecondary,
  fontSize: 13,
  fontWeight: '500' as const,
  marginBottom: 8,
};

const inputStyle = {
  backgroundColor: COLORS.surfaceSecondary,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: COLORS.text,
  fontSize: 15,
  borderWidth: 1,
  borderColor: COLORS.border,
};
