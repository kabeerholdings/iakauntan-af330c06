import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

interface Props {
  balances: AccountBalance[];
  journalLines: any[];
  accounts: any[];
}

const GeneralLedgerTab = ({ balances, journalLines, accounts }: Props) => {
  const { fmt } = useCurrency();
  return (
  <Card>
    <CardHeader><CardTitle>General Ledger</CardTitle></CardHeader>
    <CardContent className="space-y-6">
      {balances.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No posted entries in this period</p>
      ) : balances.map(acc => {
        const lines = journalLines.filter(l => l.account_id === accounts.find(a => a.code === acc.code)?.id);
        let runBal = 0;
        return (
          <div key={acc.code}>
            <h3 className="font-semibold mb-2">{acc.code} - {acc.name} <span className="text-xs text-muted-foreground capitalize">({acc.account_type})</span></h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(l => {
                  const isDebitNormal = ['asset', 'expense'].includes(acc.account_type);
                  runBal += isDebitNormal ? (+l.debit || 0) - (+l.credit || 0) : (+l.credit || 0) - (+l.debit || 0);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>{l.journal_entries?.entry_date}</TableCell>
                      <TableCell className="text-muted-foreground">{l.description || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{+l.debit > 0 ? fmt(+l.debit) : ''}</TableCell>
                      <TableCell className="text-right font-mono">{+l.credit > 0 ? fmt(+l.credit) : ''}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{fmt(runBal)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </CardContent>
  </Card>
);

export default GeneralLedgerTab;
