
import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  const tabs = [
    {
      name: 'index',
      title: 'Home',
      ios_icon_name: 'house.fill',
      android_material_icon_name: 'home' as const,
    },
    {
      name: 'artists',
      title: 'Artists',
      ios_icon_name: 'person.3.fill',
      android_material_icon_name: 'group' as const,
    },
    {
      name: 'merch',
      title: 'Merch',
      ios_icon_name: 'bag.fill',
      android_material_icon_name: 'shopping-bag' as const,
    },
    {
      name: 'about',
      title: 'About',
      ios_icon_name: 'info.circle.fill',
      android_material_icon_name: 'info' as const,
    },
    {
      name: 'admin',
      title: 'Admin',
      ios_icon_name: 'lock.fill',
      android_material_icon_name: 'lock' as const,
    },
  ];

  return (
    <>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} tabs={tabs} />}
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
