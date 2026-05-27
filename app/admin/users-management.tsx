import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, User, X, AlertTriangle } from 'lucide-react-native';
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

interface FanUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  fan_rewards?: {
    total_points: number;
    level: string;
  } | null;
}

interface UserWarning {
  id: string;
  reason: string;
  severity: string;
  created_at: string;
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'admins', label: 'Admins' },
  { key: 'warned', label: 'Warned' },
];

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'ban'];

export default function UsersManagementScreen() {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<FanUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<FanUser | null>(null);
  const [userWarnings, setUserWarnings] = useState<UserWarning[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnReason, setWarnReason] = useState('');
  const [warnSeverity, setWarnSeverity] = useState('medium');
  const [processing, setProcessing] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      console.log('[UsersManagement] Loading users, filter:', filter, 'search:', searchQuery);
      let query = db
        .from('fan_profiles')
        .select('id, display_name, username, avatar_url, is_admin, created_at, fan_rewards(total_points, level)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'admins') {
        query = query.eq('is_admin', true);
      }

      if (searchQuery.trim()) {
        query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[UsersManagement] Error:', error.message);
      } else {
        let result = (data ?? []) as FanUser[];

        if (filter === 'warned') {
          // Get warned user IDs
          const { data: warnedData } = await db
            .from('user_warnings')
            .select('user_id');
          const warnedIds = new Set((warnedData ?? []).map((w: { user_id: string }) => w.user_id));
          result = result.filter((u) => warnedIds.has(u.id));
        }

        setUsers(result);
        console.log('[UsersManagement] Loaded', result.length, 'users');
      }
    } catch (err) {
      console.error('[UsersManagement] loadUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => loadUsers(), searchQuery ? 400 : 0);
    return () => clearTimeout(timer);
  }, [loadUsers, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const loadUserWarnings = async (userId: string) => {
    setWarningsLoading(true);
    try {
      const { data, error } = await db
        .from('user_warnings')
        .select('id, reason, severity, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[UsersManagement] loadUserWarnings error:', error.message);
      } else {
        setUserWarnings((data ?? []) as UserWarning[]);
      }
    } catch (err) {
      console.error('[UsersManagement] loadUserWarnings error:', err);
    } finally {
      setWarningsLoading(false);
    }
  };

  const handleSelectUser = (u: FanUser) => {
    console.log('[UsersManagement] User selected:', u.id);
    setSelectedUser(u);
    loadUserWarnings(u.id);
  };

  const handleIssueWarning = async () => {
    if (!selectedUser || !currentUser || !warnReason.trim()) return;
    console.log('[UsersManagement] Issuing warning to:', selectedUser.id, 'severity:', warnSeverity);
    setProcessing(true);
    try {
      const { error } = await db.from('user_warnings').insert({
        user_id: selectedUser.id,
        issued_by: currentUser.id,
        reason: warnReason.trim(),
        severity: warnSeverity,
      });
      if (error) {
        console.error('[UsersManagement] Issue warning error:', error.message);
        Alert.alert('Error', 'Could not issue warning.');
        return;
      }
      console.log('[UsersManagement] Warning issued successfully');
      setShowWarnModal(false);
      setWarnReason('');
      setWarnSeverity('medium');
      loadUserWarnings(selectedUser.id);
    } catch (err) {
      console.error('[UsersManagement] handleIssueWarning error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleAdmin = async (u: FanUser) => {
    const action = u.is_admin ? 'Remove admin from' : 'Make admin';
    const name = u.display_name ?? u.username ?? 'this user';
    Alert.alert(
      `${action} ${name}?`,
      u.is_admin ? 'They will lose admin access.' : 'They will gain full admin access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            console.log('[UsersManagement] Toggling admin for:', u.id);
            try {
              await db.from('fan_profiles').update({ is_admin: !u.is_admin }).eq('id', u.id);
              setUsers((prev) => prev.map((p) => p.id === u.id ? { ...p, is_admin: !u.is_admin } : p));
              if (selectedUser?.id === u.id) {
                setSelectedUser((prev) => prev ? { ...prev, is_admin: !prev.is_admin } : null);
              }
            } catch (err) {
              console.error('[UsersManagement] handleToggleAdmin error:', err);
            }
          },
        },
      ]
    );
  };

  const handleBanUser = async (u: FanUser) => {
    const name = u.display_name ?? u.username ?? 'this user';
    Alert.alert(
      `Ban ${name}?`,
      'This will issue a ban-level warning. The user will be signed out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban User',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            console.log('[UsersManagement] Banning user:', u.id);
            try {
              await db.from('user_warnings').insert({
                user_id: u.id,
                issued_by: currentUser.id,
                reason: 'Account banned by admin',
                severity: 'ban',
              });
              Alert.alert('User banned', `${name} has been banned.`);
              loadUserWarnings(u.id);
            } catch (err) {
              console.error('[UsersManagement] handleBanUser error:', err);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Search + filters */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Search size={16} color={COLORS.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by username or name..."
            placeholderTextColor={COLORS.textTertiary}
            style={{ flex: 1, color: COLORS.text, fontSize: 14 }}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <AnimatedPressable onPress={() => setSearchQuery('')}>
              <X size={16} color={COLORS.textSecondary} />
            </AnimatedPressable>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.key;
            return (
              <AnimatedPressable
                key={opt.key}
                onPress={() => {
                  console.log('[UsersManagement] Filter changed:', opt.key);
                  setFilter(opt.key);
                }}
              >
                <View
                  style={{
                    backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? COLORS.background : COLORS.textSecondary,
                      fontSize: 13,
                      fontWeight: isActive ? '700' : '400',
                    }}
                  >
                    {opt.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2, 3].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <SkeletonLine width={44} height={44} borderRadius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLine width="50%" height={14} />
                  <SkeletonLine width="30%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : users.length === 0 ? (
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
            <User size={32} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
              No users found
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {users.map((u) => {
              const name = u.display_name ?? u.username ?? 'Unknown';
              const username = u.username ? `@${u.username}` : null;
              const points = u.fan_rewards?.total_points ?? 0;
              const level = u.fan_rewards?.level ?? null;

              return (
                <AnimatedPressable
                  key={u.id}
                  onPress={() => handleSelectUser(u)}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: u.is_admin ? COLORS.primary : COLORS.border,
                      }}
                    >
                      {u.avatar_url ? (
                        <Image
                          source={resolveImageSource(u.avatar_url)}
                          style={{ width: 44, height: 44, borderRadius: 22 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <User size={20} color={COLORS.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                          {name}
                        </Text>
                        {u.is_admin && (
                          <View
                            style={{
                              backgroundColor: COLORS.primaryMuted,
                              borderRadius: 4,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderWidth: 1,
                              borderColor: COLORS.primary,
                            }}
                          >
                            <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800' }}>ADMIN</Text>
                          </View>
                        )}
                      </View>
                      {username ? (
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 1 }}>{username}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                        <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                          {points.toLocaleString()}
                          {' pts'}
                        </Text>
                        {level ? (
                          <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '600' }}>{level}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Text style={{ color: COLORS.textTertiary, fontSize: 14 }}>›</Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* User detail modal */}
      <Modal
        visible={selectedUser !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '85%',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>
                {selectedUser?.display_name ?? selectedUser?.username ?? 'User'}
              </Text>
              <AnimatedPressable onPress={() => setSelectedUser(null)}>
                <X size={20} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Warnings */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <AlertTriangle size={14} color={COLORS.warning} />
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
                    Warnings
                    {' '}
                    {warningsLoading ? '' : `(${userWarnings.length})`}
                  </Text>
                </View>
                {warningsLoading ? (
                  <SkeletonLine width="100%" height={40} borderRadius={8} />
                ) : userWarnings.length === 0 ? (
                  <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>No warnings issued</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {userWarnings.map((w) => (
                      <View
                        key={w.id}
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: w.severity === 'ban' ? COLORS.danger : COLORS.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <View
                            style={{
                              backgroundColor: w.severity === 'ban' ? 'rgba(255,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                              borderRadius: 4,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ color: w.severity === 'ban' ? COLORS.danger : '#F59E0B', fontSize: 10, fontWeight: '700' }}>
                              {w.severity.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: COLORS.text, fontSize: 13 }}>{w.reason}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={{ gap: 10 }}>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[UsersManagement] Issue warning pressed');
                    setShowWarnModal(true);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: 'rgba(245,158,11,0.12)',
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(245,158,11,0.3)',
                    }}
                  >
                    <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '700' }}>⚠️ Issue Warning</Text>
                  </View>
                </AnimatedPressable>

                {selectedUser && (
                  <AnimatedPressable onPress={() => handleToggleAdmin(selectedUser)}>
                    <View
                      style={{
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 12,
                        paddingVertical: 14,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                      }}
                    >
                      <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                        {selectedUser.is_admin ? '🔒 Remove Admin' : '🔑 Promote to Admin'}
                      </Text>
                    </View>
                  </AnimatedPressable>
                )}

                {selectedUser && (
                  <AnimatedPressable onPress={() => handleBanUser(selectedUser)}>
                    <View
                      style={{
                        backgroundColor: 'rgba(255,68,68,0.12)',
                        borderRadius: 12,
                        paddingVertical: 14,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255,68,68,0.3)',
                      }}
                    >
                      <Text style={{ color: COLORS.danger, fontSize: 14, fontWeight: '700' }}>🚫 Ban User</Text>
                    </View>
                  </AnimatedPressable>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Issue warning modal */}
      <Modal
        visible={showWarnModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWarnModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 40,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>Issue Warning</Text>
              <AnimatedPressable onPress={() => setShowWarnModal(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>

            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>Severity:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {SEVERITY_OPTIONS.map((sev) => {
                const isSelected = warnSeverity === sev;
                const color = sev === 'ban' ? COLORS.danger : sev === 'high' ? '#F97316' : sev === 'medium' ? '#F59E0B' : '#22C55E';
                return (
                  <AnimatedPressable
                    key={sev}
                    onPress={() => {
                      console.log('[UsersManagement] Severity selected:', sev);
                      setWarnSeverity(sev);
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: isSelected ? `${color}20` : COLORS.surfaceSecondary,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderWidth: 1,
                        borderColor: isSelected ? color : COLORS.border,
                      }}
                    >
                      <Text style={{ color: isSelected ? color : COLORS.textSecondary, fontSize: 12, fontWeight: isSelected ? '700' : '400' }}>
                        {sev}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>Reason:</Text>
            <TextInput
              value={warnReason}
              onChangeText={setWarnReason}
              placeholder="Describe the reason for this warning..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: COLORS.text,
                fontSize: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
            />
            <AnimatedPressable
              onPress={handleIssueWarning}
              disabled={!warnReason.trim() || processing}
            >
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: !warnReason.trim() || processing ? 0.5 : 1,
                }}
              >
                <Text style={{ color: '#000', fontSize: 15, fontWeight: '700' }}>
                  {processing ? 'Issuing...' : 'Issue Warning'}
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
