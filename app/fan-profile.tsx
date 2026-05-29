import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Music,
  ShoppingBag,
  LogOut,
  User,
  Heart,
  Pencil,
  Trophy,
  Camera,
  Bell,
  Star,
  Clock,
  CheckCircle,
  Lock,
  Mic2,
  Search,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabasePublic } from '@/integrations/supabase/client';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic = supabasePublic as any;

interface FavoriteItem {
  id: string;
  item_type: string;
  item_id: string;
  created_at: string;
}

interface SongDetail {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
}

interface MerchDetail {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface BadgeDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface ArtistOption {
  id: string;
  name: string;
  image_url: string | null;
}

interface SongOption {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function FanProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, signOut } = useAuth();
  const { playSong } = useAudioPlayer();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [songs, setSongs] = useState<SongDetail[]>([]);
  const [merch, setMerch] = useState<MerchDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Favorite artist / song
  const [favoriteArtistId, setFavoriteArtistId] = useState<string | null>(null);
  const [favoriteSongId, setFavoriteSongId] = useState<string | null>(null);
  const [favoriteArtist, setFavoriteArtist] = useState<ArtistOption | null>(null);
  const [favoriteSong, setFavoriteSong] = useState<SongOption | null>(null);

  // Picker modals
  const [showArtistPicker, setShowArtistPicker] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [artistOptions, setArtistOptions] = useState<ArtistOption[]>([]);
  const [songOptions, setSongOptions] = useState<SongOption[]>([]);
  const [artistSearch, setArtistSearch] = useState('');
  const [songSearch, setSongSearch] = useState('');
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);

  // Rewards
  const [rewardsSummary, setRewardsSummary] = useState<{
    total_points: number;
    level: string;
    current_streak: number;
    longest_streak: number;
  } | null>(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  // Badges
  const [badges, setBadges] = useState<BadgeDetail[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDetail | null>(null);

  // Activity feed
  const [activityFeed, setActivityFeed] = useState<{ id: string; activity_type: string; target_label: string | null; created_at: string }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadProfile();
      loadRewardsSummary();
      loadActivityFeed();
      // NOTE: Daily login points are now awarded intentionally via the Check-In button on fan-rewards.tsx
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadRewardsSummary = async () => {
    if (!user) return;
    try {
      setRewardsLoading(true);
      console.log('[FanProfile] Loading rewards summary for user:', user.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-rewards`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      console.log('[FanProfile] Rewards summary loaded:', json);
      setRewardsSummary({
        total_points: json.total_points ?? 0,
        level: json.level ?? 'Fan',
        current_streak: json.current_streak ?? 0,
        longest_streak: json.longest_streak ?? 0,
      });

      // Extract badges
      const userBadges = (json.user_badges ?? []) as BadgeDetail[];
      setBadges(userBadges);
    } catch (err) {
      console.error('[FanProfile] loadRewardsSummary error:', err);
    } finally {
      setRewardsLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    try {
      console.log('[FanProfile] Loading profile for user:', user.id);
      const { data } = await db
        .from('fan_profiles')
        .select('display_name, username, bio, avatar_url, favorite_artist_id, favorite_song_id')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? '');
        setUsername(data.username ?? '');
        setBio(data.bio ?? '');
        setAvatarUrl(data.avatar_url ?? null);
        const artId = data.favorite_artist_id ?? null;
        const sngId = data.favorite_song_id ?? null;
        setFavoriteArtistId(artId);
        setFavoriteSongId(sngId);
        console.log('[FanProfile] Profile loaded, fav artist:', artId, 'fav song:', sngId);

        // Load favorite artist/song details
        if (artId) {
          dbPublic.from('artists').select('id, name, image_url').eq('id', artId).maybeSingle()
            .then(({ data: a }: { data: ArtistOption | null }) => {
              if (a) setFavoriteArtist(a);
            });
        }
        if (sngId) {
          dbPublic.from('songs').select('id, title, artist, cover_url').eq('id', sngId).maybeSingle()
            .then(({ data: s }: { data: SongOption | null }) => {
              if (s) setFavoriteSong(s);
            });
        }
      }
    } catch (err) {
      console.error('[FanProfile] loadProfile error:', err);
    }
  };

  const loadActivityFeed = async () => {
    if (!user) return;
    try {
      setActivityLoading(true);
      console.log('[FanProfile] Loading activity feed for user:', user.id);
      const { data, error } = await db
        .from('activity_feed')
        .select('id, activity_type, target_label, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[FanProfile] Activity feed error:', error.message);
      } else {
        setActivityFeed(data ?? []);
        console.log('[FanProfile] Loaded', (data ?? []).length, 'activity entries');
      }
    } catch (err) {
      console.error('[FanProfile] loadActivityFeed error:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!user) return;
    console.log('[FanProfile] Pick avatar pressed');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      console.log('[FanProfile] Avatar selected:', asset.uri);
      setUploadingAvatar(true);

      const timestamp = Date.now();
      const path = `${user.id}/avatar-${timestamp}.jpg`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.error('[FanProfile] Avatar upload error:', uploadError.message);
        Alert.alert('Upload Failed', uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      console.log('[FanProfile] Avatar uploaded, public URL:', publicUrl);

      await db.from('fan_profiles').upsert({
        id: user.id,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

      setAvatarUrl(publicUrl);
      Alert.alert('Success', 'Avatar updated!');
    } catch (err) {
      console.error('[FanProfile] handlePickAvatar error:', err);
      Alert.alert('Error', 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    console.log('[FanProfile] Save profile pressed');
    setSavingProfile(true);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (username.trim() && cleanUsername !== username.trim()) {
      Alert.alert('Invalid Username', 'Username can only contain lowercase letters, numbers, and underscores.');
      setSavingProfile(false);
      return;
    }

    try {
      const { error: upsertErr } = await db
        .from('fan_profiles')
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          username: cleanUsername || null,
          bio: bio.trim(),
          updated_at: new Date().toISOString(),
        });

      if (upsertErr) {
        console.error('[FanProfile] Save profile error:', upsertErr.message);
        if (upsertErr.message?.includes('unique') || upsertErr.code === '23505') {
          Alert.alert('Username Taken', 'That username is already in use. Please choose another.');
        } else {
          Alert.alert('Error', upsertErr.message);
        }
      } else {
        console.log('[FanProfile] Profile saved successfully');
        setEditingProfile(false);
        Alert.alert('Saved', 'Profile updated.');
      }
    } catch (err) {
      console.error('[FanProfile] handleSaveProfile error:', err);
      Alert.alert('Error', 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[FanProfile] Loading favorites for user:', user.id);
      setLoading(true);

      const { data: favData, error: favErr } = await db
        .from('favorites')
        .select('id, item_type, item_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (favErr) {
        console.error('[FanProfile] Favorites error:', favErr.message);
        return;
      }

      const favs = (favData ?? []) as FavoriteItem[];
      setFavorites(favs);

      const songIds = favs.filter(f => f.item_type === 'song').map(f => f.item_id);
      const merchIds = favs.filter(f => f.item_type === 'merch').map(f => f.item_id);

      const [songRes, merchRes] = await Promise.all([
        songIds.length > 0
          ? dbPublic.from('songs').select('id, title, artist, cover_url').in('id', songIds)
          : Promise.resolve({ data: [] }),
        merchIds.length > 0
          ? dbPublic.from('merch').select('id, name, price, image_url').in('id', merchIds)
          : Promise.resolve({ data: [] }),
      ]);

      setSongs((songRes.data ?? []) as SongDetail[]);
      setMerch((merchRes.data ?? []) as MerchDetail[]);
      console.log('[FanProfile] Loaded', songIds.length, 'song favs,', merchIds.length, 'merch favs');
    } catch (err) {
      console.error('[FanProfile] loadFavorites error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFavorites(), loadProfile(), loadRewardsSummary(), loadActivityFeed()]);
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    console.log('[FanProfile] Sign out pressed');
    await signOut();
    router.replace('/(tabs)/(home)');
  };

  // ── Favorite artist/song pickers ──

  const openArtistPicker = async () => {
    console.log('[FanProfile] Open artist picker');
    setShowArtistPicker(true);
    setArtistSearch('');
    if (artistOptions.length > 0) return;
    setLoadingArtists(true);
    try {
      const { data } = await dbPublic
        .from('artists')
        .select('id, name, image_url')
        .order('name');
      setArtistOptions((data ?? []) as ArtistOption[]);
      console.log('[FanProfile] Loaded', (data ?? []).length, 'artists for picker');
    } catch (err) {
      console.error('[FanProfile] openArtistPicker error:', err);
    } finally {
      setLoadingArtists(false);
    }
  };

  const openSongPicker = async () => {
    console.log('[FanProfile] Open song picker');
    setShowSongPicker(true);
    setSongSearch('');
    if (songOptions.length > 0) return;
    setLoadingSongs(true);
    try {
      const { data } = await dbPublic
        .from('songs')
        .select('id, title, artist, cover_url')
        .order('title');
      setSongOptions((data ?? []) as SongOption[]);
      console.log('[FanProfile] Loaded', (data ?? []).length, 'songs for picker');
    } catch (err) {
      console.error('[FanProfile] openSongPicker error:', err);
    } finally {
      setLoadingSongs(false);
    }
  };

  const selectArtist = async (artist: ArtistOption) => {
    console.log('[FanProfile] Artist selected:', artist.name, artist.id);
    setShowArtistPicker(false);
    setFavoriteArtistId(artist.id);
    setFavoriteArtist(artist);
    await saveFavoriteFields(artist.id, favoriteSongId);
  };

  const selectSong = async (song: SongOption) => {
    console.log('[FanProfile] Song selected:', song.title, song.id);
    setShowSongPicker(false);
    setFavoriteSongId(song.id);
    setFavoriteSong(song);
    await saveFavoriteFields(favoriteArtistId, song.id);
  };

  const clearFavoriteArtist = async () => {
    console.log('[FanProfile] Clear favorite artist');
    setFavoriteArtistId(null);
    setFavoriteArtist(null);
    await saveFavoriteFields(null, favoriteSongId);
  };

  const clearFavoriteSong = async () => {
    console.log('[FanProfile] Clear favorite song');
    setFavoriteSongId(null);
    setFavoriteSong(null);
    await saveFavoriteFields(favoriteArtistId, null);
  };

  const saveFavoriteFields = async (artistId: string | null, songId: string | null) => {
    if (!user) return;
    setSavingFavorites(true);
    try {
      console.log('[FanProfile] Saving favorites — artist:', artistId, 'song:', songId);
      const { error } = await db.from('fan_profiles').upsert({
        id: user.id,
        favorite_artist_id: artistId,
        favorite_song_id: songId,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error('[FanProfile] saveFavoriteFields error:', error.message);
      } else {
        console.log('[FanProfile] Favorites saved successfully');
      }
    } catch (err) {
      console.error('[FanProfile] saveFavoriteFields error:', err);
    } finally {
      setSavingFavorites(false);
    }
  };

  const filteredArtists = artistOptions.filter(a =>
    a.name.toLowerCase().includes(artistSearch.toLowerCase())
  );
  const filteredSongs = songOptions.filter(s =>
    s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
    s.artist.toLowerCase().includes(songSearch.toLowerCase())
  );

  // Not logged in state
  if (!authLoading && !user) {
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
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          <User size={32} color={COLORS.primary} />
        </View>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 22,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          Fan Account
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
            maxWidth: 260,
          }}
        >
          Sign in to save favorites and stay connected with HHR
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[FanProfile] Navigate to fan-auth');
            router.push('/fan-auth');
          }}
          style={{ marginTop: 28, width: '100%' }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
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
              Sign In to Save Favorites
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  const userEmail = user?.email ?? '';
  const userName = user?.name ?? '';
  const bioCharCount = bio.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 80,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* Avatar */}
          <AnimatedPressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: COLORS.primary,
                overflow: 'hidden',
              }}
            >
              {avatarUrl ? (
                <Image
                  source={resolveImageSource(avatarUrl)}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                  resizeMode="cover"
                />
              ) : (
                <User size={28} color={COLORS.primary} />
              )}
              {/* Camera overlay */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={12} color={COLORS.background} />
              </View>
            </View>
          </AnimatedPressable>

          <View>
            {userName ? (
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>
                {userName}
              </Text>
            ) : null}
            {displayName ? (
              <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600', marginTop: 1 }}>
                {displayName}
              </Text>
            ) : null}
            {username ? (
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 1 }}>
                @{username}
              </Text>
            ) : null}
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
              {userEmail}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Edit profile button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[FanProfile] Edit profile pressed');
              setEditingProfile(true);
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Pencil size={16} color={COLORS.textSecondary} />
            </View>
          </AnimatedPressable>

          {/* Sign out */}
          <AnimatedPressable onPress={handleSignOut}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 68, 68, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 68, 68, 0.3)',
              }}
            >
              <LogOut size={18} color={COLORS.danger} />
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Bio display */}
      {bio ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 }}>
            {bio}
          </Text>
        </View>
      ) : null}

      {/* ── Favorites (artist + song) ── */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Heart size={16} color={COLORS.primary} fill={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
            My Favorites
          </Text>
        </View>

        {/* Favorite Artist */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 }}>
          FAVORITE ARTIST
        </Text>
        {favoriteArtist ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AnimatedPressable
              onPress={() => {
                console.log('[FanProfile] Favorite artist tapped — navigate to artist:', favoriteArtist.id);
                router.push(`/artist/${favoriteArtist.id}`);
              }}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                {favoriteArtist.image_url ? (
                  <Image
                    source={resolveImageSource(favoriteArtist.image_url)}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Mic2 size={18} color={COLORS.primary} />
                  </View>
                )}
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {favoriteArtist.name}
                </Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable onPress={clearFavoriteArtist}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <X size={14} color={COLORS.textSecondary} />
              </View>
            </AnimatedPressable>
          </View>
        ) : (
          <AnimatedPressable onPress={openArtistPicker} style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderStyle: 'dashed',
              }}
            >
              <Mic2 size={16} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>
                Pick a favorite artist...
              </Text>
            </View>
          </AnimatedPressable>
        )}

        {/* Favorite Song */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 }}>
          FAVORITE SONG
        </Text>
        {favoriteSong ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AnimatedPressable
              onPress={() => {
                console.log('[FanProfile] Favorite song tapped — play:', favoriteSong.title);
                playSong({
                  id: favoriteSong.id,
                  title: favoriteSong.title,
                  artist: favoriteSong.artist,
                  cover_url: favoriteSong.cover_url,
                  audio_url: null,
                });
              }}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                {favoriteSong.cover_url ? (
                  <Image
                    source={resolveImageSource(favoriteSong.cover_url)}
                    style={{ width: 40, height: 40, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Music size={18} color={COLORS.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                    {favoriteSong.title}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                    {favoriteSong.artist}
                  </Text>
                </View>
              </View>
            </AnimatedPressable>
            <AnimatedPressable onPress={clearFavoriteSong}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <X size={14} color={COLORS.textSecondary} />
              </View>
            </AnimatedPressable>
          </View>
        ) : (
          <AnimatedPressable onPress={openSongPicker}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderStyle: 'dashed',
              }}
            >
              <Music size={16} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>
                Pick a favorite song...
              </Text>
            </View>
          </AnimatedPressable>
        )}

        {/* Edit favorites button when both are set */}
        {(favoriteArtist || favoriteSong) && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {!favoriteArtist && (
              <AnimatedPressable onPress={openArtistPicker} style={{ flex: 1 }}>
                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                    + Artist
                  </Text>
                </View>
              </AnimatedPressable>
            )}
            {!favoriteSong && (
              <AnimatedPressable onPress={openSongPicker} style={{ flex: 1 }}>
                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                    + Song
                  </Text>
                </View>
              </AnimatedPressable>
            )}
          </View>
        )}
      </View>

      {/* Edit profile panel */}
      {editingProfile && (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>
            Edit Profile
          </Text>

          {/* Display Name */}
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Display Name
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter a display name"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: 12,
            }}
          />

          {/* Username */}
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Username
          </Text>
          <TextInput
            value={username}
            onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="e.g. hungry_fan"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: 12,
            }}
          />

          {/* Bio */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' }}>
              Bio
            </Text>
            <Text style={{ color: bioCharCount > 260 ? COLORS.danger : COLORS.textTertiary, fontSize: 12 }}>
              {String(bioCharCount)}
              /280
            </Text>
          </View>
          <TextInput
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, 280))}
            placeholder="Tell fans about yourself..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: 14,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable
              onPress={handleSaveProfile}
              disabled={savingProfile}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 10,
                  paddingVertical: 11,
                  alignItems: 'center',
                  opacity: savingProfile ? 0.7 : 1,
                }}
              >
                <Text style={{ color: COLORS.background, fontSize: 14, fontWeight: '700' }}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => {
                console.log('[FanProfile] Cancel edit profile');
                setEditingProfile(false);
              }}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 10,
                  paddingVertical: 11,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>
                  Cancel
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {/* Fan Rewards card */}
      {rewardsLoading ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <SkeletonLine width={44} height={44} borderRadius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonLine width="50%" height={14} />
            <SkeletonLine width="35%" height={12} />
          </View>
          <SkeletonLine width={80} height={14} />
        </View>
      ) : (
        <AnimatedPressable
          onPress={() => {
            console.log('[FanProfile] Fan Rewards card pressed — navigating to fan-rewards');
            router.push('/fan-rewards');
          }}
          style={{ marginBottom: 12 }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }}
            >
              <Trophy size={22} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
                Fan Rewards
              </Text>
              {rewardsSummary ? (
                <View>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                    {rewardsSummary.level}
                    {' · '}
                    {rewardsSummary.total_points.toLocaleString()}
                    {' pts'}
                  </Text>
                  {rewardsSummary.current_streak > 0 && (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                      {'🔥 '}
                      {String(rewardsSummary.current_streak)}
                      {' day streak'}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Earn points & unlock achievements
                </Text>
              )}
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
              View →
            </Text>
          </View>
        </AnimatedPressable>
      )}

      {/* Exclusive Content card */}
      <AnimatedPressable
        onPress={() => {
          console.log('[FanProfile] Exclusive Content card pressed');
          router.push('/exclusive-content');
        }}
        style={{ marginBottom: 12 }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(139, 92, 246, 0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(139, 92, 246, 0.3)',
            }}
          >
            <Star size={22} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
              Exclusive Content
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
              Unlock with points or fan rank
            </Text>
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            View →
          </Text>
        </View>
      </AnimatedPressable>

      {/* My Submissions card */}
      <AnimatedPressable
        onPress={() => {
          console.log('[FanProfile] My Submissions pressed');
          router.push('/submit/my-submissions');
        }}
        style={{ marginBottom: 12 }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(124, 58, 237, 0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(124, 58, 237, 0.3)',
            }}
          >
            <Lock size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
              My Submissions
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
              Track your submitted content
            </Text>
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            →
          </Text>
        </View>
      </AnimatedPressable>

      {/* Blocked Users card */}
      <AnimatedPressable
        onPress={() => {
          console.log('[FanProfile] Blocked Users pressed');
          router.push('/blocked-users');
        }}
        style={{ marginBottom: 12 }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 68, 68, 0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 68, 68, 0.2)',
            }}
          >
            <User size={22} color={COLORS.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
              Blocked Users
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
              Manage who you've blocked
            </Text>
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            →
          </Text>
        </View>
      </AnimatedPressable>

      {/* Wishlist card */}
      <AnimatedPressable
        onPress={() => {
          console.log('[FanProfile] Wishlist pressed');
          router.push('/wishlist');
        }}
        style={{ marginBottom: 12 }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <ShoppingBag size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
              My Wishlist
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
              Saved items and sale alerts
            </Text>
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            →
          </Text>
        </View>
      </AnimatedPressable>

      {/* Style Showcase card */}
      <AnimatedPressable
        onPress={() => {
          console.log('[FanProfile] Style Showcase pressed');
          router.push('/style-showcase');
        }}
        style={{ marginBottom: 12 }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(20,184,166,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(20,184,166,0.3)',
            }}
          >
            <Camera size={22} color="#14B8A6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
              Style Showcase
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
              Show off your merch looks
            </Text>
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            →
          </Text>
        </View>
      </AnimatedPressable>

      {/* Notification Preferences card */}
      <AnimatedPressable
        onPress={() => {
          console.log('[FanProfile] Notification Preferences pressed');
          router.push('/notification-preferences');
        }}
        style={{ marginBottom: 20 }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Bell size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>
              Notifications
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
              Manage your notification preferences
            </Text>
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            →
          </Text>
        </View>
      </AnimatedPressable>

      {/* Achievement Badges */}
      {badges.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Trophy size={18} color={COLORS.primary} />
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
              My Badges
            </Text>
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                {String(badges.length)}
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {badges.map((badge) => (
              <AnimatedPressable
                key={badge.id}
                onPress={() => {
                  console.log('[FanProfile] Badge tapped:', badge.name);
                  setSelectedBadge(badge);
                }}
                style={{ marginRight: 12 }}
              >
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                    width: 90,
                  }}
                >
                  <Text style={{ fontSize: 32, marginBottom: 6 }}>{badge.icon}</Text>
                  <Text
                    style={{ color: COLORS.text, fontSize: 11, fontWeight: '700', textAlign: 'center' }}
                    numberOfLines={2}
                  >
                    {badge.name}
                  </Text>
                </View>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Leaderboards + Followers links */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[FanProfile] Leaderboards pressed');
            router.push('/leaderboards');
          }}
          style={{ flex: 1 }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Trophy size={20} color="#F59E0B" />
            <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700' }}>Leaderboards</Text>
          </View>
        </AnimatedPressable>
        {user && (
          <AnimatedPressable
            onPress={() => {
              console.log('[FanProfile] Followers pressed');
              router.push(`/followers?id=${user.id}`);
            }}
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckCircle size={20} color={COLORS.primary} />
              <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700' }}>Followers</Text>
            </View>
          </AnimatedPressable>
        )}
        {user && (
          <AnimatedPressable
            onPress={() => {
              console.log('[FanProfile] Following pressed');
              router.push(`/following?id=${user.id}`);
            }}
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Star size={20} color={COLORS.primary} />
              <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '700' }}>Following</Text>
            </View>
          </AnimatedPressable>
        )}
      </View>

      {/* Recent Activity (from activity_feed) */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Clock size={18} color={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
            Recent Activity
          </Text>
        </View>

        {activityLoading ? (
          <View style={{ gap: 8 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <SkeletonLine width={36} height={36} borderRadius={8} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLine width="60%" height={13} />
                  <SkeletonLine width="40%" height={11} />
                </View>
                <SkeletonLine width={50} height={11} />
              </View>
            ))}
          </View>
        ) : activityFeed.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Clock size={28} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10, textAlign: 'center' }}>
              No activity yet — start listening, voting, and engaging!
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {activityFeed.map((entry) => {
              const icon = (() => {
                switch (entry.activity_type) {
                  case 'listened': return '🎧';
                  case 'favorited': return '❤️';
                  case 'commented': return '💬';
                  case 'reacted': return '🔥';
                  case 'rsvp': return '🎟️';
                  case 'followed': return '👥';
                  case 'voted': return '🗳️';
                  case 'asked': return '❓';
                  case 'badge_earned': return '🏆';
                  case 'playlist_created': return '🎵';
                  default: return '⚡';
                }
              })();
              const label = entry.target_label ?? 'something';
              const timeText = timeAgo(entry.created_at);
              return (
                <View
                  key={entry.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                      {label}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                      {entry.activity_type.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                    {timeText}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Favorites section (hearted songs/merch) */}
      <View style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Heart size={18} color={COLORS.primary} fill={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
            Saved Favorites
          </Text>
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <SkeletonLine width={48} height={48} borderRadius={8} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLine width="70%" height={14} />
                  <SkeletonLine width="50%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : favorites.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Heart size={32} color={COLORS.textTertiary} />
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 15,
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              No favorites yet
            </Text>
            <Text
              style={{
                color: COLORS.textTertiary,
                fontSize: 13,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              Tap the heart icon on songs and merch to save them here
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {/* Favorite songs */}
            {songs.length > 0 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Music size={14} color={COLORS.textSecondary} />
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Songs
                  </Text>
                </View>
                {songs.map((song) => (
                  <AnimatedPressable
                    key={song.id}
                    onPress={() => {
                      console.log('[FanProfile] Play favorite song:', song.title);
                      playSong({
                        id: song.id,
                        title: song.title,
                        artist: song.artist,
                        cover_url: song.cover_url,
                        audio_url: null,
                      });
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 12,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        marginBottom: 8,
                      }}
                    >
                      {song.cover_url ? (
                        <Image
                          source={resolveImageSource(song.cover_url)}
                          style={{ width: 48, height: 48, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            backgroundColor: COLORS.primaryMuted,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Music size={20} color={COLORS.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}
                          numberOfLines={1}
                        >
                          {song.title}
                        </Text>
                        <Text
                          style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {song.artist}
                        </Text>
                      </View>
                    </View>
                  </AnimatedPressable>
                ))}
              </View>
            )}

            {/* Favorite merch */}
            {merch.length > 0 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <ShoppingBag size={14} color={COLORS.textSecondary} />
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Merch
                  </Text>
                </View>
                {merch.map((item) => {
                  const priceDisplay = `$${Number(item.price).toFixed(2)}`;
                  return (
                    <AnimatedPressable
                      key={item.id}
                      onPress={() => {
                        console.log('[FanProfile] Navigate to merch detail:', item.id);
                        router.push(`/merch-detail/${item.id}`);
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: COLORS.surface,
                          borderRadius: 12,
                          padding: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          marginBottom: 8,
                        }}
                      >
                        {item.image_url ? (
                          <Image
                            source={resolveImageSource(item.image_url)}
                            style={{ width: 48, height: 48, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 8,
                              backgroundColor: COLORS.surfaceSecondary,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ShoppingBag size={20} color={COLORS.textTertiary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700', marginTop: 2 }}
                          >
                            {priceDisplay}
                          </Text>
                        </View>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Badge detail modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 28,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
              width: '100%',
            }}
          >
            {selectedBadge && (
              <>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>{selectedBadge.icon}</Text>
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                  {selectedBadge.name}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
                  {selectedBadge.description}
                </Text>
                <AnimatedPressable onPress={() => {
                  console.log('[FanProfile] Close badge modal');
                  setSelectedBadge(null);
                }}>
                  <View
                    style={{
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 32,
                      borderWidth: 1,
                      borderColor: COLORS.primary,
                    }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                      Close
                    </Text>
                  </View>
                </AnimatedPressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Artist Picker Modal */}
      <Modal
        visible={showArtistPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowArtistPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
              maxHeight: '75%',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>
                Pick Favorite Artist
              </Text>
              <AnimatedPressable onPress={() => {
                console.log('[FanProfile] Close artist picker');
                setShowArtistPicker(false);
              }}>
                <X size={20} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginHorizontal: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Search size={14} color={COLORS.textTertiary} />
              <TextInput
                value={artistSearch}
                onChangeText={setArtistSearch}
                placeholder="Search artists..."
                placeholderTextColor={COLORS.textTertiary}
                style={{ flex: 1, color: COLORS.text, fontSize: 14 }}
                autoCapitalize="none"
              />
            </View>

            {loadingArtists ? (
              <View style={{ padding: 20, gap: 10 }}>
                {[0, 1, 2, 3].map(k => (
                  <SkeletonLine key={k} width="100%" height={52} borderRadius={10} />
                ))}
              </View>
            ) : (
              <FlatList
                data={filteredArtists}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                renderItem={({ item }) => (
                  <AnimatedPressable
                    onPress={() => selectArtist(item)}
                    style={{ marginBottom: 8 }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: item.id === favoriteArtistId ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                        borderRadius: 10,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: item.id === favoriteArtistId ? COLORS.primary : COLORS.border,
                      }}
                    >
                      {item.image_url ? (
                        <Image
                          source={resolveImageSource(item.image_url)}
                          style={{ width: 40, height: 40, borderRadius: 20 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: COLORS.primaryMuted,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Mic2 size={18} color={COLORS.primary} />
                        </View>
                      )}
                      <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.id === favoriteArtistId && (
                        <CheckCircle size={16} color={COLORS.primary} />
                      )}
                    </View>
                  </AnimatedPressable>
                )}
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>No artists found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Song Picker Modal */}
      <Modal
        visible={showSongPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSongPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
              maxHeight: '75%',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>
                Pick Favorite Song
              </Text>
              <AnimatedPressable onPress={() => {
                console.log('[FanProfile] Close song picker');
                setShowSongPicker(false);
              }}>
                <X size={20} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginHorizontal: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Search size={14} color={COLORS.textTertiary} />
              <TextInput
                value={songSearch}
                onChangeText={setSongSearch}
                placeholder="Search songs..."
                placeholderTextColor={COLORS.textTertiary}
                style={{ flex: 1, color: COLORS.text, fontSize: 14 }}
                autoCapitalize="none"
              />
            </View>

            {loadingSongs ? (
              <View style={{ padding: 20, gap: 10 }}>
                {[0, 1, 2, 3].map(k => (
                  <SkeletonLine key={k} width="100%" height={60} borderRadius={10} />
                ))}
              </View>
            ) : (
              <FlatList
                data={filteredSongs}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                renderItem={({ item }) => (
                  <AnimatedPressable
                    onPress={() => selectSong(item)}
                    style={{ marginBottom: 8 }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: item.id === favoriteSongId ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                        borderRadius: 10,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: item.id === favoriteSongId ? COLORS.primary : COLORS.border,
                      }}
                    >
                      {item.cover_url ? (
                        <Image
                          source={resolveImageSource(item.cover_url)}
                          style={{ width: 44, height: 44, borderRadius: 6 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 6,
                            backgroundColor: COLORS.primaryMuted,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Music size={18} color={COLORS.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                          {item.artist}
                        </Text>
                      </View>
                      {item.id === favoriteSongId && (
                        <CheckCircle size={16} color={COLORS.primary} />
                      )}
                    </View>
                  </AnimatedPressable>
                )}
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>No songs found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
