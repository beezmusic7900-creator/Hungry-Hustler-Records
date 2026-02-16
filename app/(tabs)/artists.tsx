
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
        <View style={styles.header}>
          <Text style={styles.title}>OUR ARTISTS</Text>
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
              const hasSpotify = !!artist.spotify_url;
              const hasAppleMusic = !!artist.apple_music_url;
              const hasYouTube = !!artist.youtube_url;
              const hasSoundCloud = !!artist.soundcloud_url;
              const hasInstagram = !!artist.instagram_url;
              const hasTwitter = !!artist.twitter_url;

              return (
                <View key={artist.id} style={commonStyles.card}>
                  {artist.photo_url && (
                    <Image
                      source={resolveImageSource(artist.photo_url)}
                      style={styles.artistImage}
                      resizeMode="cover"
                    />
                  )}
                  
                  <Text style={styles.artistName}>{artistName}</Text>
                  
                  {artistBio && (
                    <Text style={styles.artistBio}>{artistBio}</Text>
                  )}

                  {/* Music Platform Links */}
                  <View style={styles.linksSection}>
                    <Text style={styles.linksTitle}>MUSIC</Text>
                    <View style={styles.linksRow}>
                      {hasSpotify && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={() => handleOpenLink(artist.spotify_url)}
                        >
                          <IconSymbol
                            ios_icon_name="music.note"
                            android_material_icon_name="music-note"
                            size={20}
                            color={colors.primary}
                          />
                          <Text style={styles.linkText}>Spotify</Text>
                        </TouchableOpacity>
                      )}
                      
                      {hasAppleMusic && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={() => handleOpenLink(artist.apple_music_url)}
                        >
                          <IconSymbol
                            ios_icon_name="music.note"
                            android_material_icon_name="music-note"
                            size={20}
                            color={colors.primary}
                          />
                          <Text style={styles.linkText}>Apple</Text>
                        </TouchableOpacity>
                      )}
                      
                      {hasYouTube && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={() => handleOpenLink(artist.youtube_url)}
                        >
                          <IconSymbol
                            ios_icon_name="play.circle"
                            android_material_icon_name="play-arrow"
                            size={20}
                            color={colors.primary}
                          />
                          <Text style={styles.linkText}>YouTube</Text>
                        </TouchableOpacity>
                      )}
                      
                      {hasSoundCloud && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={() => handleOpenLink(artist.soundcloud_url)}
                        >
                          <IconSymbol
                            ios_icon_name="waveform"
                            android_material_icon_name="music-note"
                            size={20}
                            color={colors.primary}
                          />
                          <Text style={styles.linkText}>SoundCloud</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Social Links */}
                  {(hasInstagram || hasTwitter) && (
                    <View style={styles.linksSection}>
                      <Text style={styles.linksTitle}>SOCIAL</Text>
                      <View style={styles.linksRow}>
                        {hasInstagram && (
                          <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => handleOpenLink(artist.instagram_url)}
                          >
                            <IconSymbol
                              ios_icon_name="camera"
                              android_material_icon_name="camera"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.linkText}>Instagram</Text>
                          </TouchableOpacity>
                        )}
                        
                        {hasTwitter && (
                          <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => handleOpenLink(artist.twitter_url)}
                          >
                            <IconSymbol
                              ios_icon_name="at"
                              android_material_icon_name="alternate-email"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.linkText}>Twitter</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  artistsList: {
    paddingHorizontal: 16,
  },
  artistImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 16,
  },
  artistName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  artistBio: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  linksSection: {
    marginTop: 12,
  },
  linksTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  bottomPadding: {
    height: 100,
  },
});
