import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';

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
  submission_type: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  status: string;
  moderation_notes: string | null;
  like_count: number;
  created_at: string;
  fan_profiles?: {
    display_name: string | null;
    username: string | null;
  } | null;
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'featured', label: 'Featured' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'removed', label: 'Removed' },
];

const ACTION_BUTTONS: Record<string, { action: string; label: string; color: string }[]> = {
  pending: [
    { action: 'approve', label: 'Approve', color: '#22C55E' },
    { action: 'feature', label: 'Feature', color: COLORS.primary },
    { action: 'reject', label: 'Reject', color: COLORS.danger },
  ],
  approved: [
    { action: 'feature', label: 'Feature', color: COLORS.primary },
    { action: 'remove', label: 'Remove', color: COLORS.danger },
  ],
  featured: [
    { action: 'approve', label: 'Unfeature', color: '#22C55E' },
    { action: 'remove', label: 'Remove', color: COLORS.danger },
  ],
  rejected: [
    { action: 'approve', label: 'Approve', color: '#22C55E' },
    { action: 'remove', label: 'Remove', color: COLORS.danger },
  ],
  removed: [
    { action: 'approve', label: 'Restore', color: '#22C55E' },
  ],
};

export default function SubmissionsQueueScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('pending');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [moderating, setModerating] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSubmissions = useCallback(async () => {
    try {
      console.log('[SubmissionsQueue] Loading submissions, status:', activeTab);
      const { data, error } = await db
        .from('submissions')
        .select('id, user_id, title, submission_type, media_type, media_url, thumbnail_url, status, moderation_notes, like_count, created_at, fan_profiles(display_name, username)')
        .eq('status', activeTab)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[SubmissionsQueue] Error:', error.message);
      } else {
        setSubmissions((data ?? []) as Submission[]);
      }
    } catch (err) {
      console.error('[SubmissionsQueue] loadSubmissions error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadSubmissions();

    // Auto-refresh every 30s
    intervalRef.current = setInterval(() => {
      loadSubmissions();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadSubmissions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubmissions();
    setRefreshing(false);
  };

  const handleModerate = async (submissionId: string, action: string, notes?: string) => {
    console.log('[SubmissionsQueue] Moderating submission:', submissionId, action);
    setModerating(submissionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/moderate-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ submission_id: submissionId, action, notes }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[SubmissionsQueue] moderate-submission error:', res.status, text);
        Alert.alert('Error', 'Could not moderate submission.');
        return;
      }

      console.log('[SubmissionsQueue] Moderation successful');
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    } catch (err) {
      console.error('[SubmissionsQueue] handleModerate error:', err);
    } finally {
      setModerating(null);
    }
  };

  const handleActionPress = (submission: Submission, action: string) => {
    console.log('[SubmissionsQueue] Action pressed:', action, 'for:', submission.id);
    if (action === 'reject') {
      setRejectTarget(submission.id);
      setRejectNotes('');
    } else {
      handleModerate(submission.id, action);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Tabs */}
      <View style={{ paddingTop: insets.top + 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <AnimatedPressable
                key={tab.key}
                onPress={() => {
                  console.log('[SubmissionsQueue] Tab changed:', tab.key);
                  setActiveTab(tab.key);
                }}
              >
                <View
                  style={{
                    backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? COLORS.background : COLORS.textSecondary,
                      fontSize: 13,
                      fontWeight: isActive ? '700' : '400',
                    }}
                  >
                    {tab.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 12, paddingTop: 12 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <SkeletonLine width={72} height={72} borderRadius={10} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonLine width="70%" height={14} />
                  <SkeletonLine width="40%" height={12} />
                  <SkeletonLine width="100%" height={32} borderRadius={8} />
                </View>
              </View>
            ))}
          </View>
        ) : submissions.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 40,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
              marginTop: 20,
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 12 }}>✅</Text>
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
              Queue is clear
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              No {activeTab} submissions
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12, paddingTop: 12 }}>
            {submissions.map((sub) => {
              const ownerName = sub.fan_profiles?.display_name ?? sub.fan_profiles?.username ?? 'Unknown';
              const timeText = timeAgo(sub.created_at);
              const actions = ACTION_BUTTONS[activeTab] ?? [];
              const isProcessing = moderating === sub.id;

              return (
                <View
                  key={sub.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    {/* Thumbnail */}
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 10,
                        backgroundColor: COLORS.surfaceSecondary,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {sub.thumbnail_url ? (
                        <Image
                          source={resolveImageSource(sub.thumbnail_url)}
                          style={{ width: 72, height: 72 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 28 }}>
                          {sub.media_type === 'video' ? '🎬' : sub.media_type === 'image' ? '🖼️' : '🎵'}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                        {sub.title}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {ownerName}
                      </Text>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 2 }}>
                        {sub.submission_type.replace(/_/g, ' ')}
                        {' · '}
                        {timeText}
                      </Text>
                      {sub.moderation_notes ? (
                        <Text style={{ color: COLORS.warning, fontSize: 11, marginTop: 4 }} numberOfLines={2}>
                          Note: {sub.moderation_notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {actions.map((btn) => (
                      <AnimatedPressable
                        key={btn.action}
                        onPress={() => handleActionPress(sub, btn.action)}
                        disabled={isProcessing}
                      >
                        <View
                          style={{
                            backgroundColor: `${btn.color}18`,
                            borderRadius: 8,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: `${btn.color}40`,
                            opacity: isProcessing ? 0.5 : 1,
                          }}
                        >
                          <Text style={{ color: btn.color, fontSize: 12, fontWeight: '700' }}>
                            {isProcessing ? '...' : btn.label}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Reject modal */}
      <Modal
        visible={rejectTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectTarget(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>Reject Submission</Text>
              <AnimatedPressable onPress={() => setRejectTarget(null)}>
                <X size={20} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 }}>
              Reason for rejection (shown to creator):
            </Text>
            <TextInput
              value={rejectNotes}
              onChangeText={setRejectNotes}
              placeholder="e.g. Content violates community guidelines..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: COLORS.text,
                fontSize: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
            />
            <AnimatedPressable
              onPress={() => {
                if (!rejectTarget) return;
                const id = rejectTarget;
                setRejectTarget(null);
                handleModerate(id, 'reject', rejectNotes.trim() || undefined);
              }}
            >
              <View
                style={{
                  backgroundColor: COLORS.danger,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Reject Submission</Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
