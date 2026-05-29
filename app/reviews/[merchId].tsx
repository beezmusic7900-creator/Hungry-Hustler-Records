import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, ThumbsUp, Camera, X, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Review {
  id: string;
  user_id: string;
  merch_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  photo_urls: string[] | null;
  status: string;
  is_featured: boolean;
  like_count: number;
  created_at: string;
  fan_profiles?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

type SortKey = 'newest' | 'top_rated' | 'most_helpful';
type FilterKey = 'all' | '5' | '4' | '3' | '2' | '1' | 'photos';

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
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function StarRow({ rating, size = 16, onPress }: { rating: number; size?: number; onPress?: (r: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onPress?.(s)} disabled={!onPress}>
          <Star
            size={size}
            color="#F59E0B"
            fill={s <= rating ? '#F59E0B' : 'transparent'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const { merchId } = useLocalSearchParams<{ merchId: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortKey>('newest');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [liking, setLiking] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Review form
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!merchId) return;
    try {
      console.log('[Reviews] Loading reviews for merch:', merchId, 'sort:', sort, 'filter:', filter);
      let query = db
        .from('product_reviews')
        .select('id, user_id, merch_id, rating, title, body, photo_urls, status, is_featured, like_count, created_at, fan_profiles(display_name, username, avatar_url)')
        .eq('merch_id', merchId)
        .in('status', ['approved', 'featured']);

      if (filter !== 'all' && filter !== 'photos') {
        query = query.eq('rating', parseInt(filter, 10));
      } else if (filter === 'photos') {
        query = query.not('photo_urls', 'is', null);
      }

      if (sort === 'newest') query = query.order('created_at', { ascending: false });
      else if (sort === 'top_rated') query = query.order('rating', { ascending: false });
      else if (sort === 'most_helpful') query = query.order('like_count', { ascending: false });

      const { data, error } = await query.limit(50);
      if (error) {
        console.error('[Reviews] Load error:', error.message);
      } else {
        setReviews((data ?? []) as Review[]);
        console.log('[Reviews] Loaded', (data ?? []).length, 'reviews');
      }
    } catch (err) {
      console.error('[Reviews] loadReviews error:', err);
    } finally {
      setLoading(false);
    }
  }, [merchId, sort, filter]);

  useEffect(() => {
    navigation.setOptions({ title: 'Reviews' });
    setLoading(true);
    loadReviews();
  }, [loadReviews, navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const handleLike = async (reviewId: string) => {
    if (!user) { Alert.alert('Sign in', 'Sign in to like reviews.'); return; }
    console.log('[Reviews] Like review:', reviewId);
    setLiking(reviewId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/like-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ review_id: reviewId }),
      });
      if (res.ok) {
        const json = await res.json() as { liked: boolean; like_count: number };
        setReviews((prev) =>
          prev.map((r) => r.id === reviewId ? { ...r, like_count: json.like_count } : r)
        );
      }
    } catch (err) {
      console.error('[Reviews] handleLike error:', err);
    } finally {
      setLiking(null);
    }
  };

  const handlePickPhoto = async () => {
    if (formPhotos.length >= 4) { Alert.alert('Limit reached', 'You can upload up to 4 photos.'); return; }
    console.log('[Reviews] Pick photo pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const path = `reviews/${user?.id ?? 'anon'}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) { Alert.alert('Upload failed', uploadError.message); return; }
      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);
      setFormPhotos((prev) => [...prev, urlData.publicUrl]);
      console.log('[Reviews] Photo uploaded:', urlData.publicUrl);
    } catch (err) {
      console.error('[Reviews] handlePickPhoto error:', err);
      Alert.alert('Error', 'Could not upload photo.');
    }
  };

  const handleSubmitReview = async () => {
    if (formRating === 0) { Alert.alert('Rating required', 'Please select a star rating.'); return; }
    console.log('[Reviews] Submit review pressed — rating:', formRating);
    setSubmittingReview(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { Alert.alert('Sign in required', 'Please sign in to submit a review.'); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          merch_id: merchId,
          rating: formRating,
          title: formTitle.trim() || null,
          body: formBody.trim() || null,
          photo_urls: formPhotos.length > 0 ? formPhotos : null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[Reviews] submit-review error:', res.status, text);
        Alert.alert('Error', 'Could not submit review. Please try again.');
        return;
      }
      console.log('[Reviews] Review submitted successfully');
      setReviewSuccess(true);
    } catch (err) {
      console.error('[Reviews] handleSubmitReview error:', err);
      Alert.alert('Error', 'Could not submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const avgRatingDisplay = avgRating > 0 ? avgRating.toFixed(1) : '—';

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'top_rated', label: 'Top Rated' },
    { key: 'most_helpful', label: 'Most Helpful' },
  ];

  const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: '5', label: '5★' },
    { key: '4', label: '4★' },
    { key: '3', label: '3★' },
    { key: '2', label: '2★' },
    { key: '1', label: '1★' },
    { key: 'photos', label: 'With Photos' },
  ];

  const currentSortLabel = SORT_OPTIONS.find((s) => s.key === sort)?.label ?? 'Newest';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
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
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
                {avgRatingDisplay}
              </Text>
              <StarRow rating={Math.round(avgRating)} size={20} />
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
              {String(reviews.length)}
              {' '}
              {reviews.length === 1 ? 'review' : 'reviews'}
            </Text>
          </View>
          <AnimatedPressable
            onPress={() => {
              console.log('[Reviews] Write a review pressed');
              setShowForm(true);
              setReviewSuccess(false);
              setFormRating(0);
              setFormTitle('');
              setFormBody('');
              setFormPhotos([]);
            }}
          >
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ color: COLORS.background, fontSize: 13, fontWeight: '700' }}>
                Write a Review
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Sort + Filter */}
        <View style={{ marginBottom: 16, gap: 10 }}>
          <AnimatedPressable onPress={() => setShowSortMenu(true)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: COLORS.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>
                {currentSortLabel}
              </Text>
              <ChevronDown size={14} color={COLORS.textSecondary} />
            </View>
          </AnimatedPressable>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTER_OPTIONS.map((f) => {
              const isActive = filter === f.key;
              return (
                <AnimatedPressable
                  key={f.key}
                  onPress={() => {
                    console.log('[Reviews] Filter changed:', f.key);
                    setFilter(f.key);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: isActive ? COLORS.primary : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? COLORS.background : COLORS.textSecondary,
                        fontSize: 12,
                        fontWeight: isActive ? '700' : '400',
                      }}
                    >
                      {f.label}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Reviews list */}
        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <SkeletonLine width={36} height={36} borderRadius={18} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonLine width="50%" height={13} />
                    <SkeletonLine width="30%" height={11} />
                  </View>
                </View>
                <SkeletonLine width="80%" height={14} />
                <SkeletonLine width="100%" height={40} />
              </View>
            ))}
          </View>
        ) : reviews.length === 0 ? (
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
            <Star size={32} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
              No reviews yet
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Be the first to review this product
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {reviews.map((review) => {
              const reviewer = review.fan_profiles?.display_name ?? review.fan_profiles?.username ?? 'Fan';
              const avatarUrl = review.fan_profiles?.avatar_url ?? null;
              const timeText = timeAgo(review.created_at);
              const isLiking = liking === review.id;

              return (
                <View
                  key={review.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: review.is_featured ? COLORS.primary : COLORS.border,
                  }}
                >
                  {review.is_featured && (
                    <View
                      style={{
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        alignSelf: 'flex-start',
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                      }}
                    >
                      <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '700' }}>
                        FEATURED
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {avatarUrl ? (
                        <Image
                          source={resolveImageSource(avatarUrl)}
                          style={{ width: 36, height: 36 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                          {reviewer.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>
                        {reviewer}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <StarRow rating={review.rating} size={12} />
                        <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                          {timeText}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {review.title && (
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>
                      {review.title}
                    </Text>
                  )}
                  {review.body && (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 10 }}>
                      {review.body}
                    </Text>
                  )}

                  {/* Photos */}
                  {review.photo_urls && review.photo_urls.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      {review.photo_urls.map((url, idx) => (
                        <Image
                          key={idx}
                          source={resolveImageSource(url)}
                          style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  )}

                  {/* Like button */}
                  <AnimatedPressable
                    onPress={() => handleLike(review.id)}
                    disabled={isLiking}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        alignSelf: 'flex-start',
                        backgroundColor: COLORS.surfaceSecondary,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      {isLiking ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <ThumbsUp size={13} color={COLORS.textSecondary} />
                      )}
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
                        {String(review.like_count)}
                        {' helpful'}
                      </Text>
                    </View>
                  </AnimatedPressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sort menu modal */}
      <Modal visible={showSortMenu} transparent animationType="fade" onRequestClose={() => setShowSortMenu(false)}>
        <AnimatedPressable onPress={() => setShowSortMenu(false)} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 40 }}>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              {SORT_OPTIONS.map((s) => (
                <AnimatedPressable
                  key={s.key}
                  onPress={() => {
                    console.log('[Reviews] Sort changed:', s.key);
                    setSort(s.key);
                    setShowSortMenu(false);
                  }}
                >
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      backgroundColor: sort === s.key ? COLORS.primaryMuted : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: sort === s.key ? COLORS.primary : COLORS.text,
                        fontSize: 15,
                        fontWeight: sort === s.key ? '700' : '400',
                      }}
                    >
                      {s.label}
                    </Text>
                  </View>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </AnimatedPressable>
      </Modal>

      {/* Review form modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: insets.bottom + 24,
              maxHeight: '90%',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>
                  Write a Review
                </Text>
                <AnimatedPressable onPress={() => setShowForm(false)}>
                  <X size={20} color={COLORS.textSecondary} />
                </AnimatedPressable>
              </View>

              {reviewSuccess ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>⭐</Text>
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
                    Review submitted!
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                    Your review is pending approval and will appear once reviewed.
                  </Text>
                  <AnimatedPressable onPress={() => setShowForm(false)} style={{ marginTop: 20 }}>
                    <View
                      style={{
                        backgroundColor: COLORS.primary,
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 32,
                      }}
                    >
                      <Text style={{ color: COLORS.background, fontWeight: '700' }}>Done</Text>
                    </View>
                  </AnimatedPressable>
                </View>
              ) : (
                <>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
                    Your rating *
                  </Text>
                  <View style={{ marginBottom: 16 }}>
                    <StarRow rating={formRating} size={32} onPress={(r) => {
                      console.log('[Reviews] Form rating selected:', r);
                      setFormRating(r);
                    }} />
                  </View>

                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
                    Title (optional)
                  </Text>
                  <TextInput
                    value={formTitle}
                    onChangeText={(v) => setFormTitle(v.slice(0, 60))}
                    placeholder="Summarize your experience..."
                    placeholderTextColor={COLORS.textTertiary}
                    maxLength={60}
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: COLORS.text,
                      fontSize: 15,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      marginBottom: 12,
                    }}
                  />

                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
                    Review (optional)
                  </Text>
                  <TextInput
                    value={formBody}
                    onChangeText={(v) => setFormBody(v.slice(0, 2000))}
                    placeholder="Share your thoughts about this product..."
                    placeholderTextColor={COLORS.textTertiary}
                    multiline
                    numberOfLines={4}
                    maxLength={2000}
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: COLORS.text,
                      fontSize: 15,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      marginBottom: 4,
                      minHeight: 100,
                      textAlignVertical: 'top',
                    }}
                  />
                  <Text style={{ color: COLORS.textTertiary, fontSize: 11, textAlign: 'right', marginBottom: 12 }}>
                    {String(formBody.length)}
                    /2000
                  </Text>

                  {/* Photos */}
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
                    Photos (up to 4)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {formPhotos.map((url, idx) => (
                      <View key={idx} style={{ position: 'relative' }}>
                        <Image
                          source={resolveImageSource(url)}
                          style={{ width: 72, height: 72, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                        <AnimatedPressable
                          onPress={() => setFormPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: -6, right: -6 }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: COLORS.danger,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <X size={12} color="#fff" />
                          </View>
                        </AnimatedPressable>
                      </View>
                    ))}
                    {formPhotos.length < 4 && (
                      <AnimatedPressable onPress={handlePickPhoto}>
                        <View
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 8,
                            backgroundColor: COLORS.surfaceSecondary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            borderStyle: 'dashed',
                          }}
                        >
                          <Camera size={20} color={COLORS.textTertiary} />
                        </View>
                      </AnimatedPressable>
                    )}
                  </View>

                  <AnimatedPressable
                    onPress={handleSubmitReview}
                    disabled={submittingReview || formRating === 0}
                  >
                    <View
                      style={{
                        backgroundColor: formRating > 0 ? COLORS.primary : COLORS.surfaceSecondary,
                        borderRadius: 14,
                        paddingVertical: 16,
                        alignItems: 'center',
                        opacity: submittingReview ? 0.7 : 1,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      {submittingReview && <ActivityIndicator size="small" color={COLORS.background} />}
                      <Text
                        style={{
                          color: formRating > 0 ? COLORS.background : COLORS.textSecondary,
                          fontSize: 16,
                          fontWeight: '700',
                        }}
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </Text>
                    </View>
                  </AnimatedPressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
