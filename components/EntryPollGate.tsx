import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';

const LAST_ARTIST_KEY = 'entry_poll_last_artist';
const CLIENT_ID_KEY = 'entry_poll_client_id';
const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWF4anNreWxmZXBsaXdhZW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDgyMDUsImV4cCI6MjA4OTk4NDIwNX0.RUE1ybaqHAGEGOY-XVt4lLM_WHkOeHZbG2zKKPIP5CI';

type Artist = 'afroman' | 'og_daddy_v';

const ARTIST_CONFIG: Record<Artist, { label: string; question: string; choices: string[] }> = {
  afroman: {
    label: 'Afroman',
    question: "What's your favorite Afroman song?",
    choices: ['Because I Got High', 'Crazy Rap (Colt 45 & 2 Zig Zags)', 'Palmdale', 'Other'],
  },
  og_daddy_v: {
    label: 'OG Daddy V',
    question: "What's your favorite OG Daddy V song?",
    choices: ['Bangin In The Back', "That's Gangsta", 'Git Cha Bang On', 'Other'],
  },
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function EntryPollGate() {
  const { loading: authLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [artist, setArtist] = useState<Artist>('afroman');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [customAnswer, setCustomAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initDone = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (initDone.current) return;
    initDone.current = true;
    initPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const initPoll = async () => {
    try {
      const lastArtist = await AsyncStorage.getItem(LAST_ARTIST_KEY);
      const nextArtist: Artist =
        lastArtist === null || lastArtist === 'og_daddy_v' ? 'afroman' : 'og_daddy_v';
      console.log('[EntryPoll] Init — last artist:', lastArtist, '→ showing:', nextArtist);
      setArtist(nextArtist);
      setVisible(true);
    } catch (err) {
      console.error('[EntryPoll] initPoll error:', err);
    }
  };

  const getClientId = async (): Promise<string> => {
    let id = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = generateUUID();
      await AsyncStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  };

  const dismiss = async (saveArtist: boolean) => {
    if (saveArtist) {
      try {
        await AsyncStorage.setItem(LAST_ARTIST_KEY, artist);
      } catch (err) {
        console.error('[EntryPoll] Failed to save last artist:', err);
      }
    }
    setVisible(false);
  };

  const submitPoll = async (isSkip: boolean) => {
    console.log('[EntryPoll] Submit pressed — artist:', artist, 'choice:', selectedChoice, 'isSkip:', isSkip);
    if (!isSkip && !selectedChoice) return;
    if (!isSkip && selectedChoice === 'Other' && customAnswer.trim() === '') return;

    setSubmitting(true);
    setError(null);

    try {
      const clientId = await getClientId();
      const body: Record<string, unknown> = {
        artist,
        is_skip: isSkip,
        client_id: clientId,
      };
      if (!isSkip && selectedChoice) {
        body.choice = selectedChoice;
        if (selectedChoice === 'Other' && customAnswer.trim()) {
          body.custom_answer = customAnswer.trim();
        }
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-entry-poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        console.error('[EntryPoll] submit-entry-poll error:', res.status, text);
        if (isSkip) {
          // Don't block on skip failure
          await dismiss(true);
          return;
        }
        setError("Couldn't save your response. Please try again.");
        return;
      }

      console.log('[EntryPoll] Poll submitted successfully');
      await dismiss(true);
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'));
      console.error('[EntryPoll] submitPoll error:', err);
      if (isSkip) {
        await dismiss(true);
        return;
      }
      setError(isAbort ? 'Request timed out. Please try again.' : "Couldn't save your response.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    console.log('[EntryPoll] Skip pressed');
    submitPoll(true);
  };

  const handleSubmit = () => {
    console.log('[EntryPoll] Submit pressed');
    submitPoll(false);
  };

  const config = ARTIST_CONFIG[artist];
  const isOther = selectedChoice === 'Other';
  const canSubmit =
    selectedChoice !== null && (!isOther || customAnswer.trim().length > 0) && !submitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => dismiss(false)}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <ScrollView
            style={{ width: '100%' }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: COLORS.border,
                width: '100%',
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
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
                  <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                    {config.label}
                  </Text>
                </View>
                <AnimatedPressable onPress={() => dismiss(false)}>
                  <X size={20} color={COLORS.textSecondary} />
                </AnimatedPressable>
              </View>

              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 20,
                  fontWeight: '700',
                  letterSpacing: -0.3,
                  marginBottom: 20,
                  lineHeight: 28,
                }}
              >
                {config.question}
              </Text>

              {/* Choices */}
              <View style={{ gap: 10, marginBottom: 16 }}>
                {config.choices.map((choice) => {
                  const isSelected = selectedChoice === choice;
                  return (
                    <AnimatedPressable
                      key={choice}
                      onPress={() => {
                        console.log('[EntryPoll] Choice selected:', choice);
                        setSelectedChoice(choice);
                        if (choice !== 'Other') setCustomAnswer('');
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          backgroundColor: isSelected ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                          borderRadius: 12,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: isSelected ? COLORS.primary : COLORS.border,
                        }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: isSelected ? COLORS.primary : COLORS.textTertiary,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && (
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: COLORS.primary,
                              }}
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            color: isSelected ? COLORS.primary : COLORS.text,
                            fontSize: 15,
                            fontWeight: isSelected ? '600' : '400',
                            flex: 1,
                          }}
                        >
                          {choice}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {/* Custom answer input for "Other" */}
              {isOther && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 13,
                      fontWeight: '500',
                      marginBottom: 6,
                    }}
                  >
                    Your favorite song
                  </Text>
                  <TextInput
                    value={customAnswer}
                    onChangeText={(v) => setCustomAnswer(v.slice(0, 200))}
                    placeholder="Type your favorite song..."
                    placeholderTextColor={COLORS.textTertiary}
                    autoFocus
                    maxLength={200}
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: COLORS.text,
                      fontSize: 15,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  />
                  <Text
                    style={{
                      color: COLORS.textTertiary,
                      fontSize: 11,
                      textAlign: 'right',
                      marginTop: 4,
                    }}
                  >
                    {String(customAnswer.length)}
                    /200
                  </Text>
                </View>
              )}

              {/* Error banner */}
              {error && (
                <View
                  style={{
                    backgroundColor: 'rgba(255,68,68,0.12)',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,68,68,0.3)',
                    gap: 8,
                  }}
                >
                  <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600' }}>
                    {error}
                  </Text>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[EntryPoll] Continue without saving pressed');
                      dismiss(false);
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.textSecondary,
                        fontSize: 12,
                        textDecorationLine: 'underline',
                      }}
                    >
                      Continue without saving
                    </Text>
                  </AnimatedPressable>
                </View>
              )}

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <AnimatedPressable
                  onPress={handleSkip}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      opacity: submitting ? 0.5 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.textSecondary,
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      Skip for now
                    </Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      backgroundColor: canSubmit ? COLORS.primary : COLORS.surfaceSecondary,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: canSubmit ? COLORS.primary : COLORS.border,
                      opacity: !canSubmit ? 0.5 : 1,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {submitting && (
                      <ActivityIndicator size="small" color={COLORS.background} />
                    )}
                    <Text
                      style={{
                        color: canSubmit ? COLORS.background : COLORS.textSecondary,
                        fontSize: 15,
                        fontWeight: '700',
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
