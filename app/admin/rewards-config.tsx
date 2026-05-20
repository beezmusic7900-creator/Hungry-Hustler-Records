import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Settings, Save } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabasePublic } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic = supabasePublic as any;

interface PointConfig {
  id: string;
  action_type: string;
  points: number;
  cooldown_minutes: number;
  is_active: boolean;
  label: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number | null;
  action_type: string | null;
  action_count: number | null;
}

interface EditState {
  points: string;
  cooldown: string;
  is_active: boolean;
  saving: boolean;
}

function formatActionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminRewardsConfigScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const [configs, setConfigs] = useState<PointConfig[]>([]);
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin' as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    console.log('[RewardsConfig] Checking admin role for user:', user.id);
    dbPublic
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { role: string } | null }) => {
        const admin = data?.role === 'admin' || data?.role === 'super_admin';
        console.log('[RewardsConfig] Role:', data?.role, '— isAdmin:', admin);
        setIsAdmin(admin);
        setRoleChecked(true);
      });
  }, [user]);

  const loadData = useCallback(async () => {
    try {
      console.log('[RewardsConfig] Loading reward configs and achievements');
      const [configRes, achRes] = await Promise.all([
        db.from('reward_point_config').select('*').order('action_type'),
        db.from('achievements').select('*').order('name'),
      ]);

      if (configRes.error) {
        console.error('[RewardsConfig] Config load error:', configRes.error.message);
      } else {
        const cfgs = (configRes.data ?? []) as PointConfig[];
        setConfigs(cfgs);
        const states: Record<string, EditState> = {};
        cfgs.forEach((c) => {
          states[c.id] = {
            points: String(c.points),
            cooldown: String(c.cooldown_minutes),
            is_active: c.is_active,
            saving: false,
          };
        });
        setEditStates(states);
        console.log('[RewardsConfig] Loaded', cfgs.length, 'configs');
      }

      if (achRes.error) {
        console.error('[RewardsConfig] Achievement load error:', achRes.error.message);
      } else {
        setAchievements((achRes.data ?? []) as Achievement[]);
        console.log('[RewardsConfig] Loaded', achRes.data?.length ?? 0, 'achievements');
      }
    } catch (err) {
      console.error('[RewardsConfig] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateEditState = (id: string, patch: Partial<EditState>) => {
    setEditStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSave = async (config: PointConfig) => {
    const state = editStates[config.id];
    if (!state) return;
    const points = parseInt(state.points, 10);
    const cooldown = parseInt(state.cooldown, 10);
    if (isNaN(points) || isNaN(cooldown)) {
      Alert.alert('Invalid values', 'Points and cooldown must be numbers.');
      return;
    }
    console.log('[RewardsConfig] Save config pressed:', config.action_type, { points, cooldown, is_active: state.is_active });
    updateEditState(config.id, { saving: true });
    try {
      const { error } = await db
        .from('reward_point_config')
        .update({ points, cooldown_minutes: cooldown, is_active: state.is_active })
        .eq('id', config.id);
      if (error) {
        console.error('[RewardsConfig] Save error:', error.message);
        Alert.alert('Error', error.message);
      } else {
        console.log('[RewardsConfig] Config saved:', config.action_type);
        Alert.alert('Saved', `${formatActionLabel(config.action_type)} updated.`);
      }
    } catch (err) {
      console.error('[RewardsConfig] handleSave error:', err);
      Alert.alert('Error', 'Could not save config.');
    } finally {
      updateEditState(config.id, { saving: false });
    }
  };

  if (authLoading || !roleChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          You need admin privileges to access this screen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: 80,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Point Config Section ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Settings size={18} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
          Point Actions
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((k) => (
            <View
              key={k}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 10,
              }}
            >
              <SkeletonLine width="50%" height={15} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <SkeletonLine width={80} height={40} borderRadius={10} />
                <SkeletonLine width={80} height={40} borderRadius={10} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 12, marginBottom: 32 }}>
          {configs.map((config) => {
            const state = editStates[config.id];
            if (!state) return null;
            const label = config.label ?? formatActionLabel(config.action_type);
            return (
              <View
                key={config.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 }}>
                    {label}
                  </Text>
                  <Switch
                    value={state.is_active}
                    onValueChange={(val) => {
                      console.log('[RewardsConfig] Toggle active for:', config.action_type, val);
                      updateEditState(config.id, { is_active: val });
                    }}
                    trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryMuted }}
                    thumbColor={state.is_active ? COLORS.primary : COLORS.textTertiary}
                  />
                </View>

                {/* Inputs row */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
                      POINTS
                    </Text>
                    <TextInput
                      value={state.points}
                      onChangeText={(v) => updateEditState(config.id, { points: v })}
                      keyboardType="numeric"
                      style={{
                        backgroundColor: COLORS.surfaceSecondary,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: COLORS.text,
                        fontSize: 15,
                        fontWeight: '700',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        textAlign: 'center',
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
                      COOLDOWN (min)
                    </Text>
                    <TextInput
                      value={state.cooldown}
                      onChangeText={(v) => updateEditState(config.id, { cooldown: v })}
                      keyboardType="numeric"
                      style={{
                        backgroundColor: COLORS.surfaceSecondary,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: COLORS.text,
                        fontSize: 15,
                        fontWeight: '700',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        textAlign: 'center',
                      }}
                    />
                  </View>
                </View>

                {/* Save button */}
                <AnimatedPressable onPress={() => handleSave(config)} disabled={state.saving}>
                  <View
                    style={{
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 10,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: COLORS.primary,
                      opacity: state.saving ? 0.7 : 1,
                    }}
                  >
                    <Save size={14} color={COLORS.primary} />
                    <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
                      {state.saving ? 'Saving...' : 'Save'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Achievements Section ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Trophy size={18} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
          Achievements
        </Text>
        {!loading && (
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
              {achievements.length}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map((k) => (
            <View
              key={k}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                gap: 12,
              }}
            >
              <SkeletonLine width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonLine width="60%" height={14} />
                <SkeletonLine width="90%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : achievements.length === 0 ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 28,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Trophy size={28} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10, textAlign: 'center' }}>
            No achievements defined
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {achievements.map((ach) => {
            const reqText = ach.points_required
              ? `${ach.points_required} pts required`
              : ach.action_count && ach.action_type
              ? `${ach.action_count}x ${formatActionLabel(ach.action_type ?? '')}`
              : null;
            return (
              <View
                key={ach.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <Text style={{ fontSize: 32 }}>{ach.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
                    {ach.name}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                    {ach.description}
                  </Text>
                  {reqText ? (
                    <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                      {reqText}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
