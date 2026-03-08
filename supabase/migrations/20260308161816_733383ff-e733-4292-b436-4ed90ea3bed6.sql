
-- Salesman Commission tables
CREATE TABLE public.salesman_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  salesman_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  total_sales NUMERIC DEFAULT 0,
  total_collections NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  calculation_basis TEXT DEFAULT 'invoice_date',
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  calculation_basis TEXT DEFAULT 'invoice_date',
  tier_type TEXT DEFAULT 'flat',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.commission_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.commission_rules(id) ON DELETE CASCADE,
  min_amount NUMERIC DEFAULT 0,
  max_amount NUMERIC,
  rate NUMERIC DEFAULT 0,
  flat_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security Lock tables
CREATE TABLE public.security_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lock_type TEXT NOT NULL,
  lock_date DATE,
  is_active BOOLEAN DEFAULT true,
  locked_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document Templates
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'invoice',
  header_html TEXT,
  body_html TEXT,
  footer_html TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1a56db',
  font_family TEXT DEFAULT 'Inter',
  paper_size TEXT DEFAULT 'A4',
  show_logo BOOLEAN DEFAULT true,
  show_payment_info BOOLEAN DEFAULT true,
  show_notes BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Batch messaging log
CREATE TABLE public.batch_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT,
  recipients JSONB DEFAULT '[]'::jsonb,
  entity_type TEXT,
  entity_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.salesman_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own salesman commissions" ON public.salesman_commissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = salesman_commissions.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own commission rules" ON public.commission_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = commission_rules.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own commission tiers" ON public.commission_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM commission_rules cr JOIN companies c ON c.id = cr.company_id WHERE cr.id = commission_tiers.rule_id AND c.owner_id = auth.uid()));

CREATE POLICY "Users can manage own security locks" ON public.security_locks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = security_locks.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own document templates" ON public.document_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = document_templates.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own batch messages" ON public.batch_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = batch_messages.company_id AND companies.owner_id = auth.uid()));
