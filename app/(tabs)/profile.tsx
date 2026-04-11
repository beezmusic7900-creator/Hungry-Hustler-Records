import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import { useMusicPurchase } from "@/contexts/MusicPurchaseContext";

export default function ProfileScreen() {
  const theme = useTheme();
  const { restorePurchases } = useMusicPurchase();
  const [restoring, setRestoring] = useState(false);

  const handleRestorePurchases = async () => {
    console.log('[Profile] Restore Purchases pressed');
    setRestoring(true);
    try {
      const result = await restorePurchases();
      console.log('[Profile] Restore complete, restored_count:', result.restored_count);
      if (result.restored_count > 0) {
        Alert.alert('Purchases Restored', `${result.restored_count} purchase${result.restored_count === 1 ? '' : 's'} restored successfully.`);
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (e: any) {
      console.error('[Profile] Restore purchases error:', e);
      Alert.alert('Restore Failed', e?.message ?? 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const restoreLabel = restoring ? 'Restoring...' : 'Restore Purchases';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        <GlassView style={[
          styles.profileHeader,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="person" size={80} color={theme.colors.primary} />
          <Text style={[styles.name, { color: theme.colors.text }]}>John Doe</Text>
          <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>john.doe@example.com</Text>
        </GlassView>

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>+1 (555) 123-4567</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="location.fill" android_material_icon_name="location-on" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>San Francisco, CA</Text>
          </View>
        </GlassView>

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <TouchableOpacity
            style={[styles.restoreBtn, restoring && styles.restoreBtnDisabled]}
            onPress={handleRestorePurchases}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={20} color={theme.colors.primary} />
            )}
            <Text style={[styles.restoreBtnText, { color: theme.colors.primary }]}>{restoreLabel}</Text>
          </TouchableOpacity>
        </GlassView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restoreBtnDisabled: {
    opacity: 0.6,
  },
  restoreBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
