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
      assemblies: {
        Row: {
          assembly_date: string | null
          assembly_number: string
          assembly_type: string
          batch_no: string | null
          bom_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          job_order_id: string | null
          labour_cost: number | null
          machine_cost: number | null
          notes: string | null
          overhead_cost: number | null
          product_id: string
          quantity: number
          status: string | null
          total_cost: number | null
          total_material_cost: number | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          assembly_date?: string | null
          assembly_number: string
          assembly_type?: string
          batch_no?: string | null
          bom_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          job_order_id?: string | null
          labour_cost?: number | null
          machine_cost?: number | null
          notes?: string | null
          overhead_cost?: number | null
          product_id: string
          quantity?: number
          status?: string | null
          total_cost?: number | null
          total_material_cost?: number | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          assembly_date?: string | null
          assembly_number?: string
          assembly_type?: string
          batch_no?: string | null
          bom_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          job_order_id?: string | null
          labour_cost?: number | null
          machine_cost?: number | null
          notes?: string | null
          overhead_cost?: number | null
          product_id?: string
          quantity?: number
          status?: string | null
          total_cost?: number | null
          total_material_cost?: number | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assemblies_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_lines: {
        Row: {
          assembly_id: string
          batch_no: string | null
          created_at: string
          id: string
          quantity: number
          stock_item_id: string
          total_cost: number | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          assembly_id: string
          batch_no?: string | null
          created_at?: string
          id?: string
          quantity?: number
          stock_item_id: string
          total_cost?: number | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          assembly_id?: string
          batch_no?: string | null
          created_at?: string
          id?: string
          quantity?: number
          stock_item_id?: string
          total_cost?: number | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_lines_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_schedules: {
        Row: {
          ai_recycle_enabled: boolean | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          max_backups: number | null
          next_run_at: string | null
          retention_days: number | null
          schedule_type: string | null
          updated_at: string
        }
        Insert: {
          ai_recycle_enabled?: boolean | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          max_backups?: number | null
          next_run_at?: string | null
          retention_days?: number | null
          schedule_type?: string | null
          updated_at?: string
        }
        Update: {
          ai_recycle_enabled?: boolean | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          max_backups?: number | null
          next_run_at?: string | null
          retention_days?: number | null
          schedule_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          balance: number | null
          bank_account_id: string | null
          company_id: string
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          is_reconciled: boolean | null
          matched_journal_id: string | null
          matched_payment_id: string | null
          reference: string | null
          statement_date: string
          updated_at: string
        }
        Insert: {
          balance?: number | null
          bank_account_id?: string | null
          company_id: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          matched_journal_id?: string | null
          matched_payment_id?: string | null
          reference?: string | null
          statement_date?: string
          updated_at?: string
        }
        Update: {
          balance?: number | null
          bank_account_id?: string | null
          company_id?: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          matched_journal_id?: string | null
          matched_payment_id?: string | null
          reference?: string | null
          statement_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_matched_journal_id_fkey"
            columns: ["matched_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_messages: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          entity_ids: Json | null
          entity_type: string | null
          id: string
          message_type: string
          recipients: Json | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string | null
          total_failed: number | null
          total_sent: number | null
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          entity_ids?: Json | null
          entity_type?: string | null
          id?: string
          message_type?: string
          recipients?: Json | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          total_failed?: number | null
          total_sent?: number | null
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          entity_ids?: Json | null
          entity_type?: string | null
          id?: string
          message_type?: string
          recipients?: Json | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          total_failed?: number | null
          total_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_of_materials: {
        Row: {
          bom_code: string
          bom_name: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          labour_cost: number | null
          machine_cost: number | null
          output_quantity: number
          output_uom: string | null
          overhead_cost: number | null
          product_id: string
          total_cost: number | null
          total_material_cost: number | null
          updated_at: string
        }
        Insert: {
          bom_code: string
          bom_name: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          labour_cost?: number | null
          machine_cost?: number | null
          output_quantity?: number
          output_uom?: string | null
          overhead_cost?: number | null
          product_id: string
          total_cost?: number | null
          total_material_cost?: number | null
          updated_at?: string
        }
        Update: {
          bom_code?: string
          bom_name?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          labour_cost?: number | null
          machine_cost?: number | null
          output_quantity?: number
          output_uom?: string | null
          overhead_cost?: number | null
          product_id?: string
          total_cost?: number | null
          total_material_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_of_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_of_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_lines: {
        Row: {
          bom_id: string
          created_at: string
          effective_quantity: number | null
          id: string
          quantity: number
          sort_order: number | null
          stock_item_id: string
          total_cost: number | null
          unit_cost: number | null
          uom: string | null
          wastage_percent: number | null
        }
        Insert: {
          bom_id: string
          created_at?: string
          effective_quantity?: number | null
          id?: string
          quantity?: number
          sort_order?: number | null
          stock_item_id: string
          total_cost?: number | null
          unit_cost?: number | null
          uom?: string | null
          wastage_percent?: number | null
        }
        Update: {
          bom_id?: string
          created_at?: string
          effective_quantity?: number | null
          id?: string
          quantity?: number
          sort_order?: number | null
          stock_item_id?: string
          total_cost?: number | null
          unit_cost?: number | null
          uom?: string | null
          wastage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cloud_backups: {
        Row: {
          backup_name: string
          backup_type: string | null
          company_id: string
          created_at: string
          created_by: string | null
          file_size: number | null
          file_url: string | null
          health_score: number | null
          id: string
          is_recycled: boolean | null
          ransomware_check: boolean | null
          ransomware_status: string | null
          recycled_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          backup_name: string
          backup_type?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_url?: string | null
          health_score?: number | null
          id?: string
          is_recycled?: boolean | null
          ransomware_check?: boolean | null
          ransomware_status?: string | null
          recycled_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          backup_name?: string
          backup_type?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_url?: string | null
          health_score?: number | null
          id?: string
          is_recycled?: boolean | null
          ransomware_check?: boolean | null
          ransomware_status?: string | null
          recycled_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_backups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          calculation_basis: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          rule_name: string
          tier_type: string | null
          updated_at: string
        }
        Insert: {
          calculation_basis?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name: string
          tier_type?: string | null
          updated_at?: string
        }
        Update: {
          calculation_basis?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name?: string
          tier_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          created_at: string
          flat_amount: number | null
          id: string
          max_amount: number | null
          min_amount: number | null
          rate: number | null
          rule_id: string
        }
        Insert: {
          created_at?: string
          flat_amount?: number | null
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          rate?: number | null
          rule_id: string
        }
        Update: {
          created_at?: string
          flat_amount?: number | null
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          rate?: number | null
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_tiers_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          actual_data_start_date: string | null
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
          fiscal_year_start_date: string | null
          id: string
          inventory_system: string | null
          logo_url: string | null
          msic_code: string | null
          name: string
          owner_id: string
          phone: string | null
          postcode: string | null
          registration_no: string | null
          sample_coa: string | null
          state: string | null
          tax_id: string | null
          tax_system: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          actual_data_start_date?: string | null
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
          fiscal_year_start_date?: string | null
          id?: string
          inventory_system?: string | null
          logo_url?: string | null
          msic_code?: string | null
          name: string
          owner_id: string
          phone?: string | null
          postcode?: string | null
          registration_no?: string | null
          sample_coa?: string | null
          state?: string | null
          tax_id?: string | null
          tax_system?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          actual_data_start_date?: string | null
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
          fiscal_year_start_date?: string | null
          id?: string
          inventory_system?: string | null
          logo_url?: string | null
          msic_code?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          postcode?: string | null
          registration_no?: string | null
          sample_coa?: string | null
          state?: string | null
          tax_id?: string | null
          tax_system?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          bank_account_no: string | null
          bank_name: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          credit_limit: number | null
          credit_terms: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          overdue_limit: number | null
          phone: string | null
          postcode: string | null
          state: string | null
          tax_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_terms?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          overdue_limit?: number | null
          phone?: string | null
          postcode?: string | null
          state?: string | null
          tax_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_terms?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          overdue_limit?: number | null
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
      currency_rates: {
        Row: {
          company_id: string
          created_at: string
          currency_code: string
          effective_date: string
          id: string
          rate: number
        }
        Insert: {
          company_id: string
          created_at?: string
          currency_code: string
          effective_date?: string
          id?: string
          rate: number
        }
        Update: {
          company_id?: string
          created_at?: string
          currency_code?: string
          effective_date?: string
          id?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "currency_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          custom_field_id: string
          entity_id: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          custom_field_id: string
          entity_id: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          custom_field_id?: string
          entity_id?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          company_id: string
          created_at: string
          entity_type: string
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          position_placement: string | null
          position_reference: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_type: string
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          position_placement?: string | null
          position_reference?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_type?: string
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          position_placement?: string | null
          position_reference?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          company_id: string
          config: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          module: string
          report_name: string
          report_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          report_name: string
          report_type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          report_name?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_attachments: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          body_html: string | null
          company_id: string
          created_at: string
          font_family: string | null
          footer_html: string | null
          header_html: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          paper_size: string | null
          primary_color: string | null
          show_logo: boolean | null
          show_notes: boolean | null
          show_payment_info: boolean | null
          template_name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          company_id: string
          created_at?: string
          font_family?: string | null
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          paper_size?: string | null
          primary_color?: string | null
          show_logo?: boolean | null
          show_notes?: boolean | null
          show_payment_info?: boolean | null
          template_name: string
          template_type?: string
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          company_id?: string
          created_at?: string
          font_family?: string | null
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          paper_size?: string | null
          primary_color?: string | null
          show_logo?: boolean | null
          show_notes?: boolean | null
          show_payment_info?: boolean | null
          template_name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loans: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          loan_amount: number
          loan_type: string
          monthly_deduction: number
          notes: string | null
          outstanding_balance: number
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          loan_amount?: number
          loan_type: string
          monthly_deduction?: number
          notes?: string | null
          outstanding_balance?: number
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          loan_amount?: number
          loan_type?: string
          monthly_deduction?: number
          notes?: string | null
          outstanding_balance?: number
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_account_no: string | null
          bank_name: string | null
          basic_salary: number
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          eis_contribute: boolean | null
          email: string | null
          employee_category: string | null
          employee_no: string
          employment_type: string | null
          epf_additional_employee: number | null
          epf_additional_employer: number | null
          epf_employee_rate: number | null
          epf_employer_rate: number | null
          epf_no: string | null
          first_name: string
          gender: string | null
          hourly_rate: number | null
          hrdf_contribute: boolean | null
          ic_no: string | null
          id: string
          is_active: boolean | null
          join_date: string
          last_name: string
          marital_status: string | null
          nationality: string | null
          passport_no: string | null
          payment_method: string | null
          pcb_group: string | null
          phone: string | null
          position: string | null
          postcode: string | null
          race: string | null
          religion: string | null
          resign_date: string | null
          socso_category: string | null
          socso_no: string | null
          state: string | null
          tax_branch: string | null
          tax_no: string | null
          tax_resident: boolean | null
          tax_status: string | null
          updated_at: string
          zakat_percentage: number | null
        }
        Insert: {
          address?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          basic_salary?: number
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          eis_contribute?: boolean | null
          email?: string | null
          employee_category?: string | null
          employee_no: string
          employment_type?: string | null
          epf_additional_employee?: number | null
          epf_additional_employer?: number | null
          epf_employee_rate?: number | null
          epf_employer_rate?: number | null
          epf_no?: string | null
          first_name: string
          gender?: string | null
          hourly_rate?: number | null
          hrdf_contribute?: boolean | null
          ic_no?: string | null
          id?: string
          is_active?: boolean | null
          join_date?: string
          last_name: string
          marital_status?: string | null
          nationality?: string | null
          passport_no?: string | null
          payment_method?: string | null
          pcb_group?: string | null
          phone?: string | null
          position?: string | null
          postcode?: string | null
          race?: string | null
          religion?: string | null
          resign_date?: string | null
          socso_category?: string | null
          socso_no?: string | null
          state?: string | null
          tax_branch?: string | null
          tax_no?: string | null
          tax_resident?: boolean | null
          tax_status?: string | null
          updated_at?: string
          zakat_percentage?: number | null
        }
        Update: {
          address?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          basic_salary?: number
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          eis_contribute?: boolean | null
          email?: string | null
          employee_category?: string | null
          employee_no?: string
          employment_type?: string | null
          epf_additional_employee?: number | null
          epf_additional_employer?: number | null
          epf_employee_rate?: number | null
          epf_employer_rate?: number | null
          epf_no?: string | null
          first_name?: string
          gender?: string | null
          hourly_rate?: number | null
          hrdf_contribute?: boolean | null
          ic_no?: string | null
          id?: string
          is_active?: boolean | null
          join_date?: string
          last_name?: string
          marital_status?: string | null
          nationality?: string | null
          passport_no?: string | null
          payment_method?: string | null
          pcb_group?: string | null
          phone?: string | null
          position?: string | null
          postcode?: string | null
          race?: string | null
          religion?: string | null
          resign_date?: string | null
          socso_category?: string | null
          socso_no?: string | null
          state?: string | null
          tax_branch?: string | null
          tax_no?: string | null
          tax_resident?: boolean | null
          tax_status?: string | null
          updated_at?: string
          zakat_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
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
      job_order_lines: {
        Row: {
          created_at: string
          id: string
          issued_quantity: number | null
          job_order_id: string
          required_quantity: number
          returned_quantity: number | null
          stock_item_id: string
          unit_cost: number | null
          uom: string | null
          wastage_quantity: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          issued_quantity?: number | null
          job_order_id: string
          required_quantity?: number
          returned_quantity?: number | null
          stock_item_id: string
          unit_cost?: number | null
          uom?: string | null
          wastage_quantity?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          issued_quantity?: number | null
          job_order_id?: string
          required_quantity?: number
          returned_quantity?: number | null
          stock_item_id?: string
          unit_cost?: number | null
          uom?: string | null
          wastage_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_order_lines_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_order_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      job_orders: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          bom_id: string
          company_id: string
          completed_quantity: number | null
          created_at: string
          created_by: string | null
          id: string
          job_number: string
          labour_cost: number | null
          machine_cost: number | null
          notes: string | null
          overhead_cost: number | null
          planned_end_date: string | null
          planned_quantity: number
          planned_start_date: string | null
          priority: string | null
          product_id: string
          sales_order_id: string | null
          status: string | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          bom_id: string
          company_id: string
          completed_quantity?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_number: string
          labour_cost?: number | null
          machine_cost?: number | null
          notes?: string | null
          overhead_cost?: number | null
          planned_end_date?: string | null
          planned_quantity?: number
          planned_start_date?: string | null
          priority?: string | null
          product_id: string
          sales_order_id?: string | null
          status?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          bom_id?: string
          company_id?: string
          completed_quantity?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_number?: string
          labour_cost?: number | null
          machine_cost?: number | null
          notes?: string | null
          overhead_cost?: number | null
          planned_end_date?: string | null
          planned_quantity?: number
          planned_start_date?: string | null
          priority?: string | null
          product_id?: string
          sales_order_id?: string | null
          status?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
      leave_applications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_entitlements: {
        Row: {
          balance: number | null
          carried_forward: number | null
          created_at: string
          employee_id: string
          entitled_days: number | null
          id: string
          leave_type_id: string
          updated_at: string
          used_days: number | null
          year: number
        }
        Insert: {
          balance?: number | null
          carried_forward?: number | null
          created_at?: string
          employee_id: string
          entitled_days?: number | null
          id?: string
          leave_type_id: string
          updated_at?: string
          used_days?: number | null
          year: number
        }
        Update: {
          balance?: number | null
          carried_forward?: number | null
          created_at?: string
          employee_id?: string
          entitled_days?: number | null
          id?: string
          leave_type_id?: string
          updated_at?: string
          used_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_entitlements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_entitlements_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          company_id: string
          created_at: string
          default_days: number | null
          id: string
          is_active: boolean | null
          is_carry_forward: boolean | null
          is_paid: boolean | null
          max_carry_forward: number | null
          name: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          default_days?: number | null
          id?: string
          is_active?: boolean | null
          is_carry_forward?: boolean | null
          is_paid?: boolean | null
          max_carry_forward?: number | null
          name: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          default_days?: number | null
          id?: string
          is_active?: boolean | null
          is_carry_forward?: boolean | null
          is_paid?: boolean | null
          max_carry_forward?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      marketplace_order_lines: {
        Row: {
          created_at: string
          discount: number | null
          id: string
          line_total: number | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number | null
          sku: string | null
          stock_item_id: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          discount?: number | null
          id?: string
          line_total?: number | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number | null
          sku?: string | null
          stock_item_id?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          discount?: number | null
          id?: string
          line_total?: number | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number | null
          sku?: string | null
          stock_item_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          commission_fee: number | null
          company_id: string
          courier: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          external_order_id: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string
          payment_fee: number | null
          payment_status: string | null
          platform_fee: number | null
          posted_to_accounting: boolean | null
          seller_payout: number | null
          shipping_address: string | null
          shipping_fee: number | null
          status: string | null
          store_id: string | null
          subtotal: number | null
          total_amount: number | null
          tracking_number: string | null
          updated_at: string
          voucher_discount: number | null
        }
        Insert: {
          commission_fee?: number | null
          company_id: string
          courier?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          external_order_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number: string
          payment_fee?: number | null
          payment_status?: string | null
          platform_fee?: number | null
          posted_to_accounting?: boolean | null
          seller_payout?: number | null
          shipping_address?: string | null
          shipping_fee?: number | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
          voucher_discount?: number | null
        }
        Update: {
          commission_fee?: number | null
          company_id?: string
          courier?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          external_order_id?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string
          payment_fee?: number | null
          payment_status?: string | null
          platform_fee?: number | null
          posted_to_accounting?: boolean | null
          seller_payout?: number | null
          shipping_address?: string | null
          shipping_fee?: number | null
          status?: string | null
          store_id?: string | null
          subtotal?: number | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
          voucher_discount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          company_id: string
          created_at: string
          external_product_id: string | null
          id: string
          image_url: string | null
          last_sync_at: string | null
          price: number | null
          product_name: string
          sku: string | null
          status: string | null
          stock_item_id: string | null
          stock_qty: number | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          external_product_id?: string | null
          id?: string
          image_url?: string | null
          last_sync_at?: string | null
          price?: number | null
          product_name: string
          sku?: string | null
          status?: string | null
          stock_item_id?: string | null
          stock_qty?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          external_product_id?: string | null
          id?: string
          image_url?: string | null
          last_sync_at?: string | null
          price?: number | null
          product_name?: string
          sku?: string | null
          status?: string | null
          stock_item_id?: string | null
          stock_qty?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_products_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "marketplace_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_stores: {
        Row: {
          company_id: string
          created_at: string
          credentials: Json | null
          id: string
          last_sync_at: string | null
          marketplace: string
          region: string | null
          status: string | null
          store_id: string | null
          store_name: string
          store_url: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          credentials?: Json | null
          id?: string
          last_sync_at?: string | null
          marketplace: string
          region?: string | null
          status?: string | null
          store_id?: string | null
          store_name: string
          store_url?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          credentials?: Json | null
          id?: string
          last_sync_at?: string | null
          marketplace?: string
          region?: string | null
          status?: string | null
          store_id?: string | null
          store_name?: string
          store_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_stores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          payment_id: string
          sales_doc_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          payment_id: string
          sales_doc_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          payment_id?: string
          sales_doc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_sales_doc_id_fkey"
            columns: ["sales_doc_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          cheque_date: string | null
          cheque_no: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          exchange_rate: number | null
          id: string
          is_bounced: boolean | null
          is_post_dated: boolean | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_type: string
          project: string | null
          reference: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          cheque_date?: string | null
          cheque_no?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          id?: string
          is_bounced?: boolean | null
          is_post_dated?: boolean | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type: string
          project?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cheque_date?: string | null
          cheque_no?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          id?: string
          is_bounced?: boolean | null
          is_post_dated?: boolean | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          project?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          end_date: string
          frequency: string | null
          id: string
          notes: string | null
          period_month: number
          period_year: number
          process_date: string | null
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          frequency?: string | null
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
          process_date?: string | null
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          process_date?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_templates: {
        Row: {
          code: string
          company_id: string
          created_at: string
          default_amount: number | null
          description: string
          id: string
          is_active: boolean | null
          is_epf_applicable: boolean | null
          is_socso_applicable: boolean | null
          is_taxable: boolean | null
          item_type: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          default_amount?: number | null
          description: string
          id?: string
          is_active?: boolean | null
          is_epf_applicable?: boolean | null
          is_socso_applicable?: boolean | null
          is_taxable?: boolean | null
          item_type: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          default_amount?: number | null
          description?: string
          id?: string
          is_active?: boolean | null
          is_epf_applicable?: boolean | null
          is_socso_applicable?: boolean | null
          is_taxable?: boolean | null
          item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_items: {
        Row: {
          amount: number
          code: string | null
          created_at: string
          description: string
          id: string
          is_epf_applicable: boolean | null
          is_socso_applicable: boolean | null
          is_taxable: boolean | null
          item_type: string
          payslip_id: string
          quantity: number | null
          rate: number | null
        }
        Insert: {
          amount?: number
          code?: string | null
          created_at?: string
          description: string
          id?: string
          is_epf_applicable?: boolean | null
          is_socso_applicable?: boolean | null
          is_taxable?: boolean | null
          item_type: string
          payslip_id: string
          quantity?: number | null
          rate?: number | null
        }
        Update: {
          amount?: number
          code?: string | null
          created_at?: string
          description?: string
          id?: string
          is_epf_applicable?: boolean | null
          is_socso_applicable?: boolean | null
          is_taxable?: boolean | null
          item_type?: string
          payslip_id?: string
          quantity?: number | null
          rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payslip_items_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          basic_salary: number | null
          created_at: string
          eis_employee: number | null
          eis_employer: number | null
          employee_id: string
          epf_employee: number | null
          epf_employer: number | null
          gross_pay: number | null
          hrdf_amount: number | null
          id: string
          net_pay: number | null
          ot_amount: number | null
          ot_hours: number | null
          payment_date: string | null
          payment_method: string | null
          payroll_period_id: string
          pcb_amount: number | null
          socso_employee: number | null
          socso_employer: number | null
          status: string | null
          total_deductions: number | null
          total_earnings: number | null
          updated_at: string
          zakat_amount: number | null
        }
        Insert: {
          basic_salary?: number | null
          created_at?: string
          eis_employee?: number | null
          eis_employer?: number | null
          employee_id: string
          epf_employee?: number | null
          epf_employer?: number | null
          gross_pay?: number | null
          hrdf_amount?: number | null
          id?: string
          net_pay?: number | null
          ot_amount?: number | null
          ot_hours?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payroll_period_id: string
          pcb_amount?: number | null
          socso_employee?: number | null
          socso_employer?: number | null
          status?: string | null
          total_deductions?: number | null
          total_earnings?: number | null
          updated_at?: string
          zakat_amount?: number | null
        }
        Update: {
          basic_salary?: number | null
          created_at?: string
          eis_employee?: number | null
          eis_employer?: number | null
          employee_id?: string
          epf_employee?: number | null
          epf_employer?: number | null
          gross_pay?: number | null
          hrdf_amount?: number | null
          id?: string
          net_pay?: number | null
          ot_amount?: number | null
          ot_hours?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payroll_period_id?: string
          pcb_amount?: number | null
          socso_employee?: number | null
          socso_employer?: number | null
          status?: string | null
          total_deductions?: number | null
          total_earnings?: number | null
          updated_at?: string
          zakat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          reference: string | null
          transaction_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          payment_method: string
          reference?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          reference?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          closed_at: string | null
          closing_balance: number | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          opened_at: string | null
          opened_by: string | null
          opening_balance: number | null
          status: string | null
          terminal_id: string
          total_refunds: number | null
          total_sales: number | null
        }
        Insert: {
          closed_at?: string | null
          closing_balance?: number | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          opening_balance?: number | null
          status?: string | null
          terminal_id: string
          total_refunds?: number | null
          total_sales?: number | null
        }
        Update: {
          closed_at?: string | null
          closing_balance?: number | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          opening_balance?: number | null
          status?: string | null
          terminal_id?: string
          total_refunds?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_terminals: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          location: string | null
          terminal_name: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          terminal_name: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          terminal_name?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_terminals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_terminals_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transaction_lines: {
        Row: {
          created_at: string
          description: string
          discount_amount: number | null
          discount_percent: number | null
          id: string
          line_total: number | null
          quantity: number | null
          stock_item_id: string | null
          tax_amount: number | null
          tax_rate: number | null
          transaction_id: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          line_total?: number | null
          quantity?: number | null
          stock_item_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          transaction_id: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          line_total?: number | null
          quantity?: number | null
          stock_item_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          transaction_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transaction_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          amount_paid: number | null
          change_amount: number | null
          company_id: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          discount_amount: number | null
          held_at: string | null
          id: string
          notes: string | null
          session_id: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          transaction_number: string
          transaction_type: string | null
        }
        Insert: {
          amount_paid?: number | null
          change_amount?: number | null
          company_id: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          held_at?: string | null
          id?: string
          notes?: string | null
          session_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          transaction_number: string
          transaction_type?: string | null
        }
        Update: {
          amount_paid?: number | null
          change_amount?: number | null
          company_id?: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          held_at?: string | null
          id?: string
          notes?: string | null
          session_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          transaction_number?: string
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
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
      projects: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_document_lines: {
        Row: {
          account_id: string | null
          created_at: string
          description: string
          discount_amount: number | null
          discount_percent: number | null
          document_id: string
          id: string
          line_total: number | null
          quantity: number | null
          stock_item_id: string | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number | null
          uom: string | null
          warehouse_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description: string
          discount_amount?: number | null
          discount_percent?: number | null
          document_id: string
          id?: string
          line_total?: number | null
          quantity?: number | null
          stock_item_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number | null
          uom?: string | null
          warehouse_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string
          discount_amount?: number | null
          discount_percent?: number | null
          document_id?: string
          id?: string
          line_total?: number | null
          quantity?: number | null
          stock_item_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number | null
          uom?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_document_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "purchase_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_document_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_document_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_documents: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          doc_date: string
          doc_number: string
          doc_type: string
          due_date: string | null
          exchange_rate: number | null
          id: string
          linked_doc_id: string | null
          notes: string | null
          project: string | null
          reference: string | null
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
          created_by?: string | null
          currency?: string | null
          doc_date?: string
          doc_number: string
          doc_type: string
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          linked_doc_id?: string | null
          notes?: string | null
          project?: string | null
          reference?: string | null
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
          created_by?: string | null
          currency?: string | null
          doc_date?: string
          doc_number?: string
          doc_type?: string
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          linked_doc_id?: string | null
          notes?: string | null
          project?: string | null
          reference?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_documents_linked_doc_id_fkey"
            columns: ["linked_doc_id"]
            isOneToOne: false
            referencedRelation: "purchase_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_document_lines: {
        Row: {
          account_id: string | null
          created_at: string
          description: string
          discount_amount: number | null
          discount_percent: number | null
          document_id: string
          id: string
          line_total: number | null
          quantity: number | null
          stock_item_id: string | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number | null
          uom: string | null
          warehouse_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description: string
          discount_amount?: number | null
          discount_percent?: number | null
          document_id: string
          id?: string
          line_total?: number | null
          quantity?: number | null
          stock_item_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number | null
          uom?: string | null
          warehouse_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string
          discount_amount?: number | null
          discount_percent?: number | null
          document_id?: string
          id?: string
          line_total?: number | null
          quantity?: number | null
          stock_item_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number | null
          uom?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_document_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_document_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_document_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_documents: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          doc_date: string
          doc_number: string
          doc_type: string
          due_date: string | null
          exchange_rate: number | null
          id: string
          linked_doc_id: string | null
          notes: string | null
          project: string | null
          reference: string | null
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
          created_by?: string | null
          currency?: string | null
          doc_date?: string
          doc_number: string
          doc_type: string
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          linked_doc_id?: string | null
          notes?: string | null
          project?: string | null
          reference?: string | null
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
          created_by?: string | null
          currency?: string | null
          doc_date?: string
          doc_number?: string
          doc_type?: string
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          linked_doc_id?: string | null
          notes?: string | null
          project?: string | null
          reference?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_documents_linked_doc_id_fkey"
            columns: ["linked_doc_id"]
            isOneToOne: false
            referencedRelation: "sales_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      salesman_commissions: {
        Row: {
          calculation_basis: string | null
          commission_amount: number | null
          commission_rate: number | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          period_month: number
          period_year: number
          salesman_id: string
          status: string | null
          total_collections: number | null
          total_sales: number | null
          updated_at: string
        }
        Insert: {
          calculation_basis?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
          salesman_id: string
          status?: string | null
          total_collections?: number | null
          total_sales?: number | null
          updated_at?: string
        }
        Update: {
          calculation_basis?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          salesman_id?: string
          status?: string | null
          total_collections?: number | null
          total_sales?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesman_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salesman_commissions_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      scanned_documents: {
        Row: {
          account_code: string | null
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          document_date: string | null
          document_number: string | null
          document_type: string | null
          extracted_data: Json | null
          file_name: string
          file_type: string | null
          file_url: string | null
          id: string
          is_processed: boolean | null
          processed_entry_id: string | null
          scan_status: string | null
          scanned_by: string | null
          supplier_name: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          account_code?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_number?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_name: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_processed?: boolean | null
          processed_entry_id?: string | null
          scan_status?: string | null
          scanned_by?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          account_code?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_number?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_processed?: boolean | null
          processed_entry_id?: string | null
          scan_status?: string | null
          scanned_by?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scanned_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      script_customizations: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          module: string | null
          script_code: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module?: string | null
          script_code?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module?: string | null
          script_code?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_customizations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      security_locks: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          lock_date: string | null
          lock_type: string
          locked_by: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          lock_date?: string | null
          lock_type: string
          locked_by?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          lock_date?: string | null
          lock_type?: string
          locked_by?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_locks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_lines: {
        Row: {
          adjustment_id: string
          created_at: string
          description: string | null
          id: string
          quantity: number
          stock_item_id: string
          unit_cost: number | null
          warehouse_id: string
        }
        Insert: {
          adjustment_id: string
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          stock_item_id: string
          unit_cost?: number | null
          warehouse_id: string
        }
        Update: {
          adjustment_id?: string
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          stock_item_id?: string
          unit_cost?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_lines_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_date: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          adjustment_date?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_date?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          avg_cost: number
          id: string
          quantity: number
          stock_item_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          avg_cost?: number
          id?: string
          quantity?: number
          stock_item_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          avg_cost?: number
          id?: string
          quantity?: number
          stock_item_id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "stock_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          account_id: string | null
          barcode: string | null
          base_uom: string
          category_id: string | null
          code: string
          company_id: string
          costing_method: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          min_price: number | null
          name: string
          purchase_account_id: string | null
          purchase_price: number | null
          reorder_level: number | null
          reorder_qty: number | null
          sales_account_id: string | null
          selling_price: number | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          barcode?: string | null
          base_uom?: string
          category_id?: string | null
          code: string
          company_id: string
          costing_method?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_price?: number | null
          name: string
          purchase_account_id?: string | null
          purchase_price?: number | null
          reorder_level?: number | null
          reorder_qty?: number | null
          sales_account_id?: string | null
          selling_price?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          barcode?: string | null
          base_uom?: string
          category_id?: string | null
          code?: string
          company_id?: string
          costing_method?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_price?: number | null
          name?: string
          purchase_account_id?: string | null
          purchase_price?: number | null
          reorder_level?: number | null
          reorder_qty?: number | null
          sales_account_id?: string | null
          selling_price?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "stock_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_purchase_account_id_fkey"
            columns: ["purchase_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_sales_account_id_fkey"
            columns: ["sales_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_take_lines: {
        Row: {
          barcode: string | null
          counted_qty: number | null
          created_at: string
          id: string
          notes: string | null
          stock_item_id: string
          stock_take_id: string
          system_qty: number | null
          unit_cost: number | null
          variance: number | null
          variance_value: number | null
        }
        Insert: {
          barcode?: string | null
          counted_qty?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          stock_item_id: string
          stock_take_id: string
          system_qty?: number | null
          unit_cost?: number | null
          variance?: number | null
          variance_value?: number | null
        }
        Update: {
          barcode?: string | null
          counted_qty?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          stock_item_id?: string
          stock_take_id?: string
          system_qty?: number | null
          unit_cost?: number | null
          variance?: number | null
          variance_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_take_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_take_lines_stock_take_id_fkey"
            columns: ["stock_take_id"]
            isOneToOne: false
            referencedRelation: "stock_takes"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_takes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          status: string | null
          take_date: string | null
          take_number: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          take_date?: string | null
          take_number: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          take_date?: string | null
          take_number?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_takes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_takes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_lines: {
        Row: {
          created_at: string
          id: string
          quantity: number
          stock_item_id: string
          transfer_id: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          stock_item_id: string
          transfer_id: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          stock_item_id?: string
          transfer_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_lines_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          from_warehouse_id: string
          id: string
          reference: string | null
          status: string | null
          to_warehouse_id: string
          transfer_date: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          reference?: string | null
          status?: string | null
          to_warehouse_id: string
          transfer_date?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          reference?: string | null
          status?: string | null
          to_warehouse_id?: string
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_uom: {
        Row: {
          barcode: string | null
          conversion_rate: number
          created_at: string
          id: string
          stock_item_id: string
          uom: string
        }
        Insert: {
          barcode?: string | null
          conversion_rate?: number
          created_at?: string
          id?: string
          stock_item_id: string
          uom: string
        }
        Update: {
          barcode?: string | null
          conversion_rate?: number
          created_at?: string
          id?: string
          stock_item_id?: string
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_uom_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
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
      warehouses: {
        Row: {
          address: string | null
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_appointments: {
        Row: {
          appointment_date: string
          commission_amount: number | null
          company_id: string
          created_at: string
          end_time: string | null
          id: string
          membership_id: string | null
          notes: string | null
          price: number | null
          room_slot: string | null
          service_id: string | null
          start_time: string
          status: string | null
          therapist_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          commission_amount?: number | null
          company_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          membership_id?: string | null
          notes?: string | null
          price?: number | null
          room_slot?: string | null
          service_id?: string | null
          start_time: string
          status?: string | null
          therapist_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          commission_amount?: number | null
          company_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          membership_id?: string | null
          notes?: string | null
          price?: number | null
          room_slot?: string | null
          service_id?: string | null
          start_time?: string
          status?: string | null
          therapist_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_appointments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "wellness_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "wellness_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_commissions: {
        Row: {
          appointment_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          period_month: number | null
          period_year: number | null
          service_name: string | null
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          period_month?: number | null
          period_year?: number | null
          service_name?: string | null
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          period_month?: number | null
          period_year?: number | null
          service_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_commissions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "wellness_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_memberships: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          credit_balance: number | null
          expiry_date: string | null
          id: string
          join_date: string | null
          member_email: string | null
          member_name: string
          member_phone: string | null
          membership_type: string | null
          points_balance: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          credit_balance?: number | null
          expiry_date?: string | null
          id?: string
          join_date?: string | null
          member_email?: string | null
          member_name: string
          member_phone?: string | null
          membership_type?: string | null
          points_balance?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          credit_balance?: number | null
          expiry_date?: string | null
          id?: string
          join_date?: string | null
          member_email?: string | null
          member_name?: string
          member_phone?: string | null
          membership_type?: string | null
          points_balance?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_package_services: {
        Row: {
          created_at: string
          id: string
          package_id: string
          service_id: string
          sessions: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          service_id: string
          sessions?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          service_id?: string
          sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_package_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "wellness_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "wellness_services"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_packages: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          total_sessions: number | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          total_sessions?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          total_sessions?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_packages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_services: {
        Row: {
          category: string | null
          commission_rate: number | null
          company_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          commission_rate?: number | null
          company_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          commission_rate?: number | null
          company_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
