import { useCompany } from '@/contexts/CompanyContext';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';

export const useCurrency = () => {
  const { selectedCompany } = useCompany();
  const currency = selectedCompany?.base_currency || 'MYR';

  const fmt = (amount: number) => formatCurrency(amount, currency);
  const symbol = getCurrencySymbol(currency);

  return { fmt, symbol, currency };
};
