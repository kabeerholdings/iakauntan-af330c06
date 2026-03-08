
-- AutoCount API keys storage
CREATE TABLE public.autocount_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  key_id text NOT NULL,
  api_key text NOT NULL,
  account_book_id text NOT NULL,
  endpoint_url text NOT NULL DEFAULT 'https://accounting-api.autocountcloud.com',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.autocount_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company API keys"
ON public.autocount_api_keys FOR ALL TO authenticated
USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE TRIGGER update_autocount_api_keys_updated_at
  BEFORE UPDATE ON public.autocount_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sync log table
CREATE TABLE public.autocount_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  sync_type text NOT NULL,
  direction text NOT NULL DEFAULT 'pull',
  status text DEFAULT 'pending',
  records_processed int DEFAULT 0,
  records_failed int DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.autocount_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company sync logs"
ON public.autocount_sync_log FOR ALL TO authenticated
USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));
