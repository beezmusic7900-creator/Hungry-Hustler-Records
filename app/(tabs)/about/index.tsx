import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Phone, MapPin, Instagram, Twitter, Facebook, Youtube, Music } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { HHRLogo } from '@/components/HHRLogo';
import { getAbout } from '@/utils/api';
import type { AboutContent } from '@/types';

function SocialButton({
  icon,
  label,
  url,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  url: string;
  color: string;
}) {
  const handlePress = () => {
    console.log(`[About] Opening social link: ${label} - ${url}`);
    Linking.openURL(url);
  };

  return (
    <AnimatedPressable onPress={handlePress}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          padding: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: COLORS.border,
          minWidth: 64,
          gap: 6,
        }}
      >
        {icon}
        <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontWeight: '500' }}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} disabled={!onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.divider,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textTertiary, fontSize: 11, fontWeight: '500' }}>
            {label}
          </Text>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 14,
              marginTop: 2,
            }}
            selectable
          >
            {value}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const [about, setAbout] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAbout();
  }, []);

  const loadAbout = async () => {
    try {
      console.log('[About] Loading about content');
      setLoading(true);
      setError(null);
      const data = await getAbout();
      setAbout(data);
    } catch (err) {
      console.error('[About] Failed to load about content:', err);
      setError("Couldn't load about content.");
    } finally {
      setLoading(false);
    }
  };

  const hasSocials =
    about?.instagram_url ||
    about?.twitter_url ||
    about?.facebook_url ||
    about?.youtube_url ||
    about?.tiktok_url;

  const hasContact =
    about?.contact_email || about?.contact_phone || about?.contact_address;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 120,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <HHRLogo size="large" showGlow />
      </View>

      {/* Description */}
      <View style={{ marginBottom: 28 }}>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          About Us
        </Text>
        {loading ? (
          <View style={{ gap: 8 }}>
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="95%" height={14} />
            <SkeletonLine width="80%" height={14} />
            <SkeletonLine width="90%" height={14} />
          </View>
        ) : (
          <Text
            style={{
              color: COLORS.text,
              fontSize: 15,
              lineHeight: 24,
            }}
          >
            {about?.description ||
              'Hungry Hustler Records is an independent record label built on vision, ownership, and the relentless pursuit of success. Founded with the mission to empower artists and create opportunities without limitations, Hungry Hustler Records stands as a platform for authentic voices and real stories.'}
          </Text>
        )}
      </View>

      {/* Mission */}
      <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderLeftWidth: 3,
            borderLeftColor: COLORS.primary,
            marginBottom: 28,
          }}
        >
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Our Mission
          </Text>
          {loading ? (
            <View style={{ gap: 8 }}>
              <SkeletonLine width="100%" height={14} />
              <SkeletonLine width="85%" height={14} />
            </View>
          ) : (
            <Text
              style={{
                color: COLORS.text,
                fontSize: 15,
                lineHeight: 24,
                fontStyle: 'italic',
              }}
            >
              {about?.mission ||
                'The mission is simple: build powerful artists, create timeless music, and establish a legacy that lasts forever.'}
            </Text>
          )}
      </View>

      {/* Contact */}
      {(loading || hasContact) && (
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Contact
          </Text>
          {loading ? (
            <View style={{ gap: 12, marginTop: 12 }}>
              <SkeletonLine width="70%" height={40} borderRadius={10} />
              <SkeletonLine width="60%" height={40} borderRadius={10} />
            </View>
          ) : (
            <View>
              {about?.contact_email ? (
                <ContactRow
                  icon={<Mail size={18} color={COLORS.primary} />}
                  label="Email"
                  value={about.contact_email}
                  onPress={() => {
                    console.log('[About] Opening email:', about.contact_email);
                    Linking.openURL(`mailto:${about.contact_email}`);
                  }}
                />
              ) : null}
              {about?.contact_phone ? (
                <ContactRow
                  icon={<Phone size={18} color={COLORS.primary} />}
                  label="Phone"
                  value={about.contact_phone}
                  onPress={() => {
                    console.log('[About] Opening phone:', about.contact_phone);
                    Linking.openURL(`tel:${about.contact_phone}`);
                  }}
                />
              ) : null}
              {about?.contact_address ? (
                <ContactRow
                  icon={<MapPin size={18} color={COLORS.primary} />}
                  label="Address"
                  value={about.contact_address}
                />
              ) : null}
            </View>
          )}
        </View>
      )}

      {/* Social Media */}
      {(loading || hasSocials) && (
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Follow Us
          </Text>
          {loading ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonLine key={i} width={64} height={64} borderRadius={12} />
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {about?.instagram_url ? (
                <SocialButton
                  icon={<Instagram size={22} color="#E1306C" />}
                  label="Instagram"
                  url={about.instagram_url}
                  color="#E1306C"
                />
              ) : null}
              {about?.twitter_url ? (
                <SocialButton
                  icon={<Twitter size={22} color="#1DA1F2" />}
                  label="Twitter"
                  url={about.twitter_url}
                  color="#1DA1F2"
                />
              ) : null}
              {about?.facebook_url ? (
                <SocialButton
                  icon={<Facebook size={22} color="#1877F2" />}
                  label="Facebook"
                  url={about.facebook_url}
                  color="#1877F2"
                />
              ) : null}
              {about?.youtube_url ? (
                <SocialButton
                  icon={<Youtube size={22} color="#FF0000" />}
                  label="YouTube"
                  url={about.youtube_url}
                  color="#FF0000"
                />
              ) : null}
              {about?.tiktok_url ? (
                <SocialButton
                  icon={<Music size={22} color={COLORS.text} />}
                  label="TikTok"
                  url={about.tiktok_url}
                  color={COLORS.text}
                />
              ) : null}
            </View>
          )}
        </View>
      )}

      {error && !loading && (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[About] Retry loading');
              loadAbout();
            }}
            style={{ marginTop: 12 }}
          >
            <View
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                Try Again
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      )}
    </ScrollView>
  );
}
