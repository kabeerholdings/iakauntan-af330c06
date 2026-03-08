import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

const renderSection = (title: string, items: AccountBalance[]) => (
  <div className="mb-4">
    <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">{title}</h3>
    {items.map(b => (
      <div key={b.code} className="flex justify-between py-1 px-2 hover:bg-muted/50 rounded text-sm">
        <span>{b.code} - {b.name}</span>
        <span className="font-mono">RM {Math.abs(b.balance).toFixed(2)}</span>
      </div>
    ))}
  </div>
);

const ProfitLossTab = ({ balances }: { balances: AccountBalance[] }) => {
  const revenue = balances.filter(b => b.account_type === 'revenue');
  const expenses = balances.filter(b => b.account_type === 'expense');
  const totalRevenue = revenue.reduce((s, b) => s + b.balance, 0);
  const totalExpenses = expenses.reduce((s, b) => s + b.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  return (
    <Card>
      <CardHeader><CardTitle>Profit & Loss Statement</CardTitle></CardHeader>
      <CardContent>
        {renderSection('Revenue', revenue)}
        <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
          <span>Total Revenue</span><span className="font-mono">RM {totalRevenue.toFixed(2)}</span>
        </div>
        {renderSection('Expenses', expenses)}
        <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
          <span>Total Expenses</span><span className="font-mono">RM {totalExpenses.toFixed(2)}</span>
        </div>
        <div className={`flex justify-between py-3 px-2 font-bold text-lg border-t-2 border-border mt-4 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <span>Net {netIncome >= 0 ? 'Profit' : 'Loss'}</span>
          <span className="font-mono">RM {Math.abs(netIncome).toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossTab;
