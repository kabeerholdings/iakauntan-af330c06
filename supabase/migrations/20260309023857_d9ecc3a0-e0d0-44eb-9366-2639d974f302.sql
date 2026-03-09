
-- Proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  proposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT,
  description TEXT,
  cover_letter TEXT,
  currency TEXT DEFAULT 'MYR',
  subtotal NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  terms_and_conditions TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  converted_to_invoice_id UUID REFERENCES public.invoices(id),
  public_token UUID DEFAULT gen_random_uuid(),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Proposal line items
CREATE TABLE public.proposal_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_rate NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Proposal sections (for rich content blocks)
CREATE TABLE public.proposal_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL DEFAULT 'text',
  title TEXT,
  content TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage proposals for their companies" ON public.proposals
  FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage proposal lines" ON public.proposal_lines
  FOR ALL TO authenticated
  USING (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())))
  WITH CHECK (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())));

CREATE POLICY "Users can manage proposal sections" ON public.proposal_sections
  FOR ALL TO authenticated
  USING (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())))
  WITH CHECK (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())));

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
