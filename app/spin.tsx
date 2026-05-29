import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Modal,
  Alert,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gift, Clock, RefreshCw } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

interface SpinResult {
  prize_type: string;
  prize_value: string | null;
  coupon_code: string | null;
  points_awarded: number | null;
  message: string;
}

interface SpinLogEntry {
  id: string;
  prize_type: string;
  prize_value: string | null;
  coupon_code: string | null;
  points_awarded: number | null;
  spun_at: string;
}

const WEDGES = [
  { label: 'Points', color: COLORS.primary, emoji: '⚡' },
  { label: 'Free Shipping', color: '#3B82F6', emoji: '📦' },
  { label: '10% Off', color: '#F59E0B', emoji: '🏷️' },
  { label: 'Exclusive Unlock', color: '#8B5CF6', emoji: '🔓' },
  { label: 'Coupon', color: '#EC4899', emoji: '🎟️' },
  { label: 'Try Again', color: COLORS.textTertiary, emoji: '😅' },
];

const PRIZE_TYPE_TO_WEDGE: Record<string, number> = {
  points: 0,
  free_shipping: 1,
  discount_10: 2,
  exclusive_unlock: 3,
  coupon: 4,
  no_prize: 5,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function getCountdownToMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function SpinScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [history, setHistory] = useState<SpinLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  useEffect(() => {
    if (alreadySpun) {
      setCountdown(getCountdownToMidnight());
      const interval = setInterval(() => setCountdown(getCountdownToMidnight()), 60000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [alreadySpun]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      console.log('[Spin] Loading spin history for user:', user.id);
      const { data } = await (supabase as any)
        .from('daily_spin_log')
        .select('id, prize_type, prize_value, coupon_code, points_awarded, spun_at')
        .eq('user_id', user.id)
        .order('spun_at', { ascending: false })
        .limit(10);
      setHistory((data ?? []) as SpinLogEntry[]);
    } catch (err) {
      console.error('[Spin] loadHistory error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const handleSpin = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to spin.');
      return;
    }
    if (spinning || alreadySpun) return;
    console.log('[Spin] Spin button pressed');
    setSpinning(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Start animation immediately (3 full turns + random)
      const extraTurns = 3 + Math.random() * 2;
      const targetDeg = currentRotation.current + extraTurns * 360;

      const spinPromise = new Promise<void>((resolve) => {
        Animated.timing(rotation, {
          toValue: targetDeg,
          duration: 3000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          currentRotation.current = targetDeg % 360;
          resolve();
        });
      });

      // Call edge function in parallel
      const apiPromise = fetch(`${SUPABASE_URL}/functions/v1/daily-spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const [, res] = await Promise.all([spinPromise, apiPromise]);

      if (!res.ok) {
        const text = await res.text();
        console.error('[Spin] daily-spin error:', res.status, text);
        if (res.status === 429 || text.includes('already') || text.includes('spun')) {
          setAlreadySpun(true);
          return;
        }
        Alert.alert('Error', 'Could not complete spin. Please try again.');
        return;
      }

      const json = await res.json() as SpinResult;
      console.log('[Spin] Spin result:', json);

      // Snap wheel to the correct wedge
      const wedgeIndex = PRIZE_TYPE_TO_WEDGE[json.prize_type] ?? 5;
      const wedgeDeg = (wedgeIndex / WEDGES.length) * 360;
      const finalDeg = Math.ceil(targetDeg / 360) * 360 - wedgeDeg;
      rotation.setValue(finalDeg);
      currentRotation.current = finalDeg % 360;

      setResult(json);
      setShowResult(true);
      await loadHistory();
    } catch (err) {
      console.error('[Spin] handleSpin error:', err);
      Alert.alert('Error', 'Could not complete spin.');
    } finally {
      setSpinning(false);
    }
  };

  const rotationDeg = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  if (!authLoading && !user) {
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
        <Gift size={48} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
          Daily Spin to Win
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          Sign in to spin the wheel and win prizes every day
        </Text>
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
        alignItems: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 }}>
        Spin to Win
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginBottom: 32 }}>
        One free spin every day
      </Text>

      {/* Wheel */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        {/* Pointer */}
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 12,
            borderRightWidth: 12,
            borderTopWidth: 20,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: COLORS.text,
            marginBottom: -4,
            zIndex: 10,
          }}
        />

        <Animated.View
          style={{
            width: 260,
            height: 260,
            borderRadius: 130,
            transform: [{ rotate: rotationDeg }],
            overflow: 'hidden',
            borderWidth: 3,
            borderColor: COLORS.border,
            backgroundColor: COLORS.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Wedge dividers (rendered first, behind labels) */}
          {WEDGES.map((_, idx) => {
            const angle = (idx / WEDGES.length) * 360;
            return (
              <View
                key={`divider-${idx}`}
                style={{
                  position: 'absolute',
                  left: 130 - 0.5,
                  top: 0,
                  width: 1,
                  height: 130,
                  backgroundColor: COLORS.border,
                  transform: [
                    { translateY: 65 },
                    { rotate: `${angle}deg` },
                    { translateY: -65 },
                  ],
                }}
              />
            );
          })}

          {/* Wedge labels (rendered on top) */}
          {WEDGES.map((wedge, idx) => {
            const angle = (idx / WEDGES.length) * 360;
            const midAngle = angle + (360 / WEDGES.length / 2);
            const rad = (midAngle * Math.PI) / 180;
            const r = 80;
            const tx = 130 + r * Math.sin(rad);
            const ty = 130 - r * Math.cos(rad);
            return (
              <View
                key={idx}
                style={{
                  position: 'absolute',
                  left: tx - 30,
                  top: ty - 20,
                  width: 60,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: `${midAngle}deg` }],
                }}
              >
                <Text style={{ fontSize: 18 }}>{wedge.emoji}</Text>
                <Text
                  style={{
                    color: wedge.color,
                    fontSize: 8,
                    fontWeight: '800',
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                >
                  {wedge.label}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        {/* Center button */}
        <View
          style={{
            position: 'absolute',
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: COLORS.background,
            borderWidth: 3,
            borderColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            top: 20 + 130 - 35,
          }}
        >
          <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
            SPIN
          </Text>
        </View>
      </View>

      {/* Prizes legend */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 16,
          width: '100%',
          marginBottom: 24,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 }}>
          POSSIBLE PRIZES
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WEDGES.map((w, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 14 }}>{w.emoji}</Text>
              <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '600' }}>{w.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Spin button */}
      {alreadySpun ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 20,
            width: '100%',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
          }}
        >
          <Clock size={28} color={COLORS.textSecondary} />
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 10 }}>
            Come back tomorrow
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>
            Next spin in
            {' '}
            {countdown}
          </Text>
        </View>
      ) : (
        <AnimatedPressable
          onPress={handleSpin}
          disabled={spinning}
          style={{ width: '100%', marginBottom: 16 }}
        >
          <View
            style={{
              backgroundColor: spinning ? COLORS.surfaceSecondary : COLORS.primary,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              opacity: spinning ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                color: spinning ? COLORS.textSecondary : COLORS.background,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: 0.5,
              }}
            >
              {spinning ? 'Spinning...' : '🎰 SPIN NOW'}
            </Text>
          </View>
        </AnimatedPressable>
      )}

      {/* History link */}
      <AnimatedPressable
        onPress={() => {
          console.log('[Spin] View spin history pressed');
          setShowHistory(true);
          loadHistory();
        }}
        style={{ marginBottom: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} color={COLORS.textSecondary} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, textDecorationLine: 'underline' }}>
            View spin history
          </Text>
        </View>
      </AnimatedPressable>

      {/* Result modal */}
      <Modal visible={showResult} transparent animationType="fade" onRequestClose={() => setShowResult(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 24,
              padding: 32,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
              width: '100%',
            }}
          >
            {result && (
              <>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>
                  {result.prize_type === 'no_prize' ? '😢' : '🎉'}
                </Text>
                <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                  {result.prize_type === 'no_prize' ? 'Better luck tomorrow!' : 'You won!'}
                </Text>
                <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                  {result.message}
                </Text>
                {result.coupon_code && (
                  <View
                    style={{
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 10,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: COLORS.primary,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '800', letterSpacing: 2 }}>
                      {result.coupon_code}
                    </Text>
                  </View>
                )}
                {result.points_awarded && result.points_awarded > 0 && (
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginBottom: 16 }}>
                    +
                    {String(result.points_awarded)}
                    {' pts added to your account'}
                  </Text>
                )}
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Spin] Close result modal');
                    setShowResult(false);
                    setAlreadySpun(true);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.primary,
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 40,
                    }}
                  >
                    <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '700' }}>
                      Awesome!
                    </Text>
                  </View>
                </AnimatedPressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* History modal */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: insets.bottom + 24,
              maxHeight: '70%',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
              Spin History
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {historyLoading ? (
                <View style={{ gap: 10 }}>
                  {[0, 1, 2].map((k) => (
                    <SkeletonLine key={k} width="100%" height={48} borderRadius={10} />
                  ))}
                </View>
              ) : history.length === 0 ? (
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 20 }}>
                  No spins yet
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {history.map((entry) => (
                    <View
                      key={entry.id}
                      style={{
                        backgroundColor: COLORS.surfaceSecondary,
                        borderRadius: 10,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <View>
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>
                          {entry.prize_type.replace(/_/g, ' ')}
                        </Text>
                        {entry.coupon_code && (
                          <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 2 }}>
                            Code:
                            {' '}
                            {entry.coupon_code}
                          </Text>
                        )}
                        {entry.points_awarded && entry.points_awarded > 0 && (
                          <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 2 }}>
                            +
                            {String(entry.points_awarded)}
                            {' pts'}
                          </Text>
                        )}
                      </View>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                        {timeAgo(entry.spun_at)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            <AnimatedPressable onPress={() => setShowHistory(false)} style={{ marginTop: 16 }}>
              <View
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Close</Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
