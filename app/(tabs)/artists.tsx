
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
import { LinearGradient } from 'expo-linear-gradient';

interface Artist {
  id: string;
  name: string;
  bio?: string;
  photo_url?: string;
  spotify_url?: string;
  apple_music_url?: string;
  youtube_url?: string;
  soundcloud_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  specialties?: string[];
  status?: string;
  label?: string;
}

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function ArtistsScreen() {
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    console.log('ArtistsScreen: Fetching artists');
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      console.log('[ArtistsScreen] Fetching artists from /api/artists');
      
      const { apiGet } = await import('@/utils/api');
      const data = await apiGet<Artist[]>('/api/artists');
      
      console.log('[ArtistsScreen] Artists received:', data);
      setArtists(data || []);
    } catch (error) {
      console.error('[ArtistsScreen] Error fetching artists:', error);
      setArtists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url: string | undefined) => {
    if (!url) return;
    console.log('ArtistsScreen: Opening link:', url);
    Linking.openURL(url);
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>OUR ARTISTS</Text>
          <Text style={styles.headerSubtitle}>
            Hungry Hustler Records is home to a diverse roster of talented artists,
          </Text>
          <Text style={styles.headerSubtitle}>
            each bringing their own voice, story, and energy to the culture.
          </Text>
        </View>

        {artists.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="person.3"
              android_material_icon_name="group"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No artists yet</Text>
          </View>
        ) : (
          <View style={styles.artistsList}>
            {artists.map((artist) => {
              const artistName = artist.name;
              const artistBio = artist.bio || '';
              const artistStatus = artist.status || 'Active';
              const artistLabel = artist.label || 'Hungry Hustler Records';
              const specialties = artist.specialties || [];
              
              const hasSpotify = !!artist.spotify_url;
              const hasAppleMusic = !!artist.apple_music_url;
              const hasYouTube = !!artist.youtube_url;
              const hasSoundCloud = !!artist.soundcloud_url;
              const hasInstagram = !!artist.instagram_url;
              const hasTwitter = !!artist.twitter_url;

              const isActive = artistStatus.toLowerCase() === 'active';

              return (
                <View key={artist.id} style={styles.artistCard}>
                  {/* Artist Photo with Gradient Overlay */}
                  {artist.photo_url ? (
                    <View style={styles.artistImageContainer}>
                      <Image
                        source={resolveImageSource(artist.photo_url)}
                        style={styles.artistImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)', colors.background]}
                        style={styles.artistImageGradient}
                      />
                    </View>
                  ) : (
                    <View style={styles.artistImagePlaceholder}>
                      <IconSymbol
                        ios_icon_name="person.circle"
                        android_material_icon_name="account-circle"
                        size={80}
                        color={colors.textTertiary}
                      />
                    </View>
                  )}
                  
                  {/* Artist Info */}
                  <View style={styles.artistInfo}>
                    {/* Name and Status Badge */}
                    <View style={styles.artistHeader}>
                      <Text style={styles.artistName}>{artistName}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: isActive ? colors.primaryGlow : colors.inactive }
                      ]}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: isActive ? colors.primary : colors.textTertiary }
                        ]} />
                        <Text style={[
                          styles.statusText,
                          { color: isActive ? colors.primary : colors.textSecondary }
                        ]}>
                          {artistStatus}
                        </Text>
                      </View>
                    </View>

                    {/* Label */}
                    <Text style={styles.artistLabel}>{artistLabel}</Text>

                    {/* Bio */}
                    {artistBio && (
                      <Text style={styles.artistBio}>{artistBio}</Text>
                    )}

                    {/* Specialties */}
                    {specialties.length > 0 && (
                      <View style={styles.specialtiesSection}>
                        <Text style={styles.specialtiesTitle}>SPECIALTIES</Text>
                        <View style={styles.specialtiesList}>
                          {specialties.map((specialty, index) => {
                            const specialtyText = specialty;
                            return (
                              <View key={index} style={styles.specialtyItem}>
                                <View style={styles.specialtyBullet} />
                                <Text style={styles.specialtyText}>{specialtyText}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.primaryButton}>
                        <IconSymbol
                          ios_icon_name="person.circle"
                          android_material_icon_name="account-circle"
                          size={18}
                          color={colors.background}
                        />
                        <Text style={styles.primaryButtonText}>View Profile</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.secondaryButton}>
                        <IconSymbol
                          ios_icon_name="music.note"
                          android_material_icon_name="music-note"
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.secondaryButtonText}>Listen Now</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.secondaryButton}>
                        <IconSymbol
                          ios_icon_name="play.circle"
                          android_material_icon_name="play-arrow"
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.secondaryButtonText}>Videos</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Music Platform Links */}
                    {(hasSpotify || hasAppleMusic || hasYouTube || hasSoundCloud) && (
                      <View style={styles.linksSection}>
                        <Text style={styles.linksSectionTitle}>MUSIC PLATFORMS</Text>
                        <View style={styles.linksGrid}>
                          {hasSpotify && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.spotify_url)}
                            >
                              <IconSymbol
                                ios_icon_name="music.note"
                                android_material_icon_name="music-note"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>Spotify</Text>
                            </TouchableOpacity>
                          )}
                          
                          {hasAppleMusic && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.apple_music_url)}
                            >
                              <IconSymbol
                                ios_icon_name="music.note"
                                android_material_icon_name="music-note"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>Apple Music</Text>
                            </TouchableOpacity>
                          )}
                          
                          {hasYouTube && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.youtube_url)}
                            >
                              <IconSymbol
                                ios_icon_name="play.circle"
                                android_material_icon_name="play-arrow"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>YouTube</Text>
                            </TouchableOpacity>
                          )}
                          
                          {hasSoundCloud && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.soundcloud_url)}
                            >
                              <IconSymbol
                                ios_icon_name="waveform"
                                android_material_icon_name="music-note"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>SoundCloud</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Social Links */}
                    {(hasInstagram || hasTwitter) && (
                      <View style={styles.linksSection}>
                        <Text style={styles.linksSectionTitle}>SOCIAL MEDIA</Text>
                        <View style={styles.linksGrid}>
                          {hasInstagram && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.instagram_url)}
                            >
                              <IconSymbol
                                ios_icon_name="camera"
                                android_material_icon_name="camera"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>Instagram</Text>
                            </TouchableOpacity>
                          )}
                          
                          {hasTwitter && (
                            <TouchableOpacity
                              style={styles.platformLink}
                              onPress={() => handleOpenLink(artist.twitter_url)}
                            >
                              <IconSymbol
                                ios_icon_name="at"
                                android_material_icon_name="alternate-email"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.platformLinkText}>Twitter</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  artistsList: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  artistCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  artistImageContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  artistImagePlaceholder: {
    width: '100%',
    height: 320,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInfo: {
    padding: 24,
  },
  artistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    flex: 1,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  artistLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  artistBio: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  specialtiesSection: {
    marginBottom: 24,
  },
  specialtiesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  specialtiesList: {
    gap: 8,
  },
  specialtyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specialtyBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  specialtyText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  linksSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  linksSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  platformLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  platformLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  bottomPadding: {
    height: 120,
  },
});
