import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Send, ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabasePublic } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://egmaxjskylfepliwaeme.supabase.co';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbPublic = supabasePublic as any;

type Category = 'general' | 'music' | 'merch' | 'events' | 'rewards';

const CATEGORIES: Category[] = ['general', 'music', 'merch', 'events', 'rewards'];

interface Campaign {
  id: string;
  title: string;
  body: string;
  category: string;
  deep_link: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

function CategoryBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    general: '#8B5CF6',
    music: COLORS.primary,
    merch: '#F59E0B',
    events: '#F97316',
    rewards: '#3B82F6',
  };
  const color = colorMap[category] ?? COLORS.textSecondary;
  return (
    <View
      style={{
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: `${color}20`,
        borderWidth: 1,
        borderColor: `${color}50`,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
        {category}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isDraft = status === 'draft';
  const color = isDraft ? COLORS.warning : COLORS.primary;
  return (
    <View
      style={{
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: `${color}20`,
        borderWidth: 1,
        borderColor: `${color}50`,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
        {status}
      </Text>
    </View>
  );
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [deepLink, setDeepLink] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(tabs)/admin' as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    console.log('[AdminNotifications] Checking admin role for user:', user.id);
    dbPublic
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { role: string } | null }) => {
        const admin = data?.role === 'admin' || data?.role === 'super_admin';
        console.log('[AdminNotifications] Role:', data?.role, '— isAdmin:', admin);
        setIsAdmin(admin);
        setRoleChecked(true);
      });
  }, [user]);

  const loadCampaigns = useCallback(async () => {
    try {
      console.log('[AdminNotifications] Loading campaigns');
      const { data, error } = await db
        .from('notification_campaigns')
        .select('id, title, body, category, deep_link, status, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('[AdminNotifications] Load campaigns error:', error.message);
        return;
      }
      console.log('[AdminNotifications] Loaded', data?.length ?? 0, 'campaigns');
      setCampaigns((data ?? []) as Campaign[]);
    } catch (err) {
      console.error('[AdminNotifications] loadCampaigns error:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadCampaigns();
  }, [isAdmin, loadCampaigns]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Title and message are required.');
      return;
    }
    if (!user) return;
    console.log('[AdminNotifications] Send notification pressed — title:', title, 'category:', category);
    setSending(true);
    try {
      const { data: campaign, error: insertErr } = await db
        .from('notification_campaigns')
        .insert({
          title: title.trim(),
          body: body.trim(),
          category,
          deep_link: deepLink.trim() || null,
          status: 'draft',
          target_all: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertErr) {
        console.error('[AdminNotifications] Insert campaign error:', insertErr.message);
        Alert.alert('Error', insertErr.message);
        return;
      }

      console.log('[AdminNotifications] Campaign created:', campaign.id, '— calling send-notification');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ campaign_id: campaign.id }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[AdminNotifications] send-notification error:', res.status, text);
        Alert.alert('Sent with warnings', 'Campaign created but notification delivery may have failed.');
      } else {
        console.log('[AdminNotifications] Notification sent successfully');
        Alert.alert('Sent!', 'Push notification campaign sent.');
      }

      setTitle('');
      setBody('');
      setCategory('general');
      setDeepLink('');
      await loadCampaigns();
    } catch (err) {
      console.error('[AdminNotifications] handleSend error:', err);
      Alert.alert('Error', 'Could not send notification.');
    } finally {
      setSending(false);
    }
  };

  const handleSendDraft = async (campaignId: string) => {
    console.log('[AdminNotifications] Send draft campaign pressed:', campaignId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[AdminNotifications] Send draft error:', res.status, text);
        Alert.alert('Error', 'Could not send notification.');
      } else {
        console.log('[AdminNotifications] Draft campaign sent:', campaignId);
        Alert.alert('Sent!', 'Notification sent.');
        await loadCampaigns();
      }
    } catch (err) {
      console.error('[AdminNotifications] handleSendDraft error:', err);
      Alert.alert('Error', 'Could not send notification.');
    }
  };

  if (authLoading || !roleChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          You need admin privileges to access this screen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: 80,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Compose Form ── */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 18,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Bell size={18} color={COLORS.primary} />
          <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>
            New Campaign
          </Text>
        </View>

        {/* Title */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
          TITLE
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Notification title"
          placeholderTextColor={COLORS.textTertiary}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: COLORS.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 14,
          }}
        />

        {/* Body */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
          MESSAGE
        </Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Notification message"
          placeholderTextColor={COLORS.textTertiary}
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: COLORS.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 14,
            minHeight: 80,
            textAlignVertical: 'top',
          }}
        />

        {/* Category */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
          CATEGORY
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <AnimatedPressable
                key={cat}
                onPress={() => {
                  console.log('[AdminNotifications] Category selected:', cat);
                  setCategory(cat);
                }}
              >
                <View
                  style={{
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: isSelected ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? COLORS.primary : COLORS.textSecondary,
                      fontSize: 13,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {cat}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Deep link */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
          DEEP LINK (optional)
        </Text>
        <TextInput
          value={deepLink}
          onChangeText={setDeepLink}
          placeholder="/(tabs)/music"
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: COLORS.text,
            fontSize: 15,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
          }}
        />

        {/* Send button */}
        <AnimatedPressable onPress={handleSend} disabled={sending}>
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: sending ? 0.7 : 1,
            }}
          >
            <Send size={16} color={COLORS.background} />
            <Text style={{ color: COLORS.background, fontSize: 15, fontWeight: '700' }}>
              {sending ? 'Sending...' : 'Send Now'}
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* ── Campaign History ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <ChevronRight size={18} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>
          Campaign History
        </Text>
      </View>

      {loadingCampaigns ? (
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map((k) => (
            <View
              key={k}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 8,
              }}
            >
              <SkeletonLine width="60%" height={15} />
              <SkeletonLine width="90%" height={12} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <SkeletonLine width={60} height={22} borderRadius={8} />
                <SkeletonLine width={50} height={22} borderRadius={8} />
              </View>
            </View>
          ))}
        </View>
      ) : campaigns.length === 0 ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            padding: 28,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Bell size={28} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 10, textAlign: 'center' }}>
            No campaigns yet
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {campaigns.map((campaign) => {
            const isDraft = campaign.status === 'draft';
            const sentText = campaign.sent_at
              ? new Date(campaign.sent_at).toLocaleDateString()
              : null;
            return (
              <View
                key={campaign.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                  {campaign.title}
                </Text>
                <Text
                  style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 }}
                  numberOfLines={2}
                >
                  {campaign.body}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <CategoryBadge category={campaign.category} />
                  <StatusBadge status={campaign.status} />
                  {sentText ? (
                    <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>
                      {sentText}
                    </Text>
                  ) : null}
                  {isDraft && (
                    <AnimatedPressable
                      onPress={() => handleSendDraft(campaign.id)}
                      style={{ marginLeft: 'auto' }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: COLORS.primaryMuted,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderWidth: 1,
                          borderColor: COLORS.primary,
                        }}
                      >
                        <Send size={12} color={COLORS.primary} />
                        <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>
                          Send
                        </Text>
                      </View>
                    </AnimatedPressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
