import { useMemo, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Props {
  invoices: any[];
  contacts: any[];
  payments: any[];
  dateFrom: string;
  dateTo: string;
}

const DebtorStatementTab = ({ invoices, contacts, payments, dateFrom, dateTo }: Props) => {
  const customers = useMemo(() => contacts.filter(c => c.type === 'customer' || c.type === 'both'), [contacts]);
  const [selectedContact, setSelectedContact] = useState<string>('all');

  const statementData = useMemo(() => {
    const targetCustomers = selectedContact === 'all' ? customers : customers.filter(c => c.id === selectedContact);

    return targetCustomers.map(customer => {
      const custInvoices = invoices
        .filter(i => i.contact_id === customer.id && i.invoice_type === 'sales' && i.invoice_date >= dateFrom && i.invoice_date <= dateTo)
        .sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));

      const custPayments = payments
        .filter(p => p.contact_id === customer.id && p.payment_date >= dateFrom && p.payment_date <= dateTo)
        .sort((a, b) => (a.payment_date || '').localeCompare(b.payment_date || ''));

      const transactions: { date: string; ref: string; description: string; debit: number; credit: number; balance: number }[] = [];
      let runBal = 0;

      custInvoices.forEach(inv => {
        runBal += +(inv.total_amount || 0);
        transactions.push({ date: inv.invoice_date, ref: inv.invoice_number, description: 'Invoice', debit: +(inv.total_amount || 0), credit: 0, balance: runBal });
      });

      custPayments.forEach(pay => {
        runBal -= +(pay.amount || 0);
        transactions.push({ date: pay.payment_date, ref: pay.reference || 'PMT', description: 'Payment Received', debit: 0, credit: +(pay.amount || 0), balance: runBal });
      });

      transactions.sort((a, b) => a.date.localeCompare(b.date));
      // Recalculate running balance after sort
      let bal = 0;
      transactions.forEach(t => { bal += t.debit - t.credit; t.balance = bal; });

      return { customer, transactions, closingBalance: bal };
    }).filter(d => d.transactions.length > 0);
  }, [invoices, payments, customers, selectedContact, dateFrom, dateTo]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Debtor Statement</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Customer</Label>
            <Select value={selectedContact} onValueChange={setSelectedContact}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {statementData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No debtor transactions in this period</p>
        ) : statementData.map(({ customer, transactions, closingBalance }) => (
          <div key={customer.id} className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">{customer.name}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell className="font-mono text-sm">{t.ref}</TableCell>
                    <TableCell className="text-muted-foreground">{t.description}</TableCell>
                    <TableCell className="text-right font-mono">{t.debit > 0 ? fmt(t.debit) : ''}</TableCell>
                    <TableCell className="text-right font-mono">{t.credit > 0 ? fmt(t.credit) : ''}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{fmt(t.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={5} className="text-right">Closing Balance</TableCell>
                  <TableCell className="text-right font-mono">{fmt(closingBalance)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DebtorStatementTab;
