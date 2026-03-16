
import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Dimensions } from 'react-native';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';

const { width: screenWidth } = Dimensions.get('window');

const ALL_TABS: TabBarItem[] = [
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

export default function TabLayout() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        console.log('[TabLayout] Checking admin status');
        const data = await authenticatedPost<{ isAdmin: boolean }>('/api/admin/check', {});
        console.log('[TabLayout] Admin check result:', data);
        setIsAdmin(data.isAdmin === true);
      } catch (error) {
        console.log('[TabLayout] Admin check failed (non-admin user):', error);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const visibleTabs = isAdmin ? ALL_TABS : ALL_TABS.filter(t => t.name !== 'admin');

  // Use most of the screen width for tabs to ensure they all fit properly
  const tabBarWidth = Math.min(screenWidth - 32, 500);

  return (
    <>
      <Tabs
        tabBar={() => <FloatingTabBar tabs={visibleTabs} containerWidth={tabBarWidth} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="artists" options={{ title: 'Artists' }} />
        <Tabs.Screen name="merch" options={{ title: 'Merch' }} />
        <Tabs.Screen name="about" options={{ title: 'About' }} />
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarButton: isAdmin ? undefined : () => null,
          }}
        />
      </Tabs>
    </>
  );
}
