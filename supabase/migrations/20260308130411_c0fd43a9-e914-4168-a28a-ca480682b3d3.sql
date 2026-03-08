
-- Stock categories
CREATE TABLE public.stock_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.stock_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company stock categories" ON public.stock_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = stock_categories.company_id AND companies.owner_id = auth.uid()));

-- Warehouses
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company warehouses" ON public.warehouses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = warehouses.company_id AND companies.owner_id = auth.uid()));

-- Stock items (products/inventory)
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.stock_categories(id),
  base_uom TEXT NOT NULL DEFAULT 'unit',
  purchase_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  min_price NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 0,
  reorder_qty NUMERIC DEFAULT 0,
  costing_method TEXT DEFAULT 'weighted_avg',
  is_active BOOLEAN DEFAULT true,
  barcode TEXT,
  tax_rate NUMERIC DEFAULT 0,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  purchase_account_id UUID REFERENCES public.chart_of_accounts(id),
  sales_account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company stock items" ON public.stock_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = stock_items.company_id AND companies.owner_id = auth.uid()));

-- Stock UOM conversions
CREATE TABLE public.stock_uom (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  uom TEXT NOT NULL,
  conversion_rate NUMERIC NOT NULL DEFAULT 1,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_uom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock uom" ON public.stock_uom FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stock_items si JOIN companies c ON c.id = si.company_id WHERE si.id = stock_uom.stock_item_id AND c.owner_id = auth.uid()));

-- Stock balance per warehouse
CREATE TABLE public.stock_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  avg_cost NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stock_item_id, warehouse_id)
);
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock balances" ON public.stock_balances FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stock_items si JOIN companies c ON c.id = si.company_id WHERE si.id = stock_balances.stock_item_id AND c.owner_id = auth.uid()));

-- Stock adjustments
CREATE TABLE public.stock_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company stock adjustments" ON public.stock_adjustments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = stock_adjustments.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.stock_adjustment_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_id UUID NOT NULL REFERENCES public.stock_adjustments(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_adjustment_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock adjustment lines" ON public.stock_adjustment_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stock_adjustments sa JOIN companies c ON c.id = sa.company_id WHERE sa.id = stock_adjustment_lines.adjustment_id AND c.owner_id = auth.uid()));

-- Stock transfers between warehouses
CREATE TABLE public.stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  reference TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company stock transfers" ON public.stock_transfers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = stock_transfers.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.stock_transfer_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_transfer_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock transfer lines" ON public.stock_transfer_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stock_transfers st JOIN companies c ON c.id = st.company_id WHERE st.id = stock_transfer_lines.transfer_id AND c.owner_id = auth.uid()));

-- Sales documents: quotations, sales orders, delivery orders, credit notes, debit notes
CREATE TABLE public.sales_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- quotation, sales_order, delivery_order, credit_note, debit_note
  doc_number TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  reference TEXT,
  currency TEXT DEFAULT 'MYR',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  linked_doc_id UUID REFERENCES public.sales_documents(id),
  project TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company sales documents" ON public.sales_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = sales_documents.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.sales_document_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.sales_documents(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id),
  account_id UUID REFERENCES public.chart_of_accounts(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  uom TEXT DEFAULT 'unit',
  unit_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  warehouse_id UUID REFERENCES public.warehouses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_document_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sales document lines" ON public.sales_document_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sales_documents sd JOIN companies c ON c.id = sd.company_id WHERE sd.id = sales_document_lines.document_id AND c.owner_id = auth.uid()));

-- Purchase documents: purchase orders, purchase invoices, goods received
CREATE TABLE public.purchase_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- purchase_order, goods_received, purchase_return
  doc_number TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id),
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  reference TEXT,
  currency TEXT DEFAULT 'MYR',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  linked_doc_id UUID REFERENCES public.purchase_documents(id),
  project TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company purchase documents" ON public.purchase_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = purchase_documents.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.purchase_document_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.purchase_documents(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id),
  account_id UUID REFERENCES public.chart_of_accounts(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  uom TEXT DEFAULT 'unit',
  unit_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  warehouse_id UUID REFERENCES public.warehouses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_document_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own purchase document lines" ON public.purchase_document_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_documents pd JOIN companies c ON c.id = pd.company_id WHERE pd.id = purchase_document_lines.document_id AND c.owner_id = auth.uid()));

-- Customer/Supplier payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL, -- receipt, payment
  contact_id UUID REFERENCES public.contacts(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  payment_method TEXT DEFAULT 'cash',
  bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'MYR',
  exchange_rate NUMERIC DEFAULT 1,
  cheque_no TEXT,
  cheque_date DATE,
  is_post_dated BOOLEAN DEFAULT false,
  is_bounced BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  project TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company payments" ON public.payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = payments.company_id AND companies.owner_id = auth.uid()));

-- Payment knock-off lines (which invoices a payment settles)
CREATE TABLE public.payment_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  sales_doc_id UUID REFERENCES public.sales_documents(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own payment allocations" ON public.payment_allocations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM payments p JOIN companies c ON c.id = p.company_id WHERE p.id = payment_allocations.payment_id AND c.owner_id = auth.uid()));

-- Enhance contacts table with credit control fields
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS credit_terms INTEGER DEFAULT 30;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS overdue_limit NUMERIC DEFAULT 0;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS bank_account_no TEXT;

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company projects" ON public.projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = projects.company_id AND companies.owner_id = auth.uid()));

-- Currency exchange rates
CREATE TABLE public.currency_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, currency_code, effective_date)
);
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company currency rates" ON public.currency_rates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = currency_rates.company_id AND companies.owner_id = auth.uid()));
