import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  ShoppingBag,
  Home,
  Info,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';

interface CMSCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
}

function DashboardCard({ card }: { card: CMSCard }) {
  const router = useRouter();

  const handlePress = () => {
    console.log(`[Dashboard] Navigate to: ${card.route}`);
    router.push(card.route as never);
  };

  return (
    <AnimatedPressable onPress={handlePress} style={{ flex: 1, minWidth: '45%' }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          {card.icon}
        </View>
        <View style={{ gap: 4 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            {card.title}
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            {card.description}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <ChevronRight size={16} color={COLORS.primary} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      console.log('[Dashboard] Not authenticated, redirecting to admin tab');
      router.replace('/(tabs)/admin');
    }
  }, [user, loading]);

  const handleSignOut = async () => {
    console.log('[Dashboard] Sign out pressed');
    await signOut();
    router.replace('/(tabs)/admin');
  };

  const cards: CMSCard[] = [
    {
      title: 'Artists',
      description: 'Manage artist profiles and roster',
      icon: <Users size={22} color={COLORS.primary} />,
      route: '/admin/artists',
    },
    {
      title: 'Merch',
      description: 'Manage merchandise and products',
      icon: <ShoppingBag size={22} color={COLORS.primary} />,
      route: '/admin/merch-list',
    },
    {
      title: 'Home Page',
      description: 'Edit hero banner and featured content',
      icon: <Home size={22} color={COLORS.primary} />,
      route: '/admin/home-editor',
    },
    {
      title: 'About Page',
      description: 'Edit label info and contact details',
      icon: <Info size={22} color={COLORS.primary} />,
      route: '/admin/about-editor',
    },
  ];

  if (loading) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingBottom: 60,
        paddingHorizontal: 20,
        paddingTop: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 12,
              fontWeight: '500',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Signed in as
          </Text>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 15,
              fontWeight: '600',
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {user?.email}
          </Text>
        </View>
        <AnimatedPressable onPress={handleSignOut}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255, 68, 68, 0.12)',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 68, 68, 0.3)',
            }}
          >
            <LogOut size={16} color={COLORS.danger} />
            <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600' }}>
              Sign Out
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Section header */}
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        Content Management
      </Text>

      {/* Cards grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {cards.map((card) => (
          <DashboardCard key={card.title} card={card} />
        ))}
      </View>
    </ScrollView>
  );
}
