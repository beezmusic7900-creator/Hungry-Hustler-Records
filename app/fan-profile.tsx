import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, ShoppingBag, LogOut, User, Heart } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabasePublic } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic = supabasePublic as any;

interface FavoriteItem {
  id: string;
  item_type: string;
  item_id: string;
  created_at: string;
}

interface SongDetail {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
}

interface MerchDetail {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function FanProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, signOut } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [songs, setSongs] = useState<SongDetail[]>([]);
  const [merch, setMerch] = useState<MerchDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) loadFavorites();
  }, [user]);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[FanProfile] Loading favorites for user:', user.id);
      setLoading(true);

      const { data: favData, error: favErr } = await db
        .from('favorites')
        .select('id, item_type, item_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (favErr) {
        console.error('[FanProfile] Favorites error:', favErr.message);
        return;
      }

      const favs = (favData ?? []) as FavoriteItem[];
      setFavorites(favs);

      const songIds = favs.filter(f => f.item_type === 'song').map(f => f.item_id);
      const merchIds = favs.filter(f => f.item_type === 'merch').map(f => f.item_id);

      const [songRes, merchRes] = await Promise.all([
        songIds.length > 0
          ? dbPublic.from('songs').select('id, title, artist, cover_url').in('id', songIds)
          : Promise.resolve({ data: [] }),
        merchIds.length > 0
          ? dbPublic.from('merch').select('id, name, price, image_url').in('id', merchIds)
          : Promise.resolve({ data: [] }),
      ]);

      setSongs((songRes.data ?? []) as SongDetail[]);
      setMerch((merchRes.data ?? []) as MerchDetail[]);
      console.log('[FanProfile] Loaded', songIds.length, 'song favs,', merchIds.length, 'merch favs');
    } catch (err) {
      console.error('[FanProfile] loadFavorites error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    console.log('[FanProfile] Sign out pressed');
    await signOut();
    router.replace('/(tabs)/(home)');
  };

  // Not logged in state
  if (!authLoading && !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
        >
          <User size={32} color={COLORS.primary} />
        </View>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 22,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          Fan Account
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
            maxWidth: 260,
          }}
        >
          Sign in to save favorites and stay connected with HHR
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[FanProfile] Navigate to fan-auth');
            router.push('/fan-auth');
          }}
          style={{ marginTop: 28, width: '100%' }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: COLORS.background,
                fontSize: 16,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              Sign In to Save Favorites
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  const userEmail = user?.email ?? '';
  const userName = user?.name ?? '';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 60,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <User size={26} color={COLORS.primary} />
          </View>
          <View>
            {userName ? (
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>
                {userName}
              </Text>
            ) : null}
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
              {userEmail}
            </Text>
          </View>
        </View>

        {/* Sign out */}
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

      {/* Favorites section */}
      <View style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Heart size={18} color={COLORS.primary} fill={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
            My Favorites
          </Text>
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <View
                key={k}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <SkeletonLine width={48} height={48} borderRadius={8} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLine width="70%" height={14} />
                  <SkeletonLine width="50%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : favorites.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Heart size={32} color={COLORS.textTertiary} />
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 15,
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              No favorites yet
            </Text>
            <Text
              style={{
                color: COLORS.textTertiary,
                fontSize: 13,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              Tap the heart icon on songs and merch to save them here
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {/* Favorite songs */}
            {songs.length > 0 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Music size={14} color={COLORS.textSecondary} />
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Songs
                  </Text>
                </View>
                {songs.map((song) => (
                  <View
                    key={song.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      marginBottom: 8,
                    }}
                  >
                    {song.cover_url ? (
                      <Image
                        source={resolveImageSource(song.cover_url)}
                        style={{ width: 48, height: 48, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          backgroundColor: COLORS.primaryMuted,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Music size={20} color={COLORS.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}
                        numberOfLines={1}
                      >
                        {song.title}
                      </Text>
                      <Text
                        style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {song.artist}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Favorite merch */}
            {merch.length > 0 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <ShoppingBag size={14} color={COLORS.textSecondary} />
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Merch
                  </Text>
                </View>
                {merch.map((item) => {
                  const priceDisplay = `$${Number(item.price).toFixed(2)}`;
                  return (
                    <AnimatedPressable
                      key={item.id}
                      onPress={() => {
                        console.log('[FanProfile] Navigate to merch detail:', item.id);
                        router.push(`/merch-detail/${item.id}`);
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: COLORS.surface,
                          borderRadius: 12,
                          padding: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          marginBottom: 8,
                        }}
                      >
                        {item.image_url ? (
                          <Image
                            source={resolveImageSource(item.image_url)}
                            style={{ width: 48, height: 48, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 8,
                              backgroundColor: COLORS.surfaceSecondary,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ShoppingBag size={20} color={COLORS.textTertiary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ color: COLORS.text, fontSize: 14, fontWeight: '600' }}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700', marginTop: 2 }}
                          >
                            {priceDisplay}
                          </Text>
                        </View>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
