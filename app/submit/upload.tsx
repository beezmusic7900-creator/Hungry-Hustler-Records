import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Upload, X, CheckCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const TYPE_LABELS: Record<string, string> = {
  dance_challenge: 'Dance Challenge',
  rap_challenge: 'Rap Challenge',
  fan_art: 'Fan Art',
  performance_clip: 'Performance Clip',
  remix: 'Remix',
  beat: 'Beat',
  talent: 'Talent',
  contest_entry: 'Contest Entry',
  other: 'Other',
};

function getMediaTypes(type: string): ImagePicker.MediaType {
  if (type === 'fan_art') return 'images';
  if (type === 'beat' || type === 'rap_challenge') return 'videos';
  // For mixed, default to videos (most common for talent submissions)
  return 'videos';
}

export default function SubmitUploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ type: string; contest_id?: string }>();
  const submissionType = params.type ?? 'other';
  const contestId = params.contest_id ?? null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaAsset, setMediaAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [titleError, setTitleError] = useState('');

  const typeLabel = TYPE_LABELS[submissionType] ?? 'Content';
  const mediaTypes = getMediaTypes(submissionType);

  useEffect(() => {
    if (!user) {
      router.replace('/fan-auth');
    }
  }, [user, router]);

  const handlePickMedia = async () => {
    console.log('[SubmitUpload] Pick media pressed, type:', submissionType);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: false,
        quality: 0.9,
        videoMaxDuration: 300,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      console.log('[SubmitUpload] Media selected:', asset.uri, 'size:', asset.fileSize);

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert('File too large', 'Please select a file under 100 MB.');
        return;
      }

      setMediaAsset(asset);
      setThumbnailUri(null);

      // Generate thumbnail for videos
      if (asset.type === 'video') {
        try {
          const VideoThumbnails = await import('expo-video-thumbnails');
          const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000 });
          setThumbnailUri(uri);
          console.log('[SubmitUpload] Thumbnail generated:', uri);
        } catch (thumbErr) {
          console.warn('[SubmitUpload] Thumbnail generation failed:', thumbErr);
        }
      }
    } catch (err) {
      console.error('[SubmitUpload] handlePickMedia error:', err);
      Alert.alert('Error', 'Could not pick media. Please try again.');
    }
  };

  const validateTitle = () => {
    const t = title.trim();
    if (t.length < 3) {
      setTitleError('Title must be at least 3 characters');
      return false;
    }
    if (t.length > 100) {
      setTitleError('Title must be under 100 characters');
      return false;
    }
    setTitleError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!validateTitle()) return;
    if (!mediaAsset) {
      Alert.alert('Media required', 'Please pick a photo or video to upload.');
      return;
    }

    console.log('[SubmitUpload] Starting submission upload');
    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Sign in required', 'Please sign in to submit content.');
        return;
      }

      // Determine media type
      const isVideo = mediaAsset.type === 'video';
      const isImage = !isVideo;
      const mediaType: 'video' | 'image' = isVideo ? 'video' : 'image';

      // Build filename
      const ext = isVideo ? 'mp4' : 'jpg';
      const filename = `${Date.now()}.${ext}`;
      const storagePath = `${user.id}/${submissionType}/${filename}`;

      setUploadProgress(10);

      // Fetch the file as blob
      const fileResponse = await fetch(mediaAsset.uri);
      const blob = await fileResponse.blob();

      setUploadProgress(30);

      // Upload media
      console.log('[SubmitUpload] Uploading media to submissions bucket:', storagePath);
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(storagePath, blob, {
          contentType: isVideo ? 'video/mp4' : 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('[SubmitUpload] Media upload error:', uploadError.message);
        Alert.alert('Upload failed', uploadError.message);
        return;
      }

      setUploadProgress(70);

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(storagePath);
      const mediaUrl = urlData.publicUrl;
      console.log('[SubmitUpload] Media uploaded, URL:', mediaUrl);

      // Upload thumbnail if available
      let thumbnailUrl: string | undefined;
      if (thumbnailUri) {
        try {
          const thumbPath = `${user.id}/${submissionType}/thumb-${Date.now()}.jpg`;
          const thumbResponse = await fetch(thumbnailUri);
          const thumbBlob = await thumbResponse.blob();
          const { error: thumbErr } = await supabase.storage
            .from('submission-thumbnails')
            .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', upsert: false });
          if (!thumbErr) {
            const { data: thumbUrlData } = supabase.storage.from('submission-thumbnails').getPublicUrl(thumbPath);
            thumbnailUrl = thumbUrlData.publicUrl;
            console.log('[SubmitUpload] Thumbnail uploaded:', thumbnailUrl);
          }
        } catch (thumbErr) {
          console.warn('[SubmitUpload] Thumbnail upload failed:', thumbErr);
        }
      }

      setUploadProgress(85);

      // Call submit-content edge function
      console.log('[SubmitUpload] Calling submit-content edge function');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          submission_type: submissionType,
          title: title.trim(),
          description: description.trim() || undefined,
          media_url: mediaUrl,
          media_type: mediaType,
          thumbnail_url: thumbnailUrl,
          duration_seconds: mediaAsset.duration ? Math.round(mediaAsset.duration / 1000) : undefined,
          file_size_bytes: mediaAsset.fileSize ?? undefined,
          contest_id: contestId ?? undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[SubmitUpload] submit-content error:', res.status, text);
        Alert.alert('Submission failed', 'Could not submit your content. Please try again.');
        return;
      }

      const json = await res.json();
      console.log('[SubmitUpload] Submission successful:', json);
      setUploadProgress(100);
      setSubmitted(true);
    } catch (err) {
      console.error('[SubmitUpload] handleSubmit error:', err);
      Alert.alert('Error', 'Something went wrong. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const fileSizeMB = mediaAsset?.fileSize ? (mediaAsset.fileSize / (1024 * 1024)).toFixed(1) : null;
  const titleCharCount = title.length;
  const descCharCount = description.length;

  if (submitted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 2,
            borderColor: COLORS.primary,
          }}
        >
          <CheckCircle size={40} color={COLORS.primary} />
        </View>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
          Submitted for review!
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280, marginBottom: 32 }}>
          Your submission is under review. We'll notify you once it's approved. Most reviews happen within 24 hours.
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[SubmitUpload] View my submissions pressed');
            router.replace('/submit/my-submissions');
          }}
          style={{ width: '100%', marginBottom: 12 }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: COLORS.background, fontSize: 15, fontWeight: '700' }}>
              View My Submissions
            </Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => {
            console.log('[SubmitUpload] Back to submit index pressed');
            router.replace('/submit');
          }}
          style={{ width: '100%' }}
        >
          <View
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' }}>
              Submit Another
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 80,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          {typeLabel}
        </Text>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
          Upload Your Content
        </Text>
        {contestId ? (
          <View
            style={{
              backgroundColor: 'rgba(245,158,11,0.12)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              alignSelf: 'flex-start',
              marginTop: 8,
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.3)',
            }}
          >
            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>Contest Entry</Text>
          </View>
        ) : null}
      </View>

      {/* Title */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>
            Title <Text style={{ color: COLORS.danger }}>*</Text>
          </Text>
          <Text style={{ color: titleCharCount > 90 ? COLORS.danger : COLORS.textTertiary, fontSize: 12 }}>
            {String(titleCharCount)}/100
          </Text>
        </View>
        <TextInput
          value={title}
          onChangeText={(v) => {
            setTitle(v.slice(0, 100));
            if (titleError) setTitleError('');
          }}
          onBlur={validateTitle}
          placeholder="Give your submission a title..."
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="sentences"
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: COLORS.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: titleError ? COLORS.danger : COLORS.border,
          }}
        />
        {titleError ? (
          <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{titleError}</Text>
        ) : null}
      </View>

      {/* Description */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>
            Description
          </Text>
          <Text style={{ color: descCharCount > 900 ? COLORS.danger : COLORS.textTertiary, fontSize: 12 }}>
            {String(descCharCount)}/1000
          </Text>
        </View>
        <TextInput
          value={description}
          onChangeText={(v) => setDescription(v.slice(0, 1000))}
          placeholder="Tell us about your submission (optional)..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
          numberOfLines={4}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: COLORS.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: COLORS.border,
            minHeight: 100,
            textAlignVertical: 'top',
          }}
        />
      </View>

      {/* Media picker */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10 }}>
          Media <Text style={{ color: COLORS.danger }}>*</Text>
        </Text>

        {mediaAsset ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            {/* Preview */}
            {(thumbnailUri || mediaAsset.type === 'image') ? (
              <Image
                source={resolveImageSource(thumbnailUri ?? mediaAsset.uri)}
                style={{ width: '100%', height: 200 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 120,
                  backgroundColor: COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 40 }}>🎬</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 8 }}>Video selected</Text>
              </View>
            )}
            <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                  {mediaAsset.fileName ?? 'Selected file'}
                </Text>
                {fileSizeMB ? (
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {fileSizeMB}
                    {' MB'}
                  </Text>
                ) : null}
              </View>
              <AnimatedPressable
                onPress={() => {
                  console.log('[SubmitUpload] Remove media pressed');
                  setMediaAsset(null);
                  setThumbnailUri(null);
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255,68,68,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color={COLORS.danger} />
                </View>
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <AnimatedPressable onPress={handlePickMedia}>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 32,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: COLORS.border,
                borderStyle: 'dashed',
                gap: 10,
              }}
            >
              <Upload size={32} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
                Pick Media
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' }}>
                {submissionType === 'fan_art' ? 'Images only' : submissionType === 'beat' || submissionType === 'rap_challenge' ? 'Videos (record yourself)' : 'Photos or videos'}
              </Text>
              <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>Max 100 MB</Text>
            </View>
          </AnimatedPressable>
        )}
      </View>

      {/* Upload progress */}
      {uploading && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Uploading...</Text>
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
              {String(uploadProgress)}
              {'%'}
            </Text>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${uploadProgress}%`,
                backgroundColor: COLORS.primary,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      )}

      {/* Submit button */}
      <AnimatedPressable
        onPress={handleSubmit}
        disabled={uploading || !mediaAsset || !title.trim()}
      >
        <View
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: uploading || !mediaAsset || !title.trim() ? 0.5 : 1,
          }}
        >
          <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '700' }}>
            {uploading ? 'Uploading...' : 'Submit for Review'}
          </Text>
        </View>
      </AnimatedPressable>

      <Text style={{ color: COLORS.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
        By submitting, you confirm this content is yours and follows our community guidelines.
      </Text>
    </ScrollView>
  );
}
