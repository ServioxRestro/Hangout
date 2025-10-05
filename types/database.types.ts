export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_active: boolean
          name: string
          password_hash: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean
          name: string
          password_hash: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          password_hash?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_veg: boolean | null
          name: string
          price: number
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_veg?: boolean | null
          name: string
          price: number
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_veg?: boolean | null
          name?: string
          price?: number
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          order_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          order_id?: string | null
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          order_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          status: string | null
          table_id: string | null
          table_session_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          table_id?: string | null
          table_session_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          table_id?: string | null
          table_session_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_session_id_fkey"
            columns: ["table_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          qr_code_url: string | null
          table_code: string
          table_number: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          table_code: string
          table_number: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          table_code?: string
          table_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          benefits: Json
          conditions: Json | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          min_orders_count: number | null
          name: string
          offer_type: string
          priority: number | null
          promo_code: string | null
          start_date: string | null
          target_customer_type: string | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_days: string[] | null
          valid_hours_end: string | null
          valid_hours_start: string | null
        }
        Insert: {
          benefits?: Json
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          min_orders_count?: number | null
          name: string
          offer_type: string
          priority?: number | null
          promo_code?: string | null
          start_date?: string | null
          target_customer_type?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_days?: string[] | null
          valid_hours_end?: string | null
          valid_hours_start?: string | null
        }
        Update: {
          benefits?: Json
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          min_orders_count?: number | null
          name?: string
          offer_type?: string
          priority?: number | null
          promo_code?: string | null
          start_date?: string | null
          target_customer_type?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_days?: string[] | null
          valid_hours_end?: string | null
          valid_hours_start?: string | null
        }
        Relationships: []
      }
      offer_items: {
        Row: {
          created_at: string | null
          id: string
          item_type: string | null
          menu_category_id: string | null
          menu_item_id: string | null
          offer_id: string
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_type?: string | null
          menu_category_id?: string | null
          menu_item_id?: string | null
          offer_id: string
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_type?: string | null
          menu_category_id?: string | null
          menu_item_id?: string | null
          offer_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_items_menu_category_id_fkey"
            columns: ["menu_category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_usage: {
        Row: {
          customer_email: string | null
          customer_phone: string | null
          discount_amount: number | null
          free_items: Json | null
          id: string
          offer_id: string
          order_id: string | null
          used_at: string | null
        }
        Insert: {
          customer_email?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          free_items?: Json | null
          id?: string
          offer_id: string
          order_id?: string | null
          used_at?: string | null
        }
        Update: {
          customer_email?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          free_items?: Json | null
          id?: string
          offer_id?: string
          order_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_usage_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_meals: {
        Row: {
          combo_price: number
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_customizable: boolean | null
          name: string
          offer_id: string
        }
        Insert: {
          combo_price: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_customizable?: boolean | null
          name: string
          offer_id: string
        }
        Update: {
          combo_price?: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_customizable?: boolean | null
          name?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_meals_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_meal_items: {
        Row: {
          combo_meal_id: string
          created_at: string | null
          id: string
          is_required: boolean | null
          is_selectable: boolean | null
          menu_category_id: string | null
          menu_item_id: string | null
          quantity: number | null
        }
        Insert: {
          combo_meal_id: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          is_selectable?: boolean | null
          menu_category_id?: string | null
          menu_item_id?: string | null
          quantity?: number | null
        }
        Update: {
          combo_meal_id?: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          is_selectable?: boolean | null
          menu_category_id?: string | null
          menu_item_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "combo_meal_items_combo_meal_id_fkey"
            columns: ["combo_meal_id"]
            isOneToOne: false
            referencedRelation: "combo_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_meal_items_menu_category_id_fkey"
            columns: ["menu_category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_meal_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sessions: {
        Row: {
          created_at: string | null
          customer_email: string
          id: string
          session_ended_at: string | null
          session_started_at: string | null
          status: string
          table_id: string
          total_amount: number | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          id?: string
          session_ended_at?: string | null
          session_started_at?: string | null
          status?: string
          table_id: string
          total_amount?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          id?: string
          session_ended_at?: string | null
          session_started_at?: string | null
          status?: string
          table_id?: string
          total_amount?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_offer_usage: {
        Args: { offer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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