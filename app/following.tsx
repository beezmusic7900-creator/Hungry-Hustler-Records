import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Users } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface FanProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function FollowingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [following, setFollowing] = useState<FanProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadFollowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadFollowing = async () => {
    try {
      console.log('[Following] Loading following for:', id);
      setLoading(true);
      const { data, error } = await db
        .from('follows')
        .select('following:fan_profiles!follows_following_id_fkey(id, display_name, username, avatar_url)')
        .eq('follower_id', id)
        .limit(100);

      if (error) {
        console.error('[Following] Error:', error.message);
        setFollowing([]);
        return;
      }

      const list = (data ?? [])
        .map((row: { following: FanProfile }) => row.following)
        .filter(Boolean) as FanProfile[];
      console.log('[Following] Loaded', list.length, 'following');
      setFollowing(list);
    } catch (err) {
      console.error('[Following] loadFollowing error:', err);
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: FanProfile }) => {
    const displayName = item.display_name ?? item.username ?? 'Fan';
    const usernameText = item.username ? `@${item.username}` : null;

    const handlePress = () => {
      console.log('[Following] Profile pressed:', item.id);
      router.push(`/profile/${item.id}`);
    };

    return (
      <AnimatedPressable onPress={handlePress}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
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
              borderColor: COLORS.border,
            }}
          >
            {item.avatar_url ? (
              <Image
                source={resolveImageSource(item.avatar_url)}
                style={{ width: 44, height: 44, borderRadius: 22 }}
                resizeMode="cover"
              />
            ) : (
              <User size={20} color={COLORS.textSecondary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
              {displayName}
            </Text>
            {usernameText ? (
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 1 }}>
                {usernameText}
              </Text>
            ) : null}
          </View>
          <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>→</Text>
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>
          Following
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {[0, 1, 2, 3].map((k) => (
            <View
              key={k}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 12,
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
      ) : following.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Users size={28} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
            Not following anyone yet
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 14,
              textAlign: 'center',
              marginTop: 8,
              maxWidth: 260,
            }}
          >
            People this user follows will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
