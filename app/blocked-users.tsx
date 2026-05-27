import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, UserX } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

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

interface BlockedUser {
  blocked_id: string;
  created_at: string;
  fan_profiles?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { invalidateCache } = useBlockedUsers();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[BlockedUsers] Loading blocked users for:', user.id);
      const { data, error } = await db
        .from('user_blocks')
        .select('blocked_id, created_at, fan_profiles:blocked_id(display_name, username, avatar_url)')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BlockedUsers] Error:', error.message);
      } else {
        setBlockedUsers((data ?? []) as BlockedUser[]);
        console.log('[BlockedUsers] Loaded', (data ?? []).length, 'blocked users');
      }
    } catch (err) {
      console.error('[BlockedUsers] loadBlockedUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadBlockedUsers();
    else setLoading(false);
  }, [user, loadBlockedUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBlockedUsers();
    setRefreshing(false);
  };

  const handleUnblock = async (blockedId: string, name: string) => {
    Alert.alert(
      `Unblock ${name}?`,
      "You'll be able to see their content again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            console.log('[BlockedUsers] Unblocking user:', blockedId);
            setUnblocking(blockedId);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) return;

              const res = await fetch(`${SUPABASE_URL}/functions/v1/block-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ blocked_id: blockedId, action: 'unblock' }),
              });

              if (!res.ok) {
                const text = await res.text();
                console.error('[BlockedUsers] Unblock error:', text);
                Alert.alert('Error', 'Could not unblock user. Please try again.');
                return;
              }

              console.log('[BlockedUsers] Unblocked successfully');
              invalidateCache();
              setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== blockedId));
            } catch (err) {
              console.error('[BlockedUsers] handleUnblock error:', err);
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <UserX size={22} color={COLORS.danger} />
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
          Blocked Users
        </Text>
      </View>

      <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
        Blocked users cannot see your profile and their content is hidden from you.
      </Text>

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
              <SkeletonLine width={70} height={32} borderRadius={8} />
            </View>
          ))}
        </View>
      ) : blockedUsers.length === 0 ? (
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
          <UserX size={32} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
            No blocked users
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', maxWidth: 260 }}>
            Users you block will appear here. You can unblock them at any time.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {blockedUsers.map((item) => {
            const name = item.fan_profiles?.display_name ?? item.fan_profiles?.username ?? 'Unknown user';
            const username = item.fan_profiles?.username ? `@${item.fan_profiles.username}` : null;
            const isUnblocking = unblocking === item.blocked_id;

            return (
              <View
                key={item.blocked_id}
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
                    backgroundColor: COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {item.fan_profiles?.avatar_url ? (
                    <Image
                      source={resolveImageSource(item.fan_profiles.avatar_url)}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <User size={20} color={COLORS.textTertiary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                    {name}
                  </Text>
                  {username ? (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 1 }}>
                      {username}
                    </Text>
                  ) : null}
                </View>
                <AnimatedPressable
                  onPress={() => handleUnblock(item.blocked_id, name)}
                  disabled={isUnblocking}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      opacity: isUnblocking ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>
                      {isUnblocking ? '...' : 'Unblock'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
