import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface NotifPrefs {
  new_music: boolean;
  merch_drops: boolean;
  level_ups: boolean;
  event_announcements: boolean;
  exclusive_content: boolean;
  artist_posts: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  new_music: true,
  merch_drops: true,
  level_ups: true,
  event_announcements: true,
  exclusive_content: true,
  artist_posts: true,
};

const PREF_LABELS: { key: keyof NotifPrefs; label: string; description: string }[] = [
  { key: 'new_music', label: 'New Music', description: 'Get notified when new songs or albums drop' },
  { key: 'merch_drops', label: 'Merch Drops', description: 'Be first to know about new merchandise' },
  { key: 'level_ups', label: 'Level Ups', description: 'Celebrate when you reach a new fan level' },
  { key: 'event_announcements', label: 'Event Announcements', description: 'Tour dates, shows, and events' },
  { key: 'exclusive_content', label: 'Exclusive Content', description: 'New exclusive content available to unlock' },
  { key: 'artist_posts', label: 'Artist Posts', description: 'Updates and posts from HHR artists' },
];

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof NotifPrefs | null>(null);

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[NotifPrefs] Loading preferences for user:', user.id);
      const { data, error } = await db
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[NotifPrefs] Load error:', error.message);
      } else if (data) {
        setPrefs({
          new_music: data.new_music ?? true,
          merch_drops: data.merch_drops ?? true,
          level_ups: data.level_ups ?? true,
          event_announcements: data.event_announcements ?? true,
          exclusive_content: data.exclusive_content ?? true,
          artist_posts: data.artist_posts ?? true,
        });
        console.log('[NotifPrefs] Loaded prefs:', data);
      } else {
        // Upsert default row
        await db.from('notification_preferences').upsert({
          user_id: user.id,
          ...DEFAULT_PREFS,
        });
        console.log('[NotifPrefs] Created default prefs row');
      }
    } catch (err) {
      console.error('[NotifPrefs] loadPrefs error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleToggle = async (key: keyof NotifPrefs, value: boolean) => {
    if (!user) return;
    console.log('[NotifPrefs] Toggle', key, '->', value);
    setSaving(key);
    setPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      const { error } = await db
        .from('notification_preferences')
        .upsert({ user_id: user.id, [key]: value });
      if (error) {
        console.error('[NotifPrefs] Save error:', error.message);
        setPrefs((prev) => ({ ...prev, [key]: !value })); // revert
      } else {
        console.log('[NotifPrefs] Saved', key, '=', value);
      }
    } catch (err) {
      console.error('[NotifPrefs] handleToggle error:', err);
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: 60,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
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
        <View>
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
            Notifications
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
            Choose what you want to hear about
          </Text>
        </View>
      </View>

      {/* Preferences list */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          overflow: 'hidden',
        }}
      >
        {PREF_LABELS.map((item, index) => {
          const isLast = index === PREF_LABELS.length - 1;
          const isSaving = saving === item.key;
          const value = prefs[item.key];

          return (
            <View
              key={item.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: COLORS.border,
              }}
            >
              {loading ? (
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLine width="50%" height={14} />
                  <SkeletonLine width="80%" height={12} />
                </View>
              ) : (
                <>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600' }}>
                      {item.label}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {item.description}
                    </Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={(v) => handleToggle(item.key, v)}
                    disabled={isSaving}
                    trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryMuted }}
                    thumbColor={value ? COLORS.primary : COLORS.textTertiary}
                    ios_backgroundColor={COLORS.surfaceTertiary}
                  />
                </>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
