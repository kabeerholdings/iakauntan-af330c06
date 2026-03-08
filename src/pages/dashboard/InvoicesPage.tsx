import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Globe } from 'lucide-react';
import { toast } from 'sonner';

const InvoicesPage = () => {
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    invoice_number: '', contact_id: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', invoice_type: 'sales' as string, notes: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [inv, con] = await Promise.all([
      supabase.from('invoices').select('*, contacts(name)').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true),
    ]);
    setInvoices(inv.data || []);
    setContacts(con.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }));

  const updateLine = (idx: number, field: string, value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l) }));
  };

  const handleCreate = async () => {
    if (!selectedCompany || !form.invoice_number) { toast.error('Invoice number required'); return; }
    const subtotal = form.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
    const taxAmt = form.lines.reduce((s, l) => s + (l.quantity * l.unit_price * l.tax_rate / 100), 0);
    const { data: inv, error } = await supabase.from('invoices').insert({
      company_id: selectedCompany.id,
      contact_id: form.contact_id || null,
      invoice_type: form.invoice_type,
      invoice_number: form.invoice_number,
      invoice_date: form.invoice_date,
      due_date: form.due_date || null,
      subtotal, tax_amount: taxAmt, total_amount: subtotal + taxAmt,
      notes: form.notes || null,
    }).select().single();

    if (error) { toast.error(error.message); return; }

    if (inv) {
      await supabase.from('invoice_lines').insert(
        form.lines.map(l => ({
          invoice_id: inv.id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          tax_amount: l.quantity * l.unit_price * l.tax_rate / 100,
          line_total: l.quantity * l.unit_price * (1 + l.tax_rate / 100),
        }))
      );
    }

    toast.success('Invoice created');
    setOpen(false);
    setForm({ invoice_number: '', contact_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', invoice_type: 'sales', notes: '', lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] });
    fetchData();
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { draft: 'secondary', sent: 'default', paid: 'default', overdue: 'destructive', cancelled: 'outline' };
    return (map[s] || 'secondary') as any;
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Invoices</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Create Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Number</Label>
                  <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-001" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.invoice_type} onValueChange={v => setForm(f => ({ ...f, invoice_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Invoice</SelectItem>
                      <SelectItem value="purchase">Purchase Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Contact</Label>
                  <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                    <SelectContent>
                      {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Invoice Date</Label>
                  <Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Line Items</Label>
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                    <Input placeholder="Description" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                    <Input type="number" placeholder="Qty" value={l.quantity} onChange={e => updateLine(i, 'quantity', +e.target.value)} />
                    <Input type="number" placeholder="Unit Price" value={l.unit_price} onChange={e => updateLine(i, 'unit_price', +e.target.value)} />
                    <Input type="number" placeholder="Tax %" value={l.tax_rate} onChange={e => updateLine(i, 'tax_rate', +e.target.value)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <div className="text-lg font-semibold font-display text-foreground">
                  Total: RM {form.lines.reduce((s, l) => s + l.quantity * l.unit_price * (1 + l.tax_rate / 100), 0).toFixed(2)}
                </div>
                <Button onClick={handleCreate}>Create Invoice</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>e-Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No invoices yet</TableCell></TableRow>
              ) : invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.contacts?.name || '—'}</TableCell>
                  <TableCell>{inv.invoice_date}</TableCell>
                  <TableCell>RM {Number(inv.total_amount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                  <TableCell>
                    {inv.einvoice_status ? (
                      <Badge variant={inv.einvoice_status === 'valid' ? 'default' : 'secondary'}>{inv.einvoice_status}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesPage;
