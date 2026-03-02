
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface AboutContent {
  logo_url?: string;
  description?: string;
  mission?: string;
  contact_email?: string;
  contact_phone?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
}

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function AboutScreen() {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<AboutContent | null>(null);

  useEffect(() => {
    console.log('[AboutScreen] Fetching about content');
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      setLoading(true);
      console.log('[AboutScreen] Fetching about content from /api/about');
      
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<AboutContent>('/api/about');
      
      console.log('[AboutScreen] About content received:', data);
      setContent(data);
    } catch (error) {
      console.error('[AboutScreen] Error fetching about content:', error);
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url: string | undefined) => {
    if (!url) return;
    console.log('[AboutScreen] Opening link:', url);
    Linking.openURL(url);
  };

  const handleEmail = (email: string | undefined) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhone = (phone: string | undefined) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 0;

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop }}>
        <View style={styles.header}>
          <Text style={styles.title}>ABOUT US</Text>
        </View>

        {/* Official Logo - Use the new logo if no custom logo is set */}
        <View style={styles.logoContainer}>
          <Image
            source={content?.logo_url ? resolveImageSource(content.logo_url) : require('@/assets/images/9b0d68b6-aabc-4c32-904b-7517b29a9c31.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Description */}
        {content?.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WHO WE ARE</Text>
            <View style={commonStyles.card}>
              <Text style={styles.bodyText}>{content.description}</Text>
            </View>
          </View>
        )}

        {/* Mission */}
        {content?.mission && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OUR MISSION</Text>
            <View style={commonStyles.card}>
              <Text style={styles.bodyText}>{content.mission}</Text>
            </View>
          </View>
        )}

        {/* Contact Info */}
        {(content?.contact_email || content?.contact_phone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACT</Text>
            <View style={commonStyles.card}>
              {content.contact_email && (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleEmail(content.contact_email)}
                >
                  <IconSymbol
                    ios_icon_name="envelope"
                    android_material_icon_name="email"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.contactText}>{content.contact_email}</Text>
                </TouchableOpacity>
              )}
              
              {content.contact_phone && (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handlePhone(content.contact_phone)}
                >
                  <IconSymbol
                    ios_icon_name="phone"
                    android_material_icon_name="phone"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.contactText}>{content.contact_phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Social Links */}
        {(content?.instagram_url || content?.twitter_url || content?.facebook_url) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FOLLOW US</Text>
            <View style={styles.socialLinks}>
              {content.instagram_url && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleOpenLink(content.instagram_url)}
                >
                  <IconSymbol
                    ios_icon_name="camera"
                    android_material_icon_name="camera"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.socialText}>Instagram</Text>
                </TouchableOpacity>
              )}
              
              {content.twitter_url && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleOpenLink(content.twitter_url)}
                >
                  <IconSymbol
                    ios_icon_name="at"
                    android_material_icon_name="alternate-email"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.socialText}>Twitter</Text>
                </TouchableOpacity>
              )}
              
              {content.facebook_url && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleOpenLink(content.facebook_url)}
                >
                  <IconSymbol
                    ios_icon_name="person.2"
                    android_material_icon_name="people"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.socialText}>Facebook</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  logo: {
    width: 280,
    height: 180,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    color: colors.text,
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bottomPadding: {
    height: 100,
  },
});
