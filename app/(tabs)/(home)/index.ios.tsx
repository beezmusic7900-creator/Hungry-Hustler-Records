import React from "react";
import { Stack, useRouter } from "expo-router";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Lock, Settings } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const isAdminUser = user && isAdmin;
  const iconColor = theme.dark ? '#555' : '#bbb';

  function handleAdminPress() {
    if (isAdminUser) {
      console.log('[HomeScreen] Admin panel button pressed — navigating to admin panel');
      router.push('/(tabs)/admin');
    } else {
      console.log('[HomeScreen] Admin login button pressed — navigating to auth screen');
      router.push('/auth');
    }
  }

  const adminHeaderButton = (
    <TouchableOpacity
      onPress={handleAdminPress}
      style={styles.headerButton}
      activeOpacity={0.6}
      accessibilityLabel={isAdminUser ? 'Admin Panel' : 'Admin Login'}
    >
      {isAdminUser ? (
        <Settings size={20} color={iconColor} />
      ) : (
        <Lock size={20} color={iconColor} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Building the app...",
          headerRight: () => adminHeaderButton,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Welcome to Natively
        </Text>
        <Text style={[styles.subtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
          Your app is currently building...
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
