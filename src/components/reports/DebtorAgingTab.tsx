import { useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { differenceInDays } from 'date-fns';

interface Props {
  invoices: any[];
  contacts: any[];
  payments: any[];
  asOfDate: string;
}

const DebtorAgingTab = ({ invoices, contacts, payments, asOfDate }: Props) => {
  const asOf = new Date(asOfDate);

  const debtorData = useMemo(() => {
    const salesInvoices = invoices.filter(i => i.invoice_type === 'sales' && i.status !== 'paid' && i.status !== 'cancelled');
    const contactMap = new Map(contacts.filter(c => c.type === 'customer' || c.type === 'both').map(c => [c.id, c]));

    const grouped: Record<string, { name: string; current: number; d30: number; d60: number; d90: number; over90: number; total: number }> = {};

    salesInvoices.forEach(inv => {
      const contactId = inv.contact_id || 'unknown';
      const contact = contactMap.get(contactId);
      const name = contact?.name || (inv as any).contact?.name || 'Unknown';
      if (!grouped[contactId]) grouped[contactId] = { name, current: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 };

      const outstanding = +(inv.total_amount || 0);
      const dueDate = new Date(inv.due_date || inv.invoice_date);
      const daysOverdue = differenceInDays(asOf, dueDate);

      if (daysOverdue <= 0) grouped[contactId].current += outstanding;
      else if (daysOverdue <= 30) grouped[contactId].d30 += outstanding;
      else if (daysOverdue <= 60) grouped[contactId].d60 += outstanding;
      else if (daysOverdue <= 90) grouped[contactId].d90 += outstanding;
      else grouped[contactId].over90 += outstanding;
      grouped[contactId].total += outstanding;
    });

    return Object.values(grouped).filter(g => g.total > 0);
  }, [invoices, contacts, asOfDate]);

  const totals = debtorData.reduce((s, d) => ({
    current: s.current + d.current, d30: s.d30 + d.d30, d60: s.d60 + d.d60, d90: s.d90 + d.d90, over90: s.over90 + d.over90, total: s.total + d.total,
  }), { current: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 });

  const { fmt: fmtCurrency } = useCurrency();
  const fmt = (v: number) => v > 0 ? fmtCurrency(v) : '';

  return (
    <Card>
      <CardHeader><CardTitle>Debtor Aging Report</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61-90 Days</TableHead>
              <TableHead className="text-right">Over 90</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debtorData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No outstanding debtor balances</TableCell></TableRow>
            ) : (
              <>
                {debtorData.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(d.current)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(d.d30)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(d.d60)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(d.d90)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(d.over90)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">RM {d.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.current)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.d30)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.d60)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.d90)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.over90)}</TableCell>
                  <TableCell className="text-right font-mono">RM {totals.total.toFixed(2)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DebtorAgingTab;
