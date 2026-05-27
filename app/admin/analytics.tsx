import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2, Music } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

interface OverviewMetric {
  label: string;
  value: number | string;
  delta?: string;
  color?: string;
}

interface TopSong {
  song_id: string;
  title: string;
  artist: string;
  play_count: number;
}

interface DayPoint {
  date: string;
  plays: number;
}

interface AnalyticsData {
  overview: Record<string, number | string>;
  top_songs: TopSong[];
  engagement_funnel?: DayPoint[];
}

const METRIC_KEYS: { key: string; label: string; color?: string }[] = [
  { key: 'total_users', label: 'Total Users' },
  { key: 'dau', label: 'DAU' },
  { key: 'wau', label: 'WAU' },
  { key: 'mau', label: 'MAU' },
  { key: 'plays_24h', label: 'Plays 24h', color: COLORS.primary },
  { key: 'pending_submissions', label: 'Pending Submissions', color: '#F59E0B' },
  { key: 'open_reports', label: 'Open Reports', color: COLORS.danger },
  { key: 'rsvps_7d', label: 'RSVPs 7d' },
  { key: 'comments_24h', label: 'Comments 24h' },
  { key: 'total_points_distributed', label: 'Points Distributed' },
  { key: 'new_users_7d', label: 'New Users 7d', color: '#22C55E' },
];

function MetricCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : String(value ?? '—');
  const textColor = color ?? COLORS.text;

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        width: '47%',
        minHeight: 80,
        justifyContent: 'space-between',
      }}
    >
      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }} numberOfLines={2}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: textColor, fontSize: 24, fontWeight: '800', marginTop: 8 }}>
        {displayValue}
      </Text>
    </View>
  );
}

function Sparkline({ data }: { data: DayPoint[] }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.plays), 1);
  const barWidth = Math.floor(300 / data.length) - 2;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 60 }}>
      {data.map((point, i) => {
        const heightPct = point.plays / maxVal;
        const barHeight = Math.max(4, Math.round(heightPct * 56));
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: barHeight,
              backgroundColor: COLORS.primary,
              borderRadius: 2,
              opacity: 0.6 + heightPct * 0.4,
            }}
          />
        );
      })}
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      console.log('[AdminAnalytics] Loading analytics');
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-admin-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[AdminAnalytics] Error:', res.status, text);
        setError('Could not load analytics. Check your admin permissions.');
        return;
      }

      const json = await res.json();
      console.log('[AdminAnalytics] Loaded analytics data');
      setData(json as AnalyticsData);
    } catch (err) {
      console.error('[AdminAnalytics] loadAnalytics error:', err);
      setError('Could not load analytics. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 80,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <BarChart2 size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
          Analytics
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <SkeletonLine key={k} width="47%" height={80} borderRadius={14} />
            ))}
          </View>
        </View>
      ) : error ? (
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
          <Text style={{ color: COLORS.danger, fontSize: 15, textAlign: 'center', marginBottom: 16 }}>
            {error}
          </Text>
          <AnimatedPressable onPress={loadAnalytics}>
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
      ) : (
        <>
          {/* Overview metrics grid */}
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
            Overview
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            {METRIC_KEYS.map((m) => {
              const val = data?.overview?.[m.key] ?? 0;
              return (
                <MetricCard key={m.key} label={m.label} value={val} color={m.color} />
              );
            })}
          </View>

          {/* Top Songs */}
          {data?.top_songs && data.top_songs.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Music size={16} color={COLORS.primary} />
                <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>
                  Top Songs (7 days)
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {data.top_songs.map((song, index) => {
                  const rankText = `#${index + 1}`;
                  const playsText = song.play_count.toLocaleString();
                  return (
                    <View
                      key={song.song_id}
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 12,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '800', width: 28 }}>
                        {rankText}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 1 }}>
                          {song.artist}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: COLORS.primaryMuted,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderWidth: 1,
                          borderColor: COLORS.primary,
                        }}
                      >
                        <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>
                          {playsText}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Engagement Trend */}
          {data?.engagement_funnel && data.engagement_funnel.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 14 }}>
                Plays Trend (30 days)
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Sparkline data={data.engagement_funnel} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                    {data.engagement_funnel[0]?.date ?? ''}
                  </Text>
                  <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                    {data.engagement_funnel[data.engagement_funnel.length - 1]?.date ?? ''}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
