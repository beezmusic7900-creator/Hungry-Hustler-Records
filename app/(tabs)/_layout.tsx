
import React from 'react';
import { Tabs } from 'expo-router';
import { Dimensions } from 'react-native';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

const { width: screenWidth } = Dimensions.get('window');

const TABS: TabBarItem[] = [
  { name: 'index',   route: '/(tabs)/',        icon: 'home',         ios_icon: 'house',       label: 'Home'    },
  { name: 'artists', route: '/(tabs)/artists',  icon: 'group',        ios_icon: 'person.2',    label: 'Artists' },
  { name: 'music',   route: '/(tabs)/music',    icon: 'music-note',   ios_icon: 'music.note',  label: 'Music'   },
  { name: 'videos',  route: '/(tabs)/videos',   icon: 'play-circle',  ios_icon: 'play.circle', label: 'Videos'  },
  { name: 'merch',   route: '/(tabs)/merch',    icon: 'shopping-bag', ios_icon: 'bag',         label: 'Merch'   },
  { name: 'admin',   route: '/(tabs)/admin',    icon: 'shield',       ios_icon: 'shield',      label: 'Admin'   },
];

export default function TabLayout() {
  useSubscriptionGuard();

  const tabBarWidth = Math.min(screenWidth - 32, 500);

  return (
    <>
      <Tabs
        tabBar={() => <FloatingTabBar tabs={TABS} containerWidth={tabBarWidth} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="artists" options={{ title: 'Artists' }} />
        <Tabs.Screen name="music" options={{ title: 'Music' }} />
        <Tabs.Screen name="videos" options={{ title: 'Videos' }} />
        <Tabs.Screen name="merch" options={{ title: 'Merch' }} />
        <Tabs.Screen name="about" options={{ title: 'About', href: null }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', href: null }} />
        <Tabs.Screen name="admin" options={{ title: 'Admin' }} />
      </Tabs>
    </>
  );
}
