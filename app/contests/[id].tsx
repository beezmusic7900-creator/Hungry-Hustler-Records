import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Clock, Gift, Heart } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface FanContest {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  prize_description: string | null;
  submission_type: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

interface TopEntry {
  id: string;
  user_id: string;
  title: string;
  thumbnail_url: string | null;
  like_count: number;
  fan_profiles?: {
    display_name: string | null;
    username: string | null;
  } | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Ends tomorrow';
  return `Ends in ${days} days`;
}

export default function ContestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [contest, setContest] = useState<FanContest | null>(null);
  const [loading, setLoading] = useState(true);
  const [topEntries, setTopEntries] = useState<TopEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const loadContest = useCallback(async () => {
    if (!id) return;
    try {
      console.log('[Contest] Loading contest:', id);
      setLoading(true);
      const { data, error } = await db
        .from('fan_contests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[Contest] Error:', error.message);
      } else {
        setContest(data ?? null);
      }
    } catch (err) {
      console.error('[Contest] loadContest error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTopEntries = useCallback(async () => {
    if (!id) return;
    try {
      setEntriesLoading(true);
      console.log('[Contest] Loading top entries for contest:', id);
      const { data, error } = await db
        .from('submissions')
        .select('id, user_id, title, thumbnail_url, like_count, fan_profiles(display_name, username)')
        .eq('contest_id', id)
        .in('status', ['approved', 'featured'])
        .order('like_count', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[Contest] Top entries error:', error.message);
      } else {
        setTopEntries((data ?? []) as TopEntry[]);
        console.log('[Contest] Loaded', (data ?? []).length, 'top entries');
      }
    } catch (err) {
      console.error('[Contest] loadTopEntries error:', err);
    } finally {
      setEntriesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadContest();
      loadTopEntries();
    }
  }, [id, loadContest, loadTopEntries]);

  const endsText = daysUntil(contest?.ends_at ?? null);

  const handleSubmitEntry = () => {
    console.log('[Contest] Submit entry pressed for contest:', id);
    if (!user) {
      router.push('/fan-auth');
      return;
    }
    router.push(`/submit/upload?type=contest_entry&contest_id=${id}`);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cover image */}
      {loading ? (
        <SkeletonLine width="100%" height={220} borderRadius={0} />
      ) : contest?.cover_url ? (
        <Image
          source={resolveImageSource(contest.cover_url)}
          style={{ width: '100%', height: 220 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 220,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trophy size={48} color={COLORS.primary} />
        </View>
      )}

      <View style={{ padding: 20 }}>
        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonLine width="70%" height={24} />
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="90%" height={14} />
          </View>
        ) : contest ? (
          <>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 24,
                fontWeight: '700',
                letterSpacing: -0.4,
                marginBottom: 8,
              }}
            >
              {contest.title}
            </Text>

            {/* Status badges */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {contest.is_active && (
                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                    Active
                  </Text>
                </View>
              )}
              {endsText ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Clock size={11} color={COLORS.textSecondary} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' }}>
                    {endsText}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {contest.description ? (
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 15,
                  lineHeight: 24,
                  marginBottom: 20,
                }}
              >
                {contest.description}
              </Text>
            ) : null}

            {/* Prize */}
            {contest.prize_description ? (
              <View
                style={{
                  backgroundColor: 'rgba(245,158,11,0.1)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(245,158,11,0.3)',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <Gift size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
                    Prize
                  </Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 20 }}>
                    {contest.prize_description}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Submit Entry CTA */}
            {contest.is_active && (
              <AnimatedPressable onPress={handleSubmitEntry} style={{ marginBottom: 24 }}>
                <View
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '800' }}>
                    Submit Your Entry
                  </Text>
                  <Text style={{ color: `${COLORS.background}99`, fontSize: 12 }}>
                    Tap to upload your submission
                  </Text>
                </View>
              </AnimatedPressable>
            )}

            {/* Top Entries Leaderboard */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Trophy size={16} color="#F59E0B" />
                  <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>
                    Top Entries
                  </Text>
                </View>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Contest] View all entries pressed');
                    router.push(`/submissions?contest_id=${id}`);
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                    View All →
                  </Text>
                </AnimatedPressable>
              </View>

              {entriesLoading ? (
                <View style={{ gap: 8 }}>
                  {[0, 1, 2].map((k) => (
                    <View
                      key={k}
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 12,
                        padding: 12,
                        flexDirection: 'row',
                        gap: 10,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <SkeletonLine width={48} height={48} borderRadius={8} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <SkeletonLine width="60%" height={13} />
                        <SkeletonLine width="40%" height={11} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : topEntries.length === 0 ? (
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
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>
                    No entries yet — be the first to submit!
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {topEntries.map((entry, index) => {
                    const rankText = `#${index + 1}`;
                    const ownerName = entry.fan_profiles?.display_name ?? entry.fan_profiles?.username ?? 'Fan';
                    const likeText = String(entry.like_count);

                    return (
                      <AnimatedPressable
                        key={entry.id}
                        onPress={() => {
                          console.log('[Contest] Entry tapped:', entry.id);
                          router.push(`/submissions/${entry.id}`);
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
                            borderColor: index === 0 ? 'rgba(245,158,11,0.4)' : COLORS.border,
                          }}
                        >
                          <Text
                            style={{
                              color: index === 0 ? '#F59E0B' : COLORS.textSecondary,
                              fontSize: 15,
                              fontWeight: '800',
                              width: 28,
                            }}
                          >
                            {rankText}
                          </Text>
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 8,
                              backgroundColor: COLORS.surfaceSecondary,
                              overflow: 'hidden',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {entry.thumbnail_url ? (
                              <Image
                                source={resolveImageSource(entry.thumbnail_url)}
                                style={{ width: 48, height: 48 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={{ fontSize: 22 }}>🎬</Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                              {entry.title}
                            </Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                              {ownerName}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Heart size={13} color={COLORS.danger} fill={COLORS.danger} />
                            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
                              {likeText}
                            </Text>
                          </View>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>
              Contest not found.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
