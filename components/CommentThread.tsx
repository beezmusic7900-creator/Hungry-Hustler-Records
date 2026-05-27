import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { User } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { ReactionBar } from '@/components/ReactionBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRewards } from '@/hooks/useRewards';
import { useActivity } from '@/hooks/useActivity';

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

interface FanProfile {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  fan_profiles: FanProfile | null;
  replies?: Comment[];
  showReplies?: boolean;
}

interface Props {
  targetType: 'song' | 'video' | 'news' | 'social_post';
  targetId: string;
}

function CommentItem({
  comment,
  targetType,
  targetId,
  onReplyPosted,
}: {
  comment: Comment;
  targetType: Props['targetType'];
  targetId: string;
  onReplyPosted: () => void;
}) {
  const { user } = useAuth();
  const { awardPoints } = useRewards();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [postingReply, setPostingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const profile = comment.fan_profiles;
  const displayName = profile?.display_name ?? profile?.username ?? comment.user_id.slice(0, 8);
  const avatarUrl = profile?.avatar_url ?? null;
  const timeText = timeAgo(comment.created_at);

  const loadReplies = useCallback(async () => {
    setLoadingReplies(true);
    try {
      console.log('[CommentThread] Loading replies for comment:', comment.id);
      const { data, error } = await db
        .from('comments')
        .select('id, user_id, body, created_at, parent_id, fan_profiles(display_name, username, avatar_url)')
        .eq('parent_id', comment.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[CommentThread] Load replies error:', error.message);
      } else {
        setReplies((data ?? []) as Comment[]);
      }
    } catch (err) {
      console.error('[CommentThread] loadReplies error:', err);
    } finally {
      setLoadingReplies(false);
    }
  }, [comment.id]);

  const handleToggleReplies = () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next && replies.length === 0) {
      loadReplies();
    }
  };

  const handlePostReply = async () => {
    if (!user || !replyText.trim()) return;
    console.log('[CommentThread] Posting reply to comment:', comment.id);
    setPostingReply(true);
    try {
      const { error } = await db.from('comments').insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        parent_id: comment.id,
        body: replyText.trim(),
      });
      if (error) {
        console.error('[CommentThread] Post reply error:', error.message);
      } else {
        setReplyText('');
        setShowReplyForm(false);
        setShowReplies(true);
        loadReplies();
        onReplyPosted();
        awardPoints('comment', { reference_id: targetId });
      }
    } catch (err) {
      console.error('[CommentThread] handlePostReply error:', err);
    } finally {
      setPostingReply(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 8,
      }}
    >
      {/* Author row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {avatarUrl ? (
          <Image
            source={resolveImageSource(avatarUrl)}
            style={{ width: 28, height: 28, borderRadius: 14 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <User size={14} color={COLORS.primary} />
          </View>
        )}
        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
          {timeText}
        </Text>
      </View>

      {/* Body */}
      <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
        {comment.body}
      </Text>

      {/* Reactions */}
      <ReactionBar targetType={targetType} targetId={comment.id} compact />

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        {user && (
          <AnimatedPressable onPress={() => {
            console.log('[CommentThread] Reply button pressed for comment:', comment.id);
            setShowReplyForm((v) => !v);
          }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Reply
            </Text>
          </AnimatedPressable>
        )}
        <AnimatedPressable onPress={handleToggleReplies}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
            {showReplies ? 'Hide Replies' : 'Show Replies'}
          </Text>
        </AnimatedPressable>
      </View>

      {/* Reply form */}
      {showReplyForm && (
        <View style={{ marginTop: 10, gap: 8 }}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a reply..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: COLORS.text,
              fontSize: 13,
              borderWidth: 1,
              borderColor: COLORS.border,
              minHeight: 60,
            }}
          />
          <AnimatedPressable
            onPress={handlePostReply}
            disabled={postingReply || !replyText.trim()}
          >
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 8,
                paddingVertical: 8,
                alignItems: 'center',
                opacity: postingReply || !replyText.trim() ? 0.5 : 1,
              }}
            >
              <Text style={{ color: COLORS.background, fontSize: 13, fontWeight: '700' }}>
                {postingReply ? 'Posting...' : 'Post Reply'}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      )}

      {/* Replies */}
      {showReplies && (
        <View style={{ marginTop: 10, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: COLORS.border }}>
          {loadingReplies ? (
            <SkeletonLine width="80%" height={12} />
          ) : replies.length === 0 ? (
            <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>No replies yet</Text>
          ) : (
            replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                targetType={targetType}
                targetId={targetId}
                onReplyPosted={loadReplies}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

export function CommentThread({ targetType, targetId }: Props) {
  const { user } = useAuth();
  const { awardPoints } = useRewards();
  const { recordActivity } = useActivity();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      console.log('[CommentThread] Loading comments for', targetType, targetId);
      const { data, error } = await db
        .from('comments')
        .select('id, user_id, body, created_at, parent_id, fan_profiles(display_name, username, avatar_url)')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .is('parent_id', null)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CommentThread] Load error:', error.message);
      } else {
        setComments((data ?? []) as Comment[]);
        console.log('[CommentThread] Loaded', (data ?? []).length, 'comments');
      }
    } catch (err) {
      console.error('[CommentThread] loadComments error:', err);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handlePost = async () => {
    if (!user || !newComment.trim()) return;
    console.log('[CommentThread] Posting comment for', targetType, targetId);
    setPosting(true);
    try {
      const { error } = await db.from('comments').insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        body: newComment.trim(),
      });
      if (error) {
        console.error('[CommentThread] Post error:', error.message);
      } else {
        setNewComment('');
        loadComments();
        awardPoints('comment', { reference_id: targetId });
        recordActivity('commented', targetType, targetId, targetId).catch(() => {});
      }
    } catch (err) {
      console.error('[CommentThread] handlePost error:', err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <View>
      {/* Composer */}
      {user && (
        <View style={{ marginBottom: 16, gap: 8 }}>
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: COLORS.text,
              fontSize: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              minHeight: 70,
            }}
          />
          <AnimatedPressable
            onPress={handlePost}
            disabled={posting || !newComment.trim()}
          >
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: 'center',
                opacity: posting || !newComment.trim() ? 0.5 : 1,
              }}
            >
              <Text style={{ color: COLORS.background, fontSize: 14, fontWeight: '700' }}>
                {posting ? 'Posting...' : 'Post Comment'}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      )}

      {/* Comments list */}
      {loading ? (
        <View style={{ gap: 8 }}>
          {[0, 1, 2].map((k) => (
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
              <SkeletonLine width="90%" height={14} />
              <SkeletonLine width="70%" height={14} />
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
        <View>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              targetType={targetType}
              targetId={targetId}
              onReplyPosted={loadComments}
            />
          ))}
        </View>
      )}
    </View>
  );
}
