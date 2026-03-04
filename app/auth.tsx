
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import Modal from "@/components/ui/Modal";
import { colors } from "@/styles/commonStyles";
import { getBearerToken, BACKEND_URL } from "@/utils/api";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signInWithGitHub, loading: authLoading } =
    useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success',
  });

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const checkAdminAndRedirect = async () => {
    try {
      console.log('[AuthScreen] Checking admin status after login');
      
      // Wait a bit for token to be persisted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the token directly
      const token = await getBearerToken();
      
      if (!token) {
        console.error('[AuthScreen] No authentication token found after login');
        // Still redirect to home if no token
        router.replace('/');
        return;
      }
      
      console.log('[AuthScreen] Token found, checking admin status');
      
      // Make the admin check request with the token
      const response = await fetch(`${BACKEND_URL}/api/admin/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        console.error('[AuthScreen] Admin check failed:', response.status);
        router.replace('/');
        return;
      }
      
      const data = await response.json();
      console.log('[AuthScreen] Admin check response:', data);
      
      if (data.isAdmin) {
        console.log('[AuthScreen] User is admin, redirecting to /admin');
        router.replace('/(tabs)/admin');
      } else {
        console.log('[AuthScreen] User is not admin, redirecting to home');
        router.replace('/');
      }
    } catch (error) {
      console.error('[AuthScreen] Error checking admin status:', error);
      // If check fails, just go to home
      router.replace('/');
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      showModal("Error", "Please enter email and password", "error");
      return;
    }

    setLoading(true);
    try {
      console.log('[AuthScreen] Attempting authentication:', mode, email);
      if (mode === "signin") {
        await signInWithEmail(email, password);
        console.log('[AuthScreen] Sign in successful, checking admin status');
        await checkAdminAndRedirect();
      } else {
        await signUpWithEmail(email, password, name);
        console.log('[AuthScreen] Sign up successful');
        showModal(
          "Success",
          "Account created! Please check your email to verify your account.",
          "success"
        );
        router.replace("/");
      }
    } catch (error: any) {
      console.error('[AuthScreen] Authentication error:', error);
      showModal("Error", error.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple" | "github") => {
    setLoading(true);
    try {
      console.log('[AuthScreen] Attempting social auth:', provider);
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      } else if (provider === "github") {
        await signInWithGitHub();
      }
      console.log('[AuthScreen] Social auth successful, checking admin status');
      await checkAdminAndRedirect();
    } catch (error: any) {
      console.error('[AuthScreen] Social auth error:', error);
      showModal("Error", error.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </Text>

          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Name (optional)"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === "signin" ? "Sign In" : "Sign Up"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            <Text style={styles.switchModeText}>
              {mode === "signin"
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth("google")}
            disabled={loading}
          >
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={() => handleSocialAuth("apple")}
              disabled={loading}
            >
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.adminSetupContainer}>
            <Text style={styles.adminSetupText}>First time admin setup?</Text>
            <TouchableOpacity onPress={() => router.push('/admin-setup')}>
              <Text style={styles.adminSetupLink}>Set up admin account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 32,
    textAlign: "center",
    color: colors.primary,
    letterSpacing: 2,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  primaryButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: "center",
  },
  switchModeText: {
    color: colors.primary,
    fontSize: 14,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  socialButton: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: colors.card,
  },
  socialButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  appleButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  appleButtonText: {
    color: colors.text,
  },
  adminSetupContainer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 8,
  },
  adminSetupText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  adminSetupLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
