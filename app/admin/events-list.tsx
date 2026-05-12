import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface EventItem {
  id: string;
  title: string;
  event_date: string | null;
  venue: string | null;
  city: string | null;
  is_published: boolean;
}

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return 'Date TBA';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function EventsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      console.log('[AdminEventsList] Loading events');
      const { data, error } = await db
        .from('events')
        .select('id, title, event_date, venue, city, is_published')
        .order('event_date', { ascending: false });

      if (error) {
        console.error('[AdminEventsList] Error:', error.message);
        return;
      }
      setEvents((data ?? []) as unknown as EventItem[]);
      console.log('[AdminEventsList] Loaded', data?.length ?? 0, 'events');
    } catch (err) {
      console.error('[AdminEventsList] Failed:', err);
    }
  }, []);

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleDelete = (event: EventItem) => {
    console.log('[AdminEventsList] Delete pressed for:', event.title);
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[AdminEventsList] Confirming delete:', event.id);
            const { error } = await db.from('events').delete().eq('id', event.id);
            if (error) {
              console.error('[AdminEventsList] Delete error:', error.message);
            } else {
              console.log('[AdminEventsList] Deleted event:', event.id);
              setEvents((prev) => prev.filter((e) => e.id !== event.id));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 8,
                }}
              >
                <SkeletonLine width="70%" height={16} />
                <SkeletonLine width="50%" height={13} />
              </View>
            ))}
          </View>
        ) : events.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Calendar size={48} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 16, marginTop: 16 }}>
              No events yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {events.map((event) => {
              const dateText = formatEventDate(event.event_date);
              const venueCity = [event.venue, event.city].filter(Boolean).join(', ');
              return (
                <View
                  key={event.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}
                        numberOfLines={1}
                      >
                        {event.title}
                      </Text>
                      {!event.is_published && (
                        <View
                          style={{
                            backgroundColor: COLORS.surfaceSecondary,
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: COLORS.textTertiary, fontSize: 10, fontWeight: '600' }}>
                            DRAFT
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 3 }}>
                      {dateText}
                    </Text>
                    {venueCity ? (
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {venueCity}
                      </Text>
                    ) : null}
                  </View>

                  {/* Edit */}
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[AdminEventsList] Edit event:', event.id);
                      router.push(`/admin/event-form?id=${event.id}`);
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                      }}
                    >
                      <Pencil size={16} color={COLORS.primary} />
                    </View>
                  </AnimatedPressable>

                  {/* Delete */}
                  <AnimatedPressable onPress={() => handleDelete(event)}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 68, 68, 0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 68, 68, 0.3)',
                      }}
                    >
                      <Trash2 size={16} color={COLORS.danger} />
                    </View>
                  </AnimatedPressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <AnimatedPressable
        onPress={() => {
          console.log('[AdminEventsList] Add new event');
          router.push('/admin/event-form');
        }}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 24,
          right: 20,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={26} color={COLORS.background} />
        </View>
      </AnimatedPressable>
    </View>
  );
}
