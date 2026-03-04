
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import Modal from '@/components/ui/Modal';
import { colors, commonStyles } from '@/styles/commonStyles';

interface Artist {
  id: string;
  name: string;
  bio?: string;
  photo_url?: string;
  photoUrl?: string;
  spotify_url?: string;
  spotifyUrl?: string;
  apple_music_url?: string;
  appleMusicUrl?: string;
  youtube_url?: string;
  youtubeUrl?: string;
  soundcloud_url?: string;
  soundcloudUrl?: string;
  instagram_url?: string;
  instagramUrl?: string;
  twitter_url?: string;
  twitterUrl?: string;
  specialties?: string;
  status?: string;
  label?: string;
}

interface MerchItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock: number;
}

interface HomepageContent {
  hero_banner_url?: string;
  featured_artist_id?: string;
  featured_merch_id?: string;
  latest_release_title?: string;
  latest_release_url?: string;
}

interface AboutContent {
  logo_url?: string;
  description?: string;
  mission?: string;
  contact_email?: string;
  contact_phone?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
}

interface Song {
  id: string;
  title: string;
  artistId?: string;
  mp3Url: string;
  coverPhotoUrl: string;
  price: number;
  isExclusive: boolean;
  releaseDate: string;
}

interface Video {
  id: string;
  title: string;
  artistId?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  isExclusive: boolean;
  releaseDate: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  canUpload: boolean;
  createdAt: string;
}

type TabType = 'artists' | 'merch' | 'homepage' | 'about' | 'music' | 'videos' | 'users';

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function AdminScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('artists');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'confirm',
    onConfirm: undefined as (() => void) | undefined,
  });

  // Artists state
  const [artists, setArtists] = useState<Artist[]>([]);
  const [editingArtist, setEditingArtist] = useState<Partial<Artist>>({});

  // Merch state
  const [merchItems, setMerchItems] = useState<MerchItem[]>([]);
  const [editingMerch, setEditingMerch] = useState<Partial<MerchItem>>({});

  // Homepage state
  const [homepageContent, setHomepageContent] = useState<HomepageContent>({});

  // About state
  const [aboutContent, setAboutContent] = useState<AboutContent>({});

  // Music state
  const [songs, setSongs] = useState<Song[]>([]);
  const [editingSong, setEditingSong] = useState<Partial<Song>>({});
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Video state
  const [videos, setVideos] = useState<Video[]>([]);
  const [editingVideo, setEditingVideo] = useState<Partial<Video>>({});
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    isAdmin: false,
    canUpload: false,
  });

  useEffect(() => {
    console.log('[AdminScreen] User:', user);
    if (user) {
      checkAdminStatus();
    } else {
      setCheckingAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'artists') fetchArtists();
      else if (activeTab === 'merch') fetchMerchItems();
      else if (activeTab === 'homepage') fetchHomepageContent();
      else if (activeTab === 'about') fetchAboutContent();
      else if (activeTab === 'music') fetchSongs();
      else if (activeTab === 'videos') fetchVideos();
      else if (activeTab === 'users') fetchUsers();
    }
  }, [isAdmin, activeTab]);

  const showModal = (
    title: string,
    message: string,
    type: 'info' | 'error' | 'success' | 'confirm' = 'info',
    onConfirm?: () => void
  ) => {
    setModalConfig({ title, message, type, onConfirm });
    setModalVisible(true);
  };

  const checkAdminStatus = async () => {
    try {
      setCheckingAdmin(true);
      console.log('[AdminScreen] Checking admin status via POST /api/admin/check');
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ isAdmin: boolean }>('/api/admin/check', {});
      console.log('[AdminScreen] Admin check response:', response);
      setIsAdmin(response.isAdmin);
    } catch (error: any) {
      console.error('[AdminScreen] Error checking admin status:', error);
      setIsAdmin(false);
      showModal('Access Denied', 'You do not have admin privileges.', 'error');
    } finally {
      setCheckingAdmin(false);
    }
  };

  const uploadFileToBackend = async (
    uri: string,
    filename: string,
    mimeType: string,
    endpoint: string
  ): Promise<string | null> => {
    try {
      console.log(`[AdminScreen] Uploading file to ${endpoint}:`, filename, mimeType);
      const { authenticatedUpload } = await import('@/utils/api');
      const result = await authenticatedUpload<{ url: string; filename: string }>(
        endpoint,
        uri,
        filename,
        mimeType
      );
      console.log(`[AdminScreen] Upload success:`, result);
      return result.url || null;
    } catch (error: any) {
      console.error(`[AdminScreen] Upload error:`, error);
      throw error;
    }
  };

  const uploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('[AdminScreen] Image selected:', asset.uri);

        const filename = asset.fileName || `image_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        showModal('Uploading', 'Uploading image to server...', 'info');
        const url = await uploadFileToBackend(asset.uri, filename, mimeType, '/api/admin/upload/image');
        if (url) {
          showModal('Success', 'Image uploaded successfully', 'success');
          return url;
        }
      }
    } catch (error: any) {
      console.error('[AdminScreen] Error picking/uploading image:', error);
      showModal('Error', error.message || 'Failed to upload image', 'error');
    }
    return null;
  };

  const uploadAudio = async () => {
    try {
      setUploadingAudio(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('[AdminScreen] Audio file selected:', asset.uri);

        const filename = asset.name || `audio_${Date.now()}.mp3`;
        const mimeType = asset.mimeType || 'audio/mpeg';

        const url = await uploadFileToBackend(asset.uri, filename, mimeType, '/api/admin/upload/audio');
        if (url) {
          showModal('Success', 'Audio file uploaded successfully', 'success');
          return url;
        }
      }
    } catch (error: any) {
      console.error('[AdminScreen] Error picking/uploading audio:', error);
      showModal('Error', error.message || 'Failed to upload audio file', 'error');
    } finally {
      setUploadingAudio(false);
    }
    return null;
  };

  const uploadVideoFile = async () => {
    try {
      setUploadingVideo(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('[AdminScreen] Video file selected:', asset.uri);

        const filename = asset.name || `video_${Date.now()}.mp4`;
        const mimeType = asset.mimeType || 'video/mp4';

        const url = await uploadFileToBackend(asset.uri, filename, mimeType, '/api/admin/upload/video');
        if (url) {
          showModal('Success', 'Video file uploaded successfully', 'success');
          return url;
        }
      }
    } catch (error: any) {
      console.error('[AdminScreen] Error picking/uploading video:', error);
      showModal('Error', error.message || 'Failed to upload video file', 'error');
    } finally {
      setUploadingVideo(false);
    }
    return null;
  };

  // Artist functions
  const normalizeArtistForAdmin = (artist: any): Artist => ({
    id: artist.id,
    name: artist.name,
    bio: artist.bio,
    photo_url: artist.photo_url || artist.photoUrl,
    spotify_url: artist.spotify_url || artist.spotifyUrl,
    apple_music_url: artist.apple_music_url || artist.appleMusicUrl,
    youtube_url: artist.youtube_url || artist.youtubeUrl,
    soundcloud_url: artist.soundcloud_url || artist.soundcloudUrl,
    instagram_url: artist.instagram_url || artist.instagramUrl,
    twitter_url: artist.twitter_url || artist.twitterUrl,
    specialties: typeof artist.specialties === 'string' ? artist.specialties : JSON.stringify(artist.specialties || []),
    status: artist.status || 'Active',
    label: artist.label || 'Hungry Hustler Records',
  });

  const fetchArtists = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Fetching artists');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<any[]>('/api/artists');
      console.log('[AdminScreen] Artists received:', data);
      setArtists((data || []).map(normalizeArtistForAdmin));
    } catch (error: any) {
      console.error('[AdminScreen] Error fetching artists:', error);
      showModal('Error', 'Failed to fetch artists', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchItems = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Fetching merch items');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<MerchItem[]>('/api/merch');
      console.log('[AdminScreen] Merch items received:', data);
      setMerchItems(data || []);
    } catch (error: any) {
      console.error('[AdminScreen] Error fetching merch items:', error);
      showModal('Error', 'Failed to fetch merch items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHomepageContent = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Fetching homepage content');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<HomepageContent>('/api/homepage');
      console.log('[AdminScreen] Homepage content received:', data);
      setHomepageContent(data || {});
    } catch (error: any) {
      console.error('[AdminScreen] Error fetching homepage content:', error);
      showModal('Error', 'Failed to fetch homepage content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAboutContent = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Fetching about content');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<AboutContent>('/api/about');
      console.log('[AdminScreen] About content received:', data);
      setAboutContent(data || {});
    } catch (error: any) {
      console.error('[AdminScreen] Error fetching about content:', error);
      showModal('Error', 'Failed to fetch about content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSongs = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Fetching songs from /api/songs');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<Song[]>('/api/songs');
      console.log('[AdminScreen] Songs received:', data);
      setSongs((data || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        artistId: s.artistId || s.artist_id,
        mp3Url: s.mp3Url || s.mp3_url,
        coverPhotoUrl: s.coverPhotoUrl || s.cover_photo_url,
        price: parseFloat(s.price) || 0,
        isExclusive: s.isExclusive ?? s.is_exclusive ?? true,
        releaseDate: s.releaseDate || s.release_date,
      })));
    } catch (error: any) {
      console.error('[AdminScreen] Error fetching songs:', error);
      showModal('Error', 'Failed to fetch songs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Fetching videos from /api/videos');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<Video[]>('/api/videos');
      console.log('[AdminScreen] Videos received:', data);
      setVideos((data || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        artistId: v.artistId || v.artist_id,
        videoUrl: v.videoUrl || v.video_url,
        thumbnailUrl: v.thumbnailUrl || v.thumbnail_url,
        isExclusive: v.isExclusive ?? v.is_exclusive ?? true,
        releaseDate: v.releaseDate || v.release_date,
      })));
    } catch (error: any) {
      console.error('[AdminScreen] Error fetching videos:', error);
      showModal('Error', 'Failed to fetch videos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Fetching users from /api/admin/users');
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<User[]>('/api/admin/users');
      console.log('[AdminScreen] Users received:', data);
      setUsers((data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name || u.email,
        isAdmin: u.isAdmin ?? u.is_admin ?? false,
        canUpload: u.canUpload ?? u.can_upload ?? false,
        createdAt: u.createdAt || u.created_at,
      })));
    } catch (error: any) {
      console.error('[AdminScreen] Error fetching users:', error);
      showModal('Error', 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArtist = async () => {
    if (!editingArtist.name) {
      showModal('Error', 'Artist name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminScreen] Saving artist:', editingArtist);
      const { authenticatedPost, authenticatedPut } = await import('@/utils/api');

      if (editingArtist.id) {
        await authenticatedPut(`/api/admin/artists/${editingArtist.id}`, editingArtist);
        showModal('Success', 'Artist updated successfully', 'success');
      } else {
        await authenticatedPost('/api/admin/artists', editingArtist);
        showModal('Success', 'Artist created successfully', 'success');
      }

      setEditingArtist({});
      fetchArtists();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving artist:', error);
      showModal('Error', error.message || 'Failed to save artist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArtist = (id: string) => {
    showModal(
      'Confirm Delete',
      'Are you sure you want to delete this artist?',
      'confirm',
      async () => {
        try {
          setLoading(true);
          console.log('[AdminScreen] Deleting artist:', id);
          const { authenticatedDelete } = await import('@/utils/api');
          await authenticatedDelete(`/api/admin/artists/${id}`);
          showModal('Success', 'Artist deleted successfully', 'success');
          fetchArtists();
        } catch (error: any) {
          console.error('[AdminScreen] Error deleting artist:', error);
          showModal('Error', 'Failed to delete artist', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleSaveMerch = async () => {
    if (!editingMerch.name || !editingMerch.price) {
      showModal('Error', 'Name and price are required', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminScreen] Saving merch:', editingMerch);
      const { authenticatedPost, authenticatedPut } = await import('@/utils/api');

      if (editingMerch.id) {
        await authenticatedPut(`/api/admin/merch/${editingMerch.id}`, editingMerch);
        showModal('Success', 'Merch item updated successfully', 'success');
      } else {
        await authenticatedPost('/api/admin/merch', editingMerch);
        showModal('Success', 'Merch item created successfully', 'success');
      }

      setEditingMerch({});
      fetchMerchItems();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving merch:', error);
      showModal('Error', error.message || 'Failed to save merch item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMerch = (id: string) => {
    showModal(
      'Confirm Delete',
      'Are you sure you want to delete this merch item?',
      'confirm',
      async () => {
        try {
          setLoading(true);
          console.log('[AdminScreen] Deleting merch:', id);
          const { authenticatedDelete } = await import('@/utils/api');
          await authenticatedDelete(`/api/admin/merch/${id}`);
          showModal('Success', 'Merch item deleted successfully', 'success');
          fetchMerchItems();
        } catch (error: any) {
          console.error('[AdminScreen] Error deleting merch:', error);
          showModal('Error', 'Failed to delete merch item', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleSaveHomepage = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Saving homepage content:', homepageContent);
      const { authenticatedPut } = await import('@/utils/api');
      await authenticatedPut('/api/admin/homepage', homepageContent);
      showModal('Success', 'Homepage content updated successfully', 'success');
      fetchHomepageContent();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving homepage content:', error);
      showModal('Error', 'Failed to save homepage content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAbout = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Saving about content:', aboutContent);
      const { authenticatedPut } = await import('@/utils/api');
      await authenticatedPut('/api/admin/about', aboutContent);
      showModal('Success', 'About content updated successfully', 'success');
      fetchAboutContent();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving about content:', error);
      showModal('Error', 'Failed to save about content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSong = async () => {
    if (!editingSong.title || !editingSong.mp3Url || !editingSong.coverPhotoUrl) {
      showModal('Error', 'Title, MP3 file, and cover photo are required', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminScreen] Saving song:', editingSong);
      const { authenticatedPost, authenticatedPut } = await import('@/utils/api');

      const songData = {
        ...editingSong,
        price: editingSong.price || 0,
        isExclusive: editingSong.isExclusive !== false,
      };

      if (editingSong.id) {
        console.log('[AdminScreen] Updating song via PUT /api/admin/songs/' + editingSong.id);
        await authenticatedPut(`/api/admin/songs/${editingSong.id}`, songData);
        showModal('Success', 'Song updated successfully', 'success');
      } else {
        console.log('[AdminScreen] Creating song via POST /api/admin/songs');
        await authenticatedPost('/api/admin/songs', songData);
        showModal('Success', 'Song uploaded successfully and will appear in Merch tab', 'success');
      }

      setEditingSong({});
      fetchSongs();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving song:', error);
      showModal('Error', error.message || 'Failed to save song', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = (id: string) => {
    showModal(
      'Confirm Delete',
      'Are you sure you want to delete this song?',
      'confirm',
      async () => {
        try {
          setLoading(true);
          console.log('[AdminScreen] Deleting song via DELETE /api/admin/songs/' + id);
          const { authenticatedDelete } = await import('@/utils/api');
          await authenticatedDelete(`/api/admin/songs/${id}`);
          showModal('Success', 'Song deleted successfully', 'success');
          fetchSongs();
        } catch (error: any) {
          console.error('[AdminScreen] Error deleting song:', error);
          showModal('Error', 'Failed to delete song', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleSaveVideo = async () => {
    if (!editingVideo.title || !editingVideo.videoUrl) {
      showModal('Error', 'Title and video file are required', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminScreen] Saving video:', editingVideo);
      const { authenticatedPost, authenticatedPut } = await import('@/utils/api');

      const videoData = {
        ...editingVideo,
        isExclusive: editingVideo.isExclusive !== false,
      };

      if (editingVideo.id) {
        console.log('[AdminScreen] Updating video via PUT /api/admin/videos/' + editingVideo.id);
        await authenticatedPut(`/api/admin/videos/${editingVideo.id}`, videoData);
        showModal('Success', 'Video updated successfully', 'success');
      } else {
        console.log('[AdminScreen] Creating video via POST /api/admin/videos');
        await authenticatedPost('/api/admin/videos', videoData);
        showModal('Success', 'Video uploaded successfully and will appear in Home tab', 'success');
      }

      setEditingVideo({});
      fetchVideos();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving video:', error);
      showModal('Error', error.message || 'Failed to save video', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = (id: string) => {
    showModal(
      'Confirm Delete',
      'Are you sure you want to delete this video?',
      'confirm',
      async () => {
        try {
          setLoading(true);
          console.log('[AdminScreen] Deleting video via DELETE /api/admin/videos/' + id);
          const { authenticatedDelete } = await import('@/utils/api');
          await authenticatedDelete(`/api/admin/videos/${id}`);
          showModal('Success', 'Video deleted successfully', 'success');
          fetchVideos();
        } catch (error: any) {
          console.error('[AdminScreen] Error deleting video:', error);
          showModal('Error', 'Failed to delete video', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      showModal('Error', 'Email, password, and name are required', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminScreen] Creating user via POST /api/admin/users:', newUser);
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost('/api/admin/users', newUser);
      showModal('Success', 'User created successfully', 'success');
      setNewUser({ email: '', password: '', name: '', isAdmin: false, canUpload: false });
      fetchUsers();
    } catch (error: any) {
      console.error('[AdminScreen] Error creating user:', error);
      showModal('Error', error.message || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    showModal(
      'Confirm Delete',
      'Are you sure you want to delete this user account? This action cannot be undone.',
      'confirm',
      async () => {
        try {
          setLoading(true);
          console.log('[AdminScreen] Deleting user via DELETE /api/admin/users/' + userId);
          const { authenticatedDelete } = await import('@/utils/api');
          await authenticatedDelete(`/api/admin/users/${userId}`);
          showModal('Success', 'User deleted successfully', 'success');
          fetchUsers();
        } catch (error: any) {
          console.error('[AdminScreen] Error deleting user:', error);
          showModal('Error', error.message || 'Failed to delete user', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleUpdateUserPermissions = async (userId: string, permissions: { isAdmin?: boolean; canUpload?: boolean }) => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Updating user permissions via PUT /api/admin/users/' + userId + '/permissions:', permissions);
      const { authenticatedPut } = await import('@/utils/api');
      await authenticatedPut(`/api/admin/users/${userId}/permissions`, permissions);
      showModal('Success', 'User permissions updated successfully', 'success');
      fetchUsers();
    } catch (error: any) {
      console.error('[AdminScreen] Error updating user permissions:', error);
      showModal('Error', error.message || 'Failed to update user permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    showModal(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      'confirm',
      async () => {
        try {
          await signOut();
          router.replace('/auth');
        } catch (error: any) {
          console.error('[AdminScreen] Error signing out:', error);
          showModal('Error', 'Failed to sign out', 'error');
        }
      }
    );
  };

  if (checkingAdmin) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking admin access...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <IconSymbol
          ios_icon_name="lock.shield"
          android_material_icon_name="lock"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>Please sign in to access admin panel</Text>
        <TouchableOpacity style={commonStyles.button} onPress={() => router.push('/auth')}>
          <Text style={commonStyles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="warning"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>You do not have admin privileges</Text>
        <TouchableOpacity style={commonStyles.button} onPress={() => router.back()}>
          <Text style={commonStyles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 0;

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop }]}>
          <Text style={styles.headerTitle}>ADMIN PANEL</Text>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <IconSymbol
              ios_icon_name="rectangle.portrait.and.arrow.right"
              android_material_icon_name="logout"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'artists' && styles.tabActive]}
            onPress={() => setActiveTab('artists')}
          >
            <Text style={[styles.tabText, activeTab === 'artists' && styles.tabTextActive]}>
              Artists
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'music' && styles.tabActive]}
            onPress={() => setActiveTab('music')}
          >
            <Text style={[styles.tabText, activeTab === 'music' && styles.tabTextActive]}>
              Music
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
              Videos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'merch' && styles.tabActive]}
            onPress={() => setActiveTab('merch')}
          >
            <Text style={[styles.tabText, activeTab === 'merch' && styles.tabTextActive]}>
              Merch
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'homepage' && styles.tabActive]}
            onPress={() => setActiveTab('homepage')}
          >
            <Text style={[styles.tabText, activeTab === 'homepage' && styles.tabTextActive]}>
              Home
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.tabActive]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
              About
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              Users
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Content */}
        <ScrollView style={styles.content}>
          {/* Artists Tab */}
          {activeTab === 'artists' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Manage Artists</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push('/add-artists-helper')}
                >
                  <IconSymbol
                    ios_icon_name="person.badge.plus"
                    android_material_icon_name="person-add"
                    size={18}
                    color={colors.background}
                  />
                  <Text style={styles.addButtonText}>Quick Add</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : (
                <>
                  {artists.map((artist) => {
                    const artistName = artist.name;
                    const artistStatus = artist.status || 'Active';
                    
                    return (
                      <View key={artist.id} style={styles.listItem}>
                        <View style={styles.listItemHeader}>
                          {artist.photo_url && (
                            <Image
                              source={resolveImageSource(artist.photo_url)}
                              style={styles.listItemImage}
                              resizeMode="cover"
                            />
                          )}
                          <View style={styles.listItemInfo}>
                            <Text style={styles.listItemTitle}>{artistName}</Text>
                            <Text style={styles.listItemSubtitle}>{artistStatus}</Text>
                          </View>
                        </View>
                        <View style={styles.listItemActions}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setEditingArtist(artist)}
                          >
                            <IconSymbol
                              ios_icon_name="pencil"
                              android_material_icon_name="edit"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteArtist(artist.id)}
                          >
                            <IconSymbol
                              ios_icon_name="trash"
                              android_material_icon_name="delete"
                              size={18}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {editingArtist && Object.keys(editingArtist).length > 0 && (
                    <View style={styles.editForm}>
                      <Text style={styles.formTitle}>
                        {editingArtist.id ? 'Edit Artist' : 'New Artist'}
                      </Text>
                      
                      <TextInput
                        style={styles.input}
                        placeholder="Artist Name *"
                        placeholderTextColor={colors.textTertiary}
                        value={editingArtist.name || ''}
                        onChangeText={(text) => setEditingArtist({ ...editingArtist, name: text })}
                      />
                      
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Bio"
                        placeholderTextColor={colors.textTertiary}
                        value={editingArtist.bio || ''}
                        onChangeText={(text) => setEditingArtist({ ...editingArtist, bio: text })}
                        multiline
                        numberOfLines={4}
                      />

                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={async () => {
                          const uri = await uploadImage();
                          if (uri) setEditingArtist({ ...editingArtist, photo_url: uri });
                        }}
                      >
                        <IconSymbol
                          ios_icon_name="photo"
                          android_material_icon_name="image"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.uploadButtonText}>Upload Photo</Text>
                      </TouchableOpacity>

                      <View style={styles.formActions}>
                        <TouchableOpacity
                          style={[commonStyles.button, styles.saveButton]}
                          onPress={handleSaveArtist}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color={colors.background} />
                          ) : (
                            <Text style={commonStyles.buttonText}>Save</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setEditingArtist({})}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Music Tab */}
          {activeTab === 'music' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Manage Music</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setEditingSong({ isExclusive: true, price: 0 })}
                >
                  <IconSymbol
                    ios_icon_name="plus"
                    android_material_icon_name="add"
                    size={18}
                    color={colors.background}
                  />
                  <Text style={styles.addButtonText}>Upload Song</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="info.circle"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.infoText}>
                  Songs marked as exclusive will automatically appear in the Merch tab
                </Text>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : (
                <>
                  {songs.map((song) => {
                    const songTitle = song.title;
                    const songPrice = `$${song.price.toFixed(2)}`;
                    const exclusiveLabel = song.isExclusive ? 'Exclusive' : 'Standard';
                    
                    return (
                      <View key={song.id} style={styles.listItem}>
                        <View style={styles.listItemHeader}>
                          {song.coverPhotoUrl && (
                            <Image
                              source={resolveImageSource(song.coverPhotoUrl)}
                              style={styles.listItemImage}
                              resizeMode="cover"
                            />
                          )}
                          <View style={styles.listItemInfo}>
                            <Text style={styles.listItemTitle}>{songTitle}</Text>
                            <Text style={styles.listItemSubtitle}>{songPrice}</Text>
                            <Text style={styles.listItemSubtitle}>{exclusiveLabel}</Text>
                          </View>
                        </View>
                        <View style={styles.listItemActions}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setEditingSong(song)}
                          >
                            <IconSymbol
                              ios_icon_name="pencil"
                              android_material_icon_name="edit"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteSong(song.id)}
                          >
                            <IconSymbol
                              ios_icon_name="trash"
                              android_material_icon_name="delete"
                              size={18}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {editingSong && Object.keys(editingSong).length > 0 && (
                    <View style={styles.editForm}>
                      <Text style={styles.formTitle}>
                        {editingSong.id ? 'Edit Song' : 'Upload New Song'}
                      </Text>
                      
                      <TextInput
                        style={styles.input}
                        placeholder="Song Title *"
                        placeholderTextColor={colors.textTertiary}
                        value={editingSong.title || ''}
                        onChangeText={(text) => setEditingSong({ ...editingSong, title: text })}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="Price (USD)"
                        placeholderTextColor={colors.textTertiary}
                        value={editingSong.price?.toString() || '0'}
                        onChangeText={(text) => setEditingSong({ ...editingSong, price: parseFloat(text) || 0 })}
                        keyboardType="decimal-pad"
                      />

                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={async () => {
                          const uri = await uploadAudio();
                          if (uri) setEditingSong({ ...editingSong, mp3Url: uri });
                        }}
                        disabled={uploadingAudio}
                      >
                        {uploadingAudio ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <IconSymbol
                              ios_icon_name="music.note"
                              android_material_icon_name="music-note"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.uploadButtonText}>
                              {editingSong.mp3Url ? 'Change MP3 File' : 'Upload MP3 File *'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={async () => {
                          const uri = await uploadImage();
                          if (uri) setEditingSong({ ...editingSong, coverPhotoUrl: uri });
                        }}
                        disabled={uploadingCover}
                      >
                        {uploadingCover ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <IconSymbol
                              ios_icon_name="photo"
                              android_material_icon_name="image"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.uploadButtonText}>
                              {editingSong.coverPhotoUrl ? 'Change Cover Photo' : 'Upload Cover Photo *'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setEditingSong({ ...editingSong, isExclusive: !editingSong.isExclusive })}
                      >
                        <View style={[styles.checkbox, editingSong.isExclusive && styles.checkboxChecked]}>
                          {editingSong.isExclusive && (
                            <IconSymbol
                              ios_icon_name="checkmark"
                              android_material_icon_name="check"
                              size={16}
                              color={colors.background}
                            />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>Exclusive Release (Show in Merch Tab)</Text>
                      </TouchableOpacity>

                      <View style={styles.formActions}>
                        <TouchableOpacity
                          style={[commonStyles.button, styles.saveButton]}
                          onPress={handleSaveSong}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color={colors.background} />
                          ) : (
                            <Text style={commonStyles.buttonText}>Save</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setEditingSong({})}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Manage Videos</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setEditingVideo({ isExclusive: true })}
                >
                  <IconSymbol
                    ios_icon_name="plus"
                    android_material_icon_name="add"
                    size={18}
                    color={colors.background}
                  />
                  <Text style={styles.addButtonText}>Upload Video</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="info.circle"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.infoText}>
                  Videos marked as exclusive will automatically appear in the Home tab
                </Text>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : (
                <>
                  {videos.map((video) => {
                    const videoTitle = video.title;
                    const exclusiveLabel = video.isExclusive ? 'Exclusive' : 'Standard';
                    
                    return (
                      <View key={video.id} style={styles.listItem}>
                        <View style={styles.listItemHeader}>
                          {video.thumbnailUrl && (
                            <Image
                              source={resolveImageSource(video.thumbnailUrl)}
                              style={styles.listItemImage}
                              resizeMode="cover"
                            />
                          )}
                          <View style={styles.listItemInfo}>
                            <Text style={styles.listItemTitle}>{videoTitle}</Text>
                            <Text style={styles.listItemSubtitle}>{exclusiveLabel}</Text>
                          </View>
                        </View>
                        <View style={styles.listItemActions}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setEditingVideo(video)}
                          >
                            <IconSymbol
                              ios_icon_name="pencil"
                              android_material_icon_name="edit"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteVideo(video.id)}
                          >
                            <IconSymbol
                              ios_icon_name="trash"
                              android_material_icon_name="delete"
                              size={18}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {editingVideo && Object.keys(editingVideo).length > 0 && (
                    <View style={styles.editForm}>
                      <Text style={styles.formTitle}>
                        {editingVideo.id ? 'Edit Video' : 'Upload New Video'}
                      </Text>
                      
                      <TextInput
                        style={styles.input}
                        placeholder="Video Title *"
                        placeholderTextColor={colors.textTertiary}
                        value={editingVideo.title || ''}
                        onChangeText={(text) => setEditingVideo({ ...editingVideo, title: text })}
                      />

                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={async () => {
                          const uri = await uploadVideoFile();
                          if (uri) setEditingVideo({ ...editingVideo, videoUrl: uri });
                        }}
                        disabled={uploadingVideo}
                      >
                        {uploadingVideo ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <IconSymbol
                              ios_icon_name="play.rectangle"
                              android_material_icon_name="videocam"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.uploadButtonText}>
                              {editingVideo.videoUrl ? 'Change Video File' : 'Upload Video File *'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={async () => {
                          const uri = await uploadImage();
                          if (uri) setEditingVideo({ ...editingVideo, thumbnailUrl: uri });
                        }}
                        disabled={uploadingThumbnail}
                      >
                        {uploadingThumbnail ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <IconSymbol
                              ios_icon_name="photo"
                              android_material_icon_name="image"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.uploadButtonText}>
                              {editingVideo.thumbnailUrl ? 'Change Thumbnail' : 'Upload Thumbnail (Optional)'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setEditingVideo({ ...editingVideo, isExclusive: !editingVideo.isExclusive })}
                      >
                        <View style={[styles.checkbox, editingVideo.isExclusive && styles.checkboxChecked]}>
                          {editingVideo.isExclusive && (
                            <IconSymbol
                              ios_icon_name="checkmark"
                              android_material_icon_name="check"
                              size={16}
                              color={colors.background}
                            />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>Exclusive Release (Show in Home Tab)</Text>
                      </TouchableOpacity>

                      <View style={styles.formActions}>
                        <TouchableOpacity
                          style={[commonStyles.button, styles.saveButton]}
                          onPress={handleSaveVideo}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color={colors.background} />
                          ) : (
                            <Text style={commonStyles.buttonText}>Save</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setEditingVideo({})}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>User Management</Text>
              </View>

              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="info.circle"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.infoText}>
                  Create user accounts and manage permissions. Users with upload capability can add music and videos.
                </Text>
              </View>

              {/* Create New User Form */}
              <View style={styles.editForm}>
                <Text style={styles.formTitle}>Create New User</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Email *"
                  placeholderTextColor={colors.textTertiary}
                  value={newUser.email}
                  onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Password *"
                  placeholderTextColor={colors.textTertiary}
                  value={newUser.password}
                  onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                  secureTextEntry
                />

                <TextInput
                  style={styles.input}
                  placeholder="Name *"
                  placeholderTextColor={colors.textTertiary}
                  value={newUser.name}
                  onChangeText={(text) => setNewUser({ ...newUser, name: text })}
                />

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setNewUser({ ...newUser, isAdmin: !newUser.isAdmin })}
                >
                  <View style={[styles.checkbox, newUser.isAdmin && styles.checkboxChecked]}>
                    {newUser.isAdmin && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={16}
                        color={colors.background}
                      />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Admin Privileges</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setNewUser({ ...newUser, canUpload: !newUser.canUpload })}
                >
                  <View style={[styles.checkbox, newUser.canUpload && styles.checkboxChecked]}>
                    {newUser.canUpload && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={16}
                        color={colors.background}
                      />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Upload Capability</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[commonStyles.button, styles.saveButton]}
                  onPress={handleCreateUser}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="person.badge.plus"
                        android_material_icon_name="person-add"
                        size={20}
                        color={colors.background}
                      />
                      <Text style={commonStyles.buttonText}>Create User</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Existing Users List */}
              <Text style={styles.sectionSubtitle}>Existing Users</Text>
              
              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : (
                <>
                  {users.map((userItem) => {
                    const userName = userItem.name;
                    const userEmail = userItem.email;
                    const isAdminUser = userItem.isAdmin;
                    const canUploadUser = userItem.canUpload;
                    
                    return (
                      <View key={userItem.id} style={styles.userItem}>
                        <View style={styles.userItemHeader}>
                          <IconSymbol
                            ios_icon_name="person.circle"
                            android_material_icon_name="account-circle"
                            size={40}
                            color={colors.primary}
                          />
                          <View style={styles.userItemInfo}>
                            <Text style={styles.userItemName}>{userName}</Text>
                            <Text style={styles.userItemEmail}>{userEmail}</Text>
                            <View style={styles.userItemBadges}>
                              {isAdminUser && (
                                <View style={styles.badge}>
                                  <Text style={styles.badgeText}>Admin</Text>
                                </View>
                              )}
                              {canUploadUser && (
                                <View style={[styles.badge, styles.badgeSecondary]}>
                                  <Text style={styles.badgeText}>Can Upload</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        <View style={styles.userItemActions}>
                          <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={() => handleUpdateUserPermissions(userItem.id, { isAdmin: !isAdminUser })}
                          >
                            <IconSymbol
                              ios_icon_name="shield"
                              android_material_icon_name="security"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={() => handleUpdateUserPermissions(userItem.id, { canUpload: !canUploadUser })}
                          >
                            <IconSymbol
                              ios_icon_name="arrow.up.doc"
                              android_material_icon_name="upload"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteUser(userItem.id)}
                          >
                            <IconSymbol
                              ios_icon_name="trash"
                              android_material_icon_name="delete"
                              size={18}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* Merch Tab (existing) */}
          {activeTab === 'merch' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Manage Merch</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setEditingMerch({ stock: 0, price: 0 })}
                >
                  <IconSymbol
                    ios_icon_name="plus"
                    android_material_icon_name="add"
                    size={18}
                    color={colors.background}
                  />
                  <Text style={styles.addButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : (
                <>
                  {merchItems.map((item) => {
                    const itemName = item.name;
                    const itemPrice = `$${item.price.toFixed(2)}`;
                    const itemStock = `${item.stock} in stock`;
                    
                    return (
                      <View key={item.id} style={styles.listItem}>
                        <View style={styles.listItemHeader}>
                          {item.image_url && (
                            <Image
                              source={resolveImageSource(item.image_url)}
                              style={styles.listItemImage}
                              resizeMode="cover"
                            />
                          )}
                          <View style={styles.listItemInfo}>
                            <Text style={styles.listItemTitle}>{itemName}</Text>
                            <Text style={styles.listItemSubtitle}>{itemPrice}</Text>
                            <Text style={styles.listItemSubtitle}>{itemStock}</Text>
                          </View>
                        </View>
                        <View style={styles.listItemActions}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setEditingMerch(item)}
                          >
                            <IconSymbol
                              ios_icon_name="pencil"
                              android_material_icon_name="edit"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteMerch(item.id)}
                          >
                            <IconSymbol
                              ios_icon_name="trash"
                              android_material_icon_name="delete"
                              size={18}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {editingMerch && Object.keys(editingMerch).length > 0 && (
                    <View style={styles.editForm}>
                      <Text style={styles.formTitle}>
                        {editingMerch.id ? 'Edit Merch Item' : 'New Merch Item'}
                      </Text>
                      
                      <TextInput
                        style={styles.input}
                        placeholder="Item Name *"
                        placeholderTextColor={colors.textTertiary}
                        value={editingMerch.name || ''}
                        onChangeText={(text) => setEditingMerch({ ...editingMerch, name: text })}
                      />
                      
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Description"
                        placeholderTextColor={colors.textTertiary}
                        value={editingMerch.description || ''}
                        onChangeText={(text) => setEditingMerch({ ...editingMerch, description: text })}
                        multiline
                        numberOfLines={3}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="Price *"
                        placeholderTextColor={colors.textTertiary}
                        value={editingMerch.price?.toString() || ''}
                        onChangeText={(text) => setEditingMerch({ ...editingMerch, price: parseFloat(text) || 0 })}
                        keyboardType="decimal-pad"
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="Stock"
                        placeholderTextColor={colors.textTertiary}
                        value={editingMerch.stock?.toString() || ''}
                        onChangeText={(text) => setEditingMerch({ ...editingMerch, stock: parseInt(text) || 0 })}
                        keyboardType="number-pad"
                      />

                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={async () => {
                          const uri = await uploadImage();
                          if (uri) setEditingMerch({ ...editingMerch, image_url: uri });
                        }}
                      >
                        <IconSymbol
                          ios_icon_name="photo"
                          android_material_icon_name="image"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.uploadButtonText}>Upload Image</Text>
                      </TouchableOpacity>

                      <View style={styles.formActions}>
                        <TouchableOpacity
                          style={[commonStyles.button, styles.saveButton]}
                          onPress={handleSaveMerch}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color={colors.background} />
                          ) : (
                            <Text style={commonStyles.buttonText}>Save</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setEditingMerch({})}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Homepage Tab (existing) */}
          {activeTab === 'homepage' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Homepage Content</Text>
              
              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : (
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Hero Banner URL"
                    placeholderTextColor={colors.textTertiary}
                    value={homepageContent.hero_banner_url || ''}
                    onChangeText={(text) => setHomepageContent({ ...homepageContent, hero_banner_url: text })}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Featured Artist ID"
                    placeholderTextColor={colors.textTertiary}
                    value={homepageContent.featured_artist_id || ''}
                    onChangeText={(text) => setHomepageContent({ ...homepageContent, featured_artist_id: text })}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Featured Merch ID"
                    placeholderTextColor={colors.textTertiary}
                    value={homepageContent.featured_merch_id || ''}
                    onChangeText={(text) => setHomepageContent({ ...homepageContent, featured_merch_id: text })}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Latest Release Title"
                    placeholderTextColor={colors.textTertiary}
                    value={homepageContent.latest_release_title || ''}
                    onChangeText={(text) => setHomepageContent({ ...homepageContent, latest_release_title: text })}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Latest Release URL"
                    placeholderTextColor={colors.textTertiary}
                    value={homepageContent.latest_release_url || ''}
                    onChangeText={(text) => setHomepageContent({ ...homepageContent, latest_release_url: text })}
                  />

                  <TouchableOpacity
                    style={[commonStyles.button, styles.saveButton]}
                    onPress={handleSaveHomepage}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={commonStyles.buttonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* About Tab (existing) */}
          {activeTab === 'about' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>About Content</Text>
              
              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : (
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Logo URL"
                    placeholderTextColor={colors.textTertiary}
                    value={aboutContent.logo_url || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, logo_url: text })}
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description"
                    placeholderTextColor={colors.textTertiary}
                    value={aboutContent.description || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, description: text })}
                    multiline
                    numberOfLines={4}
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Mission"
                    placeholderTextColor={colors.textTertiary}
                    value={aboutContent.mission || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, mission: text })}
                    multiline
                    numberOfLines={4}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Contact Email"
                    placeholderTextColor={colors.textTertiary}
                    value={aboutContent.contact_email || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, contact_email: text })}
                    keyboardType="email-address"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Contact Phone"
                    placeholderTextColor={colors.textTertiary}
                    value={aboutContent.contact_phone || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, contact_phone: text })}
                    keyboardType="phone-pad"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Instagram URL"
                    placeholderTextColor={colors.textTertiary}
                    value={aboutContent.instagram_url || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, instagram_url: text })}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Twitter URL"
                    placeholderTextColor={colors.textTertiary}
                    value={aboutContent.twitter_url || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, twitter_url: text })}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Facebook URL"
                    placeholderTextColor={colors.textTertiary}
                    value={aboutContent.facebook_url || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, facebook_url: text })}
                  />

                  <TouchableOpacity
                    style={[commonStyles.button, styles.saveButton]}
                    onPress={handleSaveAbout}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={commonStyles.buttonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={modalConfig.type === 'confirm' && modalConfig.onConfirm
          ? () => {
              setModalVisible(false);
              modalConfig.onConfirm!();
            }
          : undefined
        }
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  signOutButton: {
    padding: 8,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loader: {
    marginVertical: 32,
  },
  listItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  listItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.secondary,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editForm: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  userItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  userItemInfo: {
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userItemEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  userItemBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  badgeSecondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  userItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  permissionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomPadding: {
    height: 100,
  },
});
