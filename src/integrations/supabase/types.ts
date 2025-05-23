export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: {
          approved_at: string | null
          approved_file_path: string | null
          approved_for_matching: boolean | null
          company: string
          created_at: string
          email: string
          file_data: string | null
          file_name: string | null
          file_type: string | null
          form_type: string
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          phone: string
          position: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_file_path?: string | null
          approved_for_matching?: boolean | null
          company: string
          created_at?: string
          email: string
          file_data?: string | null
          file_name?: string | null
          file_type?: string | null
          form_type: string
          full_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone: string
          position: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_file_path?: string | null
          approved_for_matching?: boolean | null
          company?: string
          created_at?: string
          email?: string
          file_data?: string | null
          file_name?: string | null
          file_type?: string | null
          form_type?: string
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string
          position?: string
          status?: string
        }
        Relationships: []
      }
      match_results: {
        Row: {
          contact_id: string | null
          created_at: string | null
          id: string
          match_score: number | null
          matched_listing_url: string
          notes: string | null
          outcome: string
          platform: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          match_score?: number | null
          matched_listing_url: string
          notes?: string | null
          outcome: string
          platform: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          match_score?: number | null
          matched_listing_url?: string
          notes?: string | null
          outcome?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_results_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "pending_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          error_message: string | null
          full_name: string
          id: string
          phone: string | null
          position: string | null
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          full_name: string
          id?: string
          phone?: string | null
          position?: string | null
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          position?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      postcode_geocoding: {
        Row: {
          country: string | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          postcode: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          postcode: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          postcode?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          contact_id: string
          created_at: string
          html_content: string
          id: string
          matches_count: number
          properties_count: number
          status: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          html_content: string
          id?: string
          matches_count?: number
          properties_count?: number
          status?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          html_content?: string
          id?: string
          matches_count?: number
          properties_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator"
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "moderator"],
    },
  },
} as const
