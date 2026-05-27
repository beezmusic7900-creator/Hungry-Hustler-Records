export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      songs: {
        Row: {
          id: string
          title: string
          artist: string
          audio_url: string
          cover_url: string | null
          cover_image_url: string | null
          category: string
          price: number | null
          is_published: boolean
          is_active: boolean
          sort_order: number
          duration: number | null
          description: string | null
          is_premium: boolean
          purchase_type: string | null
          apple_product_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          artist: string
          audio_url: string
          cover_url?: string | null
          cover_image_url?: string | null
          category?: string
          price?: number | null
          is_published?: boolean
          is_active?: boolean
          sort_order?: number
          duration?: number | null
          description?: string | null
          is_premium?: boolean
          purchase_type?: string | null
          apple_product_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          audio_url?: string
          cover_url?: string | null
          cover_image_url?: string | null
          category?: string
          price?: number | null
          is_published?: boolean
          is_active?: boolean
          sort_order?: number
          duration?: number | null
          description?: string | null
          is_premium?: boolean
          purchase_type?: string | null
          apple_product_id?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          title: string
          video_url: string | null
          youtube_url: string | null
          youtube_id: string | null
          thumbnail_url: string | null
          artist_id: string | null
          source_type: string | null
          description: string | null
          is_published: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          video_url?: string | null
          youtube_url?: string | null
          youtube_id?: string | null
          thumbnail_url?: string | null
          artist_id?: string | null
          source_type?: string | null
          description?: string | null
          is_published?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          video_url?: string | null
          youtube_url?: string | null
          youtube_id?: string | null
          thumbnail_url?: string | null
          artist_id?: string | null
          source_type?: string | null
          description?: string | null
          is_published?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          id: string
          user_id: string
          submission_type: 'dance_challenge' | 'rap_challenge' | 'fan_art' | 'performance_clip' | 'remix' | 'beat' | 'talent' | 'contest_entry' | 'other'
          contest_id: string | null
          title: string
          description: string | null
          media_url: string
          media_type: 'video' | 'audio' | 'image' | 'text'
          thumbnail_url: string | null
          duration_seconds: number | null
          file_size_bytes: number | null
          status: 'pending' | 'approved' | 'rejected' | 'featured' | 'removed'
          moderation_notes: string | null
          is_featured: boolean
          view_count: number
          like_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          submission_type: 'dance_challenge' | 'rap_challenge' | 'fan_art' | 'performance_clip' | 'remix' | 'beat' | 'talent' | 'contest_entry' | 'other'
          contest_id?: string | null
          title: string
          description?: string | null
          media_url: string
          media_type: 'video' | 'audio' | 'image' | 'text'
          thumbnail_url?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          status?: 'pending' | 'approved' | 'rejected' | 'featured' | 'removed'
          moderation_notes?: string | null
          is_featured?: boolean
          view_count?: number
          like_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          submission_type?: 'dance_challenge' | 'rap_challenge' | 'fan_art' | 'performance_clip' | 'remix' | 'beat' | 'talent' | 'contest_entry' | 'other'
          contest_id?: string | null
          title?: string
          description?: string | null
          media_url?: string
          media_type?: 'video' | 'audio' | 'image' | 'text'
          thumbnail_url?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          status?: 'pending' | 'approved' | 'rejected' | 'featured' | 'removed'
          moderation_notes?: string | null
          is_featured?: boolean
          view_count?: number
          like_count?: number
        }
        Relationships: []
      }
      submission_votes: {
        Row: {
          user_id: string
          submission_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          submission_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          submission_id?: string
        }
        Relationships: []
      }
      submission_comments: {
        Row: {
          id: string
          user_id: string
          submission_id: string
          body: string
          is_hidden: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          submission_id: string
          body: string
          is_hidden?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          submission_id?: string
          body?: string
          is_hidden?: boolean
        }
        Relationships: []
      }
      moderation_log: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          reason: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          reason?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string
          target_id?: string
          reason?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          id: string
          user_id: string
          issued_by: string
          reason: string
          severity: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          issued_by: string
          reason: string
          severity: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          issued_by?: string
          reason?: string
          severity?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          reason: string | null
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: string
          target_id: string
          reason: string
          details: string | null
          status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
          resolution: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: string
          target_id: string
          reason: string
          details?: string | null
          status?: 'open' | 'reviewing' | 'resolved' | 'dismissed'
          resolution?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_type?: string
          target_id?: string
          reason?: string
          details?: string | null
          status?: 'open' | 'reviewing' | 'resolved' | 'dismissed'
          resolution?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_name: string
          properties: Json | null
          session_id: string | null
          platform: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_name: string
          properties?: Json | null
          session_id?: string | null
          platform?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_name?: string
          properties?: Json | null
          session_id?: string | null
          platform?: string | null
        }
        Relationships: []
      }
      fan_profiles: {
        Row: {
          id: string
          display_name: string | null
          username: string | null
          bio: string | null
          avatar_url: string | null
          is_public: boolean
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          username?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_public?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          username?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_public?: boolean
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      fan_contests: {
        Row: {
          id: string
          title: string
          description: string | null
          cover_url: string | null
          prize_description: string | null
          submission_type: string | null
          starts_at: string | null
          ends_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          cover_url?: string | null
          prize_description?: string | null
          submission_type?: string | null
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          cover_url?: string | null
          prize_description?: string | null
          submission_type?: string | null
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
