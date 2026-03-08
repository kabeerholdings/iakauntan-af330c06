
-- SST Tax Codes table
CREATE TABLE public.sst_tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  tax_type TEXT NOT NULL DEFAULT 'sales' CHECK (tax_type IN ('sales', 'service')),
  rate NUMERIC NOT NULL DEFAULT 0,
  tariff_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

ALTER TABLE public.sst_tax_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company SST codes" ON public.sst_tax_codes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = sst_tax_codes.company_id AND companies.owner_id = auth.uid()
  ));

-- SST Returns table
CREATE TABLE public.sst_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  return_period TEXT NOT NULL,
  return_type TEXT NOT NULL DEFAULT 'SST-02',
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  total_sales_tax NUMERIC DEFAULT 0,
  total_service_tax NUMERIC DEFAULT 0,
  total_tax NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sst_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company SST returns" ON public.sst_returns
  FOR ALL USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = sst_returns.company_id AND companies.owner_id = auth.uid()
  ));

-- Recurring Transactions table
CREATE TABLE public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL DEFAULT 'invoice' CHECK (transaction_type IN ('invoice', 'journal_entry', 'payment_voucher')),
  description TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_run_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  auto_post BOOLEAN DEFAULT false,
  template_data JSONB DEFAULT '{}'::jsonb,
  total_generated INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company recurring transactions" ON public.recurring_transactions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = recurring_transactions.company_id AND companies.owner_id = auth.uid()
  ));
