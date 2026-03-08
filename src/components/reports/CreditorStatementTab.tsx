import { useMemo, useState } from 'react';
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

const CreditorStatementTab = ({ invoices, contacts, payments, dateFrom, dateTo }: Props) => {
  const suppliers = useMemo(() => contacts.filter(c => c.type === 'supplier' || c.type === 'both'), [contacts]);
  const [selectedContact, setSelectedContact] = useState<string>('all');

  const statementData = useMemo(() => {
    const targetSuppliers = selectedContact === 'all' ? suppliers : suppliers.filter(c => c.id === selectedContact);

    return targetSuppliers.map(supplier => {
      const suppInvoices = invoices
        .filter(i => i.contact_id === supplier.id && i.invoice_type === 'purchase' && i.invoice_date >= dateFrom && i.invoice_date <= dateTo)
        .sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));

      const suppPayments = payments
        .filter(p => p.contact_id === supplier.id && p.payment_date >= dateFrom && p.payment_date <= dateTo)
        .sort((a, b) => (a.payment_date || '').localeCompare(b.payment_date || ''));

      const transactions: { date: string; ref: string; description: string; debit: number; credit: number; balance: number }[] = [];

      suppInvoices.forEach(inv => {
        transactions.push({ date: inv.invoice_date, ref: inv.invoice_number, description: 'Purchase Invoice', debit: 0, credit: +(inv.total_amount || 0), balance: 0 });
      });

      suppPayments.forEach(pay => {
        transactions.push({ date: pay.payment_date, ref: pay.reference || 'PMT', description: 'Payment Made', debit: +(pay.amount || 0), credit: 0, balance: 0 });
      });

      transactions.sort((a, b) => a.date.localeCompare(b.date));
      let bal = 0;
      transactions.forEach(t => { bal += t.credit - t.debit; t.balance = bal; });

      return { supplier, transactions, closingBalance: bal };
    }).filter(d => d.transactions.length > 0);
  }, [invoices, payments, suppliers, selectedContact, dateFrom, dateTo]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Creditor Statement</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Supplier</Label>
            <Select value={selectedContact} onValueChange={setSelectedContact}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {statementData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No creditor transactions in this period</p>
        ) : statementData.map(({ supplier, transactions, closingBalance }) => (
          <div key={supplier.id} className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">{supplier.name}</h3>
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
                    <TableCell className="text-right font-mono">{t.debit > 0 ? `RM ${t.debit.toFixed(2)}` : ''}</TableCell>
                    <TableCell className="text-right font-mono">{t.credit > 0 ? `RM ${t.credit.toFixed(2)}` : ''}</TableCell>
                    <TableCell className="text-right font-mono font-medium">RM {t.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={5} className="text-right">Closing Balance</TableCell>
                  <TableCell className="text-right font-mono">RM {closingBalance.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CreditorStatementTab;
