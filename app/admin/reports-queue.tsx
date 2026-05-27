import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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

interface ContentReport {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
  reporter?: {
    display_name: string | null;
    username: string | null;
  } | null;
}

export default function ReportsQueueScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<ContentReport | null>(null);
  const [resolution, setResolution] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      console.log('[ReportsQueue] Loading open reports');
      const { data, error } = await db
        .from('content_reports')
        .select('id, reporter_id, target_type, target_id, reason, details, status, resolution, created_at, reporter:reporter_id(display_name, username)')
        .in('status', ['open', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[ReportsQueue] Error:', error.message);
      } else {
        setReports((data ?? []) as ContentReport[]);
        console.log('[ReportsQueue] Loaded', (data ?? []).length, 'reports');
      }
    } catch (err) {
      console.error('[ReportsQueue] loadReports error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const updateReportStatus = async (reportId: string, status: string, resolutionText?: string) => {
    if (!user) return;
    console.log('[ReportsQueue] Updating report:', reportId, 'status:', status);
    setProcessing(reportId);
    try {
      const { error } = await db
        .from('content_reports')
        .update({ status, resolution: resolutionText ?? null })
        .eq('id', reportId);

      if (error) {
        console.error('[ReportsQueue] Update error:', error.message);
        Alert.alert('Error', 'Could not update report.');
        return;
      }

      // Log to moderation_log
      await db.from('moderation_log').insert({
        admin_id: user.id,
        action: `report_${status}`,
        target_type: 'content_report',
        target_id: reportId,
        reason: resolutionText ?? status,
      });

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      console.log('[ReportsQueue] Report updated successfully');
    } catch (err) {
      console.error('[ReportsQueue] updateReportStatus error:', err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 80,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Flag size={22} color={COLORS.danger} />
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
            Reports Queue
          </Text>
          {!loading && reports.length > 0 && (
            <View
              style={{
                backgroundColor: 'rgba(255,68,68,0.15)',
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: 'rgba(255,68,68,0.4)',
              }}
            >
              <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '700' }}>
                {String(reports.length)}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 10,
                }}
              >
                <SkeletonLine width="60%" height={14} />
                <SkeletonLine width="40%" height={12} />
                <SkeletonLine width="100%" height={12} />
                <SkeletonLine width="100%" height={36} borderRadius={8} />
              </View>
            ))}
          </View>
        ) : reports.length === 0 ? (
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
            <Text style={{ fontSize: 32, marginBottom: 12 }}>✅</Text>
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
              No open reports
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              All reports have been reviewed
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {reports.map((report) => {
              const reporterName = report.reporter?.display_name ?? report.reporter?.username ?? 'Anonymous';
              const timeText = timeAgo(report.created_at);
              const isProcessing = processing === report.id;

              return (
                <View
                  key={report.id}
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                    <View
                      style={{
                        backgroundColor: 'rgba(255,68,68,0.12)',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: 'rgba(255,68,68,0.3)',
                      }}
                    >
                      <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '700' }}>
                        {report.reason}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: COLORS.surfaceSecondary,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' }}>
                        {report.target_type}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>
                    Reported by
                    {' '}
                    <Text style={{ color: COLORS.text, fontWeight: '600' }}>{reporterName}</Text>
                    {' · '}
                    {timeText}
                  </Text>

                  <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginBottom: 4 }}>
                    Target ID: {report.target_id.slice(0, 16)}...
                  </Text>

                  {report.details ? (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 10 }} numberOfLines={3}>
                      {report.details}
                    </Text>
                  ) : null}

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[ReportsQueue] Resolve pressed:', report.id);
                        setResolveTarget(report);
                        setResolution('');
                      }}
                      disabled={isProcessing}
                    >
                      <View
                        style={{
                          backgroundColor: 'rgba(34,197,94,0.12)',
                          borderRadius: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: 'rgba(34,197,94,0.3)',
                          opacity: isProcessing ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700' }}>
                          Mark Resolved
                        </Text>
                      </View>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[ReportsQueue] Dismiss pressed:', report.id);
                        updateReportStatus(report.id, 'dismissed');
                      }}
                      disabled={isProcessing}
                    >
                      <View
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          opacity: isProcessing ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' }}>
                          {isProcessing ? '...' : 'Dismiss'}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Resolve modal */}
      <Modal
        visible={resolveTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setResolveTarget(null)}
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
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>Resolve Report</Text>
              <AnimatedPressable onPress={() => setResolveTarget(null)}>
                <X size={20} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 }}>
              Resolution notes (optional):
            </Text>
            <TextInput
              value={resolution}
              onChangeText={setResolution}
              placeholder="Describe the action taken..."
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
                if (!resolveTarget) return;
                const id = resolveTarget.id;
                setResolveTarget(null);
                updateReportStatus(id, 'resolved', resolution.trim() || undefined);
              }}
            >
              <View
                style={{
                  backgroundColor: '#22C55E',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Mark as Resolved</Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
