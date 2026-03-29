import React from "react";
import { Stack, useRouter } from "expo-router";
import { StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import { Lock, Settings, Music2, Mic2, Radio } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";

const ACCENT = '#E8B84B';
const BG = '#0A0A0A';
const CARD_BG = '#141414';
const MUTED = '#888';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const isAdminUser = user && isAdmin;

  function handleAdminPress() {
    if (isAdminUser) {
      console.log('[HomeScreen] Admin panel button pressed — navigating to admin panel');
      router.push('/(tabs)/admin');
    } else {
      console.log('[HomeScreen] Admin login button pressed — navigating to auth screen');
      router.push('/auth');
    }
  }

  const headerRightButton = () => (
    <Pressable
      onPress={handleAdminPress}
      style={styles.headerButton}
      accessibilityLabel={isAdminUser ? 'Admin Panel' : 'Admin Login'}
    >
      {isAdminUser ? (
        <Settings size={22} color={ACCENT} />
      ) : (
        <Lock size={22} color={ACCENT} />
      )}
    </Pressable>
  );

  const tagline = "Independent Hip-Hop Label";
  const welcomeText = "Welcome to the official home of Hungry Hustler Records. Discover our artists, latest releases, and upcoming events.";

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Home',
          headerStyle: { backgroundColor: BG },
          headerTintColor: '#fff',
          headerRight: headerRightButton,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.appName}>Hungry Hustler Records</Text>
          <Text style={styles.tagline}>{tagline}</Text>
          <View style={styles.divider} />
          <Text style={styles.welcome}>{welcomeText}</Text>
        </View>

        <View style={styles.cards}>
          <View style={styles.card}>
            <Mic2 size={28} color={ACCENT} />
            <Text style={styles.cardTitle}>Artists</Text>
            <Text style={styles.cardDesc}>Meet the roster of talented artists on the label.</Text>
          </View>
          <View style={styles.card}>
            <Music2 size={28} color={ACCENT} />
            <Text style={styles.cardTitle}>Releases</Text>
            <Text style={styles.cardDesc}>Stream the latest albums, EPs, and singles.</Text>
          </View>
          <View style={styles.card}>
            <Radio size={28} color={ACCENT} />
            <Text style={styles.cardTitle}>Events</Text>
            <Text style={styles.cardDesc}>Stay up to date on shows and appearances.</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: ACCENT,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: ACCENT,
    borderRadius: 1,
    marginBottom: 24,
  },
  welcome: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  cards: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  cardDesc: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
