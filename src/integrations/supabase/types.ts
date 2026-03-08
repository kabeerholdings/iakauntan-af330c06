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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          base_currency: string | null
          city: string | null
          country: string | null
          created_at: string
          einvoice_enabled: boolean | null
          einvoice_tin: string | null
          email: string | null
          fiscal_year_start: number | null
          id: string
          logo_url: string | null
          msic_code: string | null
          name: string
          owner_id: string
          phone: string | null
          postcode: string | null
          registration_no: string | null
          state: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          base_currency?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          einvoice_enabled?: boolean | null
          einvoice_tin?: string | null
          email?: string | null
          fiscal_year_start?: number | null
          id?: string
          logo_url?: string | null
          msic_code?: string | null
          name: string
          owner_id: string
          phone?: string | null
          postcode?: string | null
          registration_no?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          base_currency?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          einvoice_enabled?: boolean | null
          einvoice_tin?: string | null
          email?: string | null
          fiscal_year_start?: number | null
          id?: string
          logo_url?: string | null
          msic_code?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          postcode?: string | null
          registration_no?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          postcode: string | null
          state: string | null
          tax_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          postcode?: string | null
          state?: string | null
          tax_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          postcode?: string | null
          state?: string | null
          tax_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          receipt_url: string | null
          status: string | null
          tax_amount: number | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          status?: string | null
          tax_amount?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          status?: string | null
          tax_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          account_id: string | null
          classification_code: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number | null
        }
        Insert: {
          account_id?: string | null
          classification_code?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number | null
        }
        Update: {
          account_id?: string | null
          classification_code?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          currency: string | null
          due_date: string | null
          einvoice_long_id: string | null
          einvoice_status: string | null
          einvoice_submitted_at: string | null
          einvoice_uuid: string | null
          einvoice_validated_at: string | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          einvoice_long_id?: string | null
          einvoice_status?: string | null
          einvoice_submitted_at?: string | null
          einvoice_uuid?: string | null
          einvoice_validated_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type: string
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          einvoice_long_id?: string | null
          einvoice_status?: string | null
          einvoice_submitted_at?: string | null
          einvoice_uuid?: string | null
          einvoice_validated_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          id: string
          reference: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lhdn_credentials: {
        Row: {
          client_id: string
          client_secret: string
          company_id: string
          created_at: string
          environment: string
          id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_secret: string
          company_id: string
          created_at?: string
          environment?: string
          id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          company_id?: string
          created_at?: string
          environment?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lhdn_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          mobile_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          mobile_no?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          mobile_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
