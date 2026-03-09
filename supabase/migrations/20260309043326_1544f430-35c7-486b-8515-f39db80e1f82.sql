
-- CRM Deal Stages (customizable pipeline)
CREATE TABLE public.crm_deal_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_deal_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company deal stages"
  ON public.crm_deal_stages FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- CRM Deals
CREATE TABLE public.crm_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'MYR',
  stage_id UUID REFERENCES public.crm_deal_stages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost')),
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  assigned_to UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company deals"
  ON public.crm_deals FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CRM Activities (calls, meetings, notes, emails, tasks)
CREATE TABLE public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL DEFAULT 'note' CHECK (activity_type IN ('call','meeting','note','email','task')),
  subject TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INT,
  is_completed BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company activities"
  ON public.crm_activities FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- Seed default pipeline stages when a company is created
CREATE OR REPLACE FUNCTION public.seed_default_crm_stages()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.crm_deal_stages (company_id, name, color, sort_order, is_default) VALUES
    (NEW.id, 'Lead', '#6366f1', 0, true),
    (NEW.id, 'Qualified', '#f59e0b', 1, false),
    (NEW.id, 'Proposal', '#3b82f6', 2, false),
    (NEW.id, 'Negotiation', '#8b5cf6', 3, false),
    (NEW.id, 'Won', '#22c55e', 4, false),
    (NEW.id, 'Lost', '#ef4444', 5, false);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER seed_crm_stages_on_company
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_crm_stages();
