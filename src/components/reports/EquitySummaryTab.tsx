import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/hooks/useCurrency';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

const EquitySummaryTab = ({ balances }: { balances: AccountBalance[] }) => {
  const { fmt } = useCurrency();
  const equity = balances.filter(b => b.account_type === 'equity');
  const revenue = balances.filter(b => b.account_type === 'revenue');
  const expenses = balances.filter(b => b.account_type === 'expense');
  
  const totalEquity = equity.reduce((s, b) => s + b.balance, 0);
  const netIncome = revenue.reduce((s, b) => s + b.balance, 0) - expenses.reduce((s, b) => s + b.balance, 0);
  const totalEquityWithEarnings = totalEquity + netIncome;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {equity.length === 0 && netIncome === 0 ? (
          <p className="text-center text-muted-foreground py-8">No equity accounts with activity in this period</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equity.map(eq => (
                  <TableRow key={eq.id}>
                    <TableCell className="font-mono">{eq.code}</TableCell>
                    <TableCell>{eq.name}</TableCell>
                    <TableCell className="text-right font-mono">{eq.debit_total > 0 ? fmt(eq.debit_total) : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{eq.credit_total > 0 ? fmt(eq.credit_total) : '—'}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{fmt(eq.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell className="font-mono text-muted-foreground">—</TableCell>
                  <TableCell className="italic">Current Year Earnings</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className={`text-right font-mono font-medium ${netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {fmt(netIncome)}
                  </TableCell>
                </TableRow>
                <TableRow className="font-bold border-t-2 bg-muted/50">
                  <TableCell colSpan={4}>Total Equity</TableCell>
                  <TableCell className="text-right font-mono text-lg">{fmt(totalEquityWithEarnings)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Share Capital</p>
                  <p className="text-lg font-bold">{fmt(equity.filter(e => e.code.startsWith('30')).reduce((s, e) => s + e.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Retained Earnings</p>
                  <p className="text-lg font-bold">{fmt(equity.filter(e => e.code.startsWith('31')).reduce((s, e) => s + e.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Current Year Earnings</p>
                  <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(netIncome)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                  <p className="text-lg font-bold">{equity.length}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EquitySummaryTab;
