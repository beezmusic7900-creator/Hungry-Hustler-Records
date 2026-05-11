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
          updated_at?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          id: string
          name: string
          genre: string | null
          bio: string | null
          image_url: string | null
          apple_music_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          genre?: string | null
          bio?: string | null
          image_url?: string | null
          apple_music_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          genre?: string | null
          bio?: string | null
          image_url?: string | null
          apple_music_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      merch: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          category: string | null
          in_stock: boolean
          checkout_url: string | null
          is_featured: boolean
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          category?: string | null
          in_stock?: boolean
          checkout_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          category?: string | null
          in_stock?: boolean
          checkout_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
