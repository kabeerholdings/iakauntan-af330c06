import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

const BalanceSheetTab = ({ balances }: { balances: AccountBalance[] }) => {
  const { fmt } = useCurrency();

  const renderSection = (title: string, items: AccountBalance[]) => (
    <div className="mb-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">{title}</h3>
      {items.map(b => (
        <div key={b.code} className="flex justify-between py-1 px-2 hover:bg-muted/50 rounded text-sm">
          <span>{b.code} - {b.name}</span>
          <span className="font-mono">{fmt(Math.abs(b.balance))}</span>
        </div>
      ))}
    </div>
  );

  const revenue = balances.filter(b => b.account_type === 'revenue');
  const expenses = balances.filter(b => b.account_type === 'expense');
  const netIncome = revenue.reduce((s, b) => s + b.balance, 0) - expenses.reduce((s, b) => s + b.balance, 0);

  const assets = balances.filter(b => b.account_type === 'asset');
  const liabilities = balances.filter(b => b.account_type === 'liability');
  const equity = balances.filter(b => b.account_type === 'equity');
  const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
  const totalLiabilities = liabilities.reduce((s, b) => s + b.balance, 0);
  const totalEquity = equity.reduce((s, b) => s + b.balance, 0) + netIncome;

  return (
    <Card>
      <CardHeader><CardTitle>Balance Sheet</CardTitle></CardHeader>
      <CardContent>
        {renderSection('Assets', assets)}
        <div className="flex justify-between py-2 px-2 font-semibold border-t border-border mb-4">
          <span>Total Assets</span><span className="font-mono">{fmt(totalAssets)}</span>
        </div>
        {renderSection('Liabilities', liabilities)}
        <div className="flex justify-between py-2 px-2 font-semibold border-t border-border mb-4">
          <span>Total Liabilities</span><span className="font-mono">{fmt(totalLiabilities)}</span>
        </div>
        {renderSection('Equity', equity)}
        <div className="flex justify-between py-1 px-2 text-sm">
          <span className="italic">Current Year Earnings</span><span className="font-mono">{fmt(netIncome)}</span>
        </div>
        <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
          <span>Total Equity</span><span className="font-mono">{fmt(totalEquity)}</span>
        </div>
        <div className="flex justify-between py-3 px-2 font-bold text-lg border-t-2 border-border mt-4">
          <span>Total Liabilities & Equity</span><span className="font-mono">{fmt(totalLiabilities + totalEquity)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceSheetTab;
