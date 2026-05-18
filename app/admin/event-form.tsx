import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function EventFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Event' : 'New Event' });
    if (isEdit) loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      console.log('[EventForm] Loading event:', id);
      const { data, error: dbError } = await db
        .from('events')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[EventForm] Load error:', dbError.message);
        return;
      }
      if (data) {
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setEventDate(data.event_date ? new Date(data.event_date) : new Date());
        setVenue(data.venue ?? '');
        setCity(data.city ?? '');
        setTicketUrl(data.ticket_url ?? '');
        setImageUrl(data.image_url ?? '');
        setIsPublished(data.is_published ?? false);
      }
    } catch (err) {
      console.error('[EventForm] Failed to load event:', err);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!user) {
      setError('You must be logged in.');
      return;
    }

    console.log('[EventForm] Saving event:', title, 'isEdit:', isEdit);
    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate.toISOString(),
      venue: venue.trim() || null,
      city: city.trim() || null,
      ticket_url: ticketUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      is_published: isPublished,
    };

    try {
      if (isEdit) {
        const { error: updateErr } = await db
          .from('events')
          .update(payload)
          .eq('id', id as string);
        if (updateErr) throw updateErr;
        console.log('[EventForm] Event updated:', id);
      } else {
        const { error: insertErr } = await db
          .from('events')
          .insert({ ...payload, created_by: user.id });
        if (insertErr) throw insertErr;
        console.log('[EventForm] Event created');
      }
      router.back();
    } catch (err: unknown) {
      console.error('[EventForm] Save error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save event.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async () => {
    console.log('[EventForm] Upload image pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `event-${Date.now()}.${ext}`;

      try {
        setUploading(true);
        console.log(`[EventForm] Uploading image: ${fileName}`);

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, blob, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });

        if (uploadError) {
          console.error('[EventForm] Upload failed:', uploadError.message);
          Alert.alert('Upload failed', uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        setImageUrl(urlData.publicUrl);
        console.log('[EventForm] Image uploaded:', urlData.publicUrl);
      } catch (err) {
        console.error('[EventForm] Upload failed:', err);
        Alert.alert('Upload failed', 'Could not upload the image.');
      } finally {
        setUploading(false);
      }
    }
  };

  const dateLabel = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 18 }}>
          {/* Title */}
          <View>
            <Text style={labelStyle}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Event title"
              placeholderTextColor={COLORS.textTertiary}
              style={inputStyle}
            />
          </View>

          {/* Description */}
          <View>
            <Text style={labelStyle}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Event description"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
              style={[inputStyle, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
            />
          </View>

          {/* Event Date */}
          <View>
            <Text style={labelStyle}>Event Date</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[EventForm] Open date picker');
                setShowDatePicker(true);
              }}
            >
              <View
                style={[
                  inputStyle,
                  { justifyContent: 'center' },
                ]}
              >
                <Text style={{ color: COLORS.text, fontSize: 15 }}>{dateLabel}</Text>
              </View>
            </AnimatedPressable>
            {showDatePicker && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    console.log('[EventForm] Date selected:', date.toISOString());
                    setEventDate(date);
                  }
                }}
                themeVariant="dark"
              />
            )}
          </View>

          {/* Venue */}
          <View>
            <Text style={labelStyle}>Venue</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="Venue name"
              placeholderTextColor={COLORS.textTertiary}
              style={inputStyle}
            />
          </View>

          {/* City */}
          <View>
            <Text style={labelStyle}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City, State"
              placeholderTextColor={COLORS.textTertiary}
              style={inputStyle}
            />
          </View>

          {/* Ticket URL */}
          <View>
            <Text style={labelStyle}>Ticket URL</Text>
            <TextInput
              value={ticketUrl}
              onChangeText={setTicketUrl}
              placeholder="https://..."
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
              style={inputStyle}
            />
          </View>

          {/* Event Image */}
          <View>
            <Text style={labelStyle}>Event Image</Text>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 10 }}
                resizeMode="cover"
              />
            ) : null}
            <AnimatedPressable onPress={handleUploadImage} disabled={uploading}>
              <View style={[inputStyle, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }]}>
                <Text style={{ color: uploading ? COLORS.textTertiary : COLORS.primary, fontSize: 14, fontWeight: '600' }}>
                  {uploading ? 'Uploading...' : imageUrl ? 'Change Image' : 'Upload Image'}
                </Text>
              </View>
            </AnimatedPressable>
          </View>

          {/* Published toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600' }}>Published</Text>
            <Switch
              value={isPublished}
              onValueChange={(val) => {
                console.log('[EventForm] Published toggle:', val);
                setIsPublished(val);
              }}
              trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>

          {/* Error */}
          {error ? (
            <Text style={{ color: COLORS.danger, fontSize: 13, textAlign: 'center' }}>
              {error}
            </Text>
          ) : null}

          {/* Save button */}
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
                {saving ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const labelStyle = {
  color: COLORS.textSecondary,
  fontSize: 13,
  fontWeight: '500' as const,
  marginBottom: 8,
};

const inputStyle = {
  backgroundColor: COLORS.surfaceSecondary,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: COLORS.text,
  fontSize: 15,
  borderWidth: 1,
  borderColor: COLORS.border,
};
