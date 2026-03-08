
CREATE OR REPLACE FUNCTION public.seed_default_coa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.chart_of_accounts (company_id, code, name, account_type, description) VALUES
    -- Assets
    (NEW.id, '1000', 'Cash and Cash Equivalents', 'asset', 'Petty cash and bank balances'),
    (NEW.id, '1010', 'Cash in Hand', 'asset', 'Physical cash on premises'),
    (NEW.id, '1020', 'Bank - Current Account', 'asset', 'Main operating bank account'),
    (NEW.id, '1030', 'Bank - Savings Account', 'asset', 'Savings or fixed deposit'),
    (NEW.id, '1100', 'Accounts Receivable', 'asset', 'Trade debtors'),
    (NEW.id, '1110', 'Other Receivables', 'asset', 'Non-trade receivables'),
    (NEW.id, '1200', 'Inventory', 'asset', 'Stock / goods for resale'),
    (NEW.id, '1300', 'Prepaid Expenses', 'asset', 'Expenses paid in advance'),
    (NEW.id, '1400', 'GST / SST Input Tax', 'asset', 'Tax credits claimable'),
    (NEW.id, '1500', 'Property, Plant & Equipment', 'asset', 'Fixed assets'),
    (NEW.id, '1510', 'Office Equipment', 'asset', 'Computers, furniture, fittings'),
    (NEW.id, '1520', 'Motor Vehicles', 'asset', 'Company vehicles'),
    (NEW.id, '1530', 'Leasehold Improvements', 'asset', 'Renovations to leased premises'),
    (NEW.id, '1600', 'Accumulated Depreciation', 'asset', 'Contra-asset for depreciation'),
    (NEW.id, '1700', 'Intangible Assets', 'asset', 'Software, patents, goodwill'),

    -- Liabilities
    (NEW.id, '2000', 'Accounts Payable', 'liability', 'Trade creditors'),
    (NEW.id, '2010', 'Other Payables', 'liability', 'Non-trade payables'),
    (NEW.id, '2100', 'Accrued Expenses', 'liability', 'Expenses incurred but not yet paid'),
    (NEW.id, '2200', 'GST / SST Output Tax', 'liability', 'Tax collected payable to RMCD'),
    (NEW.id, '2300', 'EPF Payable', 'liability', 'KWSP contributions payable'),
    (NEW.id, '2310', 'SOCSO Payable', 'liability', 'PERKESO contributions payable'),
    (NEW.id, '2320', 'EIS Payable', 'liability', 'Employment Insurance System payable'),
    (NEW.id, '2330', 'PCB / MTD Payable', 'liability', 'Monthly tax deduction payable to LHDN'),
    (NEW.id, '2400', 'Short-Term Loans', 'liability', 'Bank overdraft / short-term borrowings'),
    (NEW.id, '2500', 'Long-Term Loans', 'liability', 'Term loans, hire purchase'),
    (NEW.id, '2600', 'Unearned Revenue', 'liability', 'Deposits / advances from customers'),

    -- Equity
    (NEW.id, '3000', 'Share Capital', 'equity', 'Paid-up capital'),
    (NEW.id, '3100', 'Retained Earnings', 'equity', 'Accumulated profits / losses'),
    (NEW.id, '3200', 'Owner''s Equity / Drawings', 'equity', 'Capital contributions and withdrawals'),
    (NEW.id, '3300', 'Current Year Earnings', 'equity', 'Net profit for the current period'),

    -- Revenue
    (NEW.id, '4000', 'Sales Revenue', 'revenue', 'Income from goods sold'),
    (NEW.id, '4010', 'Service Revenue', 'revenue', 'Income from services rendered'),
    (NEW.id, '4100', 'Other Income', 'revenue', 'Interest, gain on disposal, etc.'),
    (NEW.id, '4200', 'Discount Received', 'revenue', 'Purchase discounts from suppliers'),

    -- Cost of Sales
    (NEW.id, '5000', 'Cost of Goods Sold', 'expense', 'Direct cost of goods sold'),
    (NEW.id, '5010', 'Direct Labour', 'expense', 'Wages for production staff'),
    (NEW.id, '5020', 'Freight & Delivery', 'expense', 'Shipping and logistics costs'),
    (NEW.id, '5100', 'Purchase Returns', 'expense', 'Returned goods to suppliers'),

    -- Operating Expenses
    (NEW.id, '6000', 'Salaries & Wages', 'expense', 'Staff salaries'),
    (NEW.id, '6010', 'EPF - Employer Contribution', 'expense', 'KWSP employer portion'),
    (NEW.id, '6020', 'SOCSO - Employer Contribution', 'expense', 'PERKESO employer portion'),
    (NEW.id, '6030', 'EIS - Employer Contribution', 'expense', 'EIS employer portion'),
    (NEW.id, '6040', 'HRDF Levy', 'expense', 'Human resource development fund'),
    (NEW.id, '6100', 'Rental Expense', 'expense', 'Office / premises rent'),
    (NEW.id, '6110', 'Utilities', 'expense', 'Electricity, water, internet'),
    (NEW.id, '6120', 'Telephone & Communications', 'expense', 'Phone and data charges'),
    (NEW.id, '6200', 'Office Supplies', 'expense', 'Stationery and consumables'),
    (NEW.id, '6210', 'Printing & Postage', 'expense', 'Printing, courier, stamps'),
    (NEW.id, '6300', 'Professional Fees', 'expense', 'Audit, legal, consulting fees'),
    (NEW.id, '6310', 'Bank Charges', 'expense', 'Service charges and fees'),
    (NEW.id, '6320', 'Insurance', 'expense', 'Business insurance premiums'),
    (NEW.id, '6400', 'Depreciation Expense', 'expense', 'Periodic asset depreciation'),
    (NEW.id, '6500', 'Travel & Entertainment', 'expense', 'Business travel and meals'),
    (NEW.id, '6510', 'Motor Vehicle Expenses', 'expense', 'Fuel, tolls, parking, maintenance'),
    (NEW.id, '6600', 'Marketing & Advertising', 'expense', 'Promotional expenses'),
    (NEW.id, '6700', 'Bad Debts', 'expense', 'Irrecoverable debts written off'),
    (NEW.id, '6800', 'Miscellaneous Expenses', 'expense', 'Other operating expenses'),
    (NEW.id, '6900', 'Discount Given', 'expense', 'Sales discounts to customers'),

    -- Tax
    (NEW.id, '7000', 'Income Tax Expense', 'expense', 'Corporate tax provision (LHDN)'),
    (NEW.id, '7100', 'Zakat Expense', 'expense', 'Business zakat payment');

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_coa();
