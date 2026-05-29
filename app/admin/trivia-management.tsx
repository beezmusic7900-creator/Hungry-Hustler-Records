import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2, Pencil, X, Brain } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface TriviaQuestion {
  id: string;
  category: string;
  question: string;
  choices: string[];
  correct_index: number;
  points_reward: number;
  difficulty: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ['all', 'afroman', 'og_daddy_v', 'songs', 'albums', 'brand'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const emptyForm = {
  category: 'afroman',
  question: '',
  choices: ['', '', '', ''],
  correct_index: 0,
  points_reward: '10',
  difficulty: 'easy',
};

export default function TriviaManagementScreen() {
  const insets = useSafeAreaInsets();
  useAuth();
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const [form, setForm] = useState(emptyForm);

  const loadQuestions = useCallback(async () => {
    try {
      console.log('[TriviaManagement] Loading questions');
      let query = db.from('trivia_questions').select('id, category, question, choices, correct_index, points_reward, difficulty, is_active, created_at').order('created_at', { ascending: false });
      if (filterCategory !== 'all') query = query.eq('category', filterCategory);
      const { data, error } = await query;
      if (error) { console.error('[TriviaManagement] Load error:', error.message); return; }
      setQuestions((data ?? []) as TriviaQuestion[]);
      console.log('[TriviaManagement] Loaded', (data ?? []).length, 'questions');
    } catch (err) {
      console.error('[TriviaManagement] loadQuestions error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Question', 'Delete this trivia question?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          console.log('[TriviaManagement] Delete question:', id);
          try {
            await db.from('trivia_questions').delete().eq('id', id);
            setQuestions((prev) => prev.filter((q) => q.id !== id));
          } catch (err) {
            console.error('[TriviaManagement] handleDelete error:', err);
            Alert.alert('Error', 'Could not delete question.');
          }
        },
      },
    ]);
  };

  const handleEdit = (q: TriviaQuestion) => {
    console.log('[TriviaManagement] Edit question:', q.id);
    setForm({
      category: q.category,
      question: q.question,
      choices: [...q.choices],
      correct_index: q.correct_index,
      points_reward: String(q.points_reward),
      difficulty: q.difficulty,
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.question.trim()) { Alert.alert('Question required'); return; }
    const validChoices = form.choices.filter((c) => c.trim().length > 0);
    if (validChoices.length < 2) { Alert.alert('At least 2 choices required'); return; }
    console.log('[TriviaManagement] Submit question — editing:', editingId);
    setSubmitting(true);
    try {
      const payload = {
        category: form.category,
        question: form.question.trim(),
        choices: form.choices.map((c) => c.trim()),
        correct_index: form.correct_index,
        points_reward: parseInt(form.points_reward, 10) || 10,
        difficulty: form.difficulty,
        is_active: true,
      };

      if (editingId) {
        const { error } = await db.from('trivia_questions').update(payload).eq('id', editingId);
        if (error) { Alert.alert('Error', error.message); return; }
      } else {
        const { error } = await db.from('trivia_questions').insert(payload);
        if (error) { Alert.alert('Error', error.message); return; }
      }

      console.log('[TriviaManagement] Question saved');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadQuestions();
    } catch (err) {
      console.error('[TriviaManagement] handleSubmit error:', err);
      Alert.alert('Error', 'Could not save question.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuestions = filterCategory === 'all' ? questions : questions.filter((q) => q.category === filterCategory);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 80, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700' }}>Trivia Questions</Text>
          <AnimatedPressable onPress={() => {
            console.log('[TriviaManagement] Add question pressed');
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}>
            <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color={COLORS.background} />
              <Text style={{ color: COLORS.background, fontSize: 13, fontWeight: '700' }}>Add</Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map((cat) => {
            const isActive = filterCategory === cat;
            return (
              <AnimatedPressable key={cat} onPress={() => {
                console.log('[TriviaManagement] Filter category:', cat);
                setFilterCategory(cat);
              }}>
                <View style={{ backgroundColor: isActive ? COLORS.primary : COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: isActive ? COLORS.primary : COLORS.border }}>
                  <Text style={{ color: isActive ? COLORS.background : COLORS.textSecondary, fontSize: 12, fontWeight: isActive ? '700' : '400' }}>{cat}</Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2].map((k) => (
              <View key={k} style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 }}>
                <SkeletonLine width="80%" height={14} />
                <SkeletonLine width="50%" height={11} />
              </View>
            ))}
          </View>
        ) : filteredQuestions.length === 0 ? (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
            <Brain size={32} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12 }}>No questions yet</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredQuestions.map((q) => (
              <View key={q.id} style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                      <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primary }}>
                        <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '700' }}>{q.category}</Text>
                      </View>
                      <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.border }}>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>{q.difficulty}</Text>
                      </View>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 10, alignSelf: 'center' }}>
                        +
                        {String(q.points_reward)}
                        {' pts'}
                      </Text>
                    </View>
                    <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', lineHeight: 18 }} numberOfLines={2}>{q.question}</Text>
                    <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 4 }}>
                      ✓
                      {' '}
                      {q.choices[q.correct_index]}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <AnimatedPressable onPress={() => handleEdit(q)}>
                      <Pencil size={16} color={COLORS.primary} />
                    </AnimatedPressable>
                    <AnimatedPressable onPress={() => handleDelete(q.id)}>
                      <Trash2 size={16} color={COLORS.danger} />
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Form modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: insets.bottom + 24, maxHeight: '95%', borderWidth: 1, borderColor: COLORS.border }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>{editingId ? 'Edit Question' : 'Add Question'}</Text>
                <AnimatedPressable onPress={() => setShowForm(false)}>
                  <X size={20} color={COLORS.textSecondary} />
                </AnimatedPressable>
              </View>

              {/* Category */}
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                {CATEGORIES.filter((c) => c !== 'all').map((cat) => (
                  <AnimatedPressable key={cat} onPress={() => setForm((f) => ({ ...f, category: cat }))}>
                    <View style={{ backgroundColor: form.category === cat ? COLORS.primaryMuted : COLORS.surfaceSecondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: form.category === cat ? COLORS.primary : COLORS.border }}>
                      <Text style={{ color: form.category === cat ? COLORS.primary : COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>{cat}</Text>
                    </View>
                  </AnimatedPressable>
                ))}
              </ScrollView>

              {/* Question */}
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Question *</Text>
              <TextInput
                value={form.question}
                onChangeText={(v) => setForm((f) => ({ ...f, question: v }))}
                placeholder="Enter the trivia question..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, minHeight: 80, textAlignVertical: 'top' }}
              />

              {/* Choices */}
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Choices (tap radio to mark correct)</Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {form.choices.map((choice, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <AnimatedPressable onPress={() => setForm((f) => ({ ...f, correct_index: idx }))}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: form.correct_index === idx ? COLORS.primary : COLORS.textTertiary, alignItems: 'center', justifyContent: 'center' }}>
                        {form.correct_index === idx && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary }} />}
                      </View>
                    </AnimatedPressable>
                    <TextInput
                      value={choice}
                      onChangeText={(v) => setForm((f) => ({ ...f, choices: f.choices.map((c, i) => i === idx ? v : c) }))}
                      placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                      placeholderTextColor={COLORS.textTertiary}
                      style={{ flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: form.correct_index === idx ? COLORS.primary : COLORS.border }}
                    />
                  </View>
                ))}
              </View>

              {/* Difficulty + Points */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Difficulty</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {DIFFICULTIES.map((d) => (
                      <AnimatedPressable key={d} onPress={() => setForm((f) => ({ ...f, difficulty: d }))}>
                        <View style={{ backgroundColor: form.difficulty === d ? COLORS.primaryMuted : COLORS.surfaceSecondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: form.difficulty === d ? COLORS.primary : COLORS.border }}>
                          <Text style={{ color: form.difficulty === d ? COLORS.primary : COLORS.textSecondary, fontSize: 11, fontWeight: '600' }}>{d}</Text>
                        </View>
                      </AnimatedPressable>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Points reward</Text>
                  <TextInput
                    value={form.points_reward}
                    onChangeText={(v) => setForm((f) => ({ ...f, points_reward: v }))}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor={COLORS.textTertiary}
                    style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border }}
                  />
                </View>
              </View>

              <AnimatedPressable onPress={handleSubmit} disabled={submitting}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}>
                  {submitting && <ActivityIndicator size="small" color={COLORS.background} />}
                  <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '700' }}>{submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Question')}</Text>
                </View>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
