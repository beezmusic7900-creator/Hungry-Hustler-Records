import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface MerchPoll {
  id: string;
  title: string;
  poll_type: string;
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
  options?: { id: string; label: string; vote_count: number }[];
}

const POLL_TYPES = ['general', 'favorite_design', 'favorite_collection', 'price_vote'];

export default function AdminMerchPollsScreen() {
  const insets = useSafeAreaInsets();
  useAuth();
  const [polls, setPolls] = useState<MerchPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('general');
  const [formEndsAt, setFormEndsAt] = useState('');
  const [formOptions, setFormOptions] = useState(['', '', '']);

  const loadPolls = useCallback(async () => {
    try {
      console.log('[AdminMerchPolls] Loading polls');
      const { data, error } = await db
        .from('merch_polls')
        .select('id, title, poll_type, is_active, ends_at, created_at')
        .order('created_at', { ascending: false });

      if (error) { console.error('[AdminMerchPolls] Load error:', error.message); return; }

      const pollRows = (data ?? []) as MerchPoll[];
      const pollIds = pollRows.map((p) => p.id);

      if (pollIds.length > 0) {
        const { data: optData } = await db
          .from('merch_poll_options')
          .select('id, poll_id, label, vote_count')
          .in('poll_id', pollIds);

        const optMap: Record<string, { id: string; label: string; vote_count: number }[]> = {};
        ((optData ?? []) as { id: string; poll_id: string; label: string; vote_count: number }[]).forEach((o) => {
          if (!optMap[o.poll_id]) optMap[o.poll_id] = [];
          optMap[o.poll_id].push(o);
        });

        setPolls(pollRows.map((p) => ({ ...p, options: optMap[p.id] ?? [] })));
      } else {
        setPolls([]);
      }
      console.log('[AdminMerchPolls] Loaded', pollRows.length, 'polls');
    } catch (err) {
      console.error('[AdminMerchPolls] loadPolls error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPolls(); }, [loadPolls]);

  const handleToggleActive = async (poll: MerchPoll) => {
    console.log('[AdminMerchPolls] Toggle active for poll:', poll.id, '→', !poll.is_active);
    setToggling(poll.id);
    try {
      const { error } = await db.from('merch_polls').update({ is_active: !poll.is_active }).eq('id', poll.id);
      if (error) { Alert.alert('Error', error.message); return; }
      setPolls((prev) => prev.map((p) => p.id === poll.id ? { ...p, is_active: !p.is_active } : p));
    } catch (err) {
      console.error('[AdminMerchPolls] handleToggleActive error:', err);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (pollId: string) => {
    Alert.alert('Delete Poll', 'This will delete the poll and all its options. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          console.log('[AdminMerchPolls] Delete poll:', pollId);
          try {
            await db.from('merch_poll_options').delete().eq('poll_id', pollId);
            await db.from('merch_polls').delete().eq('id', pollId);
            setPolls((prev) => prev.filter((p) => p.id !== pollId));
          } catch (err) {
            console.error('[AdminMerchPolls] handleDelete error:', err);
            Alert.alert('Error', 'Could not delete poll.');
          }
        },
      },
    ]);
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) { Alert.alert('Title required', 'Please enter a poll title.'); return; }
    const validOptions = formOptions.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) { Alert.alert('Options required', 'Please add at least 2 options.'); return; }
    console.log('[AdminMerchPolls] Create poll pressed — title:', formTitle);
    setSubmitting(true);
    try {
      const { data: pollData, error: pollError } = await db.from('merch_polls').insert({
        title: formTitle.trim(),
        poll_type: formType,
        is_active: true,
        ends_at: formEndsAt.trim() || null,
      }).select().single();

      if (pollError) { Alert.alert('Error', pollError.message); return; }

      const pollId = (pollData as { id: string }).id;
      const optionInserts = validOptions.map((label, idx) => ({
        poll_id: pollId,
        label: label.trim(),
        position: idx,
        vote_count: 0,
      }));

      await Promise.all(optionInserts.map((opt) => db.from('merch_poll_options').insert(opt)));

      console.log('[AdminMerchPolls] Poll created:', pollId);
      setShowCreate(false);
      setFormTitle('');
      setFormType('general');
      setFormEndsAt('');
      setFormOptions(['', '', '']);
      await loadPolls();
    } catch (err) {
      console.error('[AdminMerchPolls] handleCreate error:', err);
      Alert.alert('Error', 'Could not create poll.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 80, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700' }}>Merch Polls</Text>
          <AnimatedPressable onPress={() => {
            console.log('[AdminMerchPolls] Create poll pressed');
            setShowCreate(true);
          }}>
            <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color={COLORS.background} />
              <Text style={{ color: COLORS.background, fontSize: 13, fontWeight: '700' }}>Create Poll</Text>
            </View>
          </AnimatedPressable>
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View key={k} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 }}>
                <SkeletonLine width="70%" height={16} />
                <SkeletonLine width="40%" height={12} />
              </View>
            ))}
          </View>
        ) : polls.length === 0 ? (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>No polls yet</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 8 }}>Create your first merch poll</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {polls.map((poll) => {
              const totalVotes = (poll.options ?? []).reduce((sum, o) => sum + o.vote_count, 0);
              const isToggling = toggling === poll.id;

              return (
                <View key={poll.id} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{poll.title}</Text>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 12, marginTop: 2 }}>
                        {poll.poll_type}
                        {' · '}
                        {String(totalVotes)}
                        {' votes'}
                        {poll.ends_at ? ` · Ends ${new Date(poll.ends_at).toLocaleDateString()}` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Switch
                        value={poll.is_active}
                        onValueChange={() => handleToggleActive(poll)}
                        disabled={isToggling}
                        trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.primaryMuted }}
                        thumbColor={poll.is_active ? COLORS.primary : COLORS.textTertiary}
                      />
                      <AnimatedPressable onPress={() => handleDelete(poll.id)}>
                        <Trash2 size={16} color={COLORS.danger} />
                      </AnimatedPressable>
                    </View>
                  </View>

                  {(poll.options ?? []).map((opt) => (
                    <View key={opt.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12 }} numberOfLines={1}>{opt.label}</Text>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>
                        {String(opt.vote_count)}
                        {' votes'}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: insets.bottom + 24, maxHeight: '90%', borderWidth: 1, borderColor: COLORS.border }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>Create Poll</Text>
                <AnimatedPressable onPress={() => setShowCreate(false)}>
                  <X size={20} color={COLORS.textSecondary} />
                </AnimatedPressable>
              </View>

              <FormField label="Poll title *">
                <TextInput value={formTitle} onChangeText={setFormTitle} placeholder="e.g. Which design do you prefer?" placeholderTextColor={COLORS.textTertiary} style={inputStyle} />
              </FormField>

              <FormField label="Poll type">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {POLL_TYPES.map((t) => (
                    <AnimatedPressable key={t} onPress={() => setFormType(t)}>
                      <View style={{ backgroundColor: formType === t ? COLORS.primaryMuted : COLORS.surfaceSecondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: formType === t ? COLORS.primary : COLORS.border }}>
                        <Text style={{ color: formType === t ? COLORS.primary : COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>{t}</Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </FormField>

              <FormField label="Ends at (optional, YYYY-MM-DD)">
                <TextInput value={formEndsAt} onChangeText={setFormEndsAt} placeholder="2025-12-31" placeholderTextColor={COLORS.textTertiary} style={inputStyle} />
              </FormField>

              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Options *</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {formOptions.map((opt, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      value={opt}
                      onChangeText={(v) => setFormOptions((prev) => prev.map((o, i) => i === idx ? v : o))}
                      placeholder={`Option ${String(idx + 1)}`}
                      placeholderTextColor={COLORS.textTertiary}
                      style={[inputStyle, { flex: 1 }]}
                    />
                    {formOptions.length > 2 && (
                      <AnimatedPressable onPress={() => setFormOptions((prev) => prev.filter((_, i) => i !== idx))}>
                        <X size={16} color={COLORS.danger} />
                      </AnimatedPressable>
                    )}
                  </View>
                ))}
                <AnimatedPressable onPress={() => setFormOptions((prev) => [...prev, ''])}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                    <Plus size={14} color={COLORS.primary} />
                    <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>Add option</Text>
                  </View>
                </AnimatedPressable>
              </View>

              <AnimatedPressable onPress={handleCreate} disabled={submitting}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}>
                  {submitting && <ActivityIndicator size="small" color={COLORS.background} />}
                  <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '700' }}>{submitting ? 'Creating...' : 'Create Poll'}</Text>
                </View>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: COLORS.surfaceSecondary,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: COLORS.text,
  fontSize: 15,
  borderWidth: 1,
  borderColor: COLORS.border,
};
