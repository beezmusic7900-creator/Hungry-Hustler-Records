
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Modal from '@/components/ui/Modal';
import * as ImagePicker from 'expo-image-picker';

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

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function AdminScreen() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'artists' | 'merch' | 'homepage' | 'about'>('artists');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'confirm',
    onConfirm: () => {},
  });

  const [artists, setArtists] = useState<Artist[]>([]);
  const [editingArtist, setEditingArtist] = useState<Partial<Artist> | null>(null);

  const [merchItems, setMerchItems] = useState<MerchItem[]>([]);
  const [editingMerch, setEditingMerch] = useState<Partial<MerchItem> | null>(null);

  const [homepageContent, setHomepageContent] = useState<HomepageContent>({});
  const [editingHomepage, setEditingHomepage] = useState(false);

  const [aboutContent, setAboutContent] = useState<AboutContent>({});
  const [editingAbout, setEditingAbout] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('[AdminScreen] User logged in, checking admin status');
      checkAdminStatus();
    } else {
      console.log('[AdminScreen] No user logged in');
      setLoading(false);
      setIsAdmin(false);
    }
  }, [user]);

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' | 'confirm' = 'info', onConfirm?: () => void) => {
    setModalConfig({ title, message, type, onConfirm: onConfirm || (() => {}) });
    setModalVisible(true);
  };

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      console.log('[AdminScreen] Checking admin status for user:', user?.email);
      
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ isAdmin: boolean; userId?: string }>('/api/admin/check', {});
      
      console.log('[AdminScreen] Admin check response:', response);
      setIsAdmin(response.isAdmin);
      
      if (response.isAdmin) {
        console.log('[AdminScreen] User is admin, fetching data');
        fetchArtists();
        fetchMerchItems();
        fetchHomepageContent();
        fetchAboutContent();
      } else {
        console.log('[AdminScreen] User is not admin');
      }
    } catch (error: any) {
      console.error('[AdminScreen] Error checking admin status:', error);
      setIsAdmin(false);
      
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        showModal('Session Expired', 'Your session has expired. Please sign in again.', 'error');
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        showModal('Access Denied', 'You do not have admin privileges.', 'error');
      } else {
        showModal('Error', 'Failed to verify admin status. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    try {
      console.log('[AdminScreen] Requesting image picker permissions');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showModal('Permission Required', 'Please allow access to your photo library to upload images.', 'error');
        return null;
      }

      console.log('[AdminScreen] Launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) {
        console.log('[AdminScreen] Image picker canceled');
        return null;
      }

      const asset = result.assets[0];
      console.log('[AdminScreen] Image selected:', asset.uri);

      setUploadingImage(true);

      const formData = new FormData();
      const filename = asset.uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: asset.uri,
        name: filename,
        type,
      } as any);

      console.log('[AdminScreen] Uploading image to backend');
      const { BACKEND_URL, getBearerToken } = await import('@/utils/api');
      const token = await getBearerToken();

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${BACKEND_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      console.log('[AdminScreen] Image uploaded successfully:', data.url);
      
      setUploadingImage(false);
      return data.url;
    } catch (error: any) {
      console.error('[AdminScreen] Error uploading image:', error);
      setUploadingImage(false);
      showModal('Upload Failed', error.message || 'Failed to upload image', 'error');
      return null;
    }
  };

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
    specialties: typeof artist.specialties === 'string'
      ? artist.specialties
      : Array.isArray(artist.specialties)
        ? JSON.stringify(artist.specialties)
        : '',
    status: artist.status || 'Active',
    label: artist.label || 'Hungry Hustler Records',
  });

  const fetchArtists = async () => {
    try {
      console.log('[AdminScreen] Fetching artists');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<any[]>('/api/artists');
      console.log('[AdminScreen] Artists fetched:', data?.length || 0);
      setArtists((data || []).map(normalizeArtistForAdmin));
    } catch (error) {
      console.error('[AdminScreen] Error fetching artists:', error);
      showModal('Error', 'Failed to load artists', 'error');
    }
  };

  const fetchMerchItems = async () => {
    try {
      console.log('[AdminScreen] Fetching merch items');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<MerchItem[]>('/api/merch');
      console.log('[AdminScreen] Merch items fetched:', data?.length || 0);
      setMerchItems(data || []);
    } catch (error) {
      console.error('[AdminScreen] Error fetching merch:', error);
      showModal('Error', 'Failed to load merch items', 'error');
    }
  };

  const fetchHomepageContent = async () => {
    try {
      console.log('[AdminScreen] Fetching homepage content');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<any>('/api/homepage');
      console.log('[AdminScreen] Homepage content fetched:', data);
      setHomepageContent({
        hero_banner_url: data.heroBannerUrl || data.hero_banner_url,
        featured_artist_id: data.featuredArtist?.id,
        featured_merch_id: data.featuredMerch?.id,
        latest_release_title: data.latestReleaseTitle || data.latest_release_title,
        latest_release_url: data.latestReleaseUrl || data.latest_release_url,
      });
    } catch (error) {
      console.error('[AdminScreen] Error fetching homepage content:', error);
      showModal('Error', 'Failed to load homepage content', 'error');
    }
  };

  const fetchAboutContent = async () => {
    try {
      console.log('[AdminScreen] Fetching about content');
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<any>('/api/about');
      console.log('[AdminScreen] About content fetched:', data);
      setAboutContent({
        logo_url: data.logoUrl || data.logo_url,
        description: data.description,
        mission: data.mission,
        contact_email: data.contactEmail || data.contact_email,
        contact_phone: data.contactPhone || data.contact_phone,
        instagram_url: data.instagramUrl || data.instagram_url,
        twitter_url: data.twitterUrl || data.twitter_url,
        facebook_url: data.facebookUrl || data.facebook_url,
      });
    } catch (error) {
      console.error('[AdminScreen] Error fetching about content:', error);
      showModal('Error', 'Failed to load about content', 'error');
    }
  };

  const handleSaveArtist = async () => {
    if (!editingArtist?.name) {
      showModal('Error', 'Artist name is required', 'error');
      return;
    }

    if (editingArtist.specialties && editingArtist.specialties.trim()) {
      try {
        const parsed = JSON.parse(editingArtist.specialties);
        if (!Array.isArray(parsed)) {
          showModal('Error', 'Specialties must be a JSON array, e.g. ["Recording Artist","Songwriter"]', 'error');
          return;
        }
      } catch {
        showModal('Error', 'Specialties must be valid JSON, e.g. ["Recording Artist","Songwriter"]', 'error');
        return;
      }
    }

    try {
      console.log('[AdminScreen] Saving artist:', editingArtist.name);
      const { authenticatedPost, authenticatedPut } = await import('@/utils/api');

      const payload = {
        name: editingArtist.name,
        bio: editingArtist.bio || null,
        photo_url: editingArtist.photo_url || null,
        spotify_url: editingArtist.spotify_url || null,
        apple_music_url: editingArtist.apple_music_url || null,
        youtube_url: editingArtist.youtube_url || null,
        soundcloud_url: editingArtist.soundcloud_url || null,
        instagram_url: editingArtist.instagram_url || null,
        twitter_url: editingArtist.twitter_url || null,
        specialties: editingArtist.specialties?.trim() || null,
        status: editingArtist.status?.trim() || 'Active',
        label: editingArtist.label?.trim() || 'Hungry Hustler Records',
      };

      console.log('[AdminScreen] Artist payload:', payload);
      
      if (editingArtist.id) {
        await authenticatedPut(`/api/admin/artists/${editingArtist.id}`, payload);
        showModal('Success', 'Artist updated successfully', 'success');
      } else {
        await authenticatedPost('/api/admin/artists', payload);
        showModal('Success', 'Artist created successfully', 'success');
      }
      
      setEditingArtist(null);
      fetchArtists();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving artist:', error);
      showModal('Error', error.message || 'Failed to save artist', 'error');
    }
  };

  const handleDeleteArtist = async (id: string) => {
    showModal(
      'Confirm Delete',
      'Are you sure you want to delete this artist?',
      'confirm',
      async () => {
        try {
          console.log('[AdminScreen] Deleting artist:', id);
          const { authenticatedDelete } = await import('@/utils/api');
          await authenticatedDelete(`/api/admin/artists/${id}`);
          showModal('Success', 'Artist deleted successfully', 'success');
          fetchArtists();
        } catch (error: any) {
          console.error('[AdminScreen] Error deleting artist:', error);
          showModal('Error', error.message || 'Failed to delete artist', 'error');
        }
      }
    );
  };

  const handleSaveMerch = async () => {
    if (!editingMerch?.name || !editingMerch?.price) {
      showModal('Error', 'Merch name and price are required', 'error');
      return;
    }

    try {
      console.log('[AdminScreen] Saving merch:', editingMerch.name);
      const { authenticatedPost, authenticatedPut } = await import('@/utils/api');
      
      if (editingMerch.id) {
        await authenticatedPut(`/api/admin/merch/${editingMerch.id}`, editingMerch);
        showModal('Success', 'Merch item updated successfully', 'success');
      } else {
        await authenticatedPost('/api/admin/merch', editingMerch);
        showModal('Success', 'Merch item created successfully', 'success');
      }
      
      setEditingMerch(null);
      fetchMerchItems();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving merch:', error);
      showModal('Error', error.message || 'Failed to save merch item', 'error');
    }
  };

  const handleDeleteMerch = async (id: string) => {
    showModal(
      'Confirm Delete',
      'Are you sure you want to delete this merch item?',
      'confirm',
      async () => {
        try {
          console.log('[AdminScreen] Deleting merch:', id);
          const { authenticatedDelete } = await import('@/utils/api');
          await authenticatedDelete(`/api/admin/merch/${id}`);
          showModal('Success', 'Merch item deleted successfully', 'success');
          fetchMerchItems();
        } catch (error: any) {
          console.error('[AdminScreen] Error deleting merch:', error);
          showModal('Error', error.message || 'Failed to delete merch item', 'error');
        }
      }
    );
  };

  const handleSaveHomepage = async () => {
    try {
      console.log('[AdminScreen] Saving homepage content');
      const { authenticatedPut } = await import('@/utils/api');
      
      await authenticatedPut('/api/admin/homepage', homepageContent);
      showModal('Success', 'Homepage content updated successfully', 'success');
      setEditingHomepage(false);
      fetchHomepageContent();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving homepage content:', error);
      showModal('Error', error.message || 'Failed to save homepage content', 'error');
    }
  };

  const handleSaveAbout = async () => {
    try {
      console.log('[AdminScreen] Saving about content');
      const { authenticatedPut } = await import('@/utils/api');
      
      await authenticatedPut('/api/admin/about', aboutContent);
      showModal('Success', 'About content updated successfully', 'success');
      setEditingAbout(false);
      fetchAboutContent();
    } catch (error: any) {
      console.error('[AdminScreen] Error saving about content:', error);
      showModal('Error', error.message || 'Failed to save about content', 'error');
    }
  };

  const handleSignOut = async () => {
    showModal(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      'confirm',
      async () => {
        console.log('[AdminScreen] User signing out');
        await signOut();
        router.replace('/auth');
      }
    );
  };

  const paddingTop = Platform.OS === 'android' ? 48 : 0;

  if (authLoading || loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={commonStyles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <IconSymbol
            ios_icon_name="lock"
            android_material_icon_name="lock"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>Admin Access Required</Text>
          <Text style={styles.emptyText}>Please sign in to access the admin panel</Text>
          <TouchableOpacity
            style={commonStyles.button}
            onPress={() => router.push('/auth')}
          >
            <Text style={commonStyles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={commonStyles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={64}
            color={colors.error}
          />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptyText}>
            You don&apos;t have admin privileges. Please contact the administrator.
          </Text>
          <Text style={styles.userEmail}>Signed in as: {user.email}</Text>
          <TouchableOpacity
            style={[commonStyles.button, { backgroundColor: colors.error }]}
            onPress={handleSignOut}
          >
            <Text style={commonStyles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ADMIN PANEL</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'artists' && styles.tabActive]}
            onPress={() => setActiveTab('artists')}
          >
            <Text style={[styles.tabText, activeTab === 'artists' && styles.tabTextActive]}>
              Artists
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
        </View>

        {activeTab === 'artists' && (
          <View style={styles.content}>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={[commonStyles.button, styles.quickActionButton]}
                onPress={() => router.push('/add-artists-helper')}
              >
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name="auto-awesome"
                  size={20}
                  color={colors.background}
                />
                <Text style={commonStyles.buttonText}>Quick Add: Afroman & OG Daddy V</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={commonStyles.button}
                onPress={() => setEditingArtist({})}
              >
                <Text style={commonStyles.buttonText}>Add New Artist</Text>
              </TouchableOpacity>
            </View>

            {editingArtist && (
              <View style={[commonStyles.card, styles.editForm]}>
                <Text style={styles.formTitle}>
                  {editingArtist.id ? 'Edit Artist' : 'New Artist'}
                </Text>
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="Name *"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.name || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, name: text })}
                />
                
                <TextInput
                  style={[commonStyles.input, styles.textArea]}
                  placeholder="Bio"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.bio || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, bio: text })}
                  multiline
                  numberOfLines={4}
                />
                
                <View style={styles.imageUploadContainer}>
                  <TextInput
                    style={[commonStyles.input, { flex: 1 }]}
                    placeholder="Photo URL"
                    placeholderTextColor={colors.textSecondary}
                    value={editingArtist.photo_url || ''}
                    onChangeText={(text) => setEditingArtist({ ...editingArtist, photo_url: text })}
                  />
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={async () => {
                      const url = await uploadImage();
                      if (url) {
                        setEditingArtist({ ...editingArtist, photo_url: url });
                      }
                    }}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="image"
                        size={20}
                        color={colors.background}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {editingArtist.photo_url && (
                  <Image
                    source={resolveImageSource(editingArtist.photo_url)}
                    style={styles.previewImage}
                  />
                )}
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="Spotify URL"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.spotify_url || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, spotify_url: text })}
                />
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="Apple Music URL"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.apple_music_url || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, apple_music_url: text })}
                />
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="YouTube URL"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.youtube_url || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, youtube_url: text })}
                />
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="SoundCloud URL"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.soundcloud_url || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, soundcloud_url: text })}
                />
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="Instagram URL"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.instagram_url || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, instagram_url: text })}
                />
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="Twitter URL"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.twitter_url || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, twitter_url: text })}
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder='Specialties (JSON array, e.g. ["Recording Artist","Songwriter"])'
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.specialties || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, specialties: text })}
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Status (e.g. Active or Inactive)"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.status || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, status: text })}
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Label (e.g. Hungry Hustler Records)"
                  placeholderTextColor={colors.textSecondary}
                  value={editingArtist.label || ''}
                  onChangeText={(text) => setEditingArtist({ ...editingArtist, label: text })}
                />

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[commonStyles.button, styles.cancelButton]}
                    onPress={() => setEditingArtist(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[commonStyles.button, styles.saveButton]}
                    onPress={handleSaveArtist}
                  >
                    <Text style={commonStyles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {artists.length === 0 && !editingArtist && (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="person.3"
                  android_material_icon_name="group"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyStateText}>No artists yet</Text>
                <Text style={styles.emptyStateSubtext}>Add your first artist to get started</Text>
              </View>
            )}

            {artists.map((artist, index) => (
              <View key={artist.id || index} style={commonStyles.card}>
                <Text style={styles.itemName}>{artist.name}</Text>
                {artist.status && (
                  <Text style={styles.itemDescription}>
                    Status: {artist.status} · {artist.label || 'Hungry Hustler Records'}
                  </Text>
                )}
                {artist.bio && <Text style={styles.itemDescription}>{artist.bio}</Text>}
                {artist.specialties && (
                  <Text style={styles.itemDescription}>
                    Specialties: {(() => {
                      try {
                        const parsed = JSON.parse(artist.specialties);
                        return Array.isArray(parsed) ? parsed.join(', ') : artist.specialties;
                      } catch {
                        return artist.specialties;
                      }
                    })()}
                  </Text>
                )}
                
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setEditingArtist(artist)}
                  >
                    <IconSymbol
                      ios_icon_name="pencil"
                      android_material_icon_name="edit"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteArtist(artist.id)}
                  >
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.error}
                    />
                    <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'merch' && (
          <View style={styles.content}>
            <TouchableOpacity
              style={commonStyles.button}
              onPress={() => setEditingMerch({ stock: 0, price: 0 })}
            >
              <Text style={commonStyles.buttonText}>Add New Merch</Text>
            </TouchableOpacity>

            {editingMerch && (
              <View style={[commonStyles.card, styles.editForm]}>
                <Text style={styles.formTitle}>
                  {editingMerch.id ? 'Edit Merch' : 'New Merch'}
                </Text>
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="Name *"
                  placeholderTextColor={colors.textSecondary}
                  value={editingMerch.name || ''}
                  onChangeText={(text) => setEditingMerch({ ...editingMerch, name: text })}
                />
                
                <TextInput
                  style={[commonStyles.input, styles.textArea]}
                  placeholder="Description"
                  placeholderTextColor={colors.textSecondary}
                  value={editingMerch.description || ''}
                  onChangeText={(text) => setEditingMerch({ ...editingMerch, description: text })}
                  multiline
                  numberOfLines={4}
                />
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="Price *"
                  placeholderTextColor={colors.textSecondary}
                  value={editingMerch.price?.toString() || ''}
                  onChangeText={(text) => setEditingMerch({ ...editingMerch, price: parseFloat(text) || 0 })}
                  keyboardType="decimal-pad"
                />
                
                <View style={styles.imageUploadContainer}>
                  <TextInput
                    style={[commonStyles.input, { flex: 1 }]}
                    placeholder="Image URL"
                    placeholderTextColor={colors.textSecondary}
                    value={editingMerch.image_url || ''}
                    onChangeText={(text) => setEditingMerch({ ...editingMerch, image_url: text })}
                  />
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={async () => {
                      const url = await uploadImage();
                      if (url) {
                        setEditingMerch({ ...editingMerch, image_url: url });
                      }
                    }}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="image"
                        size={20}
                        color={colors.background}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {editingMerch.image_url && (
                  <Image
                    source={resolveImageSource(editingMerch.image_url)}
                    style={styles.previewImage}
                  />
                )}
                
                <TextInput
                  style={commonStyles.input}
                  placeholder="Stock"
                  placeholderTextColor={colors.textSecondary}
                  value={editingMerch.stock?.toString() || '0'}
                  onChangeText={(text) => setEditingMerch({ ...editingMerch, stock: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                />

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[commonStyles.button, styles.cancelButton]}
                    onPress={() => setEditingMerch(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[commonStyles.button, styles.saveButton]}
                    onPress={handleSaveMerch}
                  >
                    <Text style={commonStyles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {merchItems.length === 0 && !editingMerch && (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="bag"
                  android_material_icon_name="shopping-bag"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyStateText}>No merch items yet</Text>
                <Text style={styles.emptyStateSubtext}>Add your first merch item to get started</Text>
              </View>
            )}

            {merchItems.map((item, index) => (
              <View key={item.id || index} style={commonStyles.card}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                {item.description && <Text style={styles.itemDescription}>{item.description}</Text>}
                <Text style={styles.itemStock}>Stock: {item.stock}</Text>
                
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setEditingMerch(item)}
                  >
                    <IconSymbol
                      ios_icon_name="pencil"
                      android_material_icon_name="edit"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteMerch(item.id)}
                  >
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.error}
                    />
                    <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'homepage' && (
          <View style={styles.content}>
            <TouchableOpacity
              style={commonStyles.button}
              onPress={() => setEditingHomepage(true)}
            >
              <Text style={commonStyles.buttonText}>Edit Homepage Content</Text>
            </TouchableOpacity>

            {editingHomepage ? (
              <View style={[commonStyles.card, styles.editForm]}>
                <Text style={styles.formTitle}>Edit Homepage</Text>
                
                <View style={styles.imageUploadContainer}>
                  <TextInput
                    style={[commonStyles.input, { flex: 1 }]}
                    placeholder="Hero Banner URL"
                    placeholderTextColor={colors.textSecondary}
                    value={homepageContent.hero_banner_url || ''}
                    onChangeText={(text) => setHomepageContent({ ...homepageContent, hero_banner_url: text })}
                  />
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={async () => {
                      const url = await uploadImage();
                      if (url) {
                        setHomepageContent({ ...homepageContent, hero_banner_url: url });
                      }
                    }}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="image"
                        size={20}
                        color={colors.background}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {homepageContent.hero_banner_url && (
                  <Image
                    source={resolveImageSource(homepageContent.hero_banner_url)}
                    style={styles.previewImage}
                  />
                )}

                <Text style={styles.fieldLabel}>Featured Artist ID (optional)</Text>
                <TextInput
                  style={commonStyles.input}
                  placeholder="Artist ID"
                  placeholderTextColor={colors.textSecondary}
                  value={homepageContent.featured_artist_id || ''}
                  onChangeText={(text) => setHomepageContent({ ...homepageContent, featured_artist_id: text })}
                />

                <Text style={styles.fieldLabel}>Featured Merch ID (optional)</Text>
                <TextInput
                  style={commonStyles.input}
                  placeholder="Merch ID"
                  placeholderTextColor={colors.textSecondary}
                  value={homepageContent.featured_merch_id || ''}
                  onChangeText={(text) => setHomepageContent({ ...homepageContent, featured_merch_id: text })}
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Latest Release Title"
                  placeholderTextColor={colors.textSecondary}
                  value={homepageContent.latest_release_title || ''}
                  onChangeText={(text) => setHomepageContent({ ...homepageContent, latest_release_title: text })}
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Latest Release URL"
                  placeholderTextColor={colors.textSecondary}
                  value={homepageContent.latest_release_url || ''}
                  onChangeText={(text) => setHomepageContent({ ...homepageContent, latest_release_url: text })}
                />

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[commonStyles.button, styles.cancelButton]}
                    onPress={() => {
                      setEditingHomepage(false);
                      fetchHomepageContent();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[commonStyles.button, styles.saveButton]}
                    onPress={handleSaveHomepage}
                  >
                    <Text style={commonStyles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={commonStyles.card}>
                <Text style={styles.sectionTitle}>Current Homepage Content</Text>
                
                {homepageContent.hero_banner_url && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Hero Banner:</Text>
                    <Image
                      source={resolveImageSource(homepageContent.hero_banner_url)}
                      style={styles.thumbnailImage}
                    />
                  </View>
                )}

                {homepageContent.featured_artist_id && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Featured Artist ID:</Text>
                    <Text style={styles.contentValue}>{homepageContent.featured_artist_id}</Text>
                  </View>
                )}

                {homepageContent.featured_merch_id && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Featured Merch ID:</Text>
                    <Text style={styles.contentValue}>{homepageContent.featured_merch_id}</Text>
                  </View>
                )}

                {homepageContent.latest_release_title && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Latest Release:</Text>
                    <Text style={styles.contentValue}>{homepageContent.latest_release_title}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.content}>
            <TouchableOpacity
              style={commonStyles.button}
              onPress={() => setEditingAbout(true)}
            >
              <Text style={commonStyles.buttonText}>Edit About Content</Text>
            </TouchableOpacity>

            {editingAbout ? (
              <View style={[commonStyles.card, styles.editForm]}>
                <Text style={styles.formTitle}>Edit About Page</Text>
                
                <View style={styles.imageUploadContainer}>
                  <TextInput
                    style={[commonStyles.input, { flex: 1 }]}
                    placeholder="Logo URL"
                    placeholderTextColor={colors.textSecondary}
                    value={aboutContent.logo_url || ''}
                    onChangeText={(text) => setAboutContent({ ...aboutContent, logo_url: text })}
                  />
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={async () => {
                      const url = await uploadImage();
                      if (url) {
                        setAboutContent({ ...aboutContent, logo_url: url });
                      }
                    }}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <IconSymbol
                        ios_icon_name="photo"
                        android_material_icon_name="image"
                        size={20}
                        color={colors.background}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {aboutContent.logo_url && (
                  <Image
                    source={resolveImageSource(aboutContent.logo_url)}
                    style={styles.previewImage}
                  />
                )}

                <TextInput
                  style={[commonStyles.input, styles.textArea]}
                  placeholder="Description"
                  placeholderTextColor={colors.textSecondary}
                  value={aboutContent.description || ''}
                  onChangeText={(text) => setAboutContent({ ...aboutContent, description: text })}
                  multiline
                  numberOfLines={4}
                />

                <TextInput
                  style={[commonStyles.input, styles.textArea]}
                  placeholder="Mission"
                  placeholderTextColor={colors.textSecondary}
                  value={aboutContent.mission || ''}
                  onChangeText={(text) => setAboutContent({ ...aboutContent, mission: text })}
                  multiline
                  numberOfLines={4}
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Contact Email"
                  placeholderTextColor={colors.textSecondary}
                  value={aboutContent.contact_email || ''}
                  onChangeText={(text) => setAboutContent({ ...aboutContent, contact_email: text })}
                  keyboardType="email-address"
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Contact Phone"
                  placeholderTextColor={colors.textSecondary}
                  value={aboutContent.contact_phone || ''}
                  onChangeText={(text) => setAboutContent({ ...aboutContent, contact_phone: text })}
                  keyboardType="phone-pad"
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Instagram URL"
                  placeholderTextColor={colors.textSecondary}
                  value={aboutContent.instagram_url || ''}
                  onChangeText={(text) => setAboutContent({ ...aboutContent, instagram_url: text })}
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Twitter URL"
                  placeholderTextColor={colors.textSecondary}
                  value={aboutContent.twitter_url || ''}
                  onChangeText={(text) => setAboutContent({ ...aboutContent, twitter_url: text })}
                />

                <TextInput
                  style={commonStyles.input}
                  placeholder="Facebook URL"
                  placeholderTextColor={colors.textSecondary}
                  value={aboutContent.facebook_url || ''}
                  onChangeText={(text) => setAboutContent({ ...aboutContent, facebook_url: text })}
                />

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[commonStyles.button, styles.cancelButton]}
                    onPress={() => {
                      setEditingAbout(false);
                      fetchAboutContent();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[commonStyles.button, styles.saveButton]}
                    onPress={handleSaveAbout}
                  >
                    <Text style={commonStyles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={commonStyles.card}>
                <Text style={styles.sectionTitle}>Current About Content</Text>
                
                {aboutContent.logo_url && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Logo:</Text>
                    <Image
                      source={resolveImageSource(aboutContent.logo_url)}
                      style={styles.thumbnailImage}
                    />
                  </View>
                )}

                {aboutContent.description && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Description:</Text>
                    <Text style={styles.contentValue}>{aboutContent.description}</Text>
                  </View>
                )}

                {aboutContent.mission && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Mission:</Text>
                    <Text style={styles.contentValue}>{aboutContent.mission}</Text>
                  </View>
                )}

                {aboutContent.contact_email && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Email:</Text>
                    <Text style={styles.contentValue}>{aboutContent.contact_email}</Text>
                  </View>
                )}

                {aboutContent.contact_phone && (
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Phone:</Text>
                    <Text style={styles.contentValue}>{aboutContent.contact_phone}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  editForm: {
    marginTop: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  itemStock: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomPadding: {
    height: 100,
  },
  quickActionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 255, 102, 0.3)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  imageUploadContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: colors.secondary,
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.secondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  contentItem: {
    marginBottom: 16,
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contentValue: {
    fontSize: 14,
    color: colors.text,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    marginTop: 8,
  },
});
