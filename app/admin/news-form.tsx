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
type ArtistOption = (typeof ARTIST_OPTIONS)[number] | null;

export default function NewsFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [artistName, setArtistName] = useState<ArtistOption>(null);
  const [articleDate, setArticleDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Article' : 'New Article' });
    if (isEdit) loadArticle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadArticle = async () => {
    try {
      console.log('[NewsForm] Loading article:', id);
      const { data, error: dbError } = await db
        .from('news_articles')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[NewsForm] Load error:', dbError.message);
        return;
      }
      if (data) {
        setTitle(data.title ?? '');
        setBody(data.body ?? '');
        setImageUrl(data.image_url ?? '');
        setSourceUrl(data.source_url ?? '');
        const artist = ARTIST_OPTIONS.includes(data.artist_name)
          ? (data.artist_name as ArtistOption)
          : null;
        setArtistName(artist);
        setArticleDate(data.article_date ? new Date(data.article_date) : new Date());
        setIsPublished(data.is_published ?? false);
      }
    } catch (err) {
      console.error('[NewsForm] Failed to load article:', err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!user) {
      setError('You must be logged in.');
      return;
    }

    console.log('[NewsForm] Saving article, title:', title, 'isEdit:', isEdit);
    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      body: body.trim() || null,
      image_url: imageUrl.trim() || null,
      source_url: sourceUrl.trim() || null,
      artist_name: artistName ?? null,
      article_date: articleDate.toISOString(),
      is_published: isPublished,
    };

    try {
      if (isEdit) {
        const { error: updateErr } = await db
          .from('news_articles')
          .update(payload)
          .eq('id', id as string);
        if (updateErr) throw updateErr;
        console.log('[NewsForm] Article updated:', id);
      } else {
        const { error: insertErr } = await db
          .from('news_articles')
          .insert(payload);
        if (insertErr) throw insertErr;
        console.log('[NewsForm] Article created');
      }
      router.back();
    } catch (err: unknown) {
      console.error('[NewsForm] Save error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save article.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async () => {
    console.log('[NewsForm] Upload image pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `news-${Date.now()}.${ext}`;

      try {
        setUploading(true);
        console.log(`[NewsForm] Uploading image: ${fileName}`);

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, blob, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });

        if (uploadError) {
          console.error('[NewsForm] Upload failed:', uploadError.message);
          Alert.alert('Upload failed', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        setImageUrl(urlData.publicUrl);
        console.log('[NewsForm] Image uploaded:', urlData.publicUrl);
      } catch (err) {
        console.error('[NewsForm] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the image.');
      } finally {
        setUploading(false);
      }
    }
  };

  const dateLabel = articleDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const saveLabel = saving ? 'Saving...' : isEdit ? 'Update Article' : 'Create Article';

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
          {/* Title */}
          <View>
            <Text style={labelStyle}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Article title..."
              placeholderTextColor={COLORS.textTertiary}
              style={inputStyle}
            />
          </View>

          {/* Body */}
          <View>
            <Text style={labelStyle}>Body / Summary</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Article summary or body text..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={6}
              style={[inputStyle, { height: 140, textAlignVertical: 'top', paddingTop: 12 }]}
            />
          </View>

          {/* Article Image */}
          <View>
            <Text style={labelStyle}>Article Image</Text>
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

          {/* Source URL */}
          <View>
            <Text style={labelStyle}>Source URL</Text>
            <TextInput
              value={sourceUrl}
              onChangeText={setSourceUrl}
              placeholder="https://..."
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
              style={inputStyle}
            />
          </View>

          {/* Artist picker */}
          <View>
            <Text style={labelStyle}>Artist</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[NewsForm] Artist selected: None');
                  setArtistName(null);
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: artistName === null ? COLORS.primary : COLORS.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: artistName === null ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: artistName === null ? COLORS.background : COLORS.textSecondary,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    None
                  </Text>
                </View>
              </AnimatedPressable>
              {ARTIST_OPTIONS.map((option) => {
                const isSelected = artistName === option;
                return (
                  <AnimatedPressable
                    key={option}
                    onPress={() => {
                      console.log('[NewsForm] Artist selected:', option);
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

          {/* Article Date */}
          <View>
            <Text style={labelStyle}>Article Date</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[NewsForm] Open date picker');
                setShowDatePicker(true);
              }}
            >
              <View style={[inputStyle, { justifyContent: 'center' }]}>
                <Text style={{ color: COLORS.text, fontSize: 15 }}>{dateLabel}</Text>
              </View>
            </AnimatedPressable>
            {showDatePicker && (
              <DateTimePicker
                value={articleDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    console.log('[NewsForm] Date selected:', date.toISOString());
                    setArticleDate(date);
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
                console.log('[NewsForm] Published toggle:', val);
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
