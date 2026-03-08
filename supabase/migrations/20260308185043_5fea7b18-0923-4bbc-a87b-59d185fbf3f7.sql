
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tax_system text DEFAULT 'no_tax',
  ADD COLUMN IF NOT EXISTS fiscal_year_start_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_data_start_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inventory_system text DEFAULT 'perpetual',
  ADD COLUMN IF NOT EXISTS sample_coa text DEFAULT 'blank';
