import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/hooks/useCurrency';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

const LiabilitiesSummaryTab = ({ balances }: { balances: AccountBalance[] }) => {
  const { fmt } = useCurrency();
  const liabilities = balances.filter(b => b.account_type === 'liability');
  const totalLiabilities = liabilities.reduce((s, b) => s + b.balance, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liabilities Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {liabilities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No liability accounts with activity in this period</p>
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
                {liabilities.map(liability => (
                  <TableRow key={liability.id}>
                    <TableCell className="font-mono">{liability.code}</TableCell>
                    <TableCell>{liability.name}</TableCell>
                    <TableCell className="text-right font-mono">{liability.debit_total > 0 ? fmt(liability.debit_total) : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{liability.credit_total > 0 ? fmt(liability.credit_total) : '—'}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{fmt(liability.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2 bg-muted/50">
                  <TableCell colSpan={4}>Total Liabilities</TableCell>
                  <TableCell className="text-right font-mono text-lg">{fmt(totalLiabilities)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Current Liabilities</p>
                  <p className="text-lg font-bold">{fmt(liabilities.filter(l => l.code < '2500').reduce((s, l) => s + l.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Long-Term Liabilities</p>
                  <p className="text-lg font-bold">{fmt(liabilities.filter(l => l.code >= '2500').reduce((s, l) => s + l.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                  <p className="text-lg font-bold">{liabilities.length}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LiabilitiesSummaryTab;
