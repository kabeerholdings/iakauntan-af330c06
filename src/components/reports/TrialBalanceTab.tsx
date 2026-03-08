import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/hooks/useCurrency';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

const TrialBalanceTab = ({ balances }: { balances: AccountBalance[] }) => {
  const { fmt } = useCurrency();
  const totalDebit = balances.reduce((s, b) => s + b.debit_total, 0);
  const totalCredit = balances.reduce((s, b) => s + b.credit_total, 0);

  return (
    <Card>
      <CardHeader><CardTitle>Trial Balance</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No posted entries in this period</TableCell></TableRow>
            ) : (
              <>
                {balances.map(b => (
                  <TableRow key={b.code}>
                    <TableCell className="font-mono">{b.code}</TableCell>
                    <TableCell>{b.name}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{b.account_type}</TableCell>
                    <TableCell className="text-right font-mono">{b.debit_total > 0 ? `RM ${b.debit_total.toFixed(2)}` : ''}</TableCell>
                    <TableCell className="text-right font-mono">{b.credit_total > 0 ? `RM ${b.credit_total.toFixed(2)}` : ''}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right font-mono">RM {totalDebit.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">RM {totalCredit.toFixed(2)}</TableCell>
                </TableRow>
                {Math.abs(totalDebit - totalCredit) > 0.01 && (
                  <TableRow><TableCell colSpan={5} className="text-destructive text-center font-medium">⚠ Out of balance by RM {Math.abs(totalDebit - totalCredit).toFixed(2)}</TableCell></TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TrialBalanceTab;
