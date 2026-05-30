import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Animated,
  ImageSourcePropType,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, User, Search, Trophy, CheckCircle, BarChart2, Gift, Clock, Brain } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { HHRLogo } from '@/components/HHRLogo';
import { supabasePublic, supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRewards } from '@/hooks/useRewards';
import { useAnalytics } from '@/hooks/useAnalytics';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface TourEvent {
  id: string;
  title: string;
  event_date: string | null;
  city: string | null;
  venue: string | null;
  ticket_url: string | null;
  image_url: string | null;
}

interface MerchItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface HomeData {
  id: string;
  hero_banner_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  featured_artist_id: string | null;
  latest_release_title: string | null;
  latest_release_artist: string | null;
  latest_release_image_url: string | null;
  latest_release_spotify_url: string | null;
  latest_release_apple_music_url: string | null;
  latest_release_youtube_url: string | null;
  latest_release_soundcloud_url: string | null;
  featured_merch_ids: string[] | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface PollOption {
  id: string;
  option_text: string;
  position: number;
  vote_count: number;
}

interface Poll {
  id: string;
  question: string;
  is_closed: boolean;
  options: PollOption[];
  user_vote_option_id: string | null;
}

interface FanSpotlight {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

interface FanContest {
  id: string;
  title: string;
  prize_description: string | null;
  cover_url: string | null;
  ends_at: string | null;
}

interface ActivityEntry {
  id: string;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  activity_type: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  created_at: string;
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

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Ends tomorrow';
  return `Ends in ${days} days`;
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
    default: return '⚡';
  }
}

function HomePollCard({
  poll,
  onVote,
}: {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.vote_count, 0);
  const totalText = `${totalVotes} votes`;

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <BarChart2 size={14} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: -11, fontWeight: '700', flex: 1 }}>
          {poll.question}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        {poll.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
          const isSelected = poll.user_vote_option_id === option.id;
          const pctText = `${pct}%`;

          const handleVote = () => {
            if (poll.is_closed) return;
            console.log('[Home] Poll vote:', poll.id, option.id);
            onVote(poll.id, option.id);
          };

          return (
            <AnimatedPressable key={option.id} onPress={handleVote} disabled={poll.is_closed}>
              <View
                style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: isSelected ? COLORS.primary : COLORS.border,
                  backgroundColor: COLORS.surfaceSecondary,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, bottom: 0,
                    width: `${pct}%`,
                    backgroundColor: isSelected ? COLORS.primaryMuted : 'rgba(255,255,255,0.04)',
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    {isSelected && <CheckCircle size={12} color={COLORS.primary} />}
                    <Text
                      style={{
                        color: isSelected ? COLORS.primary : COLORS.text,
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '400',
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {option.option_text}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: isSelected ? COLORS.primary : COLORS.textSecondary,
                      fontSize: 11,
                      fontWeight: '700',
                      marginLeft: 6,
                    }}
                  >
                    {pctText}
                  </Text>
                </View>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
      <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 8 }}>{totalText}</Text>
    </View>
  );
}

function MerchPreviewCard({ item }: { item: MerchItem }) {
  const router = useRouter();
  const priceDisplay = `$${Number(item.price).toFixed(2)}`;

  const handlePress = () => {
    console.log(`[Home] Tapped merch preview: ${item.name} (${item.id})`);
    router.push(`/merch-detail/${item.id}`);
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          width: 160,
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
          marginRight: 12,
        }}
      >
        {item.image_url ? (
          <Image
            source={resolveImageSource(item.image_url)}
            style={{ width: 160, height: 160 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 160,
              height: 160,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={40} color={COLORS.textTertiary} />
          </View>
        )}
        <View style={{ padding: 12 }}>
          <Text
            style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text
            style={{
              color: COLORS.primary,
              fontSize: 14,
              fontWeight: '700',
              marginTop: 4,
            }}
          >
            {priceDisplay}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { awardPoints } = useRewards();
  const { trackEvent } = useAnalytics();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [featuredMerch, setFeaturedMerch] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tourEvents, setTourEvents] = useState<TourEvent[]>([]);
  const [tourLoading, setTourLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // New engagement sections
  const [polls, setPolls] = useState<Poll[]>([]);
  const [spotlights, setSpotlights] = useState<FanSpotlight[]>([]);
  const [activeContest, setActiveContest] = useState<FanContest | null>(null);
  const [friendsActivity, setFriendsActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    loadHome();
    trackEvent('screen_view', { screen: 'home' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) loadFriendsActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadFriendsActivity = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[Home] Loading friends activity');
      const { data: followData } = await db
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(50);

      const followingIds = (followData ?? []).map((f: { following_id: string }) => f.following_id);
      if (followingIds.length === 0) return;

      const { data } = await db
        .from('activity_feed')
        .select('id, actor_display_name, actor_avatar_url, activity_type, target_type, target_id, target_label, created_at')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(10);

      setFriendsActivity((data ?? []) as ActivityEntry[]);
      console.log('[Home] Loaded', (data ?? []).length, 'friends activity entries');
    } catch (err) {
      console.error('[Home] loadFriendsActivity error:', err);
    }
  }, [user]);

  const loadPolls = useCallback(async () => {
    try {
      console.log('[Home] Loading polls');
      const now = new Date().toISOString();
      const { data: pollData } = await (supabasePublic as any)
        .from('polls')
        .select('id, question, is_closed, closes_at')
        .eq('is_closed', false)
        .or(`closes_at.is.null,closes_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(2);

      const pollList = (pollData ?? []) as Poll[];
      if (pollList.length === 0) {
        setPolls([]);
        return;
      }

      const pollIds = pollList.map((p) => p.id);
      const { data: optionData } = await (supabasePublic as any)
        .from('poll_options')
        .select('id, poll_id, option_text, position, vote_count')
        .in('poll_id', pollIds)
        .order('position', { ascending: true });

      let userVoteMap: Record<string, string> = {};
      if (user) {
        const { data: userVotes } = await db
          .from('poll_votes')
          .select('poll_id, option_id')
          .eq('user_id', user.id)
          .in('poll_id', pollIds);
        (userVotes ?? []).forEach((v: { poll_id: string; option_id: string }) => {
          userVoteMap[v.poll_id] = v.option_id;
        });
      }

      const optionsByPoll: Record<string, PollOption[]> = {};
      (optionData ?? []).forEach((o: PollOption & { poll_id: string }) => {
        if (!optionsByPoll[o.poll_id]) optionsByPoll[o.poll_id] = [];
        optionsByPoll[o.poll_id].push(o);
      });

      setPolls(pollList.map((p) => ({
        ...p,
        options: optionsByPoll[p.id] ?? [],
        user_vote_option_id: userVoteMap[p.id] ?? null,
      })));
      console.log('[Home] Loaded', pollList.length, 'polls');
    } catch (err) {
      console.error('[Home] loadPolls error:', err);
    }
  }, [user]);

  const loadSpotlights = useCallback(async () => {
    try {
      const { data } = await (supabasePublic as any)
        .from('fan_spotlights')
        .select('id, title, description, image_url')
        .eq('is_active', true)
        .order('position', { ascending: true })
        .limit(10);
      setSpotlights((data ?? []) as FanSpotlight[]);
      console.log('[Home] Loaded', (data ?? []).length, 'spotlights');
    } catch (err) {
      console.error('[Home] loadSpotlights error:', err);
    }
  }, []);

  const loadActiveContest = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const { data } = await (supabasePublic as any)
        .from('fan_contests')
        .select('id, title, prize_description, cover_url, ends_at')
        .eq('is_active', true)
        .gt('ends_at', now)
        .order('ends_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      setActiveContest(data ?? null);
      console.log('[Home] Active contest:', data?.title ?? 'none');
    } catch (err) {
      console.error('[Home] loadActiveContest error:', err);
    }
  }, []);

  const handlePollVote = useCallback(async (pollId: string, optionId: string) => {
    if (!user) {
      router.push('/fan-auth');
      return;
    }

    // Optimistic update
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        const oldOptionId = p.user_vote_option_id;
        return {
          ...p,
          user_vote_option_id: optionId,
          options: p.options.map((o) => {
            if (o.id === optionId) return { ...o, vote_count: o.vote_count + 1 };
            if (o.id === oldOptionId) return { ...o, vote_count: Math.max(0, o.vote_count - 1) };
            return o;
          }),
        };
      })
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/cast-vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ vote_type: 'poll', target_id: pollId, option_id: optionId }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[Home] cast-vote error:', text);
      } else {
        awardPoints('vote_poll', { reference_id: pollId }).catch(() => {});
      }
    } catch (err) {
      console.error('[Home] handlePollVote error:', err);
    }
  }, [user, router, awardPoints]);

  const loadHome = async () => {
    try {
      console.log('[Home] Loading home content from Supabase');
      setLoading(true);
      setError(null);

      const { data: home, error: homeErr } = await (supabasePublic as any)
        .from('home_content')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (homeErr) {
        console.warn('[Home] home_content not available:', homeErr.message);
      }

      setHomeData(home ?? null);

      const parallelTasks: Promise<void>[] = [];

      if (home?.featured_merch_ids && home.featured_merch_ids.length > 0) {
        parallelTasks.push(
          (async () => {
            const { data } = await (supabasePublic as any)
              .from('merch')
              .select('id, name, price, image_url')
              .in('id', home.featured_merch_ids as string[])
              .eq('is_published', true);
            setFeaturedMerch(data ?? []);
          })()
        );
      }

      parallelTasks.push(
        (async () => {
          try {
            console.log('[Home] Loading tour events from Supabase');
            const { data } = await (supabasePublic as any)
              .from('events')
              .select('id, title, event_date, city, venue, ticket_url, image_url')
              .eq('is_published', true)
              .order('event_date', { ascending: true })
              .limit(5);
            setTourEvents(data ?? []);
            console.log(`[Home] Loaded ${(data ?? []).length} tour events`);
          } finally {
            setTourLoading(false);
          }
        })()
      );

      parallelTasks.push(loadPolls());
      parallelTasks.push(loadSpotlights());
      parallelTasks.push(loadActiveContest());

      await Promise.all(parallelTasks);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } catch (err) {
      console.error('[Home] Failed to load home content:', err);
      setError('Could not load content. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  };

  const heroTitle = homeData?.hero_title ?? 'HUNGRY HUSTLER RECORDS';
  const heroSubtitle = homeData?.hero_subtitle ?? 'Independent. Authentic. Unstoppable.';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 20,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <HHRLogo size="medium" showGlow />

        {/* Header action buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Search button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Search button pressed');
              router.push('/search');
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Search size={18} color={COLORS.text} />
            </View>
          </AnimatedPressable>

          {/* Profile button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Profile button pressed');
              router.push('/fan-profile');
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <User size={18} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Hero Banner */}
      {loading ? (
        <SkeletonLine
          width="100%"
          height={200}
          borderRadius={0}
          style={{ marginBottom: 24 }}
        />
      ) : (
        <View style={{ height: 200, marginBottom: 24, position: 'relative' }}>
          {homeData?.hero_banner_url ? (
            <Image
              source={resolveImageSource(homeData.hero_banner_url)}
              style={{ width: '100%', height: 200 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: -36,
                height: null,
                backgroundColor: COLORS.surfaceSecondary,
              }}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
              justifyContent: 'flex-end',
              paddingHorizontal: 20,
              paddingBottom: 16,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                fontSize: 22,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              {heroTitle}
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                marginTop: 4,
              }}
            >
              {heroSubtitle}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* The Label */}
      <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          The Label
        </Text>
        <Text
          style={{
            color: '#ffffff',
            fontSize: 15,
            lineHeight: 24,
          }}
        >
          {'Welcome to the official Hungry Hustler Records app — the home of independent excellence, authentic music, and powerful artists. This is your direct connection to the music, artists, and movement behind Hungry Hustler Records.\n\nDiscover new releases, watch exclusive videos, explore artist profiles, and stay connected with everything happening inside the label. This platform gives fans exclusive access to music, merch, announcements, and behind-the-scenes content you won\'t find anywhere else.\n\nHungry Hustler Records represents the hustle, the vision, and the future of independent music.'}
        </Text>
      </View>

      {/* Featured Merch */}
      {(loading || featuredMerch.length > 0) && (
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
              paddingHorizontal: 20,
            }}
          >
            Featured Merch
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {loading
              ? [0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: 160,
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      marginRight: 12,
                    }}
                  >
                    <SkeletonLine width={160} height={160} borderRadius={0} />
                    <View style={{ padding: 12, gap: 6 }}>
                      <SkeletonLine width="80%" height={13} />
                      <SkeletonLine width="40%" height={14} />
                    </View>
                  </View>
                ))
              : featuredMerch.map((item) => (
                  <MerchPreviewCard key={item.id} item={item} />
                ))}
          </ScrollView>
        </View>
      )}

      {/* Tour Dates */}
      {(tourLoading || tourEvents.length > 0) && (
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
              paddingHorizontal: 20,
            }}
          >
            Tour Dates
          </Text>
          {tourLoading
            ? [0, 1].map((i) => (
                <SkeletonLine
                  key={i}
                  width="auto"
                  height={72}
                  borderRadius={12}
                  style={{ marginHorizontal: 20, marginBottom: 8 }}
                />
              ))
            : tourEvents.map((event) => {
                const dateObj = event.event_date ? new Date(event.event_date) : null;
                const monthDisplay = dateObj
                  ? dateObj.toLocaleDateString('en-US', { month: 'short' })
                  : '';
                const dayDisplay = dateObj ? String(dateObj.getDate()) : '';
                const venueCity =
                  event.venue && event.city
                    ? `${event.venue} · ${event.city}`
                    : event.venue ?? event.city ?? '';
                return (
                  <View
                    key={event.id}
                    style={{
                      paddingHorizontal: 20,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      {/* Date block */}
                      <View
                        style={{
                          backgroundColor: COLORS.primaryMuted,
                          borderRadius: 8,
                          padding: 10,
                          alignItems: 'center',
                          width: 52,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: COLORS.primary,
                            textTransform: 'uppercase',
                          }}
                        >
                          {monthDisplay}
                        </Text>
                        <Text
                          style={{
                            fontSize: 22,
                            fontWeight: '800',
                            color: COLORS.text,
                            lineHeight: 24,
                          }}
                        >
                          {dayDisplay}
                        </Text>
                      </View>

                      {/* Event info */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: COLORS.text,
                          }}
                          numberOfLines={1}
                        >
                          {event.title}
                        </Text>
                        {venueCity.length > 0 && (
                          <Text
                            style={{
                              fontSize: 12,
                              color: COLORS.textSecondary,
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {venueCity}
                          </Text>
                        )}
                      </View>

                      {/* Tickets button */}
                      {event.ticket_url ? (
                        <AnimatedPressable
                          onPress={() => {
                            console.log(`[Home] Tapped Tickets for event: ${event.title} (${event.id})`);
                            Linking.openURL(event.ticket_url as string);
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: COLORS.primary,
                              borderRadius: 8,
                              paddingVertical: 7,
                              paddingHorizontal: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: COLORS.background,
                              }}
                            >
                              Tickets
                            </Text>
                          </View>
                        </AnimatedPressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
        </View>
      )}

      {/* Fan Spotlight */}
      {spotlights.length > 0 && (
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
              paddingHorizontal: 20,
            }}
          >
            Fan Spotlight
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {spotlights.map((spotlight) => (
              <View
                key={spotlight.id}
                style={{
                  width: 200,
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                {spotlight.image_url ? (
                  <Image
                    source={{ uri: spotlight.image_url }}
                    style={{ width: 200, height: 120 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 200,
                      height: 120,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 32 }}>⭐</Text>
                  </View>
                )}
                <View style={{ padding: 10 }}>
                  <Text
                    style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}
                    numberOfLines={1}
                  >
                    {spotlight.title}
                  </Text>
                  {spotlight.description ? (
                    <Text
                      style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 3, lineHeight: 15 }}
                      numberOfLines={2}
                    >
                      {spotlight.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Active Contest Banner */}
      {activeContest && (
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Contest banner pressed:', activeContest.id);
              router.push(`/contests/${activeContest.id}`);
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.4)',
              }}
            >
              {activeContest.cover_url ? (
                <Image
                  source={{ uri: activeContest.cover_url }}
                  style={{ width: '100%', height: 120 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: 80,
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trophy size={32} color="#F59E0B" />
                </View>
              )}
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
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
                    <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '700' }}>
                      CONTEST
                    </Text>
                  </View>
                  {activeContest.ends_at ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color={COLORS.textSecondary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
                        {daysUntil(activeContest.ends_at)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                  {activeContest.title}
                </Text>
                {activeContest.prize_description ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Gift size={12} color="#F59E0B" />
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12 }} numberOfLines={1}>
                      {activeContest.prize_description}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={{
                    backgroundColor: '#F59E0B',
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>
                    Join Contest
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedPressable>
        </View>
      )}

      {/* Polls Section */}
      {polls.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Polls
          </Text>
          {polls.map((poll) => (
            <HomePollCard key={poll.id} poll={poll} onVote={handlePollVote} />
          ))}
        </View>
      )}

      {/* Spin & Trivia CTAs */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Daily Activities
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Spin to Win pressed');
              router.push('/spin');
            }}
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: 'rgba(245,158,11,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(245,158,11,0.3)',
                }}
              >
                <Gift size={22} color="#F59E0B" />
              </View>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                Spin to Win
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, textAlign: 'center' }}>
                Daily free spin
              </Text>
            </View>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Trivia pressed');
              router.push('/trivia');
            }}
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: 'rgba(6,182,212,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(6,182,212,0.3)',
                }}
              >
                <Brain size={22} color="#06B6D4" />
              </View>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                Trivia
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, textAlign: 'center' }}>
                Earn points
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Friends Activity */}
      {friendsActivity.length > 0 && (
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
              paddingHorizontal: 20,
            }}
          >
            Friends Activity
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          >
            {friendsActivity.map((entry) => {
              const icon = activityIcon(entry.activity_type);
              const label = entry.target_label ?? 'something';
              const actorName = entry.actor_display_name ?? 'A fan';
              const timeText = timeAgo(entry.created_at);

              const handlePress = () => {
                console.log('[Home] Friends activity card pressed:', entry.activity_type, entry.target_id);
                if (entry.target_type === 'song' && entry.target_id) {
                  router.push(`/player`);
                }
              };

              return (
                <AnimatedPressable key={entry.id} onPress={handlePress}>
                  <View
                    style={{
                      width: 160,
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 6 }}>{icon}</Text>
                    <Text
                      style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}
                      numberOfLines={1}
                    >
                      {actorName}
                    </Text>
                    <Text
                      style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 15 }}
                      numberOfLines={2}
                    >
                      {label}
                    </Text>
                    <Text style={{ color: COLORS.textTertiary, fontSize: 10, marginTop: 6 }}>
                      {timeText}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Submit Content CTA card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Home] Submit content CTA pressed');
            router.push('/submit');
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.primary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ fontSize: 22 }}>📲</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
                Submit Your Content
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                Share your talent with the HHR community
              </Text>
            </View>
            <Text style={{ color: COLORS.primary, fontSize: 16 }}>→</Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Fan Submissions gallery card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Home] Fan submissions gallery pressed');
            router.push('/submissions');
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(124,58,237,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(124,58,237,0.3)',
              }}
            >
              <Text style={{ fontSize: 22 }}>🌟</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
                Fan Submissions
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                Browse fan dances, art, and performances
              </Text>
            </View>
            <Text style={{ color: COLORS.textTertiary, fontSize: 16 }}>→</Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Leaderboards card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Home] Leaderboards card pressed');
            router.push('/leaderboards');
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(245,158,11,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.3)',
              }}
            >
              <Trophy size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
                Leaderboards
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                See the top fans this week
              </Text>
            </View>
            <Text style={{ color: COLORS.textTertiary, fontSize: 16 }}>→</Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Latest Releases info card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Latest Releases
          </Text>
          {(['New Singles', 'Albums', 'Exclusive Releases', 'Featured Tracks'] as const).map((item) => (
            <View
              key={item}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
            >
              <Text style={{ color: '#00FF66', fontSize: 16, lineHeight: 28, marginRight: 10 }}>
                {'•'}
              </Text>
              <Text style={{ color: '#ffffff', fontSize: 14, lineHeight: 28 }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Exclusive Videos card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Exclusive Videos
          </Text>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 15,
              lineHeight: 24,
              marginBottom: 16,
            }}
          >
            {'Watch official music videos, behind-the-scenes footage, interviews, and exclusive content from Hungry Hustler Records artists.'}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Tapped Watch Now — navigating to Videos tab');
              router.push('/(tabs)/videos');
            }}
          >
            <View
              style={{
                backgroundColor: '#00FF66',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#000000', fontSize: 14, fontWeight: '700' }}>
                Watch Now
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Merch Store card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Merch Store
          </Text>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 15,
              lineHeight: 24,
              marginBottom: 16,
            }}
          >
            {'Shop official Hungry Hustler Records merchandise, including apparel, accessories, and exclusive artist merch.'}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Tapped Shop Now — navigating to Merch tab');
              router.push('/(tabs)/merch');
            }}
          >
            <View
              style={{
                backgroundColor: '#00FF66',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#000000', fontSize: 14, fontWeight: '700' }}>
                Shop Now
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Error state */}
      {error && !loading && (
        <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
          <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] Retry loading');
              loadHome();
            }}
            style={{ marginTop: 12 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                Try Again
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      )}
    </ScrollView>
  );
}
