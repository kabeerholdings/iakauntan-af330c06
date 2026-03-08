
-- Cash Book Entries (Receipt Voucher / Payment Voucher)
CREATE TABLE public.cash_book_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  voucher_type TEXT NOT NULL DEFAULT 'receipt',
  voucher_no TEXT,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contact_id UUID REFERENCES public.contacts(id),
  payee_name TEXT,
  description TEXT,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  cheque_no TEXT,
  bank_charge NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cash_book_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_book_entry_id UUID NOT NULL REFERENCES public.cash_book_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotations
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id),
  quotation_number TEXT NOT NULL,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  currency TEXT DEFAULT 'MYR',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  converted_invoice_id UUID REFERENCES public.invoices(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  stock_item_id UUID REFERENCES public.stock_items(id),
  account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credit Notes / Debit Notes
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id),
  note_type TEXT NOT NULL DEFAULT 'sales',
  note_number TEXT NOT NULL,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_id UUID REFERENCES public.invoices(id),
  currency TEXT DEFAULT 'MYR',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knock Off Entries
CREATE TABLE public.knock_off_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id),
  knock_off_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  total_applied NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.knock_off_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knock_off_id UUID NOT NULL REFERENCES public.knock_off_entries(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'invoice',
  target_id UUID NOT NULL,
  applied_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.cash_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_book_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knock_off_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knock_off_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cash book entries" ON public.cash_book_entries FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = cash_book_entries.company_id AND companies.owner_id = auth.uid()));
CREATE POLICY "Users can manage own cash book lines" ON public.cash_book_lines FOR ALL USING (EXISTS (SELECT 1 FROM cash_book_entries cbe JOIN companies c ON c.id = cbe.company_id WHERE cbe.id = cash_book_lines.cash_book_entry_id AND c.owner_id = auth.uid()));
CREATE POLICY "Users can manage own quotations" ON public.quotations FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = quotations.company_id AND companies.owner_id = auth.uid()));
CREATE POLICY "Users can manage own quotation lines" ON public.quotation_lines FOR ALL USING (EXISTS (SELECT 1 FROM quotations q JOIN companies c ON c.id = q.company_id WHERE q.id = quotation_lines.quotation_id AND c.owner_id = auth.uid()));
CREATE POLICY "Users can manage own credit notes" ON public.credit_notes FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = credit_notes.company_id AND companies.owner_id = auth.uid()));
CREATE POLICY "Users can manage own credit note lines" ON public.credit_note_lines FOR ALL USING (EXISTS (SELECT 1 FROM credit_notes cn JOIN companies c ON c.id = cn.company_id WHERE cn.id = credit_note_lines.credit_note_id AND c.owner_id = auth.uid()));
CREATE POLICY "Users can manage own knock off entries" ON public.knock_off_entries FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = knock_off_entries.company_id AND companies.owner_id = auth.uid()));
CREATE POLICY "Users can manage own knock off lines" ON public.knock_off_lines FOR ALL USING (EXISTS (SELECT 1 FROM knock_off_entries ko JOIN companies c ON c.id = ko.company_id WHERE ko.id = knock_off_lines.knock_off_id AND c.owner_id = auth.uid()));

-- Update triggers
CREATE TRIGGER update_cash_book_entries_updated_at BEFORE UPDATE ON public.cash_book_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knock_off_entries_updated_at BEFORE UPDATE ON public.knock_off_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
