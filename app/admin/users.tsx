// NOTE: The user_roles table needs an `email text` column for this screen to work.
// Run: ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS email text;

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserPlus, Trash2, ChevronLeft, Shield } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase, supabasePublic } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#7C3AED',
  super_admin: '#F59E0B',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export default function UsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'super_admin'>('admin');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[Users] No authenticated user, redirecting to admin login');
      router.replace('/(tabs)/admin');
      return;
    }
    if (user) {
      checkRoleAndLoad();
    }
  }, [user, authLoading]);

  const checkRoleAndLoad = async () => {
    console.log('[Users] Checking role for user:', user!.id);
    const { data } = await (supabasePublic as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (data?.role !== 'super_admin') {
      console.log('[Users] Access denied — role is:', data?.role);
      Alert.alert('Access Denied', 'Only super admins can manage users.');
      router.back();
      return;
    }
    console.log('[Users] Super admin confirmed, loading users');
    setIsSuperAdmin(true);
    loadUsers();
  };

  const loadUsers = async () => {
    console.log('[Users] Fetching user_roles list');
    try {
      setLoading(true);
      const { data, error } = await (supabasePublic as any)
        .from('user_roles')
        .select('user_id, role, email');

      if (error) throw error;

      const userList: AdminUser[] = (data ?? []).map((r: any) => ({
        id: r.user_id,
        email: r.email ?? r.user_id,
        role: r.role,
      }));
      console.log('[Users] Loaded', userList.length, 'users');
      setUsers(userList);
    } catch (err) {
      console.error('[Users] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleForm = () => {
    const next = !showForm;
    console.log('[Users] Toggle add-user form:', next ? 'open' : 'closed');
    setShowForm(next);
  };

  const handleAddUser = async () => {
    console.log('[Users] Add user pressed — email:', newEmail.trim(), 'role:', newRole);
    if (!newEmail.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }
    try {
      setSaving(true);

      // Sign up the new user with the anon client
      console.log('[Users] Calling supabase.auth.signUp for:', newEmail.trim());
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword.trim(),
      });
      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error('No user ID returned from sign-up');

      console.log('[Users] Sign-up succeeded, inserting role for user:', newUserId);
      // Insert role row with email stored for display
      const { error: roleError } = await (supabasePublic as any)
        .from('user_roles')
        .insert({ user_id: newUserId, role: newRole, email: newEmail.trim() });
      if (roleError) throw roleError;

      console.log('[Users] Role inserted successfully');
      Alert.alert('Success', `Account created for ${newEmail.trim()}`);
      setNewEmail('');
      setNewPassword('');
      setNewRole('admin');
      setShowForm(false);
      loadUsers();
    } catch (err: any) {
      console.error('[Users] Add user failed:', err);
      Alert.alert('Error', err.message ?? 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (u: AdminUser) => {
    console.log('[Users] Delete pressed for user:', u.id, u.email);
    if (u.id === user!.id) {
      Alert.alert('Error', 'You cannot delete your own account.');
      return;
    }
    Alert.alert('Delete Account', `Remove ${u.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log('[Users] Confirming delete for user:', u.id);
          const { error } = await (supabasePublic as any)
            .from('user_roles')
            .delete()
            .eq('user_id', u.id);
          if (error) {
            console.error('[Users] Delete failed:', error);
            Alert.alert('Error', error.message);
            return;
          }
          console.log('[Users] User deleted successfully:', u.id);
          loadUsers();
        },
      },
    ]);
  };

  const handleChangeRole = (u: AdminUser) => {
    console.log('[Users] Change role pressed for user:', u.id, 'current role:', u.role);
    if (u.id === user!.id) {
      Alert.alert('Error', 'You cannot change your own role.');
      return;
    }
    const nextRole = u.role === 'admin' ? 'super_admin' : 'admin';
    Alert.alert('Change Role', `Change ${u.email} to ${ROLE_LABELS[nextRole]}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change',
        onPress: async () => {
          console.log('[Users] Updating role for user:', u.id, '->', nextRole);
          const { error } = await (supabasePublic as any)
            .from('user_roles')
            .update({ role: nextRole })
            .eq('user_id', u.id);
          if (error) {
            console.error('[Users] Role update failed:', error);
            Alert.alert('Error', error.message);
            return;
          }
          console.log('[Users] Role updated successfully');
          loadUsers();
        },
      },
    ]);
  };

  const handleBack = () => {
    console.log('[Users] Back pressed');
    router.back();
  };

  const adminRoleColor = ROLE_COLORS['admin'];
  const superAdminRoleColor = ROLE_COLORS['super_admin'];
  const adminRoleLabel = ROLE_LABELS['admin'];
  const superAdminRoleLabel = ROLE_LABELS['super_admin'];

  const adminBorderColor = newRole === 'admin' ? COLORS.primary : COLORS.border;
  const adminBgColor = newRole === 'admin' ? COLORS.primaryMuted : COLORS.surfaceSecondary;
  const adminTextColor = newRole === 'admin' ? COLORS.primary : COLORS.textSecondary;
  const superAdminBorderColor = newRole === 'super_admin' ? COLORS.primary : COLORS.border;
  const superAdminBgColor = newRole === 'super_admin' ? COLORS.primaryMuted : COLORS.surfaceSecondary;
  const superAdminTextColor = newRole === 'super_admin' ? COLORS.primary : COLORS.textSecondary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <AnimatedPressable onPress={handleBack}>
          <ChevronLeft size={24} color={COLORS.text} />
        </AnimatedPressable>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 22,
            fontWeight: '700',
            flex: 1,
          }}
        >
          User Management
        </Text>
        <AnimatedPressable onPress={handleToggleForm}>
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <UserPlus size={16} color="#000" />
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>Add</Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Add User Form */}
      {showForm && (
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 20,
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text
            style={{
              color: COLORS.text,
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 12,
            }}
          >
            New Account
          </Text>

          <TextInput
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="Email"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: 10,
            }}
          />

          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Password"
            placeholderTextColor={COLORS.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: 10,
            }}
          />

          {/* Role selector */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <AnimatedPressable
              onPress={() => {
                console.log('[Users] Role selector: admin');
                setNewRole('admin');
              }}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: adminBorderColor,
                  backgroundColor: adminBgColor,
                }}
              >
                <Text style={{ color: adminTextColor, fontWeight: '600', fontSize: 13 }}>
                  {adminRoleLabel}
                </Text>
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                console.log('[Users] Role selector: super_admin');
                setNewRole('super_admin');
              }}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: superAdminBorderColor,
                  backgroundColor: superAdminBgColor,
                }}
              >
                <Text style={{ color: superAdminTextColor, fontWeight: '600', fontSize: 13 }}>
                  {superAdminRoleLabel}
                </Text>
              </View>
            </AnimatedPressable>
          </View>

          <AnimatedPressable onPress={handleAddUser}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 10,
                paddingVertical: 13,
                alignItems: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>
                  Create Account
                </Text>
              )}
            </View>
          </AnimatedPressable>
        </View>
      )}

      {/* Users List */}
      <View style={{ paddingHorizontal: 20 }}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <Text
            style={{
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginTop: 40,
              fontSize: 15,
            }}
          >
            No admin accounts found.
          </Text>
        ) : (
          users.map((u) => {
            const roleColor = ROLE_COLORS[u.role] ?? COLORS.primary;
            const roleLabel = ROLE_LABELS[u.role] ?? u.role;
            const roleBgColor = `${roleColor}18`;
            const roleBorderColor = `${roleColor}40`;
            const isCurrentUser = u.id === user?.id;

            return (
              <View
                key={u.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: COLORS.text,
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                      numberOfLines={1}
                    >
                      {u.email}
                    </Text>

                    <AnimatedPressable
                      onPress={() => handleChangeRole(u)}
                      style={{ marginTop: 6, alignSelf: 'flex-start' }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: roleBgColor,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderWidth: 1,
                          borderColor: roleBorderColor,
                        }}
                      >
                        <Shield size={12} color={roleColor} />
                        <Text
                          style={{
                            color: roleColor,
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {roleLabel}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  </View>

                  {!isCurrentUser && (
                    <AnimatedPressable onPress={() => handleDeleteUser(u)}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: '#FF444418',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#FF444430',
                        }}
                      >
                        <Trash2 size={16} color="#FF4444" />
                      </View>
                    </AnimatedPressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
