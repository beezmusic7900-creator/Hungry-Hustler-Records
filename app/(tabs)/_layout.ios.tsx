
import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: 'index',
      route: '/(tabs)/',
      icon: 'home',
      label: 'Home',
    },
    {
      name: 'artists',
      route: '/(tabs)/artists',
      icon: 'group',
      label: 'Artists',
    },
    {
      name: 'merch',
      route: '/(tabs)/merch',
      icon: 'shopping-bag',
      label: 'Merch',
    },
    {
      name: 'about',
      route: '/(tabs)/about',
      icon: 'info',
      label: 'About',
    },
    {
      name: 'admin',
      route: '/(tabs)/admin',
      icon: 'lock',
      label: 'Admin',
    },
  ];

  return (
    <>
      <Tabs
        tabBar={() => <FloatingTabBar tabs={tabs} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="artists" options={{ title: 'Artists' }} />
        <Tabs.Screen name="merch" options={{ title: 'Merch' }} />
        <Tabs.Screen name="about" options={{ title: 'About' }} />
        <Tabs.Screen name="admin" options={{ title: 'Admin' }} />
      </Tabs>
    </>
  );
}
