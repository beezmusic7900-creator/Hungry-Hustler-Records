import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  ImageSourcePropType,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { useRewards } from '@/hooks/useRewards';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function StyleShowcaseUploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { awardPoints } = useRewards();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePickPhoto = async () => {
    console.log('[StyleShowcaseUpload] Pick photo pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user) { Alert.alert('Sign in required', 'Please sign in to post.'); return; }
    if (!photoUri) { Alert.alert('Photo required', 'Please select a photo.'); return; }
    console.log('[StyleShowcaseUpload] Submit pressed');
    setSubmitting(true);

    try {
      // Upload photo
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const path = `style-showcase/${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);
      const photoUrl = urlData.publicUrl;
      console.log('[StyleShowcaseUpload] Photo uploaded:', photoUrl);

      // Insert showcase post
      const { error: insertError } = await db.from('fan_style_showcase').insert({
        user_id: user.id,
        photo_url: photoUrl,
        caption: caption.trim() || null,
        status: 'pending',
      });

      if (insertError) {
        console.error('[StyleShowcaseUpload] Insert error:', insertError.message);
        Alert.alert('Error', 'Could not submit your post. Please try again.');
        return;
      }

      console.log('[StyleShowcaseUpload] Post submitted successfully');

      // Award points
      await awardPoints('submit_content', { description: 'style_showcase_submit' });

      setSuccess(true);
    } catch (err) {
      console.error('[StyleShowcaseUpload] handleSubmit error:', err);
      Alert.alert('Error', 'Could not submit your post.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
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
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🎉</Text>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
          Post submitted!
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
            maxWidth: 280,
            lineHeight: 20,
          }}
        >
          Your style post is pending approval. It will appear in the showcase once reviewed.
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[StyleShowcaseUpload] Back to showcase pressed');
            router.back();
          }}
          style={{ marginTop: 24 }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '700' }}>
              Back to Showcase
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
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3, marginBottom: 24 }}>
        Share Your Style
      </Text>

      {/* Photo picker */}
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
        Photo *
      </Text>
      <AnimatedPressable onPress={handlePickPhoto} style={{ marginBottom: 20 }}>
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            borderRadius: 16,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: photoUri ? COLORS.primary : COLORS.border,
            borderStyle: photoUri ? 'solid' : 'dashed',
            overflow: 'hidden',
          }}
        >
          {photoUri ? (
            <>
              <Image
                source={resolveImageSource(photoUri)}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <AnimatedPressable
                onPress={() => {
                  console.log('[StyleShowcaseUpload] Remove photo pressed');
                  setPhotoUri(null);
                }}
                style={{ position: 'absolute', top: 12, right: 12 }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={14} color="#fff" />
                </View>
              </AnimatedPressable>
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <Camera size={40} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>
                Tap to select photo
              </Text>
              <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>
                Square format recommended
              </Text>
            </View>
          )}
        </View>
      </AnimatedPressable>

      {/* Caption */}
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
        Caption (optional)
      </Text>
      <TextInput
        value={caption}
        onChangeText={(v) => setCaption(v.slice(0, 500))}
        placeholder="Tell us about your look..."
        placeholderTextColor={COLORS.textTertiary}
        multiline
        numberOfLines={4}
        maxLength={500}
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
          marginBottom: 4,
        }}
      />
      <Text style={{ color: COLORS.textTertiary, fontSize: 11, textAlign: 'right', marginBottom: 24 }}>
        {String(caption.length)}
        /500
      </Text>

      {/* Points info */}
      <View
        style={{
          backgroundColor: COLORS.primaryMuted,
          borderRadius: 12,
          padding: 14,
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderWidth: 1,
          borderColor: COLORS.primary,
        }}
      >
        <Text style={{ fontSize: 20 }}>⚡</Text>
        <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600', flex: 1 }}>
          Earn 15 points for posting your style (up to 3 times per day)
        </Text>
      </View>

      <AnimatedPressable
        onPress={handleSubmit}
        disabled={submitting || !photoUri}
      >
        <View
          style={{
            backgroundColor: photoUri ? COLORS.primary : COLORS.surfaceSecondary,
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting && <ActivityIndicator size="small" color={COLORS.background} />}
          <Text
            style={{
              color: photoUri ? COLORS.background : COLORS.textSecondary,
              fontSize: 16,
              fontWeight: '800',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Post'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
