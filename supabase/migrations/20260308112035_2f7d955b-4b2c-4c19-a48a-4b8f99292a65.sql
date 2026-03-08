
CREATE TABLE public.lhdn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  client_id text NOT NULL,
  client_secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.lhdn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company LHDN credentials"
ON public.lhdn_credentials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = lhdn_credentials.company_id
    AND companies.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = lhdn_credentials.company_id
    AND companies.owner_id = auth.uid()
  )
);

CREATE TRIGGER update_lhdn_credentials_updated_at
  BEFORE UPDATE ON public.lhdn_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
