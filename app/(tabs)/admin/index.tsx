import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, Eye, EyeOff, LayoutDashboard } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { HHRLogo } from '@/components/HHRLogo';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading, signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // If already logged in, show dashboard shortcut
  if (!loading && user) {
    return (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          opacity: fadeAnim,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          <LayoutDashboard size={32} color={COLORS.primary} />
        </View>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 22,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          Welcome back
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {user.email}
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[Admin] Navigate to dashboard');
            router.push('/admin/dashboard');
          }}
          style={{ marginTop: 28, width: '100%' }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
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
              Go to Dashboard
            </Text>
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    console.log('[Admin] Sign in attempt:', email);
    setSigningIn(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      console.log('[Admin] Sign in successful, navigating to dashboard');
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('[Admin] Sign in failed:', err);
      setError('Invalid credentials. Please check your email and password.');
    } finally {
      setSigningIn(false);
    }
  };

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
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <HHRLogo size="medium" showGlow />
          </View>

          {/* Lock icon */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
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
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              <Lock size={28} color={COLORS.primary} />
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
              Admin Access
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Sign in to manage your label's content
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 16 }}>
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
                placeholder="admin@example.com"
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
                    console.log('[Admin] Toggle password visibility');
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

            {/* Sign In Button */}
            <AnimatedPressable
              onPress={handleSignIn}
              disabled={signingIn}
              style={{ marginTop: 8 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: signingIn ? 0.7 : 1,
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
                  {signingIn ? 'Signing in...' : 'Sign In'}
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
