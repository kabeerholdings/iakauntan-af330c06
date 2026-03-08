
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  type text NOT NULL DEFAULT 'bank_transfer',
  bank_name text,
  account_number text,
  account_id uuid REFERENCES public.chart_of_accounts(id),
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company payment methods"
  ON public.payment_methods FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM companies WHERE companies.id = payment_methods.company_id AND companies.owner_id = auth.uid()
  ));

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
