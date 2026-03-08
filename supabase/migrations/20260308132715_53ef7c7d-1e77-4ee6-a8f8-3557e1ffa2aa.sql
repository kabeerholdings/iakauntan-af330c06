
-- Bill of Materials (BOM / Recipes)
CREATE TABLE public.bill_of_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  bom_code TEXT NOT NULL,
  bom_name TEXT NOT NULL,
  description TEXT,
  output_quantity NUMERIC NOT NULL DEFAULT 1,
  output_uom TEXT DEFAULT 'unit',
  labour_cost NUMERIC DEFAULT 0,
  machine_cost NUMERIC DEFAULT 0,
  overhead_cost NUMERIC DEFAULT 0,
  total_material_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BOM Lines (raw materials/components)
CREATE TABLE public.bom_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id UUID NOT NULL REFERENCES public.bill_of_materials(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  uom TEXT DEFAULT 'unit',
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  wastage_percent NUMERIC DEFAULT 0,
  effective_quantity NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Orders
CREATE TABLE public.job_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  bom_id UUID NOT NULL REFERENCES public.bill_of_materials(id),
  product_id UUID NOT NULL REFERENCES public.stock_items(id),
  planned_quantity NUMERIC NOT NULL DEFAULT 1,
  completed_quantity NUMERIC DEFAULT 0,
  planned_start_date DATE DEFAULT CURRENT_DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'planned',
  sales_order_id UUID REFERENCES public.sales_documents(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  labour_cost NUMERIC DEFAULT 0,
  machine_cost NUMERIC DEFAULT 0,
  overhead_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Order Material Lines
CREATE TABLE public.job_order_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_order_id UUID NOT NULL REFERENCES public.job_orders(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id),
  required_quantity NUMERIC NOT NULL DEFAULT 0,
  issued_quantity NUMERIC DEFAULT 0,
  returned_quantity NUMERIC DEFAULT 0,
  wastage_quantity NUMERIC DEFAULT 0,
  uom TEXT DEFAULT 'unit',
  unit_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assemblies (Assembly/Disassembly)
CREATE TABLE public.assemblies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assembly_number TEXT NOT NULL,
  assembly_type TEXT NOT NULL DEFAULT 'assembly', -- 'assembly' or 'disassembly'
  bom_id UUID REFERENCES public.bill_of_materials(id),
  job_order_id UUID REFERENCES public.job_orders(id),
  product_id UUID NOT NULL REFERENCES public.stock_items(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  assembly_date DATE DEFAULT CURRENT_DATE,
  warehouse_id UUID REFERENCES public.warehouses(id),
  batch_no TEXT,
  expiry_date DATE,
  status TEXT DEFAULT 'draft',
  total_material_cost NUMERIC DEFAULT 0,
  labour_cost NUMERIC DEFAULT 0,
  machine_cost NUMERIC DEFAULT 0,
  overhead_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assembly Lines (materials consumed/produced)
CREATE TABLE public.assembly_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  warehouse_id UUID REFERENCES public.warehouses(id),
  batch_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own company BOMs"
  ON public.bill_of_materials FOR ALL
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = bill_of_materials.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own BOM lines"
  ON public.bom_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM bill_of_materials b JOIN companies c ON c.id = b.company_id WHERE b.id = bom_lines.bom_id AND c.owner_id = auth.uid()));

CREATE POLICY "Users can manage own company job orders"
  ON public.job_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = job_orders.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own job order lines"
  ON public.job_order_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM job_orders j JOIN companies c ON c.id = j.company_id WHERE j.id = job_order_lines.job_order_id AND c.owner_id = auth.uid()));

CREATE POLICY "Users can manage own company assemblies"
  ON public.assemblies FOR ALL
  USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = assemblies.company_id AND companies.owner_id = auth.uid()));

CREATE POLICY "Users can manage own assembly lines"
  ON public.assembly_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM assemblies a JOIN companies c ON c.id = a.company_id WHERE a.id = assembly_lines.assembly_id AND c.owner_id = auth.uid()));
