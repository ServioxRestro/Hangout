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
      bill_items: {
        Row: {
          bill_id: string | null
          created_at: string | null
          id: string
          is_cancelled: boolean | null
          item_name: string
          order_item_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          bill_id?: string | null
          created_at?: string | null
          id?: string
          is_cancelled?: boolean | null
          item_name: string
          order_item_id?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          bill_id?: string | null
          created_at?: string | null
          id?: string
          is_cancelled?: boolean | null
          item_name?: string
          order_item_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_number: string
          cgst_amount: number | null
          cgst_rate: number | null
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          final_amount: number
          generated_at: string | null
          generated_by: string | null
          id: string
          igst_amount: number | null
          igst_rate: number | null
          paid_at: string | null
          payment_method: string | null
          payment_received_by: string | null
          payment_status: string | null
          service_charge_amount: number | null
          service_charge_rate: number | null
          sgst_amount: number | null
          sgst_rate: number | null
          subtotal: number
          table_session_id: string | null
          total_tax_amount: number | null
          updated_at: string | null
        }
        Insert: {
          bill_number: string
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          final_amount?: number
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_received_by?: string | null
          payment_status?: string | null
          service_charge_amount?: number | null
          service_charge_rate?: number | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          subtotal?: number
          table_session_id?: string | null
          total_tax_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          bill_number?: string
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          final_amount?: number
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_received_by?: string | null
          payment_status?: string | null
          service_charge_amount?: number | null
          service_charge_rate?: number | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          subtotal?: number
          table_session_id?: string | null
          total_tax_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_payment_received_by_fkey"
            columns: ["payment_received_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_table_session_id_fkey"
            columns: ["table_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
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
          discount_percentage: number | null
          display_order: number | null
          has_discount: boolean | null
          id: string
          image_path: string | null
          image_url: string | null
          is_available: boolean | null
          is_veg: boolean | null
          name: string
          original_price: number | null
          price: number
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          display_order?: number | null
          has_discount?: boolean | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_available?: boolean | null
          is_veg?: boolean | null
          name: string
          original_price?: number | null
          price: number
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          display_order?: number | null
          has_discount?: boolean | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_available?: boolean | null
          is_veg?: boolean | null
          name?: string
          original_price?: number | null
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
      offers: {
        Row: {
          benefits: Json
          conditions: Json | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          image_path: string | null
          image_url: string | null
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
          image_path?: string | null
          image_url?: string | null
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
          image_path?: string | null
          image_url?: string | null
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
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string | null
          created_by: string | null
          created_by_admin_id: string | null
          created_by_staff_id: string | null
          created_by_type: string | null
          customer_email: string | null
          customer_identifier: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          order_type: string
          status: string | null
          table_id: string | null
          table_session_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_admin_id?: string | null
          created_by_staff_id?: string | null
          created_by_type?: string | null
          customer_email?: string | null
          customer_identifier?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          status?: string | null
          table_id?: string | null
          table_session_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_admin_id?: string | null
          created_by_staff_id?: string | null
          created_by_type?: string | null
          customer_email?: string | null
          customer_identifier?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_type?: string
          status?: string | null
          table_id?: string | null
          table_session_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_admin_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_staff_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
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
      restaurant_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_type: string | null
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string | null
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string | null
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
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
      table_sessions: {
        Row: {
          bill_generated_at: string | null
          billed_by: string | null
          created_at: string | null
          customer_email: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_received_by: string | null
          session_ended_at: string | null
          session_started_at: string | null
          status: string
          table_id: string | null
          total_amount: number | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          bill_generated_at?: string | null
          billed_by?: string | null
          created_at?: string | null
          customer_email: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_received_by?: string | null
          session_ended_at?: string | null
          session_started_at?: string | null
          status?: string
          table_id?: string | null
          total_amount?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          bill_generated_at?: string | null
          billed_by?: string | null
          created_at?: string | null
          customer_email?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_received_by?: string | null
          session_ended_at?: string | null
          session_started_at?: string | null
          status?: string
          table_id?: string | null
          total_amount?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_billed_by_fkey"
            columns: ["billed_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_payment_received_by_fkey"
            columns: ["payment_received_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_settings: {
        Row: {
          applies_to: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          rate: number
          updated_at: string | null
        }
        Insert: {
          applies_to?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          rate: number
          updated_at?: string | null
        }
        Update: {
          applies_to?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          rate?: number
          updated_at?: string | null
        }
        Relationships: []
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
