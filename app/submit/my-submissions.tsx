import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

interface Submission {
  id: string;
  title: string;
  submission_type: string;
  media_type: string;
  thumbnail_url: string | null;
  status: string;
  moderation_notes: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  pending: { emoji: '🟡', label: 'Pending Review', color: '#F59E0B' },
  approved: { emoji: '🟢', label: 'Approved', color: '#22C55E' },
  featured: { emoji: '⭐', label: 'Featured', color: COLORS.primary },
  rejected: { emoji: '🔴', label: 'Rejected', color: COLORS.danger },
  removed: { emoji: '⚫', label: 'Removed', color: COLORS.textTertiary },
};

const TYPE_LABELS: Record<string, string> = {
  dance_challenge: 'Dance Challenge',
  rap_challenge: 'Rap Challenge',
  fan_art: 'Fan Art',
  performance_clip: 'Performance',
  remix: 'Remix',
  beat: 'Beat',
  talent: 'Talent',
  contest_entry: 'Contest Entry',
  other: 'Other',
};

export default function MySubmissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[MySubmissions] Loading submissions for user:', user.id);
      const { data, error } = await db
        .from('submissions')
        .select('id, title, submission_type, media_type, thumbnail_url, status, moderation_notes, like_count, view_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MySubmissions] Error:', error.message);
      } else {
        setSubmissions((data ?? []) as Submission[]);
        console.log('[MySubmissions] Loaded', (data ?? []).length, 'submissions');
      }
    } catch (err) {
      console.error('[MySubmissions] loadSubmissions error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadSubmissions();
    else setLoading(false);
  }, [user, loadSubmissions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubmissions();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' }}>
          Sign in to view your submissions
        </Text>
        <AnimatedPressable onPress={() => router.push('/fan-auth')} style={{ marginTop: 16 }}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 }}>
            <Text style={{ color: COLORS.background, fontSize: 14, fontWeight: '700' }}>Sign In</Text>
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <FileText size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
          My Submissions
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 12 }}>
          {[0, 1, 2].map((k) => (
            <View
              key={k}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                gap: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <SkeletonLine width={72} height={72} borderRadius={10} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonLine width="70%" height={14} />
                <SkeletonLine width="40%" height={12} />
                <SkeletonLine width="50%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : submissions.length === 0 ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 40,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
          <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
            No submissions yet
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 260, marginBottom: 20 }}>
            Share your talent with the HHR community — submit a dance, rap, art, or performance clip.
          </Text>
          <AnimatedPressable onPress={() => {
            console.log('[MySubmissions] Submit content pressed');
            router.push('/submit');
          }}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ color: COLORS.background, fontSize: 14, fontWeight: '700' }}>Submit Content</Text>
            </View>
          </AnimatedPressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {submissions.map((sub) => {
            const statusCfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
            const typeLabel = TYPE_LABELS[sub.submission_type] ?? sub.submission_type;
            const timeText = timeAgo(sub.created_at);

            return (
              <AnimatedPressable
                key={sub.id}
                onPress={() => {
                  console.log('[MySubmissions] Submission tapped:', sub.id);
                  router.push(`/submissions/${sub.id}`);
                }}
              >
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: 'row',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  {/* Thumbnail */}
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      backgroundColor: COLORS.surfaceSecondary,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {sub.thumbnail_url ? (
                      <Image
                        source={resolveImageSource(sub.thumbnail_url)}
                        style={{ width: 72, height: 72 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 28 }}>
                        {sub.media_type === 'video' ? '🎬' : sub.media_type === 'image' ? '🖼️' : '🎵'}
                      </Text>
                    )}
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                      {sub.title}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {typeLabel}
                    </Text>

                    {/* Status pill */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <View
                        style={{
                          backgroundColor: `${statusCfg.color}18`,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderWidth: 1,
                          borderColor: `${statusCfg.color}40`,
                        }}
                      >
                        <Text style={{ color: statusCfg.color, fontSize: 11, fontWeight: '700' }}>
                          {statusCfg.emoji}
                          {' '}
                          {statusCfg.label}
                        </Text>
                      </View>
                    </View>

                    {/* Rejection notes */}
                    {sub.status === 'rejected' && sub.moderation_notes ? (
                      <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: 4, lineHeight: 15 }} numberOfLines={2}>
                        {sub.moderation_notes}
                      </Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                        ❤️
                        {' '}
                        {String(sub.like_count)}
                      </Text>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                        👁
                        {' '}
                        {String(sub.view_count)}
                      </Text>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                        {timeText}
                      </Text>
                    </View>
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
