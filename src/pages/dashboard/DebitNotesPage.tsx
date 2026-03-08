import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

const DebitNotesPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    note_number: '', note_date: new Date().toISOString().split('T')[0],
    note_type: 'sales', contact_id: '', invoice_id: '', reason: '',
    lines: [{ description: '', quantity: '1', unit_price: '', tax_rate: '0' }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [n, c, i] = await Promise.all([
      supabase.from('debit_notes').select('*, contacts(name)').eq('company_id', selectedCompany.id).order('note_date', { ascending: false }),
      supabase.from('contacts').select('id, name, type').eq('company_id', selectedCompany.id),
      supabase.from('invoices').select('id, invoice_number').eq('company_id', selectedCompany.id),
    ]);
    setNotes(n.data || []);
    setContacts(c.data || []);
    setInvoices(i.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const fmt = (n: number) => formatCurrency(n, selectedCompany?.base_currency);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: '1', unit_price: '', tax_rate: '0' }] }));
  const updateLine = (i: number, field: string, value: string) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const lineTotal = (l: any) => {
    const qty = +l.quantity || 0;
    const price = +l.unit_price || 0;
    const tax = +l.tax_rate || 0;
    const sub = qty * price;
    return sub + (sub * tax / 100);
  };

  const handleCreate = async () => {
    if (!selectedCompany || !form.note_number) { toast.error('Note number required'); return; }
    const validLines = form.lines.filter(l => l.description && l.unit_price);
    const subtotal = validLines.reduce((s, l) => s + (+l.quantity || 0) * (+l.unit_price || 0), 0);
    const taxAmount = validLines.reduce((s, l) => { const sub = (+l.quantity || 0) * (+l.unit_price || 0); return s + (sub * (+l.tax_rate || 0) / 100); }, 0);

    const { data, error } = await supabase.from('debit_notes').insert({
      company_id: selectedCompany.id, note_number: form.note_number,
      note_date: form.note_date, note_type: form.note_type,
      contact_id: form.contact_id || null, invoice_id: form.invoice_id || null,
      reason: form.reason || null, subtotal, tax_amount: taxAmount,
      total_amount: subtotal + taxAmount, created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    if (data && validLines.length > 0) {
      await supabase.from('debit_note_lines').insert(
        validLines.map(l => ({
          debit_note_id: data.id, description: l.description,
          quantity: +l.quantity || 1, unit_price: +l.unit_price || 0,
          tax_rate: +l.tax_rate || 0,
          tax_amount: (+l.quantity || 0) * (+l.unit_price || 0) * (+l.tax_rate || 0) / 100,
          line_total: lineTotal(l),
        }))
      );
    }
    toast.success('Debit note created');
    setOpen(false);
    setForm({ note_number: '', note_date: new Date().toISOString().split('T')[0], note_type: 'sales', contact_id: '', invoice_id: '', reason: '', lines: [{ description: '', quantity: '1', unit_price: '', tax_rate: '0' }] });
    fetchData();
  };

  const filteredContacts = contacts.filter(c => form.note_type === 'sales' ? c.type === 'customer' : c.type === 'supplier');

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Debit Notes</h1>
            <p className="text-sm text-muted-foreground">Issue debit notes to customers or record supplier debit notes</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Debit Note</Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Note #</TableHead><TableHead>Type</TableHead>
                <TableHead>Contact</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No debit notes</TableCell></TableRow>
              ) : notes.map(n => (
                <TableRow key={n.id}>
                  <TableCell>{n.note_date}</TableCell>
                  <TableCell className="font-mono font-medium">{n.note_number}</TableCell>
                  <TableCell><Badge variant="secondary">{n.note_type === 'sales' ? 'Customer' : 'Supplier'}</Badge></TableCell>
                  <TableCell>{(n as any).contacts?.name || '—'}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(n.total_amount))}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{n.reason || '—'}</TableCell>
                  <TableCell><Badge variant={n.status === 'posted' ? 'default' : 'secondary'}>{n.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">New Debit Note</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Note Number</Label><Input value={form.note_number} onChange={e => setForm(f => ({ ...f, note_number: e.target.value }))} placeholder="DN-001" /></div>
              <div><Label>Date</Label><Input type="date" value={form.note_date} onChange={e => setForm(f => ({ ...f, note_date: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={form.note_type} onValueChange={v => setForm(f => ({ ...f, note_type: v, contact_id: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Customer (Sales)</SelectItem>
                    <SelectItem value="purchase">Supplier (Purchase)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact</Label>
                <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Related Invoice</Label>
                <Select value={form.invoice_id} onValueChange={v => setForm(f => ({ ...f, invoice_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{invoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoice_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Price adjustment, additional charges, etc." /></div>
            <div>
              <Label className="mb-2 block">Line Items</Label>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                  <Input placeholder="Description" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  <Input type="number" placeholder="Qty" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                  <Input type="number" placeholder="Unit Price" value={l.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                  <Input type="number" placeholder="Tax %" value={l.tax_rate} onChange={e => updateLine(i, 'tax_rate', e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div className="text-right text-lg font-bold font-display border-t border-border pt-2">
              Total: {fmt(form.lines.reduce((s, l) => s + lineTotal(l), 0))}
            </div>
            <Button onClick={handleCreate} className="w-full">Create Debit Note</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebitNotesPage;
