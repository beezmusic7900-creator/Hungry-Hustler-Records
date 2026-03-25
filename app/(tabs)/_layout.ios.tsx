
import React from 'react';
import { Tabs } from 'expo-router';
import { Dimensions } from 'react-native';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';

const { width: screenWidth } = Dimensions.get('window');

const BASE_TABS: TabBarItem[] = [
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
    name: 'profile',
    route: '/(tabs)/profile',
    icon: 'person',
    label: 'Profile',
  },
];

export default function TabLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();

  const loginTab: TabBarItem = {
    name: 'auth',
    route: '/auth',
    icon: 'person',
    label: 'Login',
  };
  const adminTab: TabBarItem = {
    name: 'admin',
    route: '/(tabs)/admin',
    icon: 'lock',
    label: 'Admin',
  };

  let visibleTabs: TabBarItem[];
  if (authLoading) {
    visibleTabs = BASE_TABS;
  } else if (user && isAdmin) {
    visibleTabs = [...BASE_TABS, adminTab];
  } else if (user) {
    visibleTabs = BASE_TABS;
  } else {
    visibleTabs = [...BASE_TABS, loginTab];
  }

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
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
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
