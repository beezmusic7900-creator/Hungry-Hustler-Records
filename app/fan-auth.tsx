import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, User } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { HHRLogo } from '@/components/HHRLogo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'signin' | 'signup';

export default function FanAuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeSwitch = (newMode: Mode) => {
    console.log('[FanAuth] Switch mode to:', newMode);
    setMode(newMode);
    setError(null);
  };

  const handleForgotPassword = async () => {
    console.log('[FanAuth] Forgot password pressed');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) {
        console.error('[FanAuth] Password reset error:', resetError.message);
        setError(resetError.message);
      } else {
        console.log('[FanAuth] Password reset email sent to:', email.trim());
        Alert.alert('Check your email', 'A password reset link has been sent to ' + email.trim());
      }
    } catch (err) {
      console.error('[FanAuth] Password reset failed:', err);
      setError('Failed to send reset email. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }

    console.log('[FanAuth] Submit:', mode, email);
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        console.log('[FanAuth] Sign in success');
        router.replace('/(tabs)/(home)');
      } else {
        await signUpWithEmail(email.trim(), password, name.trim() || undefined);
        console.log('[FanAuth] Sign up success, attempting auto sign-in');
        try {
          await signInWithEmail(email.trim(), password);
          console.log('[FanAuth] Auto sign-in success');
          router.replace('/(tabs)/(home)');
        } catch (signInErr: unknown) {
          const signInMsg = signInErr instanceof Error ? signInErr.message : '';
          if (signInMsg.toLowerCase().includes('email not confirmed')) {
            console.log('[FanAuth] Email confirmation required');
            Alert.alert(
              'Account created!',
              'Please check your email to confirm your account, then sign in.'
            );
            setName('');
            setEmail('');
            setPassword('');
            setMode('signin');
          } else {
            throw signInErr;
          }
        }
      }
    } catch (err: unknown) {
      console.error('[FanAuth] Auth error:', err);
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const modeSignIn = mode === 'signin';
  const buttonLabel = submitting
    ? modeSignIn ? 'Signing in...' : 'Creating account...'
    : modeSignIn ? 'Sign In' : 'Create Account';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <HHRLogo size="medium" showGlow />
          </View>

          {/* Icon + title */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.primary,
                ...Platform.select({
                  native: {
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                  },
                  default: {},
                }),
              }}
            >
              <User size={28} color={COLORS.primary} />
            </View>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 24,
                fontWeight: '700',
                marginTop: 16,
                letterSpacing: -0.3,
              }}
            >
              Fan Account
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Save favorites and stay connected
            </Text>
          </View>

          {/* Mode toggle */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 4,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {(['signin', 'signup'] as Mode[]).map((m) => {
              const isActive = mode === m;
              const label = m === 'signin' ? 'Sign In' : 'Sign Up';
              return (
                <AnimatedPressable
                  key={m}
                  onPress={() => handleModeSwitch(m)}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: isActive ? COLORS.primary : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: isActive ? COLORS.background : COLORS.textSecondary,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Form */}
          <View style={{ gap: 16 }}>
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <View>
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 13,
                    fontWeight: '500',
                    marginBottom: 8,
                  }}
                >
                  Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: COLORS.text,
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
              </View>
            )}

            {/* Email */}
            <View>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 13,
                  fontWeight: '500',
                  marginBottom: 8,
                }}
              >
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: COLORS.text,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              />
            </View>

            {/* Password */}
            <View>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 13,
                  fontWeight: '500',
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry={!showPassword}
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    paddingRight: 52,
                    color: COLORS.text,
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
                <AnimatedPressable
                  onPress={() => {
                    console.log('[FanAuth] Toggle password visibility');
                    setShowPassword(!showPassword);
                  }}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={COLORS.textTertiary} />
                  ) : (
                    <Eye size={20} color={COLORS.textTertiary} />
                  )}
                </AnimatedPressable>
              </View>
            </View>

            {/* Forgot Password (sign-in only) */}
            {modeSignIn && (
              <AnimatedPressable
                onPress={handleForgotPassword}
                style={{ alignSelf: 'flex-end', marginTop: 6 }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Forgot Password?
                </Text>
              </AnimatedPressable>
            )}

            {/* Error */}
            {error ? (
              <Text
                style={{
                  color: COLORS.danger,
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                {error}
              </Text>
            ) : null}

            {/* Submit button */}
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={submitting}
              style={{ marginTop: 8 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: COLORS.background,
                    fontSize: 16,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                  }}
                >
                  {buttonLabel}
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
