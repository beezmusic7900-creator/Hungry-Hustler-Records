
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

const STRIPE_URL = 'https://buy.stripe.com/3cIfZjajP3pu35z8hL6Na08';
const HOODIE_STRIPE_URL = 'https://buy.stripe.com/cNiaEZ9fLf8c9tXapT6Na0b';
const SHIRT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

const LOCAL_MERCH_ITEMS = [
  {
    id: 'afroman-tshirt-white',
    name: 'Official Afroman T-Shirt',
    color: 'White',
    image: require('@/assets/images/eeb1ec34-93d3-4cd5-929e-357a7b1e2578.jpeg'),
    stripeUrl: STRIPE_URL,
  },
  {
    id: 'afroman-tshirt-black',
    name: 'Official Afroman T-Shirt',
    color: 'Black',
    image: require('@/assets/images/29bf2a31-d9fb-4a8b-9527-1a9535714d67.jpeg'),
    stripeUrl: STRIPE_URL,
  },
  {
    id: 'afroman-hoody-white',
    name: 'Official Afroman Hoody',
    color: 'White',
    image: require('@/assets/images/f70f1547-d85a-49a9-bdc1-8e4ae78f7693.jpeg'),
    stripeUrl: HOODIE_STRIPE_URL,
  },
  {
    id: 'afroman-hoody-black',
    name: 'Official Afroman Hoody',
    color: 'Black',
    image: require('@/assets/images/69cdc091-c353-4334-8f52-c2af80a59029.jpeg'),
    stripeUrl: HOODIE_STRIPE_URL,
  },
];

function resolveLocalImageSource(source: ImageSourcePropType | string | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function LocalMerchCard({ item }: { item: typeof LOCAL_MERCH_ITEMS[0] }) {
  const [selectedSize, setSelectedSize] = useState('M');

  const handleSizePress = (size: string) => {
    console.log(`[MerchScreen] Size selected: ${size} for ${item.name} (${item.color})`);
    setSelectedSize(size);
  };

  const handleBuyNow = () => {
    console.log(`[MerchScreen] Buy Now pressed for ${item.name} (${item.color}), size: ${selectedSize}`);
    Linking.openURL(item.stripeUrl);
  };

  return (
    <View style={localStyles.card}>
      <Image
        source={resolveLocalImageSource(item.image)}
        style={localStyles.cardImage}
        resizeMode="cover"
      />
      <View style={localStyles.cardBody}>
        <Text style={localStyles.cardName}>{item.name}</Text>
        <Text style={localStyles.cardColor}>{item.color}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={localStyles.sizesRow}
        >
          {SHIRT_SIZES.map((size) => {
            const isSelected = selectedSize === size;
            const chipStyle = isSelected ? localStyles.sizeChipSelected : localStyles.sizeChipUnselected;
            const textStyle = isSelected ? localStyles.sizeChipTextSelected : localStyles.sizeChipTextUnselected;
            return (
              <TouchableOpacity
                key={size}
                style={[localStyles.sizeChip, chipStyle]}
                onPress={() => handleSizePress(size)}
              >
                <Text style={[localStyles.sizeChipText, textStyle]}>{size}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={localStyles.buyButton} onPress={handleBuyNow}>
          <Text style={localStyles.buyButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 250,
  },
  cardBody: {
    padding: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardColor: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  sizesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 16,
  },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sizeChipSelected: {
    backgroundColor: '#00FF66',
    borderColor: '#00FF66',
  },
  sizeChipUnselected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#3A3A3A',
  },
  sizeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sizeChipTextSelected: {
    color: '#111111',
  },
  sizeChipTextUnselected: {
    color: '#CCCCCC',
  },
  buyButton: {
    backgroundColor: '#00FF66',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
});

interface MerchItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock: number;
}

interface Song {
  id: string;
  title: string;
  artistId?: string;
  mp3Url: string;
  coverPhotoUrl: string;
  price: number;
  isExclusive: boolean;
  releaseDate: string;
}

function resolveImageSource(source: string | number | undefined) {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

export default function MerchScreen() {
  const [loading, setLoading] = useState(true);
  const [merchItems, setMerchItems] = useState<MerchItem[]>([]);
  const [exclusiveSongs, setExclusiveSongs] = useState<Song[]>([]);

  useEffect(() => {
    console.log('[MerchScreen] Fetching merch items and exclusive songs');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { apiGet } = await import('@/utils/api');

      // Fetch merch items
      console.log('[MerchScreen] Fetching merch items from /api/merch');
      const merchData = await apiGet<any[]>('/api/merch');
      console.log('[MerchScreen] Merch items received:', merchData);
      setMerchItems((merchData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price) || 0,
        image_url: item.image_url || item.imageUrl,
        stock: parseInt(item.stock) || 0,
      })));

      // Fetch exclusive songs for Merch tab
      try {
        console.log('[MerchScreen] Fetching exclusive songs from /api/songs/exclusive');
        const songsData = await apiGet<any[]>('/api/songs/exclusive');
        console.log('[MerchScreen] Exclusive songs received:', songsData);
        setExclusiveSongs((songsData || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          artistId: s.artistId || s.artist_id,
          mp3Url: s.mp3Url || s.mp3_url,
          coverPhotoUrl: s.coverPhotoUrl || s.cover_photo_url,
          price: parseFloat(s.price) || 0,
          isExclusive: s.isExclusive ?? s.is_exclusive ?? true,
          releaseDate: s.releaseDate || s.release_date,
        })));
      } catch (error) {
        console.log('[MerchScreen] Could not fetch exclusive songs:', error);
        setExclusiveSongs([]);
      }
    } catch (error) {
      console.error('[MerchScreen] Error fetching data:', error);
      setMerchItems([]);
      setExclusiveSongs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const paddingTop = Platform.OS === 'android' ? 48 : 0;
  const hasExclusiveSongs = exclusiveSongs.length > 0;
  const hasMerchItems = merchItems.length > 0;
  const hasAnyContent = hasExclusiveSongs || hasMerchItems;

  return (
    <SafeAreaView style={commonStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop }}>
        <View style={styles.header}>
          <Text style={styles.title}>MERCH STORE</Text>
          <Text style={styles.subtitle}>Official Hungry Hustler Records Merchandise & Exclusive Releases</Text>
        </View>

        {/* Local Afroman T-Shirts — always shown at top */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>MERCHANDISE</Text>
            </View>
            <IconSymbol
              ios_icon_name="bag"
              android_material_icon_name="shopping-bag"
              size={24}
              color={colors.primary}
            />
          </View>
          {LOCAL_MERCH_ITEMS.map((item) => (
            <LocalMerchCard key={item.id} item={item} />
          ))}
        </View>

        {!hasAnyContent ? (
          <View style={styles.emptyState}>
          </View>
        ) : (
          <>
            {/* Exclusive Music Releases */}
            {hasExclusiveSongs && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>EXCLUSIVE MUSIC RELEASES</Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="music.note"
                    android_material_icon_name="music-note"
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.songsGrid}>
                  {exclusiveSongs.map((song) => {
                    const songTitle = song.title;
                    const songPrice = `$${song.price.toFixed(2)}`;
                    
                    return (
                      <View key={song.id} style={styles.songCard}>
                        <Image
                          source={resolveImageSource(song.coverPhotoUrl)}
                          style={styles.songCover}
                          resizeMode="cover"
                        />
                        
                        <View style={styles.exclusiveBadge}>
                          <IconSymbol
                            ios_icon_name="star.fill"
                            android_material_icon_name="star"
                            size={12}
                            color={colors.background}
                          />
                          <Text style={styles.exclusiveBadgeText}>EXCLUSIVE</Text>
                        </View>

                        <View style={styles.songInfo}>
                          <Text style={styles.songTitle}>{songTitle}</Text>
                          <Text style={styles.songPrice}>{songPrice}</Text>
                          
                          <View style={styles.songActions}>
                            <TouchableOpacity style={styles.previewButton}>
                              <IconSymbol
                                ios_icon_name="play.circle"
                                android_material_icon_name="play-arrow"
                                size={20}
                                color={colors.primary}
                              />
                              <Text style={styles.previewButtonText}>Preview</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.buyButton}>
                              <IconSymbol
                                ios_icon_name="cart"
                                android_material_icon_name="shopping-cart"
                                size={18}
                                color={colors.background}
                              />
                              <Text style={styles.buyButtonText}>Buy</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Merchandise */}
            {hasMerchItems && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>MERCHANDISE</Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="bag"
                    android_material_icon_name="shopping-bag"
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.merchGrid}>
                  {merchItems.map((item) => {
                    const itemName = item.name;
                    const itemDescription = item.description || '';
                    const itemPrice = `$${item.price.toFixed(2)}`;
                    const itemStock = item.stock;
                    const stockText = itemStock > 0 ? `${itemStock} in stock` : 'Out of stock';
                    const isOutOfStock = itemStock === 0;
                    
                    return (
                      <View key={item.id} style={styles.merchCard}>
                        {item.image_url && (
                          <Image
                            source={resolveImageSource(item.image_url)}
                            style={styles.merchImage}
                            resizeMode="cover"
                          />
                        )}
                        
                        <View style={styles.merchInfo}>
                          <Text style={styles.merchName}>{itemName}</Text>
                          
                          {itemDescription && (
                            <Text style={styles.merchDescription} numberOfLines={2}>
                              {itemDescription}
                            </Text>
                          )}

                          <View style={styles.merchFooter}>
                            <View>
                              <Text style={styles.merchPrice}>{itemPrice}</Text>
                              <Text style={[
                                styles.merchStock,
                                isOutOfStock && styles.merchStockOut
                              ]}>
                                {stockText}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.addToCartButton,
                              isOutOfStock && styles.addToCartButtonDisabled,
                            ]}
                            disabled={isOutOfStock}
                          >
                            <IconSymbol
                              ios_icon_name="cart"
                              android_material_icon_name="shopping-cart"
                              size={18}
                              color={isOutOfStock ? colors.textTertiary : colors.background}
                            />
                            <Text style={[
                              styles.addToCartButtonText,
                              isOutOfStock && styles.addToCartButtonTextDisabled
                            ]}>
                              {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
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
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  songsGrid: {
    gap: 16,
  },
  songCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  songCover: {
    width: '100%',
    height: 200,
    backgroundColor: colors.secondary,
  },
  exclusiveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },
  exclusiveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.5,
  },
  songInfo: {
    padding: 16,
  },
  songTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  songPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 16,
  },
  songActions: {
    flexDirection: 'row',
    gap: 10,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  buyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 255, 102, 0.3)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
  },
  merchGrid: {
    gap: 16,
  },
  merchCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  merchImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.secondary,
  },
  merchInfo: {
    padding: 16,
  },
  merchName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  merchDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  merchFooter: {
    marginBottom: 16,
  },
  merchPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 4,
  },
  merchStock: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  merchStockOut: {
    color: colors.error,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 255, 102, 0.3)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  addToCartButtonDisabled: {
    backgroundColor: colors.secondary,
    ...Platform.select({
      web: {
        boxShadow: 'none',
      },
      default: {
        shadowOpacity: 0,
        elevation: 0,
      },
    }),
  },
  addToCartButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.5,
  },
  addToCartButtonTextDisabled: {
    color: colors.textTertiary,
  },
  bottomPadding: {
    height: 120,
  },
});
