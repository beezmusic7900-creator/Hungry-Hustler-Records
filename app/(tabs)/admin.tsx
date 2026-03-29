
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Image,
  Alert,
  Switch,
  Modal,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { uploadToSupabase } from '@/utils/uploadToSupabase';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Music,
  ShoppingBag,
  Video,
  LogOut,
  X,
  Upload,
  FileAudio,
  FileVideo,
} from 'lucide-react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type SongCategory = 'exclusive' | 'featured' | 'new';

type Song = {
  id: string;
  title: string;
  artist: string;
  description?: string;
  category: SongCategory;
  file_url: string;
  cover_url?: string;
  audio_url?: string;
  cover_image_url?: string;
  price: number;
  is_active: boolean;
  is_published: boolean;
  duration?: number;
  created_at: string;
};

type MerchItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock: number;
  is_published: boolean;
  sort_order: number;
};

type VideoItem = {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  is_published: boolean;
  sort_order: number;
  source_type?: 'upload' | 'youtube';
  youtube_url?: string;
  youtube_id?: string;
};

type AdminSection = 'songs' | 'merch' | 'videos';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

async function adminFetch<T>(path: string, method = 'GET', body?: any): Promise<T> {
  let token: string | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token ?? null;
  } catch (e) {
    console.warn('[adminFetch] getSession failed:', e);
  }

  if (!token) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  const url = `${SUPABASE_FUNCTIONS_URL}${path}`;
  console.log(`[adminFetch] ${method} ${url}`);

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  console.log(`[adminFetch] Response ${res.status}: ${text.substring(0, 200)}`);

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return JSON.parse(text) as T;
}

// ─── File Picker Subcomponents ────────────────────────────────────────────────

type AudioPickerProps = {
  currentUrl?: string;
  selectedName?: string;
  uploading: boolean;
  onPick: () => void;
};

function AudioPickerField({ currentUrl, selectedName, uploading, onPick }: AudioPickerProps) {
  const hasFile = !!selectedName || !!currentUrl;
  const displayName = selectedName || (currentUrl ? currentUrl.split('/').pop() : undefined);
  const labelText = uploading ? 'Uploading...' : hasFile ? 'Replace Audio File' : 'Pick Audio File';

  return (
    <View>
      <TouchableOpacity
        style={[formStyles.pickerBtn, uploading && formStyles.pickerBtnDisabled]}
        onPress={() => { console.log('[AdminScreen] Pick audio file pressed'); onPick(); }}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <FileAudio size={18} color={colors.primary} />
        )}
        <Text style={formStyles.pickerBtnText}>{labelText}</Text>
      </TouchableOpacity>
      {displayName ? (
        <View style={formStyles.fileNameRow}>
          <Music size={14} color={colors.textSecondary} />
          <Text style={formStyles.fileName} numberOfLines={1}>{displayName}</Text>
        </View>
      ) : null}
    </View>
  );
}

type VideoPickerProps = {
  currentUrl?: string;
  selectedName?: string;
  uploading: boolean;
  onPick: () => void;
};

function VideoPickerField({ currentUrl, selectedName, uploading, onPick }: VideoPickerProps) {
  const hasFile = !!selectedName || !!currentUrl;
  const displayName = selectedName || (currentUrl ? currentUrl.split('/').pop() : undefined);
  const labelText = uploading ? 'Uploading...' : hasFile ? 'Replace Video File' : 'Pick Video File';

  return (
    <View>
      <TouchableOpacity
        style={[formStyles.pickerBtn, uploading && formStyles.pickerBtnDisabled]}
        onPress={() => { console.log('[AdminScreen] Pick video file pressed'); onPick(); }}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <FileVideo size={18} color={colors.primary} />
        )}
        <Text style={formStyles.pickerBtnText}>{labelText}</Text>
      </TouchableOpacity>
      {displayName ? (
        <View style={formStyles.fileNameRow}>
          <Video size={14} color={colors.textSecondary} />
          <Text style={formStyles.fileName} numberOfLines={1}>{displayName}</Text>
        </View>
      ) : null}
    </View>
  );
}

type ImagePickerFieldProps = {
  currentUrl?: string;
  localUri?: string;
  uploading: boolean;
  onPick: () => void;
  label?: string;
};

function ImagePickerField({ currentUrl, localUri, uploading, onPick, label = 'Pick Image' }: ImagePickerFieldProps) {
  const previewUri = localUri || currentUrl;
  const btnLabel = uploading ? 'Uploading...' : previewUri ? 'Replace Image' : label;

  return (
    <View>
      <TouchableOpacity
        style={[formStyles.pickerBtn, uploading && formStyles.pickerBtnDisabled]}
        onPress={() => { console.log('[AdminScreen] Pick image pressed'); onPick(); }}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Upload size={18} color={colors.primary} />
        )}
        <Text style={formStyles.pickerBtnText}>{btnLabel}</Text>
      </TouchableOpacity>
      {previewUri ? (
        <Image source={resolveImageSource(previewUri)} style={formStyles.preview} resizeMode="cover" />
      ) : null}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function PublishedBadge({ published }: { published: boolean }) {
  const badgeStyle = published ? styles.badgeLive : styles.badgeDraft;
  const textStyle = published ? styles.badgeLiveText : styles.badgeDraftText;
  const label = published ? 'Live' : 'Draft';
  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{label}</Text>
    </View>
  );
}

// ─── Song Form ────────────────────────────────────────────────────────────────

const SONG_CATEGORIES: SongCategory[] = ['exclusive', 'featured', 'new'];

type SongFormState = {
  title: string;
  artist: string;
  description: string;
  category: SongCategory;
  price: string;
  is_published: boolean;
};

function SongForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Song>;
  onSave: (song: Song) => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial.id;
  const [form, setForm] = useState<SongFormState>({
    title: initial.title || '',
    artist: initial.artist || '',
    description: initial.description || '',
    category: initial.category || 'exclusive',
    price: initial.price !== undefined ? String(initial.price) : '0',
    is_published: initial.is_published ?? true,
  });

  // Audio file state
  const [audioUri, setAudioUri] = useState<string | undefined>(undefined);
  const [audioName, setAudioName] = useState<string | undefined>(undefined);
  const [audioMime, setAudioMime] = useState<string>('audio/mpeg');
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Cover image state
  const [coverLocalUri, setCoverLocalUri] = useState<string | undefined>(undefined);
  const [coverMime, setCoverMime] = useState<string>('image/jpeg');
  const [uploadingCover, setUploadingCover] = useState(false);

  const existingAudioUrl = initial.audio_url || initial.file_url;
  const existingCoverUrl = initial.cover_image_url || initial.cover_url;

  const [saving, setSaving] = useState(false);
  const isUploading = uploadingAudio || uploadingCover;

  const pickAudio = async () => {
    console.log('[AdminScreen] Opening document picker for audio');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        console.log('[AdminScreen] Audio picker cancelled');
        return;
      }
      const asset = result.assets[0];
      console.log('[AdminScreen] Audio selected:', asset.name, asset.mimeType);
      setAudioUri(asset.uri);
      setAudioName(asset.name);
      setAudioMime(asset.mimeType || 'audio/mpeg');
    } catch (e: any) {
      console.error('[AdminScreen] Audio picker error:', e);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const pickCover = async () => {
    console.log('[AdminScreen] Opening image picker for song cover');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled) {
        console.log('[AdminScreen] Cover image picker cancelled');
        return;
      }
      const asset = result.assets[0];
      console.log('[AdminScreen] Cover image selected:', asset.uri);
      setCoverLocalUri(asset.uri);
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      setCoverMime(ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    } catch (e: any) {
      console.error('[AdminScreen] Cover picker error:', e);
      Alert.alert('Error', 'Failed to pick cover image');
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Validation', 'Title is required'); return; }
    if (!form.artist.trim()) { Alert.alert('Validation', 'Artist is required'); return; }
    if (!isEdit && !audioUri) { Alert.alert('Validation', 'Audio file is required'); return; }

    console.log('[AdminScreen] Saving song:', form.title, 'isEdit:', isEdit);
    setSaving(true);
    try {
      let audioUrl = existingAudioUrl || '';
      let coverUrl = existingCoverUrl || '';

      if (audioUri) {
        console.log('[AdminScreen] Uploading audio file...');
        setUploadingAudio(true);
        try {
          audioUrl = await uploadToSupabase(audioUri, 'songs', audioMime);
          console.log('[AdminScreen] Audio uploaded:', audioUrl);
        } finally {
          setUploadingAudio(false);
        }
      }

      if (coverLocalUri) {
        console.log('[AdminScreen] Uploading cover image...');
        setUploadingCover(true);
        try {
          coverUrl = await uploadToSupabase(coverLocalUri, 'song-covers', coverMime);
          console.log('[AdminScreen] Cover uploaded:', coverUrl);
        } finally {
          setUploadingCover(false);
        }
      }

      const payload = {
        title: form.title.trim(),
        artist: form.artist.trim(),
        description: form.description || undefined,
        category: form.category || 'exclusive',
        price: parseFloat(form.price) || 0,
        is_published: form.is_published ?? true,
        is_active: true,
        file_url: audioUrl || undefined,
        audio_url: audioUrl || undefined,
        cover_url: coverUrl || undefined,
        cover_image_url: coverUrl || undefined,
        duration: null,
      };

      console.log('[AdminScreen] Song payload:', JSON.stringify(payload));

      let result: Song;
      if (isEdit) {
        result = await adminFetch<Song>(`/songs/${initial.id}`, 'PUT', payload);
      } else {
        result = await adminFetch<Song>('/songs', 'POST', payload);
      }
      if (!result?.id) throw new Error('Server did not return song with id');
      Alert.alert('Success', `"${result.title}" saved successfully!`);
      onSave(result);
    } catch (e: any) {
      console.error('[SongForm] Save error:', e);
      Alert.alert('Save Failed', e?.message ?? 'Unknown error. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || isUploading;

  return (
    <ScrollView style={formStyles.scroll} contentContainerStyle={formStyles.container}>
      <Text style={formStyles.title}>{isEdit ? 'Edit Song' : 'New Song'}</Text>

      <Text style={formStyles.label}>Title *</Text>
      <TextInput
        style={formStyles.input}
        placeholder="Song title"
        placeholderTextColor={colors.textTertiary}
        value={form.title}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
      />

      <Text style={formStyles.label}>Artist *</Text>
      <TextInput
        style={formStyles.input}
        placeholder="Artist name"
        placeholderTextColor={colors.textTertiary}
        value={form.artist}
        onChangeText={(t) => setForm((f) => ({ ...f, artist: t }))}
      />

      <Text style={formStyles.label}>Description</Text>
      <TextInput
        style={[formStyles.input, formStyles.textArea]}
        placeholder="Description (optional)"
        placeholderTextColor={colors.textTertiary}
        value={form.description}
        onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
        multiline
        numberOfLines={3}
      />

      <Text style={formStyles.label}>Category</Text>
      <View style={formStyles.categoryRow}>
        {SONG_CATEGORIES.map((cat) => {
          const isActive = form.category === cat;
          const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
          return (
            <TouchableOpacity
              key={cat}
              style={[formStyles.categoryBtn, isActive && formStyles.categoryBtnActive]}
              onPress={() => { console.log('[AdminScreen] Category selected:', cat); setForm((f) => ({ ...f, category: cat })); }}
            >
              <Text style={[formStyles.categoryBtnText, isActive && formStyles.categoryBtnTextActive]}>
                {catLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={formStyles.label}>Price ($)</Text>
      <TextInput
        style={formStyles.input}
        placeholder="0.00"
        placeholderTextColor={colors.textTertiary}
        value={form.price}
        onChangeText={(t) => setForm((f) => ({ ...f, price: t }))}
        keyboardType="decimal-pad"
      />

      <Text style={formStyles.label}>Audio File {!isEdit ? '*' : ''}</Text>
      <AudioPickerField
        currentUrl={existingAudioUrl}
        selectedName={audioName}
        uploading={uploadingAudio}
        onPick={pickAudio}
      />

      <Text style={formStyles.label}>Cover Image</Text>
      <ImagePickerField
        currentUrl={existingCoverUrl}
        localUri={coverLocalUri}
        uploading={uploadingCover}
        onPick={pickCover}
        label="Pick Cover Image"
      />

      <View style={formStyles.switchRow}>
        <Text style={formStyles.switchLabel}>Published</Text>
        <Switch
          value={form.is_published}
          onValueChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
          trackColor={{ false: colors.inactive, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={formStyles.actions}>
        <TouchableOpacity style={[formStyles.saveBtn, isBusy && formStyles.saveBtnDisabled]} onPress={handleSave} disabled={isBusy}>
          {isBusy ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={formStyles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel} disabled={isBusy}>
          <Text style={formStyles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Merch Form ───────────────────────────────────────────────────────────────

function MerchForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<MerchItem>;
  onSave: (data: Partial<MerchItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<MerchItem>>(initial);
  const [saving, setSaving] = useState(false);

  const [imageLocalUri, setImageLocalUri] = useState<string | undefined>(undefined);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [uploadingImage, setUploadingImage] = useState(false);

  const pickImage = async () => {
    console.log('[AdminScreen] Opening image picker for merch');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled) {
        console.log('[AdminScreen] Merch image picker cancelled');
        return;
      }
      const asset = result.assets[0];
      console.log('[AdminScreen] Merch image selected:', asset.uri);
      setImageLocalUri(asset.uri);
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      setImageMime(ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    } catch (e: any) {
      console.error('[AdminScreen] Merch image picker error:', e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    if (form.price === undefined || form.price === null) { Alert.alert('Validation', 'Price is required'); return; }
    console.log('[AdminScreen] Saving merch:', form.name);
    setSaving(true);
    try {
      let imageUrl = form.image_url;

      if (imageLocalUri) {
        console.log('[AdminScreen] Uploading merch image...');
        setUploadingImage(true);
        try {
          imageUrl = await uploadToSupabase(imageLocalUri, 'merch-images', imageMime);
          console.log('[AdminScreen] Merch image uploaded:', imageUrl);
        } finally {
          setUploadingImage(false);
        }
      }

      await onSave({ ...form, image_url: imageUrl });
    } catch (e: any) {
      console.error('[MerchForm] Save error:', e);
      Alert.alert('Save Failed', e?.message ?? 'Unknown error. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const priceStr = form.price !== undefined ? String(form.price) : '';
  const isBusy = saving || uploadingImage;

  return (
    <ScrollView style={formStyles.scroll} contentContainerStyle={formStyles.container}>
      <Text style={formStyles.title}>{initial.id ? 'Edit Merch' : 'New Merch Item'}</Text>

      <Text style={formStyles.label}>Name *</Text>
      <TextInput
        style={formStyles.input}
        placeholder="Item name"
        placeholderTextColor={colors.textTertiary}
        value={form.name || ''}
        onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
      />

      <Text style={formStyles.label}>Description</Text>
      <TextInput
        style={[formStyles.input, formStyles.textArea]}
        placeholder="Description (optional)"
        placeholderTextColor={colors.textTertiary}
        value={form.description || ''}
        onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
        multiline
        numberOfLines={3}
      />

      <Text style={formStyles.label}>Price *</Text>
      <TextInput
        style={formStyles.input}
        placeholder="0.00"
        placeholderTextColor={colors.textTertiary}
        value={priceStr}
        onChangeText={(t) => setForm((f) => ({ ...f, price: parseFloat(t) || 0 }))}
        keyboardType="decimal-pad"
      />

      <Text style={formStyles.label}>Stock *</Text>
      <TextInput
        style={formStyles.input}
        placeholder="0"
        placeholderTextColor={colors.textTertiary}
        value={form.stock !== undefined ? String(form.stock) : ''}
        onChangeText={(t) => setForm((f) => ({ ...f, stock: parseInt(t) || 0 }))}
        keyboardType="number-pad"
      />

      <Text style={formStyles.label}>Image</Text>
      <ImagePickerField
        currentUrl={form.image_url}
        localUri={imageLocalUri}
        uploading={uploadingImage}
        onPick={pickImage}
        label="Pick Merch Image"
      />

      <View style={formStyles.switchRow}>
        <Text style={formStyles.switchLabel}>Published</Text>
        <Switch
          value={!!form.is_published}
          onValueChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
          trackColor={{ false: colors.inactive, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={formStyles.actions}>
        <TouchableOpacity style={[formStyles.saveBtn, isBusy && formStyles.saveBtnDisabled]} onPress={handleSave} disabled={isBusy}>
          {isBusy ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={formStyles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel} disabled={isBusy}>
          <Text style={formStyles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── YouTube ID extractor ─────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ─── Video Form ───────────────────────────────────────────────────────────────

type VideoFormState = {
  title: string;
  description: string;
  is_published: boolean;
  source_type: 'upload' | 'youtube';
  youtube_url: string;
  youtube_id: string | null;
};

function VideoForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<VideoItem>;
  onSave: (saved: VideoItem) => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial.id;

  const [form, setForm] = useState<VideoFormState>({
    title: initial.title || '',
    description: initial.description || '',
    is_published: initial.is_published ?? true,
    source_type: initial.source_type || 'upload',
    youtube_url: initial.youtube_url || '',
    youtube_id: initial.youtube_id || null,
  });

  const [saving, setSaving] = useState(false);

  // Upload source state
  const [videoUri, setVideoUri] = useState<string | undefined>(undefined);
  const [videoName, setVideoName] = useState<string | undefined>(undefined);
  const [videoMime, setVideoMime] = useState<string>('video/mp4');
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [thumbLocalUri, setThumbLocalUri] = useState<string | undefined>(undefined);
  const [thumbMime, setThumbMime] = useState<string>('image/jpeg');
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // YouTube validation state
  const [ytValidated, setYtValidated] = useState(!!initial.youtube_id);
  const [ytPreviewId, setYtPreviewId] = useState<string | null>(initial.youtube_id || null);

  const existingVideoUrl = initial.video_url;
  const existingThumbnailUrl = initial.thumbnail_url;

  const pickVideo = async () => {
    console.log('[AdminScreen] Opening document picker for video');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) { console.log('[AdminScreen] Video picker cancelled'); return; }
      const asset = result.assets[0];
      console.log('[AdminScreen] Video selected:', asset.name, asset.mimeType);
      setVideoUri(asset.uri);
      setVideoName(asset.name);
      setVideoMime(asset.mimeType || 'video/mp4');
    } catch (e: any) {
      console.error('[AdminScreen] Video picker error:', e);
      Alert.alert('Error', 'Failed to pick video file');
    }
  };

  const pickThumbnail = async () => {
    console.log('[AdminScreen] Opening image picker for video thumbnail');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled) { console.log('[AdminScreen] Thumbnail picker cancelled'); return; }
      const asset = result.assets[0];
      console.log('[AdminScreen] Thumbnail selected:', asset.uri);
      setThumbLocalUri(asset.uri);
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      setThumbMime(ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    } catch (e: any) {
      console.error('[AdminScreen] Thumbnail picker error:', e);
      Alert.alert('Error', 'Failed to pick thumbnail');
    }
  };

  const handleValidateYouTube = () => {
    console.log('[AdminScreen] Validate YouTube URL pressed:', form.youtube_url);
    const ytId = extractYouTubeId(form.youtube_url);
    if (!ytId) {
      Alert.alert('Invalid URL', 'Could not extract a YouTube video ID. Please check the URL.');
      setYtValidated(false);
      setYtPreviewId(null);
      return;
    }
    console.log('[AdminScreen] YouTube ID extracted:', ytId);
    setYtPreviewId(ytId);
    setYtValidated(true);
    setForm((f) => ({ ...f, youtube_id: ytId }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Validation', 'Title is required'); return; }

    if (form.source_type === 'youtube') {
      if (!form.youtube_url.trim()) { Alert.alert('Validation', 'YouTube URL is required'); return; }
      const ytId = extractYouTubeId(form.youtube_url);
      if (!ytId) { Alert.alert('Validation', 'Invalid YouTube URL. Please enter a valid YouTube link.'); return; }
    } else {
      if (!isEdit && !videoUri) { Alert.alert('Validation', 'Video file is required'); return; }
    }

    console.log('[AdminScreen] Saving video:', form.title, 'source_type:', form.source_type, 'isEdit:', isEdit);
    setSaving(true);
    try {
      let videoUrl = existingVideoUrl || '';
      let thumbnailUrl = existingThumbnailUrl || '';

      if (form.source_type === 'upload') {
        if (videoUri) {
          console.log('[AdminScreen] Uploading video file...');
          setUploadingVideo(true);
          try {
            videoUrl = await uploadToSupabase(videoUri, 'videos', videoMime);
            console.log('[AdminScreen] Video uploaded:', videoUrl);
          } finally {
            setUploadingVideo(false);
          }
        }
        if (thumbLocalUri) {
          console.log('[AdminScreen] Uploading thumbnail...');
          setUploadingThumb(true);
          try {
            thumbnailUrl = await uploadToSupabase(thumbLocalUri, 'video-thumbnails', thumbMime);
            console.log('[AdminScreen] Thumbnail uploaded:', thumbnailUrl);
          } finally {
            setUploadingThumb(false);
          }
        }
      }

      const ytId = form.source_type === 'youtube' ? extractYouTubeId(form.youtube_url) : null;
      const finalThumbnail = form.source_type === 'youtube' && ytId
        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        : thumbnailUrl;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        video_url: form.source_type === 'youtube' ? form.youtube_url : videoUrl,
        thumbnail_url: finalThumbnail || null,
        is_published: form.is_published,
        source_type: form.source_type,
        youtube_url: form.source_type === 'youtube' ? form.youtube_url : null,
        sort_order: initial.sort_order ?? 0,
      };

      console.log('[AdminScreen] Video payload:', JSON.stringify(payload));

      let result: any;
      if (isEdit && initial.id) {
        result = await adminFetch<any>(`/videos/${initial.id}`, 'PUT', payload);
      } else {
        result = await adminFetch<any>('/videos', 'POST', payload);
      }

      const saved = result.video ?? result;
      Alert.alert('Success', isEdit ? 'Video updated!' : 'Video added!');
      onSave(saved);
    } catch (e: any) {
      console.error('[VideoForm] Save error:', e);
      Alert.alert('Save Failed', e?.message ?? 'Unknown error. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || uploadingVideo || uploadingThumb;
  const ytThumbUri = ytPreviewId ? `https://img.youtube.com/vi/${ytPreviewId}/hqdefault.jpg` : undefined;

  return (
    <ScrollView style={formStyles.scroll} contentContainerStyle={formStyles.container}>
      <Text style={formStyles.title}>{isEdit ? 'Edit Video' : 'New Video'}</Text>

      <Text style={formStyles.label}>Title *</Text>
      <TextInput
        style={formStyles.input}
        placeholder="Video title"
        placeholderTextColor={colors.textTertiary}
        value={form.title}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
      />

      <Text style={formStyles.label}>Description</Text>
      <TextInput
        style={[formStyles.input, formStyles.textArea]}
        placeholder="Description (optional)"
        placeholderTextColor={colors.textTertiary}
        value={form.description}
        onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
        multiline
        numberOfLines={3}
      />

      {/* Source type toggle */}
      <Text style={formStyles.label}>Source Type</Text>
      <View style={formStyles.sourceToggleRow}>
        <TouchableOpacity
          style={[formStyles.sourceToggleBtn, form.source_type === 'upload' && formStyles.sourceToggleBtnActive]}
          onPress={() => { console.log('[AdminScreen] Source type: upload'); setForm((f) => ({ ...f, source_type: 'upload' })); }}
        >
          <Text style={[formStyles.sourceToggleText, form.source_type === 'upload' && formStyles.sourceToggleTextActive]}>
            Upload File
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[formStyles.sourceToggleBtn, form.source_type === 'youtube' && formStyles.sourceToggleBtnActive]}
          onPress={() => { console.log('[AdminScreen] Source type: youtube'); setForm((f) => ({ ...f, source_type: 'youtube' })); }}
        >
          <Text style={[formStyles.sourceToggleText, form.source_type === 'youtube' && formStyles.sourceToggleTextActive]}>
            YouTube URL
          </Text>
        </TouchableOpacity>
      </View>

      {form.source_type === 'upload' ? (
        <>
          <Text style={formStyles.label}>Video File {!isEdit ? '*' : ''}</Text>
          <VideoPickerField
            currentUrl={existingVideoUrl}
            selectedName={videoName}
            uploading={uploadingVideo}
            onPick={pickVideo}
          />

          <Text style={formStyles.label}>Thumbnail</Text>
          <ImagePickerField
            currentUrl={existingThumbnailUrl}
            localUri={thumbLocalUri}
            uploading={uploadingThumb}
            onPick={pickThumbnail}
            label="Pick Thumbnail"
          />
        </>
      ) : (
        <>
          <Text style={formStyles.label}>YouTube URL *</Text>
          <View style={formStyles.ytRow}>
            <TextInput
              style={[formStyles.input, formStyles.ytInput]}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={colors.textTertiary}
              value={form.youtube_url}
              onChangeText={(t) => {
                setForm((f) => ({ ...f, youtube_url: t }));
                setYtValidated(false);
                setYtPreviewId(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={formStyles.ytValidateBtn}
              onPress={handleValidateYouTube}
              disabled={!form.youtube_url.trim()}
            >
              <Text style={formStyles.ytValidateBtnText}>Validate</Text>
            </TouchableOpacity>
          </View>
          {ytValidated && ytThumbUri ? (
            <View style={formStyles.ytPreviewContainer}>
              <Image source={resolveImageSource(ytThumbUri)} style={formStyles.preview} resizeMode="cover" />
              <Text style={formStyles.ytValidatedText}>YouTube ID: {ytPreviewId}</Text>
            </View>
          ) : null}
        </>
      )}

      <View style={formStyles.switchRow}>
        <Text style={formStyles.switchLabel}>Published</Text>
        <Switch
          value={form.is_published}
          onValueChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
          trackColor={{ false: colors.inactive, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={formStyles.actions}>
        <TouchableOpacity style={[formStyles.saveBtn, isBusy && formStyles.saveBtnDisabled]} onPress={handleSave} disabled={isBusy}>
          {isBusy ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={formStyles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel} disabled={isBusy}>
          <Text style={formStyles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Admin Screen ────────────────────────────────────────────────────────

export default function AdminScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isAdmin, checkingAdmin } = useAdmin();

  const [activeSection, setActiveSection] = useState<AdminSection>('songs');

  const [songs, setSongs] = useState<Song[]>([]);
  const [merch, setMerch] = useState<MerchItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);

  const [loadingSongs, setLoadingSongs] = useState(false);
  const [loadingMerch, setLoadingMerch] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  const [editingMerch, setEditingMerch] = useState<Partial<MerchItem> | null>(null);
  const [editingVideo, setEditingVideo] = useState<Partial<VideoItem> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSongs = useCallback(async () => {
    console.log('[AdminScreen] Fetching songs from /songs');
    setLoadingSongs(true);
    try {
      const data = await adminFetch<{ songs: Song[] }>('/songs', 'GET');
      console.log('[AdminScreen] Songs received:', data?.songs?.length ?? 0);
      setSongs(data?.songs ?? []);
    } catch (e: any) {
      console.error('[AdminScreen] Error fetching songs:', e);
      Alert.alert('Error', 'Failed to load songs');
    } finally {
      setLoadingSongs(false);
    }
  }, []);

  const fetchMerch = useCallback(async () => {
    console.log('[AdminScreen] Fetching merch from /merch');
    setLoadingMerch(true);
    try {
      const data = await adminFetch<{ merch: MerchItem[] }>('/merch', 'GET');
      console.log('[AdminScreen] Merch received:', data?.merch?.length ?? 0);
      setMerch((data?.merch ?? []).sort((a, b) => a.sort_order - b.sort_order));
    } catch (e: any) {
      console.error('[AdminScreen] Error fetching merch:', e);
      Alert.alert('Error', 'Failed to load merch');
    } finally {
      setLoadingMerch(false);
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    console.log('[AdminScreen] Fetching videos from /videos (admin — all including drafts)');
    setLoadingVideos(true);
    try {
      const data = await adminFetch<any>('/videos', 'GET');
      const list: VideoItem[] = Array.isArray(data) ? data : (data.videos ?? data.data ?? []);
      console.log('[AdminScreen] Videos received:', list.length);
      setVideos(list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    } catch (e: any) {
      console.error('[AdminScreen] Error fetching videos:', e);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) return;
      fetchSongs();
      fetchMerch();
      fetchVideos();
    }, [isAdmin, fetchSongs, fetchMerch, fetchVideos])
  );

  // ── Songs CRUD ─────────────────────────────────────────────────────────────

  const handleSaveSong = async (savedSong: Song) => {
    console.log('[AdminScreen] Song saved successfully, id:', savedSong.id);
    setSongs((prev) => {
      const exists = prev.find((s) => s.id === savedSong.id);
      if (exists) return prev.map((s) => s.id === savedSong.id ? savedSong : s);
      return [savedSong, ...prev];
    });
    setFormVisible(false);
    setEditingSong(null);
    Alert.alert('Success', `"${savedSong.title}" saved successfully!`);
    await fetchSongs();
  };

  const handleDeleteSong = (id: string, title: string) => {
    console.log(`[AdminScreen] Delete song pressed: ${title}`);
    Alert.alert('Delete Song', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          console.log(`[AdminScreen] DELETE /songs/${id}`);
          try {
            await adminFetch(`/songs/${id}`, 'DELETE');
            await fetchSongs();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete song');
          }
        },
      },
    ]);
  };

  const handleToggleSongPublish = async (song: Song) => {
    console.log(`[AdminScreen] Toggle publish song: ${song.title}, current: ${song.is_published}`);
    try {
      await adminFetch(`/songs/${song.id}`, 'PUT', { is_published: !song.is_published });
      await fetchSongs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update song');
    }
  };

  const moveSong = (index: number, direction: 'up' | 'down') => {
    const newList = [...songs];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setSongs(newList);
  };

  // ── Merch CRUD ─────────────────────────────────────────────────────────────

  const handleSaveMerch = async (data: Partial<MerchItem>) => {
    try {
      const payload = {
        ...data,
        is_published: data.is_published ?? true,
        is_active: true,
      };
      if (data.id) {
        console.log(`[AdminScreen] PUT /merch/${data.id}`, JSON.stringify(payload));
        await adminFetch(`/merch/${data.id}`, 'PUT', payload);
      } else {
        console.log('[AdminScreen] POST /merch', JSON.stringify(payload));
        await adminFetch('/merch', 'POST', payload);
      }
      Alert.alert('Success', `"${data.name}" saved successfully!`);
      setFormVisible(false);
      setEditingMerch(null);
      await fetchMerch();
    } catch (e: any) {
      console.error('[AdminScreen] Merch save error:', e);
      Alert.alert('Save Failed', e.message || 'Failed to save merch');
    }
  };

  const handleDeleteMerch = (id: string, name: string) => {
    console.log(`[AdminScreen] Delete merch pressed: ${name}`);
    Alert.alert('Delete Item', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          console.log(`[AdminScreen] DELETE /merch/${id}`);
          try {
            await adminFetch(`/merch/${id}`, 'DELETE');
            await fetchMerch();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete merch');
          }
        },
      },
    ]);
  };

  const handleToggleMerchPublish = async (item: MerchItem) => {
    console.log(`[AdminScreen] Toggle publish merch: ${item.name}, current: ${item.is_published}`);
    try {
      await adminFetch(`/merch/${item.id}`, 'PUT', { is_published: !item.is_published });
      await fetchMerch();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update merch');
    }
  };

  const moveMerch = async (index: number, direction: 'up' | 'down') => {
    const newList = [...merch];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setMerch(newList);
    try {
      await adminFetch(`/merch/${newList[index].id}`, 'PUT', { sort_order: index });
      await adminFetch(`/merch/${newList[swapIndex].id}`, 'PUT', { sort_order: swapIndex });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to reorder merch');
      await fetchMerch();
    }
  };

  // ── Videos CRUD ────────────────────────────────────────────────────────────

  const handleSaveVideo = (saved: VideoItem) => {
    console.log('[AdminScreen] Video saved successfully, id:', saved.id);
    setVideos((prev) => {
      const exists = prev.find((v) => v.id === saved.id);
      if (exists) return prev.map((v) => v.id === saved.id ? saved : v);
      return [saved, ...prev];
    });
    setFormVisible(false);
    setEditingVideo(null);
    fetchVideos();
  };

  const handleDeleteVideo = (id: string, title: string) => {
    console.log(`[AdminScreen] Delete video pressed: ${title}`);
    Alert.alert('Delete Video', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          console.log(`[AdminScreen] DELETE /videos/${id}`);
          try {
            await adminFetch(`/videos/${id}`, 'DELETE');
            await fetchVideos();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete video');
          }
        },
      },
    ]);
  };

  const handleToggleVideoPublish = async (video: VideoItem) => {
    console.log(`[AdminScreen] Toggle publish video: ${video.title}, current: ${video.is_published}`);
    try {
      await adminFetch(`/videos/${video.id}`, 'PUT', { is_published: !video.is_published });
      await fetchVideos();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update video');
    }
  };

  const moveVideo = async (index: number, direction: 'up' | 'down') => {
    const newList = [...videos];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setVideos(newList);
    try {
      await adminFetch(`/videos/${newList[index].id}`, 'PUT', { sort_order: index });
      await adminFetch(`/videos/${newList[swapIndex].id}`, 'PUT', { sort_order: swapIndex });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to reorder videos');
      await fetchVideos();
    }
  };

  // ── Sign Out ───────────────────────────────────────────────────────────────

  const handleSignOut = () => {
    console.log('[AdminScreen] Sign out pressed');
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  // ── Open Form ──────────────────────────────────────────────────────────────

  const openNewSong = () => {
    console.log('[AdminScreen] Open new song form');
    setEditingSong({
      title: '', artist: '', description: '', category: 'exclusive',
      file_url: '', audio_url: '', cover_url: '', cover_image_url: '',
      price: 0, is_active: true, is_published: true, duration: undefined,
    });
    setFormVisible(true);
  };

  const openEditSong = (song: Song) => {
    console.log(`[AdminScreen] Open edit song form: ${song.title}`);
    setEditingSong(song);
    setFormVisible(true);
  };

  const openNewMerch = () => {
    console.log('[AdminScreen] Open new merch form');
    setEditingMerch({ is_published: true, stock: 0, price: 0 });
    setFormVisible(true);
  };

  const openEditMerch = (item: MerchItem) => {
    console.log(`[AdminScreen] Open edit merch form: ${item.name}`);
    setEditingMerch(item);
    setFormVisible(true);
  };

  const openNewVideo = () => {
    console.log('[AdminScreen] Open new video form');
    setEditingVideo({ is_published: true });
    setFormVisible(true);
  };

  const openEditVideo = (video: VideoItem) => {
    console.log(`[AdminScreen] Open edit video form: ${video.title}`);
    setEditingVideo(video);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingSong(null);
    setEditingMerch(null);
    setEditingVideo(null);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (checkingAdmin) {
    return (
      <View style={[commonStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking admin access...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[commonStyles.container, styles.centered]}>
        <Text style={styles.emptyText}>Please sign in to access admin panel</Text>
        <TouchableOpacity style={commonStyles.button} onPress={() => { console.log('[AdminScreen] Sign in button pressed'); router.push('/auth'); }}>
          <Text style={commonStyles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[commonStyles.container, styles.centered]}>
        <Text style={styles.emptyText}>You do not have admin privileges</Text>
        <TouchableOpacity style={commonStyles.button} onPress={() => router.back()}>
          <Text style={commonStyles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ADMIN</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Section Switcher */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSection === 'songs' && styles.segmentBtnActive]}
          onPress={() => { console.log('[AdminScreen] Section switched to songs'); setActiveSection('songs'); }}
        >
          <Music size={16} color={activeSection === 'songs' ? colors.background : colors.textSecondary} />
          <Text style={[styles.segmentText, activeSection === 'songs' && styles.segmentTextActive]}>Songs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSection === 'merch' && styles.segmentBtnActive]}
          onPress={() => { console.log('[AdminScreen] Section switched to merch'); setActiveSection('merch'); }}
        >
          <ShoppingBag size={16} color={activeSection === 'merch' ? colors.background : colors.textSecondary} />
          <Text style={[styles.segmentText, activeSection === 'merch' && styles.segmentTextActive]}>Merch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSection === 'videos' && styles.segmentBtnActive]}
          onPress={() => { console.log('[AdminScreen] Section switched to videos'); setActiveSection('videos'); }}
        >
          <Video size={16} color={activeSection === 'videos' ? colors.background : colors.textSecondary} />
          <Text style={[styles.segmentText, activeSection === 'videos' && styles.segmentTextActive]}>Videos</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Songs Section ── */}
        {activeSection === 'songs' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Songs</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openNewSong}>
                <Plus size={18} color={colors.background} />
                <Text style={styles.addBtnText}>Add Song</Text>
              </TouchableOpacity>
            </View>
            {loadingSongs ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : songs.length === 0 ? (
              <View style={styles.emptyState}>
                <Music size={40} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No songs yet</Text>
              </View>
            ) : (
              songs.map((song, index) => {
                const songTitle = song.title;
                const songArtist = song.artist;
                const coverUri = song.cover_image_url || song.cover_url;
                return (
                  <View key={song.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      {coverUri ? (
                        <Image source={resolveImageSource(coverUri)} style={styles.listItemThumb} resizeMode="cover" />
                      ) : (
                        <View style={styles.listItemThumbPlaceholder}>
                          <Music size={16} color={colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.listItemInfo}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>{songTitle}</Text>
                        <Text style={styles.listItemSubtitle} numberOfLines={1}>{songArtist}</Text>
                        <PublishedBadge published={song.is_published} />
                      </View>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => moveSong(index, 'up')} disabled={index === 0}>
                        <ChevronUp size={18} color={index === 0 ? colors.inactive : colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => moveSong(index, 'down')} disabled={index === songs.length - 1}>
                        <ChevronDown size={18} color={index === songs.length - 1 ? colors.inactive : colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleToggleSongPublish(song)}>
                        {song.is_published ? (
                          <EyeOff size={18} color={colors.textSecondary} />
                        ) : (
                          <Eye size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openEditSong(song)}>
                        <Pencil size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteSong(song.id, song.title)}>
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Merch Section ── */}
        {activeSection === 'merch' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Merch</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openNewMerch}>
                <Plus size={18} color={colors.background} />
                <Text style={styles.addBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>
            {loadingMerch ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : merch.length === 0 ? (
              <View style={styles.emptyState}>
                <ShoppingBag size={40} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No merch items yet</Text>
              </View>
            ) : (
              merch.map((item, index) => {
                const itemName = item.name;
                const priceText = `$${Number(item.price).toFixed(2)}`;
                return (
                  <View key={item.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      {item.image_url ? (
                        <Image source={resolveImageSource(item.image_url)} style={styles.listItemThumb} resizeMode="cover" />
                      ) : (
                        <View style={styles.listItemThumbPlaceholder}>
                          <ShoppingBag size={16} color={colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.listItemInfo}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>{itemName}</Text>
                        <Text style={styles.listItemSubtitle}>{priceText}</Text>
                        <PublishedBadge published={item.is_published} />
                      </View>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => moveMerch(index, 'up')} disabled={index === 0}>
                        <ChevronUp size={18} color={index === 0 ? colors.inactive : colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => moveMerch(index, 'down')} disabled={index === merch.length - 1}>
                        <ChevronDown size={18} color={index === merch.length - 1 ? colors.inactive : colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleToggleMerchPublish(item)}>
                        {item.is_published ? (
                          <EyeOff size={18} color={colors.textSecondary} />
                        ) : (
                          <Eye size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openEditMerch(item)}>
                        <Pencil size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteMerch(item.id, item.name)}>
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Videos Section ── */}
        {activeSection === 'videos' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Videos</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openNewVideo}>
                <Plus size={18} color={colors.background} />
                <Text style={styles.addBtnText}>Add Video</Text>
              </TouchableOpacity>
            </View>
            {loadingVideos ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : videos.length === 0 ? (
              <View style={styles.emptyState}>
                <Video size={40} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No videos yet</Text>
              </View>
            ) : (
              videos.map((video, index) => {
                const videoTitle = video.title;
                const videoThumb = video.thumbnail_url ||
                  (video.youtube_id ? `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg` : undefined);
                return (
                  <View key={video.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      {videoThumb ? (
                        <Image source={resolveImageSource(videoThumb)} style={styles.listItemThumb} resizeMode="cover" />
                      ) : (
                        <View style={styles.listItemThumbPlaceholder}>
                          <Video size={16} color={colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.listItemInfo}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>{videoTitle}</Text>
                        {video.description ? (
                          <Text style={styles.listItemSubtitle} numberOfLines={1}>{video.description}</Text>
                        ) : null}
                        <PublishedBadge published={video.is_published} />
                      </View>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => moveVideo(index, 'up')} disabled={index === 0}>
                        <ChevronUp size={18} color={index === 0 ? colors.inactive : colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => moveVideo(index, 'down')} disabled={index === videos.length - 1}>
                        <ChevronDown size={18} color={index === videos.length - 1 ? colors.inactive : colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleToggleVideoPublish(video)}>
                        {video.is_published ? (
                          <EyeOff size={18} color={colors.textSecondary} />
                        ) : (
                          <Eye size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openEditVideo(video)}>
                        <Pencil size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteVideo(video.id, video.title)}>
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Form Modal */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeForm} style={styles.modalCloseBtn}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {activeSection === 'songs' && editingSong && (
            <SongForm
              initial={editingSong as Partial<Song>}
              onSave={handleSaveSong}
              onCancel={closeForm}
            />
          )}
          {activeSection === 'merch' && editingMerch && (
            <MerchForm
              initial={editingMerch}
              onSave={handleSaveMerch}
              onCancel={closeForm}
            />
          )}
          {activeSection === 'videos' && editingVideo && (
            <VideoForm
              initial={editingVideo}
              onSave={handleSaveVideo}
              onCancel={closeForm}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  signOutBtn: {
    padding: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 8,
  },
  listItemThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    flexShrink: 0,
  },
  listItemThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listItemInfo: {
    flex: 1,
    gap: 3,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    padding: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeLive: {
    backgroundColor: 'rgba(0,255,102,0.15)',
  },
  badgeDraft: {
    backgroundColor: colors.secondary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeLiveText: {
    color: colors.primary,
  },
  badgeDraftText: {
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    padding: 4,
  },
});

const formStyles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerBtnDisabled: {
    opacity: 0.6,
  },
  pickerBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  fileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: colors.secondary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  categoryBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  categoryBtnTextActive: {
    color: colors.background,
  },
  sourceToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  sourceToggleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sourceToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sourceToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sourceToggleTextActive: {
    color: colors.background,
  },
  ytRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  ytInput: {
    flex: 1,
  },
  ytValidateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ytValidateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.background,
  },
  ytPreviewContainer: {
    marginTop: 10,
    gap: 6,
  },
  ytValidatedText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
});
