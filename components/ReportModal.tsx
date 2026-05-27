import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Flag } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Hate Speech',
  'Sexual Content',
  'Violence',
  'Self Harm',
  'Copyright',
  'Other',
];

interface Props {
  targetType: string;
  targetId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportModal({ targetType, targetId, visible, onClose }: Props) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleClose = () => {
    setSelectedReason(null);
    setDetails('');
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    console.log('[ReportModal] Submitting report:', targetType, targetId, selectedReason);
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Sign in required', 'Please sign in to report content.');
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/report-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[ReportModal] report-content error:', res.status, text);
        Alert.alert('Error', 'Could not submit report. Please try again.');
        return;
      }

      const json = await res.json();
      console.log('[ReportModal] Report submitted:', json);
      setSubmitted(true);
    } catch (err) {
      console.error('[ReportModal] handleSubmit error:', err);
      Alert.alert('Error', 'Could not submit report. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'flex-end',
        }}
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
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Flag size={18} color={COLORS.danger} />
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>
                Report Content
              </Text>
            </View>
            <AnimatedPressable onPress={handleClose}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color={COLORS.textSecondary} />
              </View>
            </AnimatedPressable>
          </View>

          {submitted ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                Report submitted
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
                Thanks for reporting — our team reviews within 24 hours and will take appropriate action.
              </Text>
              <AnimatedPressable onPress={handleClose} style={{ marginTop: 20 }}>
                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 32,
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                    Done
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          ) : (
            <>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 14 }}>
                Why are you reporting this content?
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {REPORT_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <AnimatedPressable
                      key={reason}
                      onPress={() => {
                        console.log('[ReportModal] Reason selected:', reason);
                        setSelectedReason(reason);
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: isSelected ? COLORS.danger : COLORS.surfaceSecondary,
                          borderRadius: 20,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: isSelected ? COLORS.danger : COLORS.border,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? '#fff' : COLORS.textSecondary,
                            fontSize: 13,
                            fontWeight: isSelected ? '700' : '400',
                          }}
                        >
                          {reason}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {selectedReason && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>
                    Additional details (optional)
                  </Text>
                  <TextInput
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Describe the issue..."
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
                    }}
                  />
                </View>
              )}

              <AnimatedPressable
                onPress={handleSubmit}
                disabled={!selectedReason || submitting}
              >
                <View
                  style={{
                    backgroundColor: selectedReason ? COLORS.danger : COLORS.surfaceSecondary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: !selectedReason || submitting ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </Text>
                </View>
              </AnimatedPressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
