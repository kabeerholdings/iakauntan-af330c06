import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  journalEntries: any[];
  journalLines: any[];
  accounts: any[];
}

const JournalListingTab = ({ journalEntries, journalLines, accounts }: Props) => {
  const { fmt } = useCurrency();
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  return (
    <Card>
      <CardHeader><CardTitle>Journal of Transactions</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {journalEntries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No posted journal entries in this period</p>
        ) : journalEntries.map(je => {
          const lines = journalLines.filter(l => l.journal_entry_id === je.id);
          const totalDebit = lines.reduce((s, l) => s + (+l.debit || 0), 0);
          const totalCredit = lines.reduce((s, l) => s + (+l.credit || 0), 0);
          return (
            <div key={je.id} className="border border-border rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <div>
                  <span className="font-semibold">{je.reference || 'JE'}</span>
                  <span className="text-muted-foreground text-sm ml-3">{je.entry_date}</span>
                </div>
                <span className="text-sm text-muted-foreground">{je.description || ''}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(l => {
                    const acc = accountMap.get(l.account_id);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-sm">{acc ? `${acc.code} - ${acc.name}` : l.account_id}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{l.description || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{+l.debit > 0 ? fmt(+l.debit) : ''}</TableCell>
                        <TableCell className="text-right font-mono">{+l.credit > 0 ? fmt(+l.credit) : ''}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-semibold border-t">
                    <TableCell colSpan={2} className="text-right">Total</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalDebit)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default JournalListingTab;
