export interface Artist {
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
  facebook_url?: string;
  tiktok_url?: string;
  video_urls?: string[];
  display_order?: number;
  is_featured?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MerchItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  in_stock?: boolean;
  checkout_url?: string;
  display_order?: number;
  is_featured?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface HomeContent {
  id?: string;
  hero_banner_url?: string;
  hero_title?: string;
  hero_subtitle?: string;
  featured_artist?: Artist;
  latest_release_title?: string;
  latest_release_artist?: string;
  latest_release_image_url?: string;
  latest_release_spotify_url?: string;
  latest_release_apple_music_url?: string;
  latest_release_youtube_url?: string;
  latest_release_soundcloud_url?: string;
  featured_merch?: MerchItem[];
  updated_at?: string;
}

export interface AboutContent {
  id?: string;
  logo_url?: string;
  description?: string;
  mission?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  updated_at?: string;
}

export interface ArtistInput {
  name: string;
  bio?: string;
  photo_url?: string;
  spotify_url?: string;
  apple_music_url?: string;
  youtube_url?: string;
  soundcloud_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  video_urls?: string[];
  display_order?: number;
  is_featured?: boolean;
}

export interface MerchInput {
  name: string;
  description?: string;
  price?: number;
  image_url?: string;
  category?: string;
  in_stock?: boolean;
  checkout_url?: string;
  display_order?: number;
  is_featured?: boolean;
}

export interface HomeContentInput {
  hero_banner_url?: string;
  hero_title?: string;
  hero_subtitle?: string;
  featured_artist_id?: string;
  latest_release_title?: string;
  latest_release_artist?: string;
  latest_release_image_url?: string;
  latest_release_spotify_url?: string;
  latest_release_apple_music_url?: string;
  latest_release_youtube_url?: string;
  latest_release_soundcloud_url?: string;
}

export interface AboutContentInput {
  logo_url?: string;
  description?: string;
  mission?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
}
