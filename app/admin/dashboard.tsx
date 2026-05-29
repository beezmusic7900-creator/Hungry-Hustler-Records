import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Music,
  Video,
  ShoppingBag,
  Home,
  Info,
  LogOut,
  UserCog,
  Calendar,
  Share2,
  Newspaper,
  Bell,
  Trophy,
  ClipboardList,
  Flag,
  BarChart2,
  Star,
  BarChart,
  Package,
  Camera,
  Brain,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { HHRLogo } from '@/components/HHRLogo';
import { useAuth } from '@/contexts/AuthContext';
import { supabasePublic } from '@/integrations/supabase/client';

interface DashboardCard {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

function DashCard({ card }: { card: DashboardCard }) {
  const router = useRouter();

  const handlePress = () => {
    console.log(`[Dashboard] Navigate to: ${card.route}`);
    router.push(card.route as never);
  };

  return (
    <AnimatedPressable onPress={handlePress} style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: COLORS.border,
          minHeight: 110,
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: `${card.color}18`,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: `${card.color}40`,
          }}
        >
          {card.icon}
        </View>
        <View style={{ marginTop: 12 }}>
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
              marginTop: 2,
            }}
          >
            {card.subtitle}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, signOut } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    console.log('[Dashboard] Checking super_admin role for user:', user.id);
    (supabasePublic as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { role: string } | null }) => {
        const isSuper = data?.role === 'super_admin';
        console.log('[Dashboard] Role check result:', data?.role, '— isSuperAdmin:', isSuper);
        setIsSuperAdmin(isSuper);
      });
  }, [user]);

  const handleSignOut = async () => {
    console.log('[Dashboard] Sign out pressed');
    await signOut();
    router.replace('/(tabs)/admin');
  };

  const cards: DashboardCard[] = [
    {
      title: 'Artists',
      subtitle: 'Manage roster',
      icon: <Users size={22} color="#7C3AED" />,
      route: '/admin/artists',
      color: '#7C3AED',
    },
    {
      title: 'Music',
      subtitle: 'Songs & audio',
      icon: <Music size={22} color={COLORS.primary} />,
      route: '/admin/music-list',
      color: COLORS.primary,
    },
    {
      title: 'Videos',
      subtitle: 'Music videos',
      icon: <Video size={22} color="#3B82F6" />,
      route: '/admin/videos-list',
      color: '#3B82F6',
    },
    {
      title: 'Merch',
      subtitle: 'Products & store',
      icon: <ShoppingBag size={22} color="#F59E0B" />,
      route: '/admin/merch-list',
      color: '#F59E0B',
    },
    {
      title: 'Home Page',
      subtitle: 'Hero & releases',
      icon: <Home size={22} color="#EC4899" />,
      route: '/admin/home-editor',
      color: '#EC4899',
    },
    {
      title: 'About Page',
      subtitle: 'Label info',
      icon: <Info size={22} color="#14B8A6" />,
      route: '/admin/about-editor',
      color: '#14B8A6',
    },
    {
      title: 'Events',
      subtitle: 'Shows & tickets',
      icon: <Calendar size={22} color="#F97316" />,
      route: '/admin/events-list',
      color: '#F97316',
    },
    {
      title: 'Social',
      subtitle: 'Instagram & social',
      icon: <Share2 size={22} color="#E1306C" />,
      route: '/admin/social-list',
      color: '#E1306C',
    },
    {
      title: 'News',
      subtitle: 'Articles & updates',
      icon: <Newspaper size={22} color="#06B6D4" />,
      route: '/admin/news-list',
      color: '#06B6D4',
    },
    {
      title: 'Notifications',
      subtitle: 'Push campaigns',
      icon: <Bell size={22} color="#8B5CF6" />,
      route: '/admin/notifications',
      color: '#8B5CF6',
    },
    {
      title: 'Rewards',
      subtitle: 'Points & badges',
      icon: <Trophy size={22} color="#F59E0B" />,
      route: '/admin/rewards-config',
      color: '#F59E0B',
    },
  ];

  // Always add UGC moderation cards
  cards.push(
    {
      title: 'Submissions',
      subtitle: 'Review fan content',
      icon: <ClipboardList size={22} color="#8B5CF6" />,
      route: '/admin/submissions-queue',
      color: '#8B5CF6',
    },
    {
      title: 'Reports',
      subtitle: 'Content reports',
      icon: <Flag size={22} color="#EF4444" />,
      route: '/admin/reports-queue',
      color: '#EF4444',
    },
    {
      title: 'Analytics',
      subtitle: 'Usage & engagement',
      icon: <BarChart2 size={22} color="#06B6D4" />,
      route: '/admin/analytics',
      color: '#06B6D4',
    },
    {
      title: 'Users',
      subtitle: 'Manage accounts',
      icon: <UserCog size={22} color="#F97316" />,
      route: '/admin/users-management',
      color: '#F97316',
    },
    {
      title: 'Reviews Queue',
      subtitle: 'Moderate reviews',
      icon: <Star size={22} color="#8B5CF6" />,
      route: '/admin/reviews-queue',
      color: '#8B5CF6',
    },
    {
      title: 'Merch Polls',
      subtitle: 'Create & manage polls',
      icon: <BarChart size={22} color="#EC4899" />,
      route: '/admin/merch-polls',
      color: '#EC4899',
    },
    {
      title: 'Trivia',
      subtitle: 'Manage questions',
      icon: <Brain size={22} color="#06B6D4" />,
      route: '/admin/trivia-management',
      color: '#06B6D4',
    },
    {
      title: 'Collections',
      subtitle: 'Merch collections',
      icon: <Package size={22} color="#F59E0B" />,
      route: '/admin/collections-management',
      color: '#F59E0B',
    },
    {
      title: 'Style Showcase',
      subtitle: 'Fan style posts',
      icon: <Camera size={22} color="#14B8A6" />,
      route: '/admin/style-showcase-queue',
      color: '#14B8A6',
    }
  );

  if (isSuperAdmin) {
    cards.push({
      title: 'User Roles',
      subtitle: 'Legacy user admin',
      icon: <Users size={22} color="#EF4444" />,
      route: '/admin/users',
      color: '#EF4444',
    });
  }

  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: COLORS.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 60,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <View>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 24,
              fontWeight: '700',
              letterSpacing: -0.3,
            }}
          >
            Dashboard
          </Text>
          {user ? (
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {user.email}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <HHRLogo size="small" />
          <AnimatedPressable onPress={handleSignOut}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 68, 68, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 68, 68, 0.3)',
              }}
            >
              <LogOut size={18} color={COLORS.danger} />
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Cards grid */}
      <View style={{ gap: 12 }}>
        {Array.from({ length: Math.ceil(cards.length / 2) }, (_, i) => i * 2).map((rowStart) => (
          <View
            key={rowStart}
            style={{ flexDirection: 'row', gap: 12 }}
          >
            {cards.slice(rowStart, rowStart + 2).map((card) => (
              <DashCard key={card.title} card={card} />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
