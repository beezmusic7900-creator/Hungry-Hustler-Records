import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Lock,
  Trophy,
  Users,
  ChevronRight,
  Music,
  Heart,
  Star,
  MessageCircle,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRewards } from '@/hooks/useRewards';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface FanProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

interface ActivityEntry {
  id: string;
  activity_type: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  created_at: string;
}

interface BadgeDetail {
  id: string;
  name: string;
  icon: string;
  description: string;
}

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

function activityIcon(type: string): string {
  switch (type) {
    case 'listened': return '🎧';
    case 'favorited': return '❤️';
    case 'commented': return '💬';
    case 'reacted': return '🔥';
    case 'rsvp': return '🎟️';
    case 'followed': return '👥';
    case 'voted': return '🗳️';
    case 'asked': return '❓';
    case 'badge_earned': return '🏆';
    case 'playlist_created': return '🎵';
    default: return '⚡';
  }
}

function activityLabel(entry: ActivityEntry): string {
  const label = entry.target_label ?? 'something';
  switch (entry.activity_type) {
    case 'listened': return `Listened to ${label}`;
    case 'favorited': return `Saved ${label} to favorites`;
    case 'commented': return `Commented on ${label}`;
    case 'reacted': return `Reacted to ${label}`;
    case 'rsvp': return `RSVP'd to ${label}`;
    case 'followed': return `Followed ${label}`;
    case 'voted': return `Voted on ${label}`;
    case 'asked': return `Asked a question about ${label}`;
    case 'badge_earned': return `Earned the ${label} badge`;
    case 'playlist_created': return `Created playlist ${label}`;
    default: return `Did something with ${label}`;
  }
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { awardPoints } = useRewards();

  const [profile, setProfile] = useState<FanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [badges, setBadges] = useState<BadgeDetail[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [rewardLevel, setRewardLevel] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = user?.id === id;

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      console.log('[PublicProfile] Loading profile:', id);
      setLoading(true);

      const { data: profileData } = await db
        .from('fan_profiles')
        .select('id, display_name, username, bio, avatar_url, is_public')
        .eq('id', id)
        .maybeSingle();

      if (!profileData) {
        setIsPrivate(true);
        setLoading(false);
        return;
      }

      // Check if we can view: own profile, public, or following
      let canView = isOwnProfile || profileData.is_public;

      if (!canView && user) {
        const { data: followData } = await db
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', id)
          .maybeSingle();
        canView = !!followData;
      }

      if (!canView) {
        setIsPrivate(true);
        setProfile(profileData);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setIsPrivate(false);

      // Load follow state, counts, badges, rewards in parallel
      await Promise.all([
        loadFollowState(),
        loadFollowCounts(),
        loadBadges(),
        loadActivity(),
        loadRewardLevel(),
      ]);
    } catch (err) {
      console.error('[PublicProfile] loadProfile error:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, isOwnProfile]);

  const loadFollowState = async () => {
    if (!user || !id || isOwnProfile) return;
    try {
      const { data } = await db
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .maybeSingle();
      setIsFollowing(!!data);
    } catch (err) {
      console.error('[PublicProfile] loadFollowState error:', err);
    }
  };

  const loadFollowCounts = async () => {
    if (!id) return;
    try {
      const [followerRes, followingRes] = await Promise.all([
        db.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id),
        db.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', id),
      ]);
      setFollowerCount(followerRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
    } catch (err) {
      console.error('[PublicProfile] loadFollowCounts error:', err);
    }
  };

  const loadBadges = async () => {
    if (!id) return;
    try {
      const { data } = await db
        .from('user_badges')
        .select('badge:badges(id, name, icon, description)')
        .eq('user_id', id)
        .limit(10);
      const badgeList = (data ?? []).map((row: { badge: BadgeDetail }) => row.badge).filter(Boolean);
      setBadges(badgeList);
    } catch (err) {
      console.error('[PublicProfile] loadBadges error:', err);
    }
  };

  const loadActivity = async () => {
    if (!id) return;
    try {
      setActivityLoading(true);
      const { data } = await db
        .from('activity_feed')
        .select('id, activity_type, target_type, target_id, target_label, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivity((data ?? []) as ActivityEntry[]);
    } catch (err) {
      console.error('[PublicProfile] loadActivity error:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadRewardLevel = async () => {
    if (!id) return;
    try {
      const { data } = await db
        .from('fan_rewards')
        .select('level')
        .eq('user_id', id)
        .maybeSingle();
      setRewardLevel(data?.level ?? null);
    } catch (err) {
      console.error('[PublicProfile] loadRewardLevel error:', err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleToggleFollow = async () => {
    if (!user) {
      router.push('/fan-auth');
      return;
    }
    if (isOwnProfile) return;
    console.log('[PublicProfile] Toggle follow:', id, 'currently following:', isFollowing);
    setFollowLoading(true);

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((c) => c + (wasFollowing ? -1 : 1));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/toggle-follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ following_id: id }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[PublicProfile] toggle-follow error:', text);
        setIsFollowing(wasFollowing);
        setFollowerCount((c) => c + (wasFollowing ? 1 : -1));
        return;
      }

      const json = await res.json();
      console.log('[PublicProfile] toggle-follow result:', json);
      setIsFollowing(json.is_following);
      setFollowerCount(json.follower_count ?? followerCount);

      if (!wasFollowing) {
        awardPoints('follow_user', { reference_id: id as string }).catch(() => {});
      }
    } catch (err) {
      console.error('[PublicProfile] handleToggleFollow error:', err);
      setIsFollowing(wasFollowing);
      setFollowerCount((c) => c + (wasFollowing ? 1 : -1));
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <SkeletonLine width={72} height={72} borderRadius={36} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonLine width="60%" height={18} />
              <SkeletonLine width="40%" height={13} />
            </View>
          </View>
          <SkeletonLine width="100%" height={44} borderRadius={12} />
          <SkeletonLine width="100%" height={80} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (isPrivate && !isOwnProfile) {
    const displayName = profile?.display_name ?? profile?.username ?? 'This user';
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
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Lock size={28} color={COLORS.textTertiary} />
        </View>
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
          Private Profile
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
            maxWidth: 260,
            lineHeight: 20,
          }}
        >
          {displayName}
          {"'s profile is private. Follow them to see their activity."}
        </Text>
        {user && !isOwnProfile && (
          <AnimatedPressable onPress={handleToggleFollow} style={{ marginTop: 24 }}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 32,
              }}
            >
              <Text style={{ color: COLORS.background, fontSize: 14, fontWeight: '700' }}>
                Follow
              </Text>
            </View>
          </AnimatedPressable>
        )}
      </View>
    );
  }

  const displayName = profile?.display_name ?? profile?.username ?? 'Fan';
  const usernameText = profile?.username ? `@${profile.username}` : null;
  const followerText = `${followerCount.toLocaleString()} followers`;
  const followingText = `${followingCount.toLocaleString()} following`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100, paddingHorizontal: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: COLORS.primary,
          }}
        >
          {profile?.avatar_url ? (
            <Image
              source={resolveImageSource(profile.avatar_url)}
              style={{ width: 72, height: 72, borderRadius: 36 }}
              resizeMode="cover"
            />
          ) : (
            <User size={30} color={COLORS.primary} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
            {displayName}
          </Text>
          {usernameText ? (
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
              {usernameText}
            </Text>
          ) : null}
          {rewardLevel ? (
            <View
              style={{
                backgroundColor: 'rgba(245,158,11,0.15)',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 2,
                alignSelf: 'flex-start',
                marginTop: 4,
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.4)',
              }}
            >
              <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
                {rewardLevel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Bio */}
      {profile?.bio ? (
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 16,
          }}
        >
          {profile.bio}
        </Text>
      ) : null}

      {/* Follow counts */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[PublicProfile] Followers pressed');
            router.push(`/followers?id=${id}`);
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>
              {followerCount.toLocaleString()}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Followers</Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => {
            console.log('[PublicProfile] Following pressed');
            router.push(`/following?id=${id}`);
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>
              {followingCount.toLocaleString()}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Following</Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Follow button */}
      {!isOwnProfile && user && (
        <AnimatedPressable
          onPress={handleToggleFollow}
          disabled={followLoading}
          style={{ marginBottom: 20 }}
        >
          <View
            style={{
              backgroundColor: isFollowing ? COLORS.surfaceSecondary : COLORS.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isFollowing ? COLORS.border : COLORS.primary,
              opacity: followLoading ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                color: isFollowing ? COLORS.textSecondary : COLORS.background,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </Text>
          </View>
        </AnimatedPressable>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Trophy size={16} color={COLORS.primary} />
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>Badges</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                  width: 80,
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 28, marginBottom: 4 }}>{badge.icon}</Text>
                <Text
                  style={{ color: COLORS.text, fontSize: 10, fontWeight: '700', textAlign: 'center' }}
                  numberOfLines={2}
                >
                  {badge.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Activity feed */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Star size={16} color={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>Activity</Text>
        </View>

        {activityLoading ? (
          [0, 1, 2].map((k) => (
            <View
              key={k}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <SkeletonLine width={32} height={32} borderRadius={8} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonLine width="70%" height={13} />
                <SkeletonLine width="30%" height={11} />
              </View>
            </View>
          ))
        ) : activity.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Star size={24} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10 }}>
              No activity yet
            </Text>
          </View>
        ) : (
          activity.map((entry) => {
            const icon = activityIcon(entry.activity_type);
            const label = activityLabel(entry);
            const timeText = timeAgo(entry.created_at);

            return (
              <View
                key={entry.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: COLORS.text, fontSize: 13, lineHeight: 18 }}
                    numberOfLines={2}
                  >
                    {label}
                  </Text>
                  <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 2 }}>
                    {timeText}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
