import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, MoreHorizontal, User, Send, Trash2 } from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { ReportModal } from '@/components/ReportModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';

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

interface Submission {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  submission_type: string;
  media_url: string;
  media_type: 'video' | 'audio' | 'image' | 'text';
  thumbnail_url: string | null;
  status: string;
  is_featured: boolean;
  like_count: number;
  view_count: number;
  created_at: string;
  fan_profiles?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface SubmissionComment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  fan_profiles?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

function VideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 280 }}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function SubmissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<SubmissionComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const loadSubmission = useCallback(async () => {
    if (!id) return;
    try {
      console.log('[SubmissionDetail] Loading submission:', id);
      const { data, error } = await db
        .from('submissions')
        .select('*, fan_profiles(display_name, username, avatar_url)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[SubmissionDetail] Error:', error.message);
      } else {
        setSubmission(data ?? null);
        setLikeCount(data?.like_count ?? 0);
      }
    } catch (err) {
      console.error('[SubmissionDetail] loadSubmission error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    try {
      setCommentsLoading(true);
      const { data, error } = await db
        .from('submission_comments')
        .select('id, user_id, body, created_at, fan_profiles(display_name, username, avatar_url)')
        .eq('submission_id', id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SubmissionDetail] Comments error:', error.message);
      } else {
        setComments((data ?? []) as SubmissionComment[]);
      }
    } catch (err) {
      console.error('[SubmissionDetail] loadComments error:', err);
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  const loadLikeState = useCallback(async () => {
    if (!user || !id) return;
    try {
      const { data } = await db
        .from('submission_votes')
        .select('submission_id')
        .eq('user_id', user.id)
        .eq('submission_id', id)
        .maybeSingle();
      setIsLiked(!!data);
    } catch (err) {
      console.error('[SubmissionDetail] loadLikeState error:', err);
    }
  }, [user, id]);

  useEffect(() => {
    if (id) {
      loadSubmission();
      loadComments();
      loadLikeState();

      // Track view
      trackEvent('submission_view', { submission_id: id });
    }
  }, [id, loadSubmission, loadComments, loadLikeState, trackEvent]);

  const handleLike = async () => {
    if (!user) {
      router.push('/fan-auth');
      return;
    }
    console.log('[SubmissionDetail] Like toggled:', id);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));

    try {
      if (wasLiked) {
        await db.from('submission_votes').delete().eq('user_id', user.id).eq('submission_id', id);
      } else {
        await db.from('submission_votes').insert({ user_id: user.id, submission_id: id });
      }
    } catch (err) {
      console.error('[SubmissionDetail] handleLike error:', err);
      setIsLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  };

  const handlePostComment = async () => {
    if (!user || !newComment.trim()) return;
    console.log('[SubmissionDetail] Posting comment on submission:', id);
    setPosting(true);
    try {
      const { error } = await db.from('submission_comments').insert({
        user_id: user.id,
        submission_id: id,
        body: newComment.trim(),
      });
      if (error) {
        console.error('[SubmissionDetail] Post comment error:', error.message);
        Alert.alert('Error', 'Could not post comment.');
      } else {
        setNewComment('');
        loadComments();
      }
    } catch (err) {
      console.error('[SubmissionDetail] handlePostComment error:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleBlock = async () => {
    if (!submission || !user) return;
    const name = submission.fan_profiles?.display_name ?? submission.fan_profiles?.username ?? 'this user';
    Alert.alert(
      `Block ${name}?`,
      "You won't see their content anymore.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            console.log('[SubmissionDetail] Blocking user:', submission.user_id);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) return;
              await fetch(`${SUPABASE_URL}/functions/v1/block-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ blocked_id: submission.user_id, action: 'block' }),
              });
              router.back();
            } catch (err) {
              console.error('[SubmissionDetail] handleBlock error:', err);
            }
          },
        },
      ]
    );
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!submission || !user || submission.user_id !== user.id) return;
    Alert.alert(
      'Delete submission?',
      'This will permanently remove your submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[SubmissionDetail] Deleting submission:', id);
            try {
              await db.from('submissions').delete().eq('id', id).eq('user_id', user.id);
              router.back();
            } catch (err) {
              console.error('[SubmissionDetail] handleDelete error:', err);
            }
          },
        },
      ]
    );
    setShowMenu(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SkeletonLine width="100%" height={280} borderRadius={0} />
        <View style={{ padding: 20, gap: 12 }}>
          <SkeletonLine width="70%" height={20} />
          <SkeletonLine width="40%" height={14} />
          <SkeletonLine width="100%" height={60} />
        </View>
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>Submission not found.</Text>
      </View>
    );
  }

  const isOwn = user?.id === submission.user_id;
  const ownerName = submission.fan_profiles?.display_name ?? submission.fan_profiles?.username ?? 'Fan';
  const likeCountText = String(likeCount);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Media */}
      {submission.media_type === 'video' ? (
        <VideoPlayer uri={submission.media_url} />
      ) : (
        <Image
          source={resolveImageSource(submission.media_url)}
          style={{ width: '100%', height: 300 }}
          resizeMode="cover"
        />
      )}

      <View style={{ padding: 20 }}>
        {/* Title + menu */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>
              {submission.title}
            </Text>
            {submission.is_featured && (
              <View
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  alignSelf: 'flex-start',
                  marginTop: 6,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
              >
                <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>⭐ FEATURED</Text>
              </View>
            )}
          </View>
          <AnimatedPressable onPress={() => {
            console.log('[SubmissionDetail] Menu pressed');
            setShowMenu(true);
          }}>
            <View style={{ padding: 6 }}>
              <MoreHorizontal size={22} color={COLORS.textSecondary} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Owner */}
        <AnimatedPressable
          onPress={() => {
            console.log('[SubmissionDetail] Owner profile pressed:', submission.user_id);
            router.push(`/profile/${submission.user_id}`);
          }}
          style={{ marginBottom: 14 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              {submission.fan_profiles?.avatar_url ? (
                <Image
                  source={resolveImageSource(submission.fan_profiles.avatar_url)}
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                  resizeMode="cover"
                />
              ) : (
                <User size={18} color={COLORS.primary} />
              )}
            </View>
            <View>
              <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>{ownerName}</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{timeAgo(submission.created_at)}</Text>
            </View>
          </View>
        </AnimatedPressable>

        {/* Description */}
        {submission.description ? (
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
            {submission.description}
          </Text>
        ) : null}

        {/* Like button */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
          <AnimatedPressable onPress={handleLike}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: isLiked ? 'rgba(255,68,68,0.12)' : COLORS.surface,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: isLiked ? COLORS.danger : COLORS.border,
              }}
            >
              <Heart
                size={18}
                color={isLiked ? COLORS.danger : COLORS.textSecondary}
                fill={isLiked ? COLORS.danger : 'transparent'}
              />
              <Text style={{ color: isLiked ? COLORS.danger : COLORS.textSecondary, fontSize: 14, fontWeight: '700' }}>
                {likeCountText}
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Comments section */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 14 }}>
            Comments
          </Text>

          {/* Composer */}
          {user && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: COLORS.text,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  minHeight: 44,
                  maxHeight: 100,
                }}
              />
              <AnimatedPressable
                onPress={handlePostComment}
                disabled={posting || !newComment.trim()}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: newComment.trim() ? COLORS.primary : COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: posting ? 0.6 : 1,
                  }}
                >
                  <Send size={18} color={newComment.trim() ? COLORS.background : COLORS.textTertiary} />
                </View>
              </AnimatedPressable>
            </View>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <View style={{ gap: 8 }}>
              {[0, 1].map((k) => (
                <View
                  key={k}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <SkeletonLine width={28} height={28} borderRadius={14} />
                    <SkeletonLine width="40%" height={13} />
                  </View>
                  <SkeletonLine width="80%" height={13} />
                </View>
              ))}
            </View>
          ) : comments.length === 0 ? (
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
              <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                No comments yet — be the first!
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {comments.map((comment) => {
                const cName = comment.fan_profiles?.display_name ?? comment.fan_profiles?.username ?? 'Fan';
                const cTime = timeAgo(comment.created_at);
                return (
                  <View
                    key={comment.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: COLORS.primaryMuted,
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {comment.fan_profiles?.avatar_url ? (
                          <Image
                            source={resolveImageSource(comment.fan_profiles.avatar_url)}
                            style={{ width: 28, height: 28, borderRadius: 14 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <User size={14} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                        {cName}
                      </Text>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>{cTime}</Text>
                    </View>
                    <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 20 }}>
                      {comment.body}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Three-dot menu modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <AnimatedPressable
          onPress={() => setShowMenu(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        >
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
            {!isOwn && (
              <>
                <AnimatedPressable
                  onPress={() => {
                    setShowMenu(false);
                    setShowReport(true);
                  }}
                >
                  <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
                    <Text style={{ color: COLORS.danger, fontSize: 15, fontWeight: '600' }}>🚩 Report</Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable onPress={handleBlock}>
                  <View style={{ paddingVertical: 14 }}>
                    <Text style={{ color: COLORS.danger, fontSize: 15, fontWeight: '600' }}>🚫 Block creator</Text>
                  </View>
                </AnimatedPressable>
              </>
            )}
            {isOwn && submission.status === 'pending' && (
              <AnimatedPressable onPress={handleDelete}>
                <View style={{ paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Trash2 size={18} color={COLORS.danger} />
                  <Text style={{ color: COLORS.danger, fontSize: 15, fontWeight: '600' }}>Delete submission</Text>
                </View>
              </AnimatedPressable>
            )}
          </View>
        </AnimatedPressable>
      </Modal>

      {/* Report modal */}
      <ReportModal
        targetType="submission"
        targetId={id ?? ''}
        visible={showReport}
        onClose={() => setShowReport(false)}
      />
    </ScrollView>
  );
}
