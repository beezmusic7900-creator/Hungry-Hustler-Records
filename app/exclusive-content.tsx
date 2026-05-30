import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Construction } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

export default function ExclusiveContentScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      scrollEnabled={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconCircle}>
          <Sparkles size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.headerTitle}>Exclusive Content</Text>
      </View>

      {/* Coming Soon Card */}
      <View style={styles.card}>
        <View style={styles.cardIconCircle}>
          <Construction size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.cardHeading}>Coming Soon</Text>
        <Text style={styles.cardBody}>
          {"We're cooking up exclusive tracks, behind-the-scenes videos, and member-only drops. Check back soon!"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    paddingVertical: 52,
    paddingHorizontal: 32,
    marginTop: 60,
  },
  cardIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cardHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  cardBody: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
});
