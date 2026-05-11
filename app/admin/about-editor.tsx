import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  const [aboutId, setAboutId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [mission, setMission] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [saving, setSaving] = useState(false);
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
      console.log('[AboutEditor] Loading about content from Supabase');
      const { data, error: dbError } = await (supabase as any)
        .from('about_content')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (dbError && dbError.code !== 'PGRST116' && dbError.code !== 'PGRST205') {
        console.error('[AboutEditor] Failed to load about content:', dbError.message);
      }

      if (data) {
        setAboutId(data.id);
        setDescription(data.description ?? '');
        setMission(data.mission ?? '');
        setContactEmail(data.contact_email ?? '');
        setContactPhone(data.contact_phone ?? '');
        setInstagramUrl(data.instagram_url ?? '');
        setTwitterUrl(data.twitter_url ?? '');
        setFacebookUrl(data.facebook_url ?? '');
        setYoutubeUrl(data.youtube_url ?? '');
      }
    } catch (err) {
      console.error('[AboutEditor] Failed to load about content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('[AboutEditor] Save pressed');
    setSaving(true);

    const payload = {
      description: description.trim() || null,
      mission: mission.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      twitter_url: twitterUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      let dbError;
      if (aboutId) {
        console.log('[AboutEditor] Updating existing about content');
        const result = await (supabase as any)
          .from('about_content')
          .update(payload)
          .eq('id', aboutId);
        dbError = result.error;
      } else {
        console.log('[AboutEditor] Inserting new about content');
        const result = await (supabase as any)
          .from('about_content')
          .insert(payload)
          .select()
          .single();
        dbError = result.error;
        if (result.data) setAboutId(result.data.id);
      }

      if (dbError) {
        console.error('[AboutEditor] Save failed:', dbError.message);
        Alert.alert('Error', dbError.message);
        return;
      }

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
