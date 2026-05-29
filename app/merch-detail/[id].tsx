import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Linking,
  ImageSourcePropType,
  Platform,
  Animated,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ShoppingBag, ExternalLink, CheckCircle, XCircle, Bookmark, Bell, Star } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabasePublic, supabase } from '@/integrations/supabase/client';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  fan_profiles?: { display_name: string | null; username: string | null } | null;
}

interface MerchItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  in_stock: boolean;
  stripe_url: string | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function MerchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState<MerchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topReviews, setTopReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowSheet, setShowFollowSheet] = useState(false);
  const [followPrefs, setFollowPrefs] = useState({ notify_launch: true, notify_restock: true, notify_price_change: true });
  const [followLoading, setFollowLoading] = useState(false);

  const { wishlisted, loading: wishlistLoading, toggle: toggleWishlist } = useWishlist(id ?? '');
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (id) {
      loadItem();
      loadReviews();
      if (user) loadFollowStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await db
        .from('product_reviews')
        .select('id, rating, title, body, created_at, fan_profiles(display_name, username)')
        .eq('merch_id', id)
        .in('status', ['approved', 'featured'])
        .order('like_count', { ascending: false })
        .limit(3);
      const reviews = (data ?? []) as Review[];
      setTopReviews(reviews);
      if (reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        setAvgRating(avg);
      }
      // Get total count
      const { count } = await db
        .from('product_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('merch_id', id)
        .in('status', ['approved', 'featured']);
      setReviewCount(count ?? 0);
    } catch (err) {
      console.error('[MerchDetail] loadReviews error:', err);
    }
  }, [id]);

  const loadFollowStatus = useCallback(async () => {
    if (!user || !id) return;
    try {
      const { data } = await db
        .from('product_followers')
        .select('id, notify_launch, notify_restock, notify_price_change')
        .eq('user_id', user.id)
        .eq('merch_id', id)
        .maybeSingle();
      if (data) {
        setIsFollowing(true);
        setFollowPrefs({
          notify_launch: data.notify_launch,
          notify_restock: data.notify_restock,
          notify_price_change: data.notify_price_change,
        });
      }
    } catch (err) {
      console.error('[MerchDetail] loadFollowStatus error:', err);
    }
  }, [user, id]);

  const handleWishlistToggle = async () => {
    console.log('[MerchDetail] Wishlist toggle pressed');
    Animated.sequence([
      Animated.timing(bookmarkScale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(bookmarkScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    const result = await toggleWishlist();
    if (result !== null) {
      Alert.alert(
        result.added ? 'Added to wishlist' : 'Removed from wishlist',
        result.added ? "We'll alert you on sales and restocks" : undefined
      );
    }
  };

  const handleFollowToggle = async () => {
    if (!user) { Alert.alert('Sign in required', 'Please sign in to follow products.'); return; }
    console.log('[MerchDetail] Follow toggle pressed — currently:', isFollowing);
    setFollowLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/toggle-product-follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ merch_id: id }),
      });
      if (res.ok) {
        const json = await res.json() as { following: boolean };
        setIsFollowing(json.following);
        if (json.following) setShowFollowSheet(true);
      } else {
        Alert.alert('Error', 'Could not update follow status.');
      }
    } catch (err) {
      console.error('[MerchDetail] handleFollowToggle error:', err);
      Alert.alert('Error', 'Could not update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUpdateFollowPrefs = async (field: keyof typeof followPrefs, value: boolean) => {
    if (!user || !id) return;
    console.log('[MerchDetail] Update follow pref:', field, value);
    setFollowPrefs((prev) => ({ ...prev, [field]: value }));
    try {
      await db.from('product_followers').update({ [field]: value }).eq('user_id', user.id).eq('merch_id', id);
    } catch (err) {
      console.error('[MerchDetail] handleUpdateFollowPrefs error:', err);
      setFollowPrefs((prev) => ({ ...prev, [field]: !value }));
    }
  };

  const loadItem = async () => {
    try {
      console.log(`[MerchDetail] Loading merch item: ${id}`);
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabasePublic
        .from('merch')
        .select('*')
        .eq('id', id as string)
        .single();

      if (dbError) {
        console.error('[MerchDetail] Supabase error:', dbError.message);
        setError("Couldn't load this item.");
        return;
      }
      setItem(data as any as MerchItem);
      navigation.setOptions({ title: (data as any).name });
    } catch (err) {
      console.error('[MerchDetail] Failed to load merch item:', err);
      setError("Couldn't load this item.");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (item?.stripe_url) {
      console.log(`[MerchDetail] Buy Now pressed: ${item.name} - ${item.stripe_url}`);
      Linking.openURL(item.stripe_url);
    }
  };

  const priceDisplay = item ? `$${Number(item.price).toFixed(2)}` : '';
  const inStockText = item?.in_stock === false ? 'Out of Stock' : 'In Stock';
  const inStockColor = item?.in_stock === false ? COLORS.danger : COLORS.success;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Product Image */}
      {loading ? (
        <SkeletonLine width="100%" height={300} borderRadius={0} />
      ) : item?.image_url ? (
        <Image
          source={resolveImageSource(item.image_url)}
          style={{ width: '100%', height: 300 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 300,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShoppingBag size={64} color={COLORS.textTertiary} />
        </View>
      )}

      <View style={{ padding: 20 }}>
        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonLine width="70%" height={28} />
            <SkeletonLine width="30%" height={24} />
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="90%" height={14} />
            <SkeletonLine width="80%" height={14} />
          </View>
        ) : item ? (
          <>
            {/* Name */}
            <Text
              style={{
                color: COLORS.text,
                fontSize: 26,
                fontWeight: '700',
                letterSpacing: -0.3,
                marginBottom: 8,
              }}
            >
              {item.name}
            </Text>

            {/* Price */}
            <Text
              style={{
                color: COLORS.primary,
                fontSize: 28,
                fontWeight: '700',
                marginBottom: 16,
                textShadowColor: 'rgba(0, 255, 102, 0.4)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              }}
            >
              {priceDisplay}
            </Text>

            {/* Stock + Category row */}
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginBottom: 20,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: COLORS.surface,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                {item.in_stock === false ? (
                  <XCircle size={14} color={COLORS.danger} />
                ) : (
                  <CheckCircle size={14} color={COLORS.success} />
                )}
                <Text
                  style={{
                    color: inStockColor,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {inStockText}
                </Text>
              </View>

              {item.category ? (
                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {item.category}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {item.description ? (
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 15,
                  lineHeight: 24,
                  marginBottom: 28,
                }}
              >
                {item.description}
              </Text>
            ) : null}

            {/* Action buttons row: Wishlist + Follow */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <AnimatedPressable
                onPress={handleWishlistToggle}
                disabled={wishlistLoading}
                style={{ flex: 1 }}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: bookmarkScale }],
                    backgroundColor: wishlisted ? COLORS.primaryMuted : COLORS.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    borderWidth: 1,
                    borderColor: wishlisted ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Bookmark
                    size={16}
                    color={wishlisted ? COLORS.primary : COLORS.textSecondary}
                    fill={wishlisted ? COLORS.primary : 'transparent'}
                  />
                  <Text style={{ color: wishlisted ? COLORS.primary : COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>
                    {wishlisted ? 'Wishlisted' : 'Wishlist'}
                  </Text>
                </Animated.View>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={isFollowing ? () => setShowFollowSheet(true) : handleFollowToggle}
                disabled={followLoading}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    backgroundColor: isFollowing ? 'rgba(245,158,11,0.12)' : COLORS.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    borderWidth: 1,
                    borderColor: isFollowing ? '#F59E0B' : COLORS.border,
                  }}
                >
                  <Bell
                    size={16}
                    color={isFollowing ? '#F59E0B' : COLORS.textSecondary}
                    fill={isFollowing ? '#F59E0B' : 'transparent'}
                  />
                  <Text style={{ color: isFollowing ? '#F59E0B' : COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>
                    {isFollowing ? 'Following' : 'Notify me'}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>

            {/* Buy Now Button */}
            {item.stripe_url ? (
              <AnimatedPressable onPress={handleBuyNow}>
                <View
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    ...Platform.select({
                      native: {
                        shadowColor: COLORS.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                      },
                      web: {
                        boxShadow: '0px 0px 12px rgba(0,255,102,0.4)',
                      },
                      default: {},
                    }),
                  }}
                >
                  <ExternalLink size={18} color={COLORS.background} />
                  <Text
                    style={{
                      color: COLORS.background,
                      fontSize: 16,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                    }}
                  >
                    Buy Now
                  </Text>
                </View>
              </AnimatedPressable>
            ) : (
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 15,
                    fontWeight: '500',
                  }}
                >
                  Contact us to purchase
                </Text>
              </View>
            )}

            {/* Reviews section */}
            <View style={{ marginTop: 28 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>Reviews</Text>
                  {avgRating > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Star size={14} color="#F59E0B" fill="#F59E0B" />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                        {avgRating.toFixed(1)}
                        {' ('}
                        {String(reviewCount)}
                        {')'}
                      </Text>
                    </View>
                  )}
                </View>
                <AnimatedPressable onPress={() => {
                  console.log('[MerchDetail] See all reviews pressed');
                  router.push(`/reviews/${id}`);
                }}>
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                    See all →
                  </Text>
                </AnimatedPressable>
              </View>

              {topReviews.length === 0 ? (
                <AnimatedPressable onPress={() => {
                  console.log('[MerchDetail] Write first review pressed');
                  router.push(`/reviews/${id}`);
                }}>
                  <View style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Be the first to review this product</Text>
                    <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600', marginTop: 4 }}>Write a Review →</Text>
                  </View>
                </AnimatedPressable>
              ) : (
                <View style={{ gap: 10 }}>
                  {topReviews.map((review) => {
                    const reviewer = review.fan_profiles?.display_name ?? review.fan_profiles?.username ?? 'Fan';
                    return (
                      <View key={review.id} style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{reviewer}</Text>
                          <View style={{ flexDirection: 'row', gap: 2 }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={11} color="#F59E0B" fill={s <= review.rating ? '#F59E0B' : 'transparent'} />
                            ))}
                          </View>
                        </View>
                        {review.title && <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>{review.title}</Text>}
                        {review.body && <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 }} numberOfLines={3}>{review.body}</Text>}
                      </View>
                    );
                  })}
                  <AnimatedPressable onPress={() => {
                    console.log('[MerchDetail] See all reviews pressed (bottom)');
                    router.push(`/reviews/${id}`);
                  }}>
                    <View style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
                      <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                        See all
                        {' '}
                        {String(reviewCount)}
                        {' reviews →'}
                      </Text>
                    </View>
                  </AnimatedPressable>
                </View>
              )}
            </View>
          </>
        ) : null}

        {/* Follow alerts sheet */}
        <Modal visible={showFollowSheet} transparent animationType="slide" onRequestClose={() => setShowFollowSheet(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Alert Settings</Text>
              {([
                { field: 'notify_launch' as const, label: 'New launch alerts' },
                { field: 'notify_restock' as const, label: 'Restock alerts' },
                { field: 'notify_price_change' as const, label: 'Price change alerts' },
              ] as const).map(({ field, label }) => (
                <View key={field} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                  <Text style={{ color: COLORS.text, fontSize: 15 }}>{label}</Text>
                  <Switch
                    value={followPrefs[field]}
                    onValueChange={(v) => handleUpdateFollowPrefs(field, v)}
                    trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryMuted }}
                    thumbColor={followPrefs[field] ? COLORS.primary : COLORS.textTertiary}
                  />
                </View>
              ))}
              <AnimatedPressable onPress={() => setShowFollowSheet(false)} style={{ marginTop: 20 }}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.background, fontWeight: '700', fontSize: 15 }}>Done</Text>
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </Modal>

        {/* Error */}
        {error && !loading && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text
              style={{
                color: COLORS.danger,
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Couldn't load this item
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[MerchDetail] Retry loading');
                loadItem();
              }}
              style={{ marginTop: 20 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 28,
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
      </View>
    </ScrollView>
  );
}
