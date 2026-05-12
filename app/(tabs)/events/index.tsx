import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Linking,
  RefreshControl,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, MapPin, Ticket, Heart } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';
import { useFavorite } from '@/hooks/useFavorite';

// The `events` table is not yet in the generated Supabase types — cast to bypass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic: any = supabasePublic;

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  venue: string | null;
  city: string | null;
  ticket_url: string | null;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return 'Date TBA';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function EventFavoriteButton({ eventId }: { eventId: string }) {
  const { isFavorited, toggleFavorite } = useFavorite('event', eventId);

  const handlePress = () => {
    console.log('[Events] Toggle favorite for event:', eventId, '— currently:', isFavorited);
    toggleFavorite();
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isFavorited ? 'rgba(255, 68, 68, 0.15)' : COLORS.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: isFavorited ? 'rgba(255, 68, 68, 0.4)' : COLORS.border,
        }}
      >
        <Heart
          size={16}
          color={isFavorited ? '#FF4444' : COLORS.textSecondary}
          fill={isFavorited ? '#FF4444' : 'transparent'}
        />
      </View>
    </AnimatedPressable>
  );
}

function EventCard({ item }: { item: EventItem }) {
  const dateText = formatEventDate(item.event_date);
  const venueCity = [item.venue, item.city].filter(Boolean).join(', ');

  const handleGetTickets = () => {
    if (item.ticket_url) {
      console.log('[Events] Get tickets pressed for:', item.title, item.ticket_url);
      Linking.openURL(item.ticket_url);
    }
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
      }}
    >
      {/* Event image */}
      {item.image_url ? (
        <Image
          source={resolveImageSource(item.image_url)}
          style={{ width: '100%', height: 180 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 120,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <Calendar size={40} color={COLORS.primary} />
        </View>
      )}

      <View style={{ padding: 16 }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 18,
              fontWeight: '700',
              flex: 1,
              letterSpacing: -0.2,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <EventFavoriteButton eventId={item.id} />
        </View>

        {/* Date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Calendar size={14} color={COLORS.primary} />
          <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
            {dateText}
          </Text>
        </View>

        {/* Venue */}
        {venueCity ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <MapPin size={14} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }} numberOfLines={1}>
              {venueCity}
            </Text>
          </View>
        ) : null}

        {/* Description */}
        {item.description ? (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 13,
              lineHeight: 20,
              marginTop: 10,
            }}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        ) : null}

        {/* Get Tickets button */}
        {item.ticket_url ? (
          <AnimatedPressable onPress={handleGetTickets} style={{ marginTop: 14 }}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 10,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ticket size={16} color={COLORS.background} />
              <Text
                style={{
                  color: COLORS.background,
                  fontSize: 14,
                  fontWeight: '700',
                  letterSpacing: 0.3,
                }}
              >
                Get Tickets
              </Text>
            </View>
          </AnimatedPressable>
        ) : (
          <View
            style={{
              marginTop: 14,
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>
              Tickets Coming Soon
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SkeletonEventCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
      }}
    >
      <SkeletonLine width="100%" height={180} borderRadius={0} />
      <View style={{ padding: 16, gap: 10 }}>
        <SkeletonLine width="75%" height={18} />
        <SkeletonLine width="50%" height={13} />
        <SkeletonLine width="60%" height={13} />
        <SkeletonLine width="100%" height={44} borderRadius={10} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      console.log('[Events] Loading events from Supabase');
      setError(null);
      const { data, error: dbError } = await dbPublic
        .from('events')
        .select('*')
        .eq('is_published', true)
        .order('event_date', { ascending: true });

      if (dbError) {
        console.error('[Events] Supabase error:', dbError.message);
        setError("Couldn't load events.");
        return;
      }
      console.log('[Events] Loaded', data?.length ?? 0, 'events');
      setEvents((data ?? []) as unknown as EventItem[]);
    } catch (err) {
      console.error('[Events] Failed to load events:', err);
      setError("Couldn't load events. Check your connection.");
    }
  }, []);

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const handleRefresh = async () => {
    console.log('[Events] Pull-to-refresh triggered');
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <Text
          style={{
            color: COLORS.text,
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.5,
          }}
        >
          EVENTS
        </Text>
        <View
          style={{
            width: 40,
            height: 3,
            backgroundColor: COLORS.primary,
            borderRadius: 2,
            marginTop: 6,
            ...Platform.select({
              native: {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 6,
              },
              default: {},
            }),
          }}
        />
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
          {[0, 1, 2].map((k) => <SkeletonEventCard key={k} />)}
        </ScrollView>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontSize: 15, textAlign: 'center' }}>{error}</Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Events] Retry loading');
              setLoading(true);
              loadEvents().finally(() => setLoading(false));
            }}
            style={{ marginTop: 16 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Try Again</Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : events.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Calendar size={32} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
            No events yet
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
            Check back soon for upcoming shows and events.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {events.map((event) => (
            <EventCard key={event.id} item={event} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
