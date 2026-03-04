
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Modal from '@/components/ui/Modal';

export default function AdminSetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  
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

  const handleSetup = async () => {
    setLoading(true);
    try {
      console.log('[AdminSetup] Calling admin setup endpoint');
      const { apiPost } = await import('@/utils/api');
      const response = await apiPost<{ success: boolean; message: string }>('/api/admin/setup', {});
      
      console.log('[AdminSetup] Setup response:', response);
      
      if (response.success) {
        setSetupComplete(true);
        showModal('Success', 'Admin account has been created successfully. You can now sign in.', 'success');
      } else {
        showModal('Error', 'Failed to set up admin user', 'error');
      }
    } catch (error: any) {
      console.error('[AdminSetup] Setup error:', error);
      showModal('Error', error.message || 'Failed to set up admin user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const paddingTop = Platform.OS === 'android' ? 48 : 0;

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop }]}>
        <View style={styles.content}>
          <IconSymbol
            ios_icon_name="gear"
            android_material_icon_name="settings"
            size={64}
            color={colors.primary}
          />
          
          <Text style={styles.title}>Admin Setup</Text>
          
          {!setupComplete ? (
            <>
              <Text style={styles.description}>
                This will create the admin user account for Hungry Hustler Records.
              </Text>
              
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Admin Credentials:</Text>
                <View style={styles.credentialRow}>
                  <Text style={styles.credentialLabel}>Email:</Text>
                  <Text style={styles.credentialValue}>hungry.hustler@yahoo.com</Text>
                </View>
                <View style={styles.credentialRow}>
                  <Text style={styles.credentialLabel}>Password:</Text>
                  <Text style={styles.credentialValue}>Afroman420!</Text>
                </View>
              </View>
              
              <Text style={styles.note}>
                After setup, use the credentials above to sign in and access the admin panel.
              </Text>
              
              <TouchableOpacity
                style={[commonStyles.button, loading && styles.buttonDisabled]}
                onPress={handleSetup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={commonStyles.buttonText}>Set Up Admin User</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.successCard}>
                <IconSymbol
                  ios_icon_name="checkmark.circle"
                  android_material_icon_name="check-circle"
                  size={48}
                  color={colors.primary}
                />
                <Text style={styles.successTitle}>Setup Complete!</Text>
                <Text style={styles.successText}>
                  The admin user has been created. Sign in with:
                </Text>
                <View style={styles.credentialRow}>
                  <Text style={styles.credentialLabel}>Email:</Text>
                  <Text style={styles.credentialValue}>hungry.hustler@yahoo.com</Text>
                </View>
                <View style={styles.credentialRow}>
                  <Text style={styles.credentialLabel}>Password:</Text>
                  <Text style={styles.credentialValue}>Afroman420!</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={commonStyles.button}
                onPress={() => router.replace('/auth')}
              >
                <Text style={commonStyles.buttonText}>Go to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    marginTop: 16,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  credentialLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 80,
  },
  credentialValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  note: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  successText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
