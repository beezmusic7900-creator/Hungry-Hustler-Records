import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Linking,
  RefreshControl,
  ImageSourcePropType,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, Newspaper, Bell, CheckCircle, Clock, Ticket } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic, supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRewards } from '@/hooks/useRewards';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic: any = supabasePublic;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

const INSTAGRAM_GRADIENT_COLORS = ['#833AB4', '#FD1D1D', '#F77737'];

interface SocialPost {
  id: string;
  artist_name: string | null;
  caption: string | null;
  image_url: string | null;
  post_url: string | null;
  post_date: string | null;
  is_published: boolean;
}

type RsvpStatus = 'going' | 'maybe' | 'not_going';

interface TourEvent {
  id: string;
  title: string;
  event_date: string | null;
  city: string | null;
  venue: string | null;
  ticket_url: string | null;
  image_url: string | null;
  description: string | null;
  start_time?: string | null;
}

interface RsvpState {
  status: RsvpStatus | null;
  goingCount: number;
  reminderMinutes: number | null;
}

function countdown(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (diff > sevenDays) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `Starts in ${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `Starts in ${hours}h ${mins}m`;
  return `Starts in ${mins}m`;
}

const REMINDER_OPTIONS: { label: string; value: number }[] = [
  { label: '15 minutes before', value: 15 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

interface NewsArticle {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  source_url: string | null;
  artist_name: string | null;
  article_date: string | null;
  is_published: boolean;
}

interface ArtistSection {
  name: string;
  handle: string;
  profileUrl: string;
  embedUrl: string;
}

const ARTISTS: ArtistSection[] = [
  {
    name: 'Afroman',
    handle: '@ogafroman',
    profileUrl: 'https://www.instagram.com/ogafroman/',
    embedUrl: 'https://www.instagram.com/ogafroman/embed/',
  },
  {
    name: 'OG Daddy V',
    handle: '@ogdaddy_vee',
    profileUrl: 'https://www.instagram.com/ogdaddy_vee/',
    embedUrl: 'https://www.instagram.com/ogdaddy_vee/embed/',
  },
];

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function InstagramGradientBorder({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 10,
        padding: 1.5,
        backgroundColor: INSTAGRAM_GRADIENT_COLORS[1],
        borderWidth: 0,
      }}
    >
      {children}
    </View>
  );
}

function PostCard({ post }: { post: SocialPost }) {
  const handleViewPost = () => {
    if (post.post_url) {
      console.log('[Social] View post pressed:', post.post_url);
      Linking.openURL(post.post_url);
    }
  };

  return (
    <InstagramGradientBorder>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 9,
          overflow: 'hidden',
        }}
      >
        {post.image_url ? (
          <Image
            source={resolveImageSource(post.image_url)}
            style={{ width: '100%', aspectRatio: 1 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={24} color={COLORS.primary} />
          </View>
        )}
        {post.caption ? (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              lineHeight: 15,
              padding: 6,
            }}
            numberOfLines={2}
          >
            {post.caption}
          </Text>
        ) : null}
        {post.post_url ? (
          <AnimatedPressable onPress={handleViewPost} style={{ padding: 6, paddingTop: 0 }}>
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 6,
                paddingVertical: 5,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                View Post
              </Text>
            </View>
          </AnimatedPressable>
        ) : null}
      </View>
    </InstagramGradientBorder>
  );
}

function InstagramEmbed({ artist }: { artist: ArtistSection }) {
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(false);

  const handleOpenInstagram = () => {
    console.log('[Social] Open on Instagram pressed for:', artist.name, artist.profileUrl);
    Linking.openURL(artist.profileUrl);
  };

  if (webViewError) {
    return (
      <View
        style={{
          marginHorizontal: 16,
          height: 200,
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
          Could not load Instagram feed
        </Text>
        <AnimatedPressable onPress={handleOpenInstagram}>
          <View
            style={{
              backgroundColor: INSTAGRAM_GRADIENT_COLORS[1],
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
              Open on Instagram
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        height: 500,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {webViewLoading ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <SkeletonLine width="100%" height={500} borderRadius={12} />
        </View>
      ) : null}
      <WebView
        source={{ uri: artist.embedUrl }}
        style={{ flex: 1, backgroundColor: COLORS.surface }}
        onLoadStart={() => {
          console.log('[Social] WebView loading:', artist.embedUrl);
          setWebViewLoading(true);
          setWebViewError(false);
        }}
        onLoad={() => {
          console.log('[Social] WebView loaded:', artist.name);
          setWebViewLoading(false);
        }}
        onError={() => {
          console.log('[Social] WebView error for:', artist.name);
          setWebViewLoading(false);
          setWebViewError(true);
        }}
        onHttpError={() => {
          console.log('[Social] WebView HTTP error for:', artist.name);
          setWebViewLoading(false);
          setWebViewError(true);
        }}
        scrollEnabled
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        mixedContentMode="always"
      />
    </View>
  );
}

function ArtistSocialSection({
  artist,
  posts,
}: {
  artist: ArtistSection;
  posts: SocialPost[];
}) {
  const handleFollow = () => {
    console.log('[Social] Follow on Instagram pressed for:', artist.name, artist.profileUrl);
    Linking.openURL(artist.profileUrl);
  };

  const artistPosts = posts.filter(
    (p) => p.artist_name?.toLowerCase() === artist.name.toLowerCase()
  );
  const hasPosts = artistPosts.length > 0;

  return (
    <View style={{ marginBottom: 32 }}>
      {/* Artist header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 18,
              fontWeight: '700',
              letterSpacing: -0.3,
            }}
          >
            {artist.name}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
            {artist.handle}
          </Text>
        </View>
        <AnimatedPressable onPress={handleFollow}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: INSTAGRAM_GRADIENT_COLORS[1],
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}
          >
            <Share2 size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
              Follow on Instagram
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Published posts grid (shown above WebView when available) */}
      {hasPosts ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: 12,
            gap: 6,
            marginBottom: 12,
          }}
        >
          {artistPosts.map((post) => (
            <View key={post.id} style={{ width: '31.5%' }}>
              <PostCard post={post} />
            </View>
          ))}
        </View>
      ) : null}

      {/* Instagram embed WebView */}
      <InstagramEmbed artist={artist} />
    </View>
  );
}

function formatArticleDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function NewsSkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 14,
      }}
    >
      <SkeletonLine width="100%" height={180} borderRadius={0} />
      <View style={{ padding: 14, gap: 8 }}>
        <SkeletonLine width="80%" height={16} />
        <SkeletonLine width="100%" height={13} />
        <SkeletonLine width="60%" height={13} />
        <SkeletonLine width="40%" height={12} />
      </View>
    </View>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  const handleReadMore = () => {
    if (article.source_url) {
      console.log('[News] Read More pressed:', article.source_url);
      Linking.openURL(article.source_url);
    }
  };

  const dateText = formatArticleDate(article.article_date);
  const hasImage = !!article.image_url;
  const hasArtist = !!article.artist_name;
  const hasSourceUrl = !!article.source_url;

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 14,
      }}
    >
      {hasImage ? (
        <Image
          source={resolveImageSource(article.image_url ?? undefined)}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ padding: 14, gap: 8 }}>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 16,
            fontWeight: '700',
            lineHeight: 22,
            letterSpacing: -0.2,
          }}
        >
          {article.title}
        </Text>
        {article.body ? (
          <Text
            style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 }}
            numberOfLines={2}
          >
            {article.body}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {hasArtist ? (
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '600' }}>
                {article.artist_name}
              </Text>
            </View>
          ) : null}
          {dateText ? (
            <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>{dateText}</Text>
          ) : null}
        </View>
        {hasSourceUrl ? (
          <AnimatedPressable onPress={handleReadMore}>
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.primary,
                marginTop: 2,
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
                Read More
              </Text>
            </View>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { awardPoints } = useRewards();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [events, setEvents] = useState<TourEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [rsvpMap, setRsvpMap] = useState<Record<string, RsvpState>>({});
  const [rsvpLoading, setRsvpLoading] = useState<Record<string, boolean>>({});
  const [rsvdEvents, setRsvdEvents] = useState<TourEvent[]>([]);
  const [countdowns, setCountdowns] = useState<Record<string, string | null>>({});
  const [reminderModal, setReminderModal] = useState<{ eventId: string; eventTitle: string } | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      console.log('[Social] Loading social_posts from Supabase');
      const { data, error: dbError } = await dbPublic
        .from('social_posts')
        .select('*')
        .eq('is_published', true)
        .order('post_date', { ascending: false });

      if (dbError) {
        const code = (dbError.code ?? '') as string;
        const msg = (dbError.message ?? '').toLowerCase();
        const isTableMissing =
          code === 'PGRST200' ||
          code === 'PGRST204' ||
          code === '42P01' ||
          msg.includes('schema cache') ||
          msg.includes('does not exist') ||
          msg.includes('relation') ||
          msg.includes('not found');
        if (isTableMissing) {
          console.log('[Social] social_posts table not ready — showing placeholder layout');
          setShowPlaceholder(true);
          return;
        }
        console.error('[Social] Supabase error:', dbError.message);
        setShowPlaceholder(true);
        return;
      }

      const loaded = (data ?? []) as unknown as SocialPost[];
      console.log('[Social] Loaded', loaded.length, 'social posts');
      setPosts(loaded);
      setShowPlaceholder(loaded.length === 0);
    } catch (err) {
      console.error('[Social] Failed to load posts:', err);
      setShowPlaceholder(true);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      console.log('[Events] Loading events from Supabase');
      const { data, error: dbError } = await dbPublic
        .from('events')
        .select('id, title, event_date, city, venue, ticket_url, image_url, description, start_time')
        .eq('is_published', true)
        .order('event_date', { ascending: true });

      if (dbError) {
        console.error('[Events] Error:', dbError.message);
        setEvents([]);
        return;
      }

      const loaded = (data ?? []) as unknown as TourEvent[];
      console.log(`[Events] Loaded ${loaded.length} events`);
      setEvents(loaded);

      // Update countdowns
      const newCountdowns: Record<string, string | null> = {};
      loaded.forEach((e) => {
        const dateStr = e.start_time ?? e.event_date;
        newCountdowns[e.id] = countdown(dateStr);
      });
      setCountdowns(newCountdowns);
    } catch (err) {
      console.error('[Events] Error:', err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadRsvps = useCallback(async (eventList: TourEvent[]) => {
    if (!user || eventList.length === 0) return;
    try {
      console.log('[Events] Loading RSVPs for user:', user.id);
      const eventIds = eventList.map((e) => e.id);

      const { data: rsvpData } = await db
        .from('event_rsvps')
        .select('event_id, status, reminder_minutes_before')
        .eq('user_id', user.id)
        .in('event_id', eventIds);

      const newMap: Record<string, RsvpState> = {};
      eventIds.forEach((id) => {
        newMap[id] = { status: null, goingCount: 0, reminderMinutes: null };
      });

      (rsvpData ?? []).forEach((r: { event_id: string; status: RsvpStatus; reminder_minutes_before: number | null }) => {
        if (newMap[r.event_id]) {
          newMap[r.event_id].status = r.status;
          newMap[r.event_id].reminderMinutes = r.reminder_minutes_before;
        }
      });

      // Load going counts
      const { data: countData } = await dbPublic
        .from('event_rsvps')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'going');

      (countData ?? []).forEach((r: { event_id: string }) => {
        if (newMap[r.event_id]) {
          newMap[r.event_id].goingCount = (newMap[r.event_id].goingCount ?? 0) + 1;
        }
      });

      setRsvpMap(newMap);

      // Load RSVP'd events (going)
      const goingEventIds = Object.entries(newMap)
        .filter(([, v]) => v.status === 'going')
        .map(([k]) => k);

      if (goingEventIds.length > 0) {
        const goingEvents = eventList.filter((e) => goingEventIds.includes(e.id));
        setRsvdEvents(goingEvents);
      }
    } catch (err) {
      console.error('[Events] loadRsvps error:', err);
    }
  }, [user]);

  const handleRsvp = useCallback(async (eventId: string, status: RsvpStatus) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to RSVP to events.');
      return;
    }
    console.log('[Events] RSVP:', eventId, status);
    setRsvpLoading((prev) => ({ ...prev, [eventId]: true }));

    const prevState = rsvpMap[eventId];
    const wasGoing = prevState?.status === 'going';
    const willBeGoing = status === 'going';

    // Optimistic update
    setRsvpMap((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        status,
        goingCount: (prev[eventId]?.goingCount ?? 0) + (willBeGoing ? 1 : 0) - (wasGoing ? 1 : 0),
      },
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/event-rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ event_id: eventId, status }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[Events] event-rsvp error:', text);
        // Revert
        setRsvpMap((prev) => ({ ...prev, [eventId]: prevState }));
        return;
      }

      const json = await res.json();
      console.log('[Events] RSVP result:', json);
      setRsvpMap((prev) => ({
        ...prev,
        [eventId]: {
          ...prev[eventId],
          status,
          goingCount: json.rsvp_count_for_event ?? prev[eventId]?.goingCount ?? 0,
        },
      }));

      if (status === 'going') {
        awardPoints('rsvp_event', { reference_id: eventId }).catch(() => {});
      }
    } catch (err) {
      console.error('[Events] handleRsvp error:', err);
      setRsvpMap((prev) => ({ ...prev, [eventId]: prevState }));
    } finally {
      setRsvpLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  }, [user, rsvpMap, awardPoints]);

  const handleSetReminder = useCallback(async (eventId: string, minutes: number) => {
    if (!user) return;
    console.log('[Events] Set reminder:', eventId, minutes, 'minutes before');
    setReminderModal(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/event-rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          status: rsvpMap[eventId]?.status ?? 'going',
          reminder_minutes_before: minutes,
        }),
      });

      if (res.ok) {
        setRsvpMap((prev) => ({
          ...prev,
          [eventId]: { ...prev[eventId], reminderMinutes: minutes },
        }));
        Alert.alert('Reminder Set', `We'll remind you ${REMINDER_OPTIONS.find((o) => o.value === minutes)?.label ?? `${minutes} min before`}.`);
      }
    } catch (err) {
      console.error('[Events] handleSetReminder error:', err);
    }
  }, [user, rsvpMap]);

  const loadNews = useCallback(async () => {
    try {
      console.log('[News] Loading news_articles from Supabase');
      const { data, error: dbError } = await dbPublic
        .from('news_articles')
        .select('*')
        .eq('is_published', true)
        .order('article_date', { ascending: false });

      if (dbError) {
        console.error('[News] Supabase error:', dbError.message);
        setNews([]);
        return;
      }

      const loaded = (data ?? []) as unknown as NewsArticle[];
      console.log('[News] Loaded', loaded.length, 'articles');
      setNews(loaded);
    } catch (err) {
      console.error('[News] Failed to load articles:', err);
      setNews([]);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadNews().finally(() => setNewsLoading(false));
    loadEvents();
  }, [loadPosts, loadNews, loadEvents]);

  useEffect(() => {
    if (events.length > 0) {
      loadRsvps(events);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, user]);

  // Countdown interval
  useEffect(() => {
    countdownInterval.current = setInterval(() => {
      setCountdowns((prev) => {
        const updated: Record<string, string | null> = {};
        events.forEach((e) => {
          const dateStr = e.start_time ?? e.event_date;
          updated[e.id] = countdown(dateStr);
        });
        return updated;
      });
    }, 60000);
    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const handleRefresh = async () => {
    console.log('[Social] Pull-to-refresh triggered');
    setRefreshing(true);
    await Promise.all([loadPosts(), loadNews(), loadEvents()]);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <Text
          style={{
            color: COLORS.text,
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.5,
          }}
        >
          SOCIAL
        </Text>
        <View
          style={{
            width: 40,
            height: 3,
            backgroundColor: COLORS.primary,
            borderRadius: 2,
            marginTop: 6,
            ...Platform.select({
              native: {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 6,
              },
              default: {},
            }),
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* EVENTS section */}
        {(eventsLoading || events.length > 0) && (
          <View style={{ marginBottom: 28 }}>
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 28,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                }}
              >
                EVENTS
              </Text>
              <View
                style={{
                  width: 40,
                  height: 3,
                  backgroundColor: COLORS.primary,
                  borderRadius: 2,
                  marginTop: 6,
                  ...Platform.select({
                    native: {
                      shadowColor: COLORS.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 6,
                    },
                    default: {},
                  }),
                }}
              />
            </View>

            {/* RSVP'd Events horizontal scroll */}
            {rsvdEvents.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                    paddingHorizontal: 20,
                  }}
                >
                  🎟️ Your RSVP'd Events
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                >
                  {rsvdEvents.map((event) => {
                    const dateObj = event.event_date ? new Date(event.event_date) : null;
                    const dateText = dateObj
                      ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'TBA';
                    return (
                      <View
                        key={event.id}
                        style={{
                          width: 160,
                          backgroundColor: COLORS.surface,
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: COLORS.primary,
                        }}
                      >
                        <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                          {dateText}
                        </Text>
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }} numberOfLines={2}>
                          {event.title}
                        </Text>
                        {event.city ? (
                          <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                            {event.city}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {eventsLoading ? (
              <>
                <SkeletonLine
                  width="auto"
                  height={72}
                  borderRadius={12}
                  style={{ marginHorizontal: 20, marginBottom: 8 }}
                />
                <SkeletonLine
                  width="auto"
                  height={72}
                  borderRadius={12}
                  style={{ marginHorizontal: 20, marginBottom: 8 }}
                />
              </>
            ) : (
              events.map((event) => {
                const dateObj = event.event_date ? new Date(event.event_date) : null;
                const monthDisplay = dateObj
                  ? dateObj.toLocaleDateString('en-US', { month: 'short' })
                  : 'TBA';
                const dayDisplay = dateObj ? String(dateObj.getDate()) : '';
                const venueCity =
                  event.venue && event.city
                    ? `${event.venue} · ${event.city}`
                    : event.venue ?? event.city ?? '';
                const hasVenueCity = venueCity.length > 0;
                const hasTicketUrl = !!event.ticket_url;
                const rsvp = rsvpMap[event.id];
                const isRsvpLoading = rsvpLoading[event.id] ?? false;
                const goingCount = rsvp?.goingCount ?? 0;
                const countdownText = countdowns[event.id];

                const RSVP_BUTTONS: { label: string; value: RsvpStatus }[] = [
                  { label: 'Going', value: 'going' },
                  { label: 'Maybe', value: 'maybe' },
                  { label: "Can't", value: 'not_going' },
                ];

                return (
                  <View
                    key={event.id}
                    style={{ paddingHorizontal: 20, marginBottom: 12 }}
                  >
                    <View
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: rsvp?.status === 'going' ? COLORS.primary : COLORS.border,
                        padding: 14,
                        gap: 10,
                      }}
                    >
                      {/* Top row: date + info + tickets */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                          {dayDisplay ? (
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
                          ) : null}
                        </View>

                        {/* Event info */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                          {hasVenueCity ? (
                            <Text
                              style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}
                              numberOfLines={1}
                            >
                              {venueCity}
                            </Text>
                          ) : null}
                          {goingCount > 0 ? (
                            <Text style={{ fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '600' }}>
                              {`🎟️ ${goingCount} going`}
                            </Text>
                          ) : null}
                        </View>

                        {/* Tickets button */}
                        {hasTicketUrl ? (
                          <AnimatedPressable
                            onPress={() => {
                              console.log(`[Events] Tickets pressed for: ${event.title} (${event.id})`);
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
                              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.background }}>
                                Tickets
                              </Text>
                            </View>
                          </AnimatedPressable>
                        ) : null}
                      </View>

                      {/* Countdown */}
                      {countdownText ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} color={COLORS.primary} />
                          <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                            {countdownText}
                          </Text>
                        </View>
                      ) : null}

                      {/* RSVP segmented control */}
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 8,
                          padding: 3,
                          gap: 3,
                          opacity: isRsvpLoading ? 0.6 : 1,
                        }}
                      >
                        {RSVP_BUTTONS.map((btn) => {
                          const isActive = rsvp?.status === btn.value;
                          return (
                            <AnimatedPressable
                              key={btn.value}
                              onPress={() => {
                                console.log('[Events] RSVP button pressed:', btn.value, event.id);
                                handleRsvp(event.id, btn.value);
                              }}
                              disabled={isRsvpLoading}
                              style={{ flex: 1 }}
                            >
                              <View
                                style={{
                                  paddingVertical: 7,
                                  borderRadius: 6,
                                  alignItems: 'center',
                                  backgroundColor: isActive ? COLORS.primary : 'transparent',
                                  flexDirection: 'row',
                                  justifyContent: 'center',
                                  gap: 4,
                                }}
                              >
                                {isActive && <CheckCircle size={11} color={COLORS.background} />}
                                <Text
                                  style={{
                                    color: isActive ? COLORS.background : COLORS.textSecondary,
                                    fontSize: 12,
                                    fontWeight: isActive ? '700' : '500',
                                  }}
                                >
                                  {btn.label}
                                </Text>
                              </View>
                            </AnimatedPressable>
                          );
                        })}
                      </View>

                      {/* Set Reminder button (only if going or maybe) */}
                      {(rsvp?.status === 'going' || rsvp?.status === 'maybe') && (
                        <AnimatedPressable
                          onPress={() => {
                            console.log('[Events] Set reminder pressed for:', event.id);
                            setReminderModal({ eventId: event.id, eventTitle: event.title });
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: COLORS.primaryMuted,
                              borderRadius: 8,
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderWidth: 1,
                              borderColor: COLORS.primary,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Bell size={12} color={COLORS.primary} />
                            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                              {rsvp.reminderMinutes
                                ? `Reminder: ${REMINDER_OPTIONS.find((o) => o.value === rsvp.reminderMinutes)?.label ?? `${rsvp.reminderMinutes}m before`}`
                                : 'Set Reminder'}
                            </Text>
                          </View>
                        </AnimatedPressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Reminder Modal */}
        <Modal
          visible={!!reminderModal}
          transparent
          animationType="slide"
          onRequestClose={() => setReminderModal(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                gap: 12,
              }}
            >
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 4 }}>
                Set Reminder
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>
                {reminderModal?.eventTitle}
              </Text>
              {REMINDER_OPTIONS.map((opt) => (
                <AnimatedPressable
                  key={opt.value}
                  onPress={() => {
                    if (reminderModal) handleSetReminder(reminderModal.eventId, opt.value);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}>
                      {opt.label}
                    </Text>
                  </View>
                </AnimatedPressable>
              ))}
              <AnimatedPressable onPress={() => setReminderModal(null)} style={{ marginTop: 4 }}>
                <View style={{ padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Cancel</Text>
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </Modal>

        {ARTISTS.map((artist) => (
          <ArtistSocialSection
            key={artist.name}
            artist={artist}
            posts={posts}
          />
        ))}

        {/* NEWS section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.5,
            }}
          >
            NEWS
          </Text>
          <View
            style={{
              width: 40,
              height: 3,
              backgroundColor: COLORS.primary,
              borderRadius: 2,
              marginTop: 6,
              ...Platform.select({
                native: {
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                },
                default: {},
              }),
            }}
          />
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {newsLoading ? (
            <>
              <NewsSkeletonCard />
              <NewsSkeletonCard />
            </>
          ) : news.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
              <Newspaper size={40} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>
                No news articles yet
              </Text>
            </View>
          ) : (
            news.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
