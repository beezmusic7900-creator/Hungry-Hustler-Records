
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
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
} from 'lucide-react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type SongCategory = 'exclusive' | 'featured' | 'new';

type Song = {
  id: string;
  title: string;
  artist: string;
  category: SongCategory;
  file_url: string;
  cover_url?: string;
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
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  is_published: boolean;
  sort_order: number;
};

type AdminSection = 'songs' | 'merch' | 'videos';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

async function adminFetch<T>(path: string, method: string, body?: any): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  console.log(`[AdminScreen] ${method} ${SUPABASE_FUNCTIONS_URL}${path}`);
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[AdminScreen] API error ${res.status}:`, text);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
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
  category: SongCategory;
  price: string;
  is_published: boolean;
  file_url: string;
  cover_url: string;
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
    category: initial.category || 'exclusive',
    price: initial.price !== undefined ? String(initial.price) : '0',
    is_published: initial.is_published ?? false,
    file_url: initial.file_url || '',
    cover_url: initial.cover_url || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Validation', 'Title is required'); return; }
    if (!form.artist.trim()) { Alert.alert('Validation', 'Artist is required'); return; }
    if (!isEdit && !form.file_url.trim()) { Alert.alert('Validation', 'Audio file URL is required'); return; }

    console.log('[AdminScreen] Saving song:', form.title, 'isEdit:', isEdit);
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        artist: form.artist,
        category: form.category,
        price: parseFloat(form.price) || 0,
        is_published: form.is_published,
        file_url: form.file_url,
        cover_url: form.cover_url || undefined,
      };
      let result: Song;
      if (isEdit) {
        result = await adminFetch<Song>(`/songs/${initial.id}`, 'PUT', payload);
      } else {
        result = await adminFetch<Song>('/songs', 'POST', payload);
      }
      if (!result?.id) throw new Error('Server did not return song with id');
      onSave(result);
    } catch (e: any) {
      console.error('[AdminScreen] Song save error:', e);
      Alert.alert('Error', e.message || 'Failed to save song');
    } finally {
      setSaving(false);
    }
  };

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

      <Text style={formStyles.label}>Category</Text>
      <View style={formStyles.categoryRow}>
        {SONG_CATEGORIES.map((cat) => {
          const isActive = form.category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[formStyles.categoryBtn, isActive && formStyles.categoryBtnActive]}
              onPress={() => { console.log('[AdminScreen] Category selected:', cat); setForm((f) => ({ ...f, category: cat })); }}
            >
              <Text style={[formStyles.categoryBtnText, isActive && formStyles.categoryBtnTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
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

      <Text style={formStyles.label}>Audio File URL {!isEdit ? '*' : ''}</Text>
      <TextInput
        style={formStyles.input}
        placeholder="https://example.com/song.mp3"
        placeholderTextColor={colors.textTertiary}
        value={form.file_url}
        onChangeText={(t) => setForm((f) => ({ ...f, file_url: t }))}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={formStyles.label}>Cover Image URL</Text>
      <TextInput
        style={formStyles.input}
        placeholder="https://example.com/cover.jpg"
        placeholderTextColor={colors.textTertiary}
        value={form.cover_url}
        onChangeText={(t) => setForm((f) => ({ ...f, cover_url: t }))}
        autoCapitalize="none"
        keyboardType="url"
      />

      {form.cover_url ? (
        <Image source={resolveImageSource(form.cover_url)} style={formStyles.preview} resizeMode="cover" />
      ) : null}

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
        <TouchableOpacity style={formStyles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={formStyles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel} disabled={saving}>
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

  const handleSave = async () => {
    if (!form.name?.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    if (form.price === undefined || form.price === null) { Alert.alert('Validation', 'Price is required'); return; }
    console.log('[AdminScreen] Saving merch:', form.name);
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const priceStr = form.price !== undefined ? String(form.price) : '';

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

      <Text style={formStyles.label}>Image URL</Text>
      <TextInput
        style={formStyles.input}
        placeholder="https://example.com/image.jpg"
        placeholderTextColor={colors.textTertiary}
        value={form.image_url || ''}
        onChangeText={(t) => setForm((f) => ({ ...f, image_url: t }))}
        autoCapitalize="none"
        keyboardType="url"
      />

      {form.image_url ? (
        <Image source={resolveImageSource(form.image_url)} style={formStyles.preview} resizeMode="cover" />
      ) : null}

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
        <TouchableOpacity style={formStyles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={formStyles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel}>
          <Text style={formStyles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Video Form ───────────────────────────────────────────────────────────────

function VideoForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<VideoItem>;
  onSave: (data: Partial<VideoItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<VideoItem>>(initial);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title?.trim()) { Alert.alert('Validation', 'Title is required'); return; }
    if (!form.video_url?.trim() && !initial.id) { Alert.alert('Validation', 'Video URL is required'); return; }
    console.log('[AdminScreen] Saving video:', form.title);
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={formStyles.scroll} contentContainerStyle={formStyles.container}>
      <Text style={formStyles.title}>{initial.id ? 'Edit Video' : 'New Video'}</Text>

      <Text style={formStyles.label}>Title *</Text>
      <TextInput
        style={formStyles.input}
        placeholder="Video title"
        placeholderTextColor={colors.textTertiary}
        value={form.title || ''}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
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

      <Text style={formStyles.label}>Video URL {!initial.id ? '*' : ''}</Text>
      <TextInput
        style={formStyles.input}
        placeholder="https://example.com/video.mp4"
        placeholderTextColor={colors.textTertiary}
        value={form.video_url || ''}
        onChangeText={(t) => setForm((f) => ({ ...f, video_url: t }))}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={formStyles.label}>Thumbnail URL</Text>
      <TextInput
        style={formStyles.input}
        placeholder="https://example.com/thumb.jpg"
        placeholderTextColor={colors.textTertiary}
        value={form.thumbnail_url || ''}
        onChangeText={(t) => setForm((f) => ({ ...f, thumbnail_url: t }))}
        autoCapitalize="none"
        keyboardType="url"
      />

      {form.thumbnail_url ? (
        <Image source={resolveImageSource(form.thumbnail_url)} style={formStyles.preview} resizeMode="cover" />
      ) : null}

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
        <TouchableOpacity style={formStyles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={formStyles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel}>
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
    console.log('[AdminScreen] Fetching videos from /videos');
    setLoadingVideos(true);
    try {
      const data = await adminFetch<{ videos: VideoItem[] }>('/videos', 'GET');
      console.log('[AdminScreen] Videos received:', data?.videos?.length ?? 0);
      setVideos((data?.videos ?? []).sort((a, b) => a.sort_order - b.sort_order));
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
      if (data.id) {
        console.log(`[AdminScreen] PUT /merch/${data.id}`);
        await adminFetch(`/merch/${data.id}`, 'PUT', data);
      } else {
        console.log('[AdminScreen] POST /merch');
        await adminFetch('/merch', 'POST', data);
      }
      setFormVisible(false);
      setEditingMerch(null);
      await fetchMerch();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save merch');
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

  const handleSaveVideo = async (data: Partial<VideoItem>) => {
    try {
      if (data.id) {
        console.log(`[AdminScreen] PUT /videos/${data.id}`);
        await adminFetch(`/videos/${data.id}`, 'PUT', data);
      } else {
        console.log('[AdminScreen] POST /videos');
        await adminFetch('/videos', 'POST', data);
      }
      setFormVisible(false);
      setEditingVideo(null);
      await fetchVideos();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save video');
    }
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
    setEditingSong({ is_published: false });
    setFormVisible(true);
  };

  const openEditSong = (song: Song) => {
    console.log(`[AdminScreen] Open edit song form: ${song.title}`);
    setEditingSong(song);
    setFormVisible(true);
  };

  const openNewMerch = () => {
    console.log('[AdminScreen] Open new merch form');
    setEditingMerch({ is_published: false, stock: 0, price: 0 });
    setFormVisible(true);
  };

  const openEditMerch = (item: MerchItem) => {
    console.log(`[AdminScreen] Open edit merch form: ${item.name}`);
    setEditingMerch(item);
    setFormVisible(true);
  };

  const openNewVideo = () => {
    console.log('[AdminScreen] Open new video form');
    setEditingVideo({ is_published: false });
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
                return (
                  <View key={song.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      {song.cover_url ? (
                        <Image source={resolveImageSource(song.cover_url)} style={styles.listItemThumb} resizeMode="cover" />
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
                return (
                  <View key={video.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      {video.thumbnail_url ? (
                        <Image source={resolveImageSource(video.thumbnail_url)} style={styles.listItemThumb} resizeMode="cover" />
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
});
