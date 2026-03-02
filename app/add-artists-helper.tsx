
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import Modal from '@/components/ui/Modal';

const AFROMAN_DATA = {
  name: 'Afroman',
  bio: 'Afroman is a legendary voice in hip-hop whose influence spans generations. Best known for his worldwide smash hit "Because I Got High," & "Crazy Rap". Afroman earned global recognition and a Grammy nomination, cementing his place as one of the most recognizable and authentic artists in the culture. His music blends humor, truth, and real-life storytelling, creating timeless records that continue to resonate with fans across the world. Born Joseph Edgar Foreman in Hattiesburg, Mississippi, by the way of Los Angeles, California, Afroman built his career independently, proving that authenticity and consistency can break barriers in the music industry. His laid-back delivery, signature sound, and unapologetic honesty helped define an era of hip-hop while inspiring countless independent artists to follow their own path. Today, Afroman continues to perform internationally, release new music, and expand his legacy as a pioneer, entrepreneur, and cultural icon. His dedication to his craft and his fans has solidified his status as a respected legend whose impact on hip-hop remains undeniable.',
  specialties: JSON.stringify(['Recording Artist', 'Songwriter', 'Performer', 'Cultural Icon', 'Grammy Nominee']),
  status: 'Active',
  label: 'Hungry Hustler Records',
  photo_url: 'https://prod-finalquest-user-projects-storage-bucket-aws.s3.amazonaws.com/user-projects/e6f7a075-2ed0-4f03-bcbc-37c67737a41d/assets/images/3b5745fe-e173-4118-9832-7f94f05f0173.jpeg',
  spotify_url: '',
  apple_music_url: '',
  youtube_url: '',
  soundcloud_url: '',
  instagram_url: '',
  twitter_url: '',
};

const OG_DADDY_V_DATA = {
  name: 'OG Daddy V',
  bio: 'OG Daddy V is an hip-hop artist representing authenticity, resilience, and the true spirit of independent hustle. Known for his raw lyricism and commanding presence, OG Daddy V delivers music rooted life experiences, street wisdom, and personal growth. His sound reflects both struggle and success, connecting with listeners who value truth, loyalty, and perseverance. With a growing fanbase and a strong independent foundation, OG Daddy V continues to build his brand through consistent releases, live performances, and community engagement. His dedication to his craft and his message has positioned him as a respected voice and rising force in modern hip-hop. As he continues to evolve as an artist, OG Daddy V represents more than music, he represents vision, leadership, and the relentless drive to succeed. His journey reflects the core values of Hungry Hustler Records: independence, authenticity, and legacy.',
  specialties: JSON.stringify(['Recording Artist', 'Songwriter', 'Performer', 'Rising Force']),
  status: 'Active',
  label: 'Hungry Hustler Records',
  photo_url: 'https://prod-finalquest-user-projects-storage-bucket-aws.s3.amazonaws.com/user-projects/e6f7a075-2ed0-4f03-bcbc-37c67737a41d/assets/images/55346a7f-3dfa-4292-b409-7e9e44590154.png',
  spotify_url: '',
  apple_music_url: '',
  youtube_url: '',
  soundcloud_url: '',
  instagram_url: '',
  twitter_url: '',
};

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function AddArtistsHelper() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success',
  });

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const addArtist = async (artistData: typeof AFROMAN_DATA, artistName: string) => {
    try {
      console.log(`[AddArtistsHelper] Adding ${artistName}`);
      const { authenticatedPost } = await import('@/utils/api');
      
      await authenticatedPost('/api/admin/artists', artistData);
      
      console.log(`[AddArtistsHelper] ${artistName} added successfully`);
      return true;
    } catch (error: any) {
      console.error(`[AddArtistsHelper] Error adding ${artistName}:`, error);
      throw error;
    }
  };

  const handleAddBothArtists = async () => {
    setLoading(true);
    try {
      console.log('[AddArtistsHelper] Adding both artists');
      
      await addArtist(AFROMAN_DATA, 'Afroman');
      await addArtist(OG_DADDY_V_DATA, 'OG Daddy V');
      
      showModal(
        'Success!',
        'Both Afroman and OG Daddy V have been added to the Artists tab with their profile pictures and bios. You can now view them in the Artists section or edit them in the Admin panel.',
        'success'
      );
    } catch (error: any) {
      console.error('[AddArtistsHelper] Error adding artists:', error);
      showModal(
        'Error',
        error.message || 'Failed to add artists. Please make sure you are logged in as an admin.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddAfroman = async () => {
    setLoading(true);
    try {
      await addArtist(AFROMAN_DATA, 'Afroman');
      showModal('Success!', 'Afroman has been added to the Artists tab with his profile picture and bio.', 'success');
    } catch (error: any) {
      showModal('Error', error.message || 'Failed to add Afroman.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOGDaddyV = async () => {
    setLoading(true);
    try {
      await addArtist(OG_DADDY_V_DATA, 'OG Daddy V');
      showModal('Success!', 'OG Daddy V has been added to the Artists tab with his profile picture and bio.', 'success');
    } catch (error: any) {
      showModal('Error', error.message || 'Failed to add OG Daddy V.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const paddingTop = Platform.OS === 'android' ? 48 : 0;

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.title}>ADD ARTISTS</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>Quick Artist Setup</Text>
            <Text style={styles.infoText}>
              This helper will add Afroman and OG Daddy V to your Artists tab with their complete bios, profile pictures, specialties, and status information.
            </Text>
            <Text style={styles.infoNote}>
              Note: You must be logged in as an admin to add artists.
            </Text>
          </View>

          <View style={styles.artistPreview}>
            <View style={styles.artistPreviewHeader}>
              <Image
                source={resolveImageSource(AFROMAN_DATA.photo_url)}
                style={styles.artistPreviewImage}
                resizeMode="cover"
              />
              <View style={styles.artistPreviewInfo}>
                <Text style={styles.previewTitle}>AFROMAN</Text>
                <Text style={styles.previewLabel}>Status: Active</Text>
                <Text style={styles.previewLabel}>Label: Hungry Hustler Records</Text>
              </View>
            </View>
            <Text style={styles.previewSpecialties}>
              Recording Artist • Songwriter • Performer • Cultural Icon • Grammy Nominee
            </Text>
            <Text style={styles.previewBio} numberOfLines={4}>
              {AFROMAN_DATA.bio}
            </Text>
            
            <TouchableOpacity
              style={[commonStyles.button, styles.addButton]}
              onPress={handleAddAfroman}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="plus"
                    android_material_icon_name="add"
                    size={20}
                    color={colors.background}
                  />
                  <Text style={commonStyles.buttonText}>Add Afroman</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.artistPreview}>
            <View style={styles.artistPreviewHeader}>
              <Image
                source={resolveImageSource(OG_DADDY_V_DATA.photo_url)}
                style={styles.artistPreviewImage}
                resizeMode="cover"
              />
              <View style={styles.artistPreviewInfo}>
                <Text style={styles.previewTitle}>OG DADDY V</Text>
                <Text style={styles.previewLabel}>Status: Active</Text>
                <Text style={styles.previewLabel}>Label: Hungry Hustler Records</Text>
              </View>
            </View>
            <Text style={styles.previewSpecialties}>
              Recording Artist • Songwriter • Performer • Rising Force
            </Text>
            <Text style={styles.previewBio} numberOfLines={4}>
              {OG_DADDY_V_DATA.bio}
            </Text>
            
            <TouchableOpacity
              style={[commonStyles.button, styles.addButton]}
              onPress={handleAddOGDaddyV}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="plus"
                    android_material_icon_name="add"
                    size={20}
                    color={colors.background}
                  />
                  <Text style={commonStyles.buttonText}>Add OG Daddy V</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[commonStyles.button, styles.addBothButton]}
            onPress={handleAddBothArtists}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle"
                  android_material_icon_name="check-circle"
                  size={24}
                  color={colors.background}
                />
                <Text style={[commonStyles.buttonText, styles.addBothButtonText]}>
                  Add Both Artists
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>Need to edit artist details?</Text>
            <Text style={styles.helpText}>
              After adding the artists, you can edit their information (add social media links, music platform links, etc.) in the Admin panel.
            </Text>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => router.push('/(tabs)/admin')}
            >
              <Text style={styles.helpButtonText}>Go to Admin Panel</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          if (modalConfig.type === 'success') {
            router.push('/(tabs)/artists');
          }
        }}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  infoNote: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistPreview: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  artistPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  artistPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.secondary,
  },
  artistPreviewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  previewSpecialties: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  previewBio: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  addBothButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 12px rgba(0, 255, 102, 0.4)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  addBothButtonText: {
    fontSize: 18,
  },
  helpCard: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomPadding: {
    height: 100,
  },
});
