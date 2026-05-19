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
import { Camera, FileVideo, Video } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase, supabasePublic } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Artist { id: string; name: string; }

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

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
  keyboardType?: 'default' | 'url' | 'numeric';
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

export default function VideoFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [useFileUpload, setUseFileUpload] = useState(false);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [lyrics, setLyrics] = useState('');
  const [lyricsLabel, setLyricsLabel] = useState('AI Generated Lyrics');
  const [lyricsIsApproved, setLyricsIsApproved] = useState(false);

  const [pendingVideoUri, setPendingVideoUri] = useState<string | null>(null);
  const [pendingVideoName, setPendingVideoName] = useState<string | null>(null);
  const [pendingThumbnailUri, setPendingThumbnailUri] = useState<string | null>(null);
  const [pendingThumbnailMime, setPendingThumbnailMime] = useState<string>('image/jpeg');

  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  const loadArtists = async () => {
    const { data } = await supabasePublic.from('artists').select('id, name').order('name');
    setArtists((data as Artist[]) ?? []);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    loadArtists();
    if (isEditing) loadVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const loadVideo = async () => {
    try {
      console.log(`[VideoForm] Loading video: ${id}`);
      const { data, error: dbError } = await supabasePublic
        .from('videos')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[VideoForm] Load failed:', dbError.message);
        Alert.alert('Error', 'Could not load video data.');
        router.back();
        return;
      }

      const anyData = data as any;
      setTitle(anyData.title ?? '');
      setVideoUrl(anyData.video_url ?? '');
      setThumbnailUrl(anyData.thumbnail_url ?? '');
      setIsPublished(anyData.is_published ?? true);
      setArtistId(anyData.artist_id ?? null);
      setLyrics(anyData.lyrics ?? '');
      setLyricsLabel(anyData.lyrics_label ?? 'AI Generated Lyrics');
      setLyricsIsApproved(anyData.lyrics_is_approved ?? false);
    } catch (err) {
      console.error('[VideoForm] Load failed:', err);
      Alert.alert('Error', 'Could not load video data.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePickVideo = async () => {
    console.log('[VideoForm] Pick video file pressed');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log(`[VideoForm] Video selected: ${asset.name}`);
        setPendingVideoUri(asset.uri);
        setPendingVideoName(asset.name);
      }
    } catch (err) {
      console.error('[VideoForm] Video pick failed:', err);
      Alert.alert('Error', 'Could not pick video file.');
    }
  };

  const handlePickThumbnail = async () => {
    console.log('[VideoForm] Pick thumbnail pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log(`[VideoForm] Thumbnail selected: ${asset.uri}`);
      setPendingThumbnailUri(asset.uri);
      setPendingThumbnailMime(asset.mimeType ?? 'image/jpeg');
    }
  };

  const uploadVideo = async (): Promise<string | null> => {
    if (!pendingVideoUri || !pendingVideoName) return videoUrl || null;

    const ext = pendingVideoName.split('.').pop() ?? 'mp4';
    const fileName = `video-${Date.now()}.${ext}`;
    console.log(`[VideoForm] Uploading video: ${fileName}`);
    setUploadingVideo(true);

    try {
      const response = await fetch(pendingVideoUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, blob, { upsert: true, contentType: blob.type || 'video/mp4' });

      if (uploadError) {
        console.error('[VideoForm] Video upload failed:', uploadError.message);
        Alert.alert('Upload failed', uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      console.log('[VideoForm] Video uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('[VideoForm] Video upload failed:', err);
      Alert.alert('Upload failed', 'Could not upload video file.');
      return null;
    } finally {
      setUploadingVideo(false);
    }
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!pendingThumbnailUri) return thumbnailUrl || null;

    const ext = pendingThumbnailUri.split('.').pop() ?? 'jpg';
    const fileName = `thumb-${Date.now()}.${ext}`;
    console.log(`[VideoForm] Uploading thumbnail: ${fileName}`);
    setUploadingThumbnail(true);

    try {
      const response = await fetch(pendingThumbnailUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, blob, { upsert: true, contentType: pendingThumbnailMime });

      if (uploadError) {
        console.error('[VideoForm] Thumbnail upload failed:', uploadError.message);
        Alert.alert('Upload failed', uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);
      console.log('[VideoForm] Thumbnail uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('[VideoForm] Thumbnail upload failed:', err);
      Alert.alert('Upload failed', 'Could not upload thumbnail.');
      return null;
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const validateYouTubeEmbed = async (videoId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { method: 'GET' }
      );
      // 200 = embeddable, 401/403/404 = not embeddable or private
      return response.ok;
    } catch {
      // Network error — allow save but warn
      return true;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Video title is required.');
      return;
    }
    if (!isEditing && !videoUrl.trim() && !pendingVideoUri) {
      Alert.alert('Validation', 'Please enter a video URL or select a video file.');
      return;
    }

    console.log(`[VideoForm] Save pressed: ${title}`);
    setSaving(true);

    try {
      let finalVideoUrl = videoUrl.trim();
      let finalThumbnailUrl = thumbnailUrl.trim() || null;

      // Upload file if selected
      if (useFileUpload && pendingVideoUri) {
        const uploaded = await uploadVideo();
        if (!uploaded) {
          setSaving(false);
          return;
        }
        finalVideoUrl = uploaded;
      }

      if (pendingThumbnailUri) {
        const uploaded = await uploadThumbnail();
        if (uploaded) finalThumbnailUrl = uploaded;
      }

      if (!finalVideoUrl) {
        Alert.alert('Error', 'Video URL is required.');
        setSaving(false);
        return;
      }

      const youtubeId = getYouTubeId(finalVideoUrl);

      // Validate YouTube embed if this is a YouTube video
      if (youtubeId && !useFileUpload) {
        console.log('[VideoForm] Validating YouTube embed for:', youtubeId);
        const isEmbeddable = await validateYouTubeEmbed(youtubeId);
        if (!isEmbeddable) {
          Alert.alert(
            'Video Not Embeddable',
            'This YouTube video cannot be played inside the app. The video may be private, age-restricted, or the owner has disabled embedding.\n\nPlease use a different video or upload an MP4 file instead.',
            [{ text: 'OK' }]
          );
          setSaving(false);
          return;
        }
        console.log('[VideoForm] YouTube embed validated OK');
      }

      const payload = {
        title: title.trim(),
        video_url: finalVideoUrl,
        youtube_url: finalVideoUrl.includes('youtu') ? finalVideoUrl : null,
        youtube_id: youtubeId,
        thumbnail_url: finalThumbnailUrl ?? (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null),
        source_type: youtubeId ? 'youtube' : 'upload',
        is_published: isPublished,
        artist_id: artistId,
        lyrics: lyrics.trim() || null,
        lyrics_label: lyricsLabel.trim() || 'AI Generated Lyrics',
        lyrics_is_approved: lyricsIsApproved,
      };

      if (isEditing) {
        console.log(`[VideoForm] Updating video: ${id}`);
        const { error: dbError } = await (supabase as any)
          .from('videos')
          .update(payload)
          .eq('id', id as string);

        if (dbError) {
          console.error('[VideoForm] Update failed:', dbError.message);
          Alert.alert('Error', dbError.message);
          return;
        }
        console.log('[VideoForm] Video updated successfully');
      } else {
        console.log('[VideoForm] Inserting new video');
        const { error: dbError } = await (supabase as any)
          .from('videos')
          .insert({ ...payload, created_by: user?.id ?? null });

        if (dbError) {
          console.error('[VideoForm] Insert failed:', dbError.message);
          Alert.alert('Error', dbError.message);
          return;
        }
        console.log('[VideoForm] Video created successfully');
      }

      router.replace('/admin/videos-list');
    } catch (err) {
      console.error('[VideoForm] Save failed:', err);
      Alert.alert('Error', 'Failed to save video.');
    } finally {
      setSaving(false);
    }
  };

  const isUploading = uploadingVideo || uploadingThumbnail;

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
      {/* Thumbnail */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        {pendingThumbnailUri ? (
          <Image
            source={resolveImageSource(pendingThumbnailUri)}
            style={{ width: 160, height: 90, borderRadius: 10, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : thumbnailUrl ? (
          <Image
            source={resolveImageSource(thumbnailUrl)}
            style={{ width: 160, height: 90, borderRadius: 10, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 160,
              height: 90,
              borderRadius: 10,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Video size={32} color={COLORS.textTertiary} />
          </View>
        )}
        <AnimatedPressable onPress={handlePickThumbnail} disabled={uploadingThumbnail}>
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
              {uploadingThumbnail ? 'Uploading...' : 'Thumbnail'}
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      <FormField
        label="Video Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Video title"
        required
      />

      {/* Artist picker */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
          Artist Section
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[{ id: null, name: 'None' }, ...artists].map((a) => {
            const selected = artistId === a.id;
            return (
              <AnimatedPressable
                key={String(a.id)}
                onPress={() => {
                  console.log(`[VideoForm] Artist selected: ${a.name}`);
                  setArtistId(a.id);
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    backgroundColor: selected ? COLORS.primary : COLORS.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: selected ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text style={{ color: selected ? COLORS.background : COLORS.text, fontSize: 13, fontWeight: '600' }}>
                    {a.name}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Video source toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingVertical: 4,
        }}
      >
        <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '500' }}>
          Upload video file
        </Text>
        <Switch
          value={useFileUpload}
          onValueChange={(v) => {
            console.log(`[VideoForm] Use file upload toggle: ${v}`);
            setUseFileUpload(v);
          }}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={useFileUpload ? COLORS.background : COLORS.textSecondary}
        />
      </View>

      {useFileUpload ? (
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 13,
              fontWeight: '500',
              marginBottom: 8,
            }}
          >
            Video File *
          </Text>
          <AnimatedPressable onPress={handlePickVideo} disabled={uploadingVideo}>
            <View
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: pendingVideoUri ? COLORS.primary : COLORS.border,
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
                  backgroundColor: pendingVideoUri ? COLORS.primaryMuted : COLORS.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: pendingVideoUri ? COLORS.primary : COLORS.border,
                }}
              >
                <FileVideo size={20} color={pendingVideoUri ? COLORS.primary : COLORS.textTertiary} />
              </View>
              <Text
                style={{
                  color: pendingVideoUri ? COLORS.primary : COLORS.textSecondary,
                  fontSize: 14,
                  fontWeight: '500',
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {pendingVideoName ?? 'Select video file'}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : (
        <>
          <FormField
            label="Video URL"
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://youtube.com/watch?v=... or direct URL"
            keyboardType="url"
            required
          />
          {!useFileUpload && (
            <Text style={{
              color: COLORS.textSecondary,
              fontSize: 12,
              marginTop: -8,
              marginBottom: 16,
              paddingHorizontal: 4,
            }}>
              Only publicly embeddable YouTube videos will work in the app. Private, age-restricted, or embedding-disabled videos will be rejected.
            </Text>
          )}
        </>
      )}

      {/* AI / Fan Lyrics */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 13,
            fontWeight: '500',
            marginBottom: 8,
          }}
        >
          AI / Fan Lyrics
        </Text>
        <TextInput
          value={lyrics}
          onChangeText={setLyrics}
          placeholder="Paste AI-generated or fan lyrics here..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: COLORS.text,
            fontSize: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            minHeight: 160,
          }}
        />
      </View>

      {/* Lyrics Label */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 13,
            fontWeight: '500',
            marginBottom: 8,
          }}
        >
          Lyrics Label
        </Text>
        <TextInput
          value={lyricsLabel}
          onChangeText={setLyricsLabel}
          placeholder="AI Generated Lyrics"
          placeholderTextColor={COLORS.textTertiary}
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

      {/* Approved for public display toggle */}
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
          Approved for public display
        </Text>
        <Switch
          value={lyricsIsApproved}
          onValueChange={(v) => {
            console.log(`[VideoForm] Lyrics approved toggle: ${v}`);
            setLyricsIsApproved(v);
          }}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={lyricsIsApproved ? COLORS.background : COLORS.textSecondary}
        />
      </View>

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
            console.log(`[VideoForm] Published toggle: ${v}`);
            setIsPublished(v);
          }}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={isPublished ? COLORS.background : COLORS.textSecondary}
        />
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
            {uploadingVideo ? 'Uploading video...' : 'Uploading thumbnail...'}
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
            {saving ? 'Saving...' : isEditing ? 'Update Video' : 'Add Video'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
