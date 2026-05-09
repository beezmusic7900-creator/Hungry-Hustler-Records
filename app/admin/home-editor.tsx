import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'url' | 'numeric' | 'email-address';
}) {
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
        {label}
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

function ImageField({
  label,
  value,
  onChangeText,
  onUpload,
  uploading,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onUpload: () => void;
  uploading: boolean;
}) {
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
        {label}
      </Text>
      {value ? (
        <Image
          source={resolveImageSource(value)}
          style={{ width: '100%', height: 120, borderRadius: 12, marginBottom: 8 }}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="https://..."
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="none"
          style={{
            flex: 1,
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: COLORS.text,
            fontSize: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        />
        <AnimatedPressable onPress={onUpload} disabled={uploading}>
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Camera size={18} color={COLORS.primary} />
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

interface Artist {
  id: string;
  name: string;
}

export default function HomeEditorScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [homeId, setHomeId] = useState<string | null>(null);
  const [heroBannerUrl, setHeroBannerUrl] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [featuredArtistId, setFeaturedArtistId] = useState('');
  const [latestReleaseTitle, setLatestReleaseTitle] = useState('');
  const [latestReleaseArtist, setLatestReleaseArtist] = useState('');
  const [latestReleaseImageUrl, setLatestReleaseImageUrl] = useState('');
  const [latestReleaseSpotifyUrl, setLatestReleaseSpotifyUrl] = useState('');
  const [latestReleaseAppleMusicUrl, setLatestReleaseAppleMusicUrl] = useState('');
  const [latestReleaseYoutubeUrl, setLatestReleaseYoutubeUrl] = useState('');
  const [latestReleaseSoundcloudUrl, setLatestReleaseSoundcloudUrl] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      console.log('[HomeEditor] Loading home content and artists from Supabase');
      const [homeResult, artistsResult] = await Promise.all([
        (supabase as any).from('home_content').select('*').limit(1).single(),
        supabase.from('artists').select('id, name').order('name'),
      ]);

      if (homeResult.data) {
        const d = homeResult.data;
        setHomeId(d.id);
        setHeroBannerUrl(d.hero_banner_url ?? '');
        setHeroTitle(d.hero_title ?? '');
        setHeroSubtitle(d.hero_subtitle ?? '');
        setFeaturedArtistId(d.featured_artist_id ?? '');
        setLatestReleaseTitle(d.latest_release_title ?? '');
        setLatestReleaseArtist(d.latest_release_artist ?? '');
        setLatestReleaseImageUrl(d.latest_release_image_url ?? '');
        setLatestReleaseSpotifyUrl(d.latest_release_spotify_url ?? '');
        setLatestReleaseAppleMusicUrl(d.latest_release_apple_music_url ?? '');
        setLatestReleaseYoutubeUrl(d.latest_release_youtube_url ?? '');
        setLatestReleaseSoundcloudUrl(d.latest_release_soundcloud_url ?? '');
      }

      setArtists(artistsResult.data ?? []);
    } catch (err) {
      console.error('[HomeEditor] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (field: string, setter: (url: string) => void) => {
    console.log(`[HomeEditor] Upload pressed for: ${field}`);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `home-${field}-${Date.now()}.${ext}`;

      try {
        setUploading(field);
        console.log(`[HomeEditor] Uploading ${field}: ${fileName}`);

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, blob, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });

        if (uploadError) {
          console.error('[HomeEditor] Upload failed:', uploadError.message);
          Alert.alert('Upload failed', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        setter(urlData.publicUrl);
        console.log(`[HomeEditor] Uploaded ${field}:`, urlData.publicUrl);
      } catch (err) {
        console.error('[HomeEditor] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the image.');
      } finally {
        setUploading(null);
      }
    }
  };

  const handleSave = async () => {
    console.log('[HomeEditor] Save pressed');
    setSaving(true);

    const payload = {
      hero_banner_url: heroBannerUrl.trim() || null,
      hero_title: heroTitle.trim() || null,
      hero_subtitle: heroSubtitle.trim() || null,
      featured_artist_id: featuredArtistId.trim() || null,
      latest_release_title: latestReleaseTitle.trim() || null,
      latest_release_artist: latestReleaseArtist.trim() || null,
      latest_release_image_url: latestReleaseImageUrl.trim() || null,
      latest_release_spotify_url: latestReleaseSpotifyUrl.trim() || null,
      latest_release_apple_music_url: latestReleaseAppleMusicUrl.trim() || null,
      latest_release_youtube_url: latestReleaseYoutubeUrl.trim() || null,
      latest_release_soundcloud_url: latestReleaseSoundcloudUrl.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      let dbError;
      if (homeId) {
        console.log('[HomeEditor] Updating existing home content');
        const result = await (supabase as any)
          .from('home_content')
          .update(payload)
          .eq('id', homeId);
        dbError = result.error;
      } else {
        console.log('[HomeEditor] Inserting new home content');
        const result = await (supabase as any)
          .from('home_content')
          .insert(payload)
          .select()
          .single();
        dbError = result.error;
        if (result.data) setHomeId(result.data.id);
      }

      if (dbError) {
        console.error('[HomeEditor] Save failed:', dbError.message);
        Alert.alert('Error', dbError.message);
        return;
      }

      console.log('[HomeEditor] Home content saved successfully');
      Alert.alert('Saved', 'Home page content updated successfully.');
    } catch (err) {
      console.error('[HomeEditor] Save failed:', err);
      Alert.alert('Error', 'Failed to save home content.');
    } finally {
      setSaving(false);
    }
  };

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
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        Hero Section
      </Text>

      <ImageField
        label="Hero Banner Image"
        value={heroBannerUrl}
        onChangeText={setHeroBannerUrl}
        onUpload={() => handleUpload('hero_banner', setHeroBannerUrl)}
        uploading={uploading === 'hero_banner'}
      />
      <FormField
        label="Hero Title"
        value={heroTitle}
        onChangeText={setHeroTitle}
        placeholder="HUNGRY HUSTLER RECORDS"
      />
      <FormField
        label="Hero Subtitle"
        value={heroSubtitle}
        onChangeText={setHeroSubtitle}
        placeholder="Independent. Authentic. Unstoppable."
      />

      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginTop: 8,
        }}
      >
        Featured Artist
      </Text>

      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 13,
            fontWeight: '500',
            marginBottom: 8,
          }}
        >
          Featured Artist ID
        </Text>
        <TextInput
          value={featuredArtistId}
          onChangeText={setFeaturedArtistId}
          placeholder="Artist ID"
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="none"
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: COLORS.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 8,
          }}
        />
        {artists.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>
              Quick select:
            </Text>
            {artists.map((a) => (
              <AnimatedPressable
                key={a.id}
                onPress={() => {
                  console.log(`[HomeEditor] Selected featured artist: ${a.name}`);
                  setFeaturedArtistId(a.id);
                }}
              >
                <View
                  style={{
                    backgroundColor:
                      featuredArtistId === a.id ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor:
                      featuredArtistId === a.id ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: featuredArtistId === a.id ? COLORS.primary : COLORS.text,
                      fontSize: 13,
                    }}
                  >
                    {a.name}
                  </Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        )}
      </View>

      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 12,
          marginTop: 8,
        }}
      >
        Latest Release
      </Text>

      <FormField
        label="Release Title"
        value={latestReleaseTitle}
        onChangeText={setLatestReleaseTitle}
        placeholder="Album / Single name"
      />
      <FormField
        label="Artist Name"
        value={latestReleaseArtist}
        onChangeText={setLatestReleaseArtist}
        placeholder="Artist name"
      />
      <ImageField
        label="Release Image"
        value={latestReleaseImageUrl}
        onChangeText={setLatestReleaseImageUrl}
        onUpload={() => handleUpload('release_image', setLatestReleaseImageUrl)}
        uploading={uploading === 'release_image'}
      />
      <FormField
        label="Spotify URL"
        value={latestReleaseSpotifyUrl}
        onChangeText={setLatestReleaseSpotifyUrl}
        placeholder="https://open.spotify.com/..."
        keyboardType="url"
      />
      <FormField
        label="Apple Music URL"
        value={latestReleaseAppleMusicUrl}
        onChangeText={setLatestReleaseAppleMusicUrl}
        placeholder="https://music.apple.com/..."
        keyboardType="url"
      />
      <FormField
        label="YouTube URL"
        value={latestReleaseYoutubeUrl}
        onChangeText={setLatestReleaseYoutubeUrl}
        placeholder="https://youtube.com/..."
        keyboardType="url"
      />
      <FormField
        label="SoundCloud URL"
        value={latestReleaseSoundcloudUrl}
        onChangeText={setLatestReleaseSoundcloudUrl}
        placeholder="https://soundcloud.com/..."
        keyboardType="url"
      />

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
            {saving ? 'Saving...' : 'Save Home Page'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
