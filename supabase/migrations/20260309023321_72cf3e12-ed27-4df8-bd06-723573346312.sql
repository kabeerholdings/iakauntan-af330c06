
-- Retainers table: contracts for advance payments
CREATE TABLE public.retainers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  retainer_number TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  retainer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  currency TEXT DEFAULT 'MYR',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  amount_collected NUMERIC DEFAULT 0,
  amount_applied NUMERIC DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (COALESCE(amount_collected, 0) - COALESCE(amount_applied, 0)) STORED,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Retainer line items
CREATE TABLE public.retainer_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retainer_id UUID NOT NULL REFERENCES public.retainers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_rate NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Retainer payments (advance payments collected)
CREATE TABLE public.retainer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retainer_id UUID NOT NULL REFERENCES public.retainers(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Retainer applications (applying retainer balance to invoices)
CREATE TABLE public.retainer_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retainer_id UUID NOT NULL REFERENCES public.retainers(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retainer_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retainer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retainer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage retainers for their companies" ON public.retainers
  FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage retainer lines" ON public.retainer_lines
  FOR ALL TO authenticated
  USING (retainer_id IN (SELECT id FROM public.retainers WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())))
  WITH CHECK (retainer_id IN (SELECT id FROM public.retainers WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())));

CREATE POLICY "Users can manage retainer payments" ON public.retainer_payments
  FOR ALL TO authenticated
  USING (retainer_id IN (SELECT id FROM public.retainers WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())))
  WITH CHECK (retainer_id IN (SELECT id FROM public.retainers WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())));

CREATE POLICY "Users can manage retainer applications" ON public.retainer_applications
  FOR ALL TO authenticated
  USING (retainer_id IN (SELECT id FROM public.retainers WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())))
  WITH CHECK (retainer_id IN (SELECT id FROM public.retainers WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())));

-- Updated_at trigger
CREATE TRIGGER update_retainers_updated_at BEFORE UPDATE ON public.retainers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
