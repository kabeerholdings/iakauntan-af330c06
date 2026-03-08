
-- E-Commerce / X-Store tables
CREATE TABLE public.marketplace_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  marketplace text NOT NULL, -- shopee, lazada, tiktok, shopify, woocommerce
  store_url text,
  store_id text,
  status text DEFAULT 'active',
  region text DEFAULT 'MY',
  last_sync_at timestamptz,
  credentials jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own marketplace stores" ON public.marketplace_stores FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = marketplace_stores.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id),
  external_product_id text,
  product_name text NOT NULL,
  sku text,
  price numeric DEFAULT 0,
  stock_qty numeric DEFAULT 0,
  status text DEFAULT 'active',
  image_url text,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own marketplace products" ON public.marketplace_products FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = marketplace_products.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  external_order_id text,
  order_number text NOT NULL,
  order_date timestamptz DEFAULT now(),
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_address text,
  subtotal numeric DEFAULT 0,
  shipping_fee numeric DEFAULT 0,
  platform_fee numeric DEFAULT 0,
  commission_fee numeric DEFAULT 0,
  payment_fee numeric DEFAULT 0,
  voucher_discount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  seller_payout numeric DEFAULT 0,
  status text DEFAULT 'pending', -- pending, confirmed, shipping, delivered, completed, cancelled, returned
  payment_status text DEFAULT 'unpaid',
  tracking_number text,
  courier text,
  notes text,
  posted_to_accounting boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own marketplace orders" ON public.marketplace_orders FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = marketplace_orders.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.marketplace_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.marketplace_products(id),
  stock_item_id uuid REFERENCES public.stock_items(id),
  sku text,
  product_name text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own marketplace order lines" ON public.marketplace_order_lines FOR ALL USING (EXISTS (SELECT 1 FROM marketplace_orders mo JOIN companies c ON c.id = mo.company_id WHERE mo.id = marketplace_order_lines.order_id AND c.owner_id = auth.uid()));

-- POS tables
CREATE TABLE public.pos_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  terminal_name text NOT NULL,
  location text,
  warehouse_id uuid REFERENCES public.warehouses(id),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own POS terminals" ON public.pos_terminals FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = pos_terminals.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id uuid NOT NULL REFERENCES public.pos_terminals(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opened_by uuid,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  opening_balance numeric DEFAULT 0,
  closing_balance numeric DEFAULT 0,
  total_sales numeric DEFAULT 0,
  total_refunds numeric DEFAULT 0,
  status text DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own POS sessions" ON public.pos_sessions FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = pos_sessions.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.pos_sessions(id),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_number text NOT NULL,
  transaction_type text DEFAULT 'sale', -- sale, refund, hold
  customer_name text,
  contact_id uuid REFERENCES public.contacts(id),
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  change_amount numeric DEFAULT 0,
  status text DEFAULT 'completed', -- completed, held, voided, refunded
  held_at timestamptz,
  completed_at timestamptz DEFAULT now(),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own POS transactions" ON public.pos_transactions FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = pos_transactions.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.pos_transaction_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id),
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_transaction_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own POS transaction lines" ON public.pos_transaction_lines FOR ALL USING (EXISTS (SELECT 1 FROM pos_transactions pt JOIN companies c ON c.id = pt.company_id WHERE pt.id = pos_transaction_lines.transaction_id AND c.owner_id = auth.uid()));

CREATE TABLE public.pos_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  payment_method text NOT NULL, -- cash, card, ewallet, bank_transfer
  amount numeric NOT NULL DEFAULT 0,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own POS payments" ON public.pos_payments FOR ALL USING (EXISTS (SELECT 1 FROM pos_transactions pt JOIN companies c ON c.id = pt.company_id WHERE pt.id = pos_payments.transaction_id AND c.owner_id = auth.uid()));

-- AI Document Scanner tables
CREATE TABLE public.scanned_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text,
  file_type text,
  scan_status text DEFAULT 'pending', -- pending, processing, completed, failed
  document_type text, -- invoice, receipt, voucher, bill
  extracted_data jsonb DEFAULT '{}',
  supplier_name text,
  document_date date,
  document_number text,
  total_amount numeric,
  tax_amount numeric,
  description text,
  account_code text,
  category text,
  is_processed boolean DEFAULT false,
  processed_entry_id uuid,
  scanned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scanned_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own scanned documents" ON public.scanned_documents FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = scanned_documents.company_id AND companies.owner_id = auth.uid()));

-- Stock Take tables
CREATE TABLE public.stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  take_number text NOT NULL,
  take_date date DEFAULT CURRENT_DATE,
  warehouse_id uuid REFERENCES public.warehouses(id),
  status text DEFAULT 'draft', -- draft, in_progress, completed, synced
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_takes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock takes" ON public.stock_takes FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = stock_takes.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.stock_take_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id uuid NOT NULL REFERENCES public.stock_takes(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id),
  system_qty numeric DEFAULT 0,
  counted_qty numeric DEFAULT 0,
  variance numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  variance_value numeric DEFAULT 0,
  barcode text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_take_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock take lines" ON public.stock_take_lines FOR ALL USING (EXISTS (SELECT 1 FROM stock_takes st JOIN companies c ON c.id = st.company_id WHERE st.id = stock_take_lines.stock_take_id AND c.owner_id = auth.uid()));

-- Wellness POS tables
CREATE TABLE public.wellness_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  duration_minutes integer DEFAULT 60,
  price numeric DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wellness services" ON public.wellness_services FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = wellness_services.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.wellness_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  total_sessions integer DEFAULT 1,
  price numeric DEFAULT 0,
  validity_days integer DEFAULT 365,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wellness packages" ON public.wellness_packages FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = wellness_packages.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.wellness_package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.wellness_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.wellness_services(id),
  sessions integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_package_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own package services" ON public.wellness_package_services FOR ALL USING (EXISTS (SELECT 1 FROM wellness_packages wp JOIN companies c ON c.id = wp.company_id WHERE wp.id = wellness_package_services.package_id AND c.owner_id = auth.uid()));

CREATE TABLE public.wellness_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id),
  member_name text NOT NULL,
  member_phone text,
  member_email text,
  membership_type text DEFAULT 'standard',
  points_balance numeric DEFAULT 0,
  credit_balance numeric DEFAULT 0,
  join_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wellness memberships" ON public.wellness_memberships FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = wellness_memberships.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.wellness_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES public.wellness_memberships(id),
  service_id uuid REFERENCES public.wellness_services(id),
  therapist_id uuid REFERENCES public.employees(id),
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  room_slot text,
  status text DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled, no_show
  price numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wellness appointments" ON public.wellness_appointments FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = wellness_appointments.company_id AND companies.owner_id = auth.uid()));

CREATE TABLE public.wellness_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  appointment_id uuid REFERENCES public.wellness_appointments(id),
  service_name text,
  commission_rate numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  period_month integer,
  period_year integer,
  status text DEFAULT 'pending', -- pending, approved, paid
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wellness commissions" ON public.wellness_commissions FOR ALL USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = wellness_commissions.company_id AND companies.owner_id = auth.uid()));
