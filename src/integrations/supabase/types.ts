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
