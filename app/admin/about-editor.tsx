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
import { getAbout, upsertAbout, uploadImage, getBearerToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { AboutContentInput } from '@/types';

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
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'url' | 'numeric' | 'email-address' | 'phone-pad';
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
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 12 : 14,
          color: COLORS.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: COLORS.border,
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export default function AboutEditorScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [mission, setMission] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      console.log('[AboutEditor] Loading about content');
      const data = await getAbout();
      setLogoUrl(data.logo_url ?? '');
      setDescription(data.description ?? '');
      setMission(data.mission ?? '');
      setContactEmail(data.contact_email ?? '');
      setContactPhone(data.contact_phone ?? '');
      setContactAddress(data.contact_address ?? '');
      setInstagramUrl(data.instagram_url ?? '');
      setTwitterUrl(data.twitter_url ?? '');
      setFacebookUrl(data.facebook_url ?? '');
      setYoutubeUrl(data.youtube_url ?? '');
      setTiktokUrl(data.tiktok_url ?? '');
    } catch (err) {
      console.error('[AboutEditor] Failed to load about content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async () => {
    console.log('[AboutEditor] Upload logo pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() ?? 'logo.jpg';
      const fileType = asset.mimeType ?? 'image/jpeg';

      try {
        setUploading(true);
        const token = await getBearerToken();
        if (!token) throw new Error('Not authenticated');
        const { url } = await uploadImage(
          { uri: asset.uri, name: fileName, type: fileType },
          token
        );
        setLogoUrl(url);
        console.log('[AboutEditor] Logo uploaded:', url);
      } catch (err) {
        console.error('[AboutEditor] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the logo.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    console.log('[AboutEditor] Save pressed');
    setSaving(true);

    const data: AboutContentInput = {
      logo_url: logoUrl.trim() || undefined,
      description: description.trim() || undefined,
      mission: mission.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      contact_address: contactAddress.trim() || undefined,
      instagram_url: instagramUrl.trim() || undefined,
      twitter_url: twitterUrl.trim() || undefined,
      facebook_url: facebookUrl.trim() || undefined,
      youtube_url: youtubeUrl.trim() || undefined,
      tiktok_url: tiktokUrl.trim() || undefined,
    };

    try {
      const token = await getBearerToken();
      if (!token) throw new Error('Not authenticated');
      await upsertAbout(data, token);
      console.log('[AboutEditor] About content saved successfully');
      Alert.alert('Saved', 'About page content updated successfully.');
    } catch (err) {
      console.error('[AboutEditor] Save failed:', err);
      Alert.alert('Error', 'Failed to save about content.');
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
      {/* Logo Upload */}
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Logo
      </Text>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        {logoUrl ? (
          <Image
            source={resolveImageSource(logoUrl)}
            style={{ width: 120, height: 120, borderRadius: 12, marginBottom: 12 }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 12,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Camera size={32} color={COLORS.textTertiary} />
          </View>
        )}
        <AnimatedPressable onPress={handleUploadLogo} disabled={uploading}>
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 20,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Label Info
      </Text>

      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="About the label..."
        multiline
      />
      <FormField
        label="Mission Statement"
        value={mission}
        onChangeText={setMission}
        placeholder="Our mission..."
        multiline
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
        Contact Info
      </Text>

      <FormField
        label="Email"
        value={contactEmail}
        onChangeText={setContactEmail}
        placeholder="contact@example.com"
        keyboardType="email-address"
      />
      <FormField
        label="Phone"
        value={contactPhone}
        onChangeText={setContactPhone}
        placeholder="+1 (555) 000-0000"
        keyboardType="phone-pad"
      />
      <FormField
        label="Address"
        value={contactAddress}
        onChangeText={setContactAddress}
        placeholder="123 Main St, City, State"
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
        Social Media
      </Text>

      <FormField
        label="Instagram URL"
        value={instagramUrl}
        onChangeText={setInstagramUrl}
        placeholder="https://instagram.com/..."
        keyboardType="url"
      />
      <FormField
        label="Twitter URL"
        value={twitterUrl}
        onChangeText={setTwitterUrl}
        placeholder="https://twitter.com/..."
        keyboardType="url"
      />
      <FormField
        label="Facebook URL"
        value={facebookUrl}
        onChangeText={setFacebookUrl}
        placeholder="https://facebook.com/..."
        keyboardType="url"
      />
      <FormField
        label="YouTube URL"
        value={youtubeUrl}
        onChangeText={setYoutubeUrl}
        placeholder="https://youtube.com/..."
        keyboardType="url"
      />
      <FormField
        label="TikTok URL"
        value={tiktokUrl}
        onChangeText={setTiktokUrl}
        placeholder="https://tiktok.com/..."
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
            {saving ? 'Saving...' : 'Save About Page'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
