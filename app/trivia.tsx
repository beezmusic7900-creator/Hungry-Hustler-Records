import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brain, CheckCircle, XCircle, Trophy } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { TYPOGRAPHY, LAYOUT } from '@/constants/Typography';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Category = 'all' | 'afroman' | 'og_daddy_v' | 'songs' | 'albums' | 'brand';

interface TriviaQuestion {
  id: string;
  category: string;
  question: string;
  choices: string[];
  correct_index: number;
  points_reward: number;
  difficulty: string;
}

type GameState = 'category' | 'playing' | 'answered' | 'finished';

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'all', label: 'All Categories', emoji: '🎯' },
  { key: 'afroman', label: 'Afroman', emoji: '🎤' },
  { key: 'og_daddy_v', label: 'OG Daddy V', emoji: '🎵' },
  { key: 'songs', label: 'Songs', emoji: '🎶' },
  { key: 'albums', label: 'Albums', emoji: '💿' },
  { key: 'brand', label: 'Brand', emoji: '🏷️' },
];

export default function TriviaScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('category');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [streakBonusShown, setStreakBonusShown] = useState(false);

  const loadQuestions = useCallback(async (category: Category) => {
    if (!user) { Alert.alert('Sign in required', 'Please sign in to play trivia.'); return; }
    setLoading(true);
    try {
      console.log('[Trivia] Loading questions for category:', category);
      // Get already-correct question IDs
      const { data: attemptData } = await db
        .from('trivia_attempts')
        .select('question_id')
        .eq('user_id', user.id)
        .eq('is_correct', true);

      const answeredIds = ((attemptData ?? []) as { question_id: string }[]).map((a) => a.question_id);

      let query = db
        .from('trivia_questions')
        .select('id, category, question, choices, correct_index, points_reward, difficulty')
        .eq('is_active', true);

      if (category !== 'all') {
        query = query.eq('category', category);
      }
      if (answeredIds.length > 0) {
        query = query.not('id', 'in', `(${answeredIds.join(',')})`);
      }

      const { data, error } = await query.limit(20);
      if (error) {
        console.error('[Trivia] Load error:', error.message);
        Alert.alert('Error', 'Could not load questions.');
        return;
      }

      const all = (data ?? []) as TriviaQuestion[];
      // Shuffle and take 5
      const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 5);
      console.log('[Trivia] Loaded', shuffled.length, 'questions');

      if (shuffled.length === 0) {
        Alert.alert("You've answered them all!", 'No new questions available in this category. Try another!');
        return;
      }

      setQuestions(shuffled);
      setCurrentIndex(0);
      setScore(0);
      setTotalPoints(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setCorrectStreak(0);
      setStreakBonusShown(false);
      setGameState('playing');
    } catch (err) {
      console.error('[Trivia] loadQuestions error:', err);
      Alert.alert('Error', 'Could not load questions.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleAnswer = async (choiceIndex: number) => {
    if (submitting || selectedAnswer !== null) return;
    const question = questions[currentIndex];
    if (!question) return;

    console.log('[Trivia] Answer selected:', choiceIndex, '— correct:', question.correct_index);
    setSelectedAnswer(choiceIndex);
    const correct = choiceIndex === question.correct_index;
    setIsCorrect(correct);
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-trivia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question_id: question.id,
          selected_index: choiceIndex,
        }),
      });

      if (res.ok) {
        const json = await res.json() as { is_correct: boolean; points_earned: number };
        if (json.is_correct) {
          setScore((prev) => prev + 1);
          setTotalPoints((prev) => prev + json.points_earned);
          const newStreak = correctStreak + 1;
          setCorrectStreak(newStreak);
          if (newStreak >= 5 && !streakBonusShown) {
            setStreakBonusShown(true);
            Alert.alert('🧠 Trivia Master!', 'You hit a 5-correct streak — bonus 50 pts!');
          }
        } else {
          setCorrectStreak(0);
        }
      } else {
        // Still show correct/incorrect locally
        if (correct) {
          setScore((prev) => prev + 1);
          setTotalPoints((prev) => prev + question.points_reward);
        }
      }
    } catch (err) {
      console.error('[Trivia] handleAnswer error:', err);
      if (correct) {
        setScore((prev) => prev + 1);
        setTotalPoints((prev) => prev + question.points_reward);
      }
    } finally {
      setSubmitting(false);
      setGameState('answered');
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      console.log('[Trivia] Quiz finished — score:', score + (isCorrect ? 1 : 0), '/', questions.length);
      setGameState('finished');
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setGameState('playing');
    }
  };

  const handlePlayAgain = () => {
    console.log('[Trivia] Play again pressed');
    setGameState('category');
    setQuestions([]);
  };

  const currentQuestion = questions[currentIndex];
  const finalScore = score;

  if (gameState === 'category') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 80,
          paddingHorizontal: 20,
          maxWidth: LAYOUT.feedMaxWidth,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Brain size={24} color={COLORS.primary} />
          <Text style={{ ...TYPOGRAPHY.h1, color: COLORS.text }}>
            Trivia
          </Text>
        </View>
        <Text style={{ ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: 28 }}>
          Test your knowledge and earn points
        </Text>

        <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '600', letterSpacing: 0.5, color: COLORS.textSecondary, marginBottom: 12 }}>
          CHOOSE A CATEGORY
        </Text>

        <View style={{ gap: 10 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <AnimatedPressable
                key={cat.key}
                onPress={() => {
                  console.log('[Trivia] Category selected:', cat.key);
                  setSelectedCategory(cat.key);
                }}
              >
                <View
                  style={{
                    backgroundColor: isSelected ? COLORS.primaryMuted : COLORS.surface,
                    borderRadius: 14,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderWidth: 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
                  <Text
                    style={{
                      ...TYPOGRAPHY.body,
                      color: isSelected ? COLORS.primary : COLORS.text,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {cat.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        <AnimatedPressable
          onPress={() => loadQuestions(selectedCategory)}
          disabled={loading}
          style={{ marginTop: 24 }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <ActivityIndicator size="small" color={COLORS.background} />}
            <Text style={{ ...TYPOGRAPHY.button, color: COLORS.background }}>
              {loading ? 'Loading...' : 'Start Quiz'}
            </Text>
          </View>
        </AnimatedPressable>
      </ScrollView>
    );
  }

  if (gameState === 'finished') {
    const pct = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Trophy size={56} color="#F59E0B" />
        <Text style={{ ...TYPOGRAPHY.display, color: COLORS.text, marginTop: 16, textAlign: 'center' }}>
          Quiz Complete!
        </Text>
        <Text style={{ ...TYPOGRAPHY.bodyLarge, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>
          {String(finalScore)}
          /
          {String(questions.length)}
          {' correct · '}
          {String(pct)}
          {'%'}
        </Text>
        <View
          style={{
            backgroundColor: COLORS.primaryMuted,
            borderRadius: 16,
            padding: 20,
            marginTop: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.primary,
            width: '100%',
          }}
        >
          <Text style={{ ...TYPOGRAPHY.display, color: COLORS.primary }}>
            +
            {String(totalPoints)}
          </Text>
          <Text style={{ ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.primary }}>
            points earned
          </Text>
        </View>
        <AnimatedPressable onPress={handlePlayAgain} style={{ marginTop: 24, width: '100%' }}>
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...TYPOGRAPHY.button, color: COLORS.background }}>
              Play Again
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  if (!currentQuestion) return null;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 80,
          paddingHorizontal: 20,
          maxWidth: LAYOUT.feedMaxWidth,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '600', color: COLORS.textSecondary }}>
            Question
            {' '}
            {String(currentIndex + 1)}
            /
            {String(questions.length)}
          </Text>
          <View
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.primary }}>
              {String(score)}
              {' correct · +'}
              {String(totalPoints)}
              {' pts'}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 2,
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
              backgroundColor: COLORS.primary,
              borderRadius: 2,
            }}
          />
        </View>

        {/* Question */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.primary }}>
                {currentQuestion.category.toUpperCase()}
              </Text>
            </View>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary }}>
              {currentQuestion.difficulty}
              {' · '}
              {String(currentQuestion.points_reward)}
              {' pts'}
            </Text>
          </View>
          <Text style={{ ...TYPOGRAPHY.h3, color: COLORS.text, lineHeight: 26 }}>
            {currentQuestion.question}
          </Text>
        </View>

        {/* Choices */}
        <View style={{ gap: 10 }}>
          {currentQuestion.choices.map((choice, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrectAnswer = idx === currentQuestion.correct_index;
            const showResult = gameState === 'answered';

            let bgColor = COLORS.surface;
            let borderColor = COLORS.border;
            let textColor = COLORS.text;

            if (showResult) {
              if (isCorrectAnswer) {
                bgColor = 'rgba(0,200,100,0.12)';
                borderColor = '#00C864';
                textColor = '#00C864';
              } else if (isSelected && !isCorrectAnswer) {
                bgColor = 'rgba(255,68,68,0.12)';
                borderColor = COLORS.danger;
                textColor = COLORS.danger;
              }
            } else if (isSelected) {
              bgColor = COLORS.primaryMuted;
              borderColor = COLORS.primary;
              textColor = COLORS.primary;
            }

            return (
              <AnimatedPressable
                key={idx}
                onPress={() => handleAnswer(idx)}
                disabled={gameState === 'answered' || submitting}
              >
                <View
                  style={{
                    backgroundColor: bgColor,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor,
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: showResult && isCorrectAnswer ? '#00C864' : (showResult && isSelected ? COLORS.danger : (isSelected ? COLORS.primary : COLORS.surfaceSecondary)),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showResult && isCorrectAnswer ? (
                      <CheckCircle size={16} color="#fff" />
                    ) : showResult && isSelected && !isCorrectAnswer ? (
                      <XCircle size={16} color="#fff" />
                    ) : (
                      <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '700', color: isSelected ? COLORS.background : COLORS.textSecondary }}>
                        {String.fromCharCode(65 + idx)}
                      </Text>
                    )}
                  </View>
                  <Text style={{ ...TYPOGRAPHY.body, color: textColor, fontWeight: isSelected ? '600' : '500', flex: 1 }}>
                    {choice}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Next button */}
        {gameState === 'answered' && (
          <AnimatedPressable onPress={handleNext} style={{ marginTop: 20 }}>
            <View
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...TYPOGRAPHY.button, color: COLORS.background }}>
                {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
              </Text>
            </View>
          </AnimatedPressable>
        )}
      </ScrollView>
    </View>
  );
}
