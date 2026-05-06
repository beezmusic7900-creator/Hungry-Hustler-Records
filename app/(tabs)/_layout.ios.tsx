import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/Colors';
import { useWindowDimensions } from 'react-native';

const tabs: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'home', label: 'Home' },
  { name: 'artists', route: '/(tabs)/artists', icon: 'people', label: 'Artists' },
  { name: 'music', route: '/(tabs)/music', icon: 'music-note', label: 'Music' },
  { name: 'videos', route: '/(tabs)/videos', icon: 'videocam', label: 'Videos' },
  { name: 'merch', route: '/(tabs)/merch', icon: 'shopping-bag', label: 'Merch' },
  { name: 'admin', route: '/(tabs)/admin', icon: 'admin-panel-settings', label: 'Admin' },
];

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(width - 32, 420);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="(home)" />
        <Tabs.Screen name="artists" />
        <Tabs.Screen name="music" />
        <Tabs.Screen name="videos" />
        <Tabs.Screen name="merch" />
        <Tabs.Screen name="admin" />
      </Tabs>
      <FloatingTabBar
        tabs={tabs}
        containerWidth={tabBarWidth}
        borderRadius={35}
        bottomMargin={20}
      />
    </View>
  );
}
