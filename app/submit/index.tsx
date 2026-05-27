import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Clock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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

interface FanContest {
  id: string;
  title: string;
  cover_url: string | null;
  ends_at: string | null;
}

const SUBMISSION_TYPES = [
  { type: 'dance_challenge', emoji: '🕺', label: 'Dance Challenge', desc: 'Show your moves' },
  { type: 'rap_challenge', emoji: '🎤', label: 'Rap Challenge', desc: 'Spit your bars' },
  { type: 'fan_art', emoji: '🎨', label: 'Fan Art', desc: 'Share your artwork' },
  { type: 'performance_clip', emoji: '🎬', label: 'Performance', desc: 'Live performance clip' },
  { type: 'remix', emoji: '🔁', label: 'Remix', desc: 'Your remix or cover' },
  { type: 'beat', emoji: '🥁', label: 'Beat', desc: 'Original beat or track' },
  { type: 'talent', emoji: '⭐', label: 'Talent', desc: 'Show your talent' },
  { type: 'other', emoji: '✨', label: 'Other', desc: 'Something else' },
];

export default function SubmitIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeContest, setActiveContest] = useState<FanContest | null>(null);
  const [contestLoading, setContestLoading] = useState(true);

  useEffect(() => {
    loadActiveContest();
  }, []);

  const loadActiveContest = async () => {
    try {
      const now = new Date().toISOString();
      const { data } = await db
        .from('fan_contests')
        .select('id, title, cover_url, ends_at')
        .eq('is_active', true)
        .gt('ends_at', now)
        .order('ends_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      setActiveContest(data ?? null);
    } catch (err) {
      console.error('[Submit] loadActiveContest error:', err);
    } finally {
      setContestLoading(false);
    }
  };

  const handleTypePress = (type: string) => {
    console.log('[Submit] Type selected:', type);
    if (!user) {
      router.push('/fan-auth');
      return;
    }
    router.push(`/submit/upload?type=${type}`);
  };

  const handleContestPress = () => {
    if (!activeContest) return;
    console.log('[Submit] Contest banner pressed:', activeContest.id);
    if (!user) {
      router.push('/fan-auth');
      return;
    }
    router.push(`/submit/upload?type=contest_entry&contest_id=${activeContest.id}`);
  };

  const endsText = daysUntil(activeContest?.ends_at ?? null);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 80,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 }}>
          Share Your Talent
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
          Submit your content to the HHR community. All submissions are reviewed before going live.
        </Text>
      </View>

      {/* Active Contest Banner */}
      {contestLoading ? (
        <SkeletonLine width="100%" height={100} borderRadius={14} style={{ marginBottom: 20 }} />
      ) : activeContest ? (
        <AnimatedPressable onPress={handleContestPress} style={{ marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.4)',
            }}
          >
            {activeContest.cover_url ? (
              <Image
                source={resolveImageSource(activeContest.cover_url)}
                style={{ width: '100%', height: 80 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 60,
                  backgroundColor: 'rgba(245,158,11,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trophy size={28} color="#F59E0B" />
              </View>
            )}
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(245,158,11,0.15)',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderWidth: 1,
                      borderColor: 'rgba(245,158,11,0.4)',
                    }}
                  >
                    <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '700' }}>ACTIVE CONTEST</Text>
                  </View>
                  {endsText ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} color={COLORS.textSecondary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{endsText}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                  {activeContest.title}
                </Text>
                <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                  Submit your entry →
                </Text>
              </View>
            </View>
          </View>
        </AnimatedPressable>
      ) : null}

      {/* My Submissions link */}
      <AnimatedPressable
        onPress={() => {
          console.log('[Submit] My Submissions pressed');
          router.push('/submit/my-submissions');
        }}
        style={{ marginBottom: 20 }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 20 }}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>My Submissions</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 1 }}>Track your submission status</Text>
          </View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>→</Text>
        </View>
      </AnimatedPressable>

      {/* Type grid */}
      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
        Choose a type
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {SUBMISSION_TYPES.map((item) => (
          <AnimatedPressable
            key={item.type}
            onPress={() => handleTypePress(item.type)}
            style={{ width: '47%' }}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                minHeight: 110,
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
                  {item.label}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {item.desc}
                </Text>
              </View>
            </View>
          </AnimatedPressable>
        ))}
      </View>

      {/* Browse submissions */}
      <AnimatedPressable
        onPress={() => {
          console.log('[Submit] Browse submissions pressed');
          router.push('/submissions');
        }}
        style={{ marginTop: 20 }}
      >
        <View
          style={{
            backgroundColor: COLORS.primaryMuted,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.primary,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '700' }}>
            Browse Fan Submissions
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
