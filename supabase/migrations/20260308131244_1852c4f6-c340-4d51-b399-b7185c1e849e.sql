
-- Employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_no TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  ic_no TEXT,
  passport_no TEXT,
  date_of_birth DATE,
  gender TEXT,
  marital_status TEXT DEFAULT 'single',
  nationality TEXT DEFAULT 'Malaysian',
  race TEXT,
  religion TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Malaysia',
  phone TEXT,
  email TEXT,
  
  -- Employment details
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resign_date DATE,
  department TEXT,
  position TEXT,
  employment_type TEXT DEFAULT 'permanent',
  employee_category TEXT DEFAULT 'local',
  is_active BOOLEAN DEFAULT true,
  
  -- Salary
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  
  -- Statutory settings
  epf_no TEXT,
  epf_employee_rate NUMERIC DEFAULT 11,
  epf_employer_rate NUMERIC DEFAULT 13,
  epf_additional_employee NUMERIC DEFAULT 0,
  epf_additional_employer NUMERIC DEFAULT 0,
  socso_no TEXT,
  socso_category TEXT DEFAULT '1',
  eis_contribute BOOLEAN DEFAULT true,
  tax_no TEXT,
  tax_branch TEXT,
  tax_status TEXT DEFAULT 'single',
  tax_resident BOOLEAN DEFAULT true,
  pcb_group TEXT DEFAULT 'KA0',
  zakat_percentage NUMERIC DEFAULT 0,
  hrdf_contribute BOOLEAN DEFAULT true,
  
  -- Bank
  bank_name TEXT,
  bank_account_no TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_no)
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company employees" ON public.employees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = employees.company_id AND companies.owner_id = auth.uid()));

-- Payroll periods
CREATE TABLE public.payroll_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open',
  process_date DATE,
  frequency TEXT DEFAULT 'monthly',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_year, period_month, frequency)
);
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company payroll periods" ON public.payroll_periods FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = payroll_periods.company_id AND companies.owner_id = auth.uid()));

-- Payslips (one per employee per period)
CREATE TABLE public.payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  basic_salary NUMERIC DEFAULT 0,
  gross_pay NUMERIC DEFAULT 0,
  net_pay NUMERIC DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  
  -- Statutory contributions
  epf_employee NUMERIC DEFAULT 0,
  epf_employer NUMERIC DEFAULT 0,
  socso_employee NUMERIC DEFAULT 0,
  socso_employer NUMERIC DEFAULT 0,
  eis_employee NUMERIC DEFAULT 0,
  eis_employer NUMERIC DEFAULT 0,
  pcb_amount NUMERIC DEFAULT 0,
  zakat_amount NUMERIC DEFAULT 0,
  hrdf_amount NUMERIC DEFAULT 0,
  
  -- OT
  ot_hours NUMERIC DEFAULT 0,
  ot_amount NUMERIC DEFAULT 0,
  
  status TEXT DEFAULT 'draft',
  payment_date DATE,
  payment_method TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payroll_period_id, employee_id)
);
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company payslips" ON public.payslips FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM payroll_periods pp JOIN companies c ON c.id = pp.company_id WHERE pp.id = payslips.payroll_period_id AND c.owner_id = auth.uid()));

-- Payslip line items (allowances, deductions, etc.)
CREATE TABLE public.payslip_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payslip_id UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- earning, deduction, overtime, bonus, commission, claim
  code TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC DEFAULT 1,
  rate NUMERIC DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  is_epf_applicable BOOLEAN DEFAULT true,
  is_socso_applicable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payslip_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own payslip items" ON public.payslip_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM payslips ps JOIN payroll_periods pp ON pp.id = ps.payroll_period_id JOIN companies c ON c.id = pp.company_id WHERE ps.id = payslip_items.payslip_id AND c.owner_id = auth.uid()));

-- Leave types
CREATE TABLE public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  default_days NUMERIC DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  is_carry_forward BOOLEAN DEFAULT false,
  max_carry_forward NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company leave types" ON public.leave_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = leave_types.company_id AND companies.owner_id = auth.uid()));

-- Leave entitlements (per employee per year)
CREATE TABLE public.leave_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  entitled_days NUMERIC DEFAULT 0,
  carried_forward NUMERIC DEFAULT 0,
  used_days NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);
ALTER TABLE public.leave_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company leave entitlements" ON public.leave_entitlements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM employees e JOIN companies c ON c.id = e.company_id WHERE e.id = leave_entitlements.employee_id AND c.owner_id = auth.uid()));

-- Leave applications
CREATE TABLE public.leave_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company leave applications" ON public.leave_applications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM employees e JOIN companies c ON c.id = e.company_id WHERE e.id = leave_applications.employee_id AND c.owner_id = auth.uid()));

-- Employee loans
CREATE TABLE public.employee_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL,
  loan_amount NUMERIC NOT NULL DEFAULT 0,
  monthly_deduction NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  outstanding_balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company employee loans" ON public.employee_loans FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM employees e JOIN companies c ON c.id = e.company_id WHERE e.id = employee_loans.employee_id AND c.owner_id = auth.uid()));

-- Payroll allowance/deduction templates
CREATE TABLE public.payroll_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  item_type TEXT NOT NULL, -- earning, deduction
  default_amount NUMERIC DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  is_epf_applicable BOOLEAN DEFAULT true,
  is_socso_applicable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.payroll_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company payroll templates" ON public.payroll_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = payroll_templates.company_id AND companies.owner_id = auth.uid()));

-- Seed default leave types trigger
CREATE OR REPLACE FUNCTION public.seed_default_leave_types()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.leave_types (company_id, code, name, default_days, is_paid, is_carry_forward, max_carry_forward) VALUES
    (NEW.id, 'AL', 'Annual Leave', 14, true, true, 7),
    (NEW.id, 'MC', 'Medical Leave', 14, true, false, 0),
    (NEW.id, 'UL', 'Unpaid Leave', 0, false, false, 0),
    (NEW.id, 'HL', 'Hospitalization Leave', 60, true, false, 0),
    (NEW.id, 'ML', 'Maternity Leave', 98, true, false, 0),
    (NEW.id, 'PL', 'Paternity Leave', 7, true, false, 0),
    (NEW.id, 'CL', 'Compassionate Leave', 3, true, false, 0),
    (NEW.id, 'RL', 'Replacement Leave', 0, true, false, 0),
    (NEW.id, 'SL', 'Study Leave', 0, false, false, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_leave_types_trigger
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_leave_types();
