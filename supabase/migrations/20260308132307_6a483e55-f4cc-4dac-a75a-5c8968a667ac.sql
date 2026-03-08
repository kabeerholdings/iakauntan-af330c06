
-- Bank reconciliation tables
CREATE TABLE public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  statement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  description TEXT,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  is_reconciled BOOLEAN DEFAULT false,
  matched_payment_id UUID REFERENCES public.payments(id),
  matched_journal_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company bank statements"
  ON public.bank_statements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = bank_statements.company_id AND companies.owner_id = auth.uid()
  ));

-- Document attachments table
CREATE TABLE public.document_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'invoice', 'expense', 'sales_document', 'purchase_document', 'payment', 'journal_entry'
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company attachments"
  ON public.document_attachments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = document_attachments.company_id AND companies.owner_id = auth.uid()
  ));
