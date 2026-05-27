import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Clock, Gift } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

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
  const insets = useSafeAreaInsets();
  const [contest, setContest] = useState<FanContest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadContest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadContest = async () => {
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
  };

  const endsText = daysUntil(contest?.ends_at ?? null);

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

            {/* Coming soon banner */}
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 32 }}>🚀</Text>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 16,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                Submissions open soon
              </Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 14,
                  textAlign: 'center',
                  lineHeight: 20,
                  maxWidth: 280,
                }}
              >
                Contest submissions will be available in the next update. Stay tuned!
              </Text>
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
