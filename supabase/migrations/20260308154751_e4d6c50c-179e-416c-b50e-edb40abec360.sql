
-- AI Cloud Backups table
CREATE TABLE IF NOT EXISTS public.cloud_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  backup_name text NOT NULL,
  file_size bigint DEFAULT 0,
  file_url text,
  backup_type text DEFAULT 'manual',
  status text DEFAULT 'healthy',
  health_score numeric DEFAULT 100,
  ransomware_check boolean DEFAULT false,
  ransomware_status text DEFAULT 'clean',
  is_recycled boolean DEFAULT false,
  recycled_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  schedule_type text DEFAULT 'daily',
  is_active boolean DEFAULT true,
  retention_days integer DEFAULT 30,
  max_backups integer DEFAULT 50,
  ai_recycle_enabled boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  field_options jsonb DEFAULT '[]'::jsonb,
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id uuid NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_name text NOT NULL,
  report_type text NOT NULL DEFAULT 'listing',
  module text NOT NULL DEFAULT 'general',
  description text,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.script_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text DEFAULT 'diy',
  module text DEFAULT 'general',
  description text,
  script_code text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.cloud_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cloud backups" ON public.cloud_backups FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = cloud_backups.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own backup schedules" ON public.backup_schedules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = backup_schedules.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own custom fields" ON public.custom_fields FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = custom_fields.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own custom field values" ON public.custom_field_values FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM custom_fields cf JOIN companies c ON c.id = cf.company_id WHERE cf.id = custom_field_values.custom_field_id AND c.owner_id = auth.uid()));

CREATE POLICY "Users can manage own custom reports" ON public.custom_reports FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = custom_reports.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own script customizations" ON public.script_customizations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = script_customizations.company_id AND companies.owner_id = auth.uid()));
