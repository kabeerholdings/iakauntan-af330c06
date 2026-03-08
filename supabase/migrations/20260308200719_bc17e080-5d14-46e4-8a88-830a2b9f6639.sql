
-- Fixed Asset Types
CREATE TABLE public.fixed_asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  useful_life_years INTEGER NOT NULL DEFAULT 5,
  depreciation_rate NUMERIC DEFAULT 20,
  asset_account_id UUID REFERENCES public.chart_of_accounts(id),
  depreciation_account_id UUID REFERENCES public.chart_of_accounts(id),
  accumulated_dep_account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fixed Assets Register
CREATE TABLE public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  asset_type_id UUID REFERENCES public.fixed_asset_types(id),
  asset_code TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  description TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purchase_cost NUMERIC NOT NULL DEFAULT 0,
  residual_value NUMERIC DEFAULT 0,
  useful_life_years INTEGER DEFAULT 5,
  depreciation_method TEXT DEFAULT 'straight_line',
  accumulated_depreciation NUMERIC DEFAULT 0,
  net_book_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  disposal_date DATE,
  disposal_amount NUMERIC,
  disposal_gain_loss NUMERIC,
  location TEXT,
  serial_number TEXT,
  supplier_id UUID REFERENCES public.contacts(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Depreciation Entries
CREATE TABLE public.depreciation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.fixed_assets(id) ON DELETE CASCADE NOT NULL,
  depreciation_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  accumulated_total NUMERIC DEFAULT 0,
  net_book_value NUMERIC DEFAULT 0,
  period_label TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Terms
CREATE TABLE public.payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Debit Notes
CREATE TABLE public.debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  note_number TEXT NOT NULL,
  note_date DATE DEFAULT CURRENT_DATE,
  note_type TEXT DEFAULT 'sales',
  invoice_id UUID REFERENCES public.invoices(id),
  reason TEXT,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  currency TEXT DEFAULT 'MYR',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.debit_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_id UUID REFERENCES public.debit_notes(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Opening Balances table
CREATE TABLE public.opening_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE NOT NULL,
  balance_date DATE NOT NULL,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, account_id, balance_date)
);

-- RLS
ALTER TABLE public.fixed_asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies via company ownership
CREATE POLICY "Users can manage fixed_asset_types" ON public.fixed_asset_types FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage fixed_assets" ON public.fixed_assets FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage depreciation_entries" ON public.depreciation_entries FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage payment_terms" ON public.payment_terms FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage debit_notes" ON public.debit_notes FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage debit_note_lines" ON public.debit_note_lines FOR ALL TO authenticated
  USING (debit_note_id IN (SELECT id FROM public.debit_notes WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())));
CREATE POLICY "Users can manage opening_balances" ON public.opening_balances FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_fixed_asset_types_updated_at BEFORE UPDATE ON public.fixed_asset_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fixed_assets_updated_at BEFORE UPDATE ON public.fixed_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debit_notes_updated_at BEFORE UPDATE ON public.debit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opening_balances_updated_at BEFORE UPDATE ON public.opening_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
