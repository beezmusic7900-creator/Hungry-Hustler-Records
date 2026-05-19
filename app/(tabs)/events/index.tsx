import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Linking,
  RefreshControl,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, Newspaper } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic: any = supabasePublic;

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

interface TourEvent {
  id: string;
  title: string;
  event_date: string | null;
  city: string | null;
  venue: string | null;
  ticket_url: string | null;
  image_url: string | null;
  description: string | null;
}

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
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [events, setEvents] = useState<TourEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

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
        .select('id, title, event_date, city, venue, ticket_url, image_url, description')
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
    } catch (err) {
      console.error('[Events] Error:', err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

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

                return (
                  <View
                    key={event.id}
                    style={{ paddingHorizontal: 20, marginBottom: 8 }}
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
                          style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: COLORS.text,
                          }}
                          numberOfLines={1}
                        >
                          {event.title}
                        </Text>
                        {hasVenueCity ? (
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
              })
            )}
          </View>
        )}

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
