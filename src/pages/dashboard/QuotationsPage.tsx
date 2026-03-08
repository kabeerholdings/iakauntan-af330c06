import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = { draft: 'secondary', sent: 'default', accepted: 'default', rejected: 'destructive', expired: 'secondary', converted: 'outline' };

const QuotationsPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    quotation_number: '', quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '', contact_id: '', notes: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [q, c] = await Promise.all([
      supabase.from('quotations').select('*, contacts(name), quotation_lines(*)').eq('company_id', selectedCompany.id).order('quotation_date', { ascending: false }),
      supabase.from('contacts').select('id, name').eq('company_id', selectedCompany.id).eq('type', 'customer').eq('is_active', true),
    ]);
    setQuotations(q.data || []);
    setContacts(c.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const calcLine = (l: any) => {
    const sub = (+l.quantity || 0) * (+l.unit_price || 0);
    const tax = sub * (+l.tax_rate || 0) / 100;
    return { sub, tax, total: sub + tax };
  };

  const subtotal = form.lines.reduce((s, l) => s + calcLine(l).sub, 0);
  const taxTotal = form.lines.reduce((s, l) => s + calcLine(l).tax, 0);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const handleCreate = async () => {
    if (!selectedCompany || !form.quotation_number) { toast.error('Quotation number required'); return; }
    const { data, error } = await supabase.from('quotations').insert({
      company_id: selectedCompany.id, quotation_number: form.quotation_number,
      quotation_date: form.quotation_date, valid_until: form.valid_until || null,
      contact_id: form.contact_id || null, notes: form.notes || null,
      subtotal, tax_amount: taxTotal, total_amount: subtotal + taxTotal,
      created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await supabase.from('quotation_lines').insert(
        form.lines.filter(l => l.description).map(l => ({
          quotation_id: data.id, description: l.description,
          quantity: +l.quantity || 1, unit_price: +l.unit_price || 0,
          tax_rate: +l.tax_rate || 0, tax_amount: calcLine(l).tax, line_total: calcLine(l).total,
        }))
      );
    }
    toast.success('Quotation created');
    setOpen(false);
    setForm({ quotation_number: '', quotation_date: new Date().toISOString().split('T')[0], valid_until: '', contact_id: '', notes: '', lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] });
    fetchData();
  };

  const convertToInvoice = async (q: any) => {
    if (!selectedCompany) return;
    const { data: inv, error } = await supabase.from('invoices').insert({
      company_id: selectedCompany.id, invoice_number: `INV-${q.quotation_number}`,
      invoice_type: 'standard', contact_id: q.contact_id, invoice_date: new Date().toISOString().split('T')[0],
      subtotal: q.subtotal, tax_amount: q.tax_amount, total_amount: q.total_amount,
      notes: q.notes, currency: q.currency,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (inv && q.quotation_lines?.length) {
      await supabase.from('invoice_lines').insert(
        q.quotation_lines.map((l: any) => ({
          invoice_id: inv.id, description: l.description, quantity: l.quantity,
          unit_price: l.unit_price, tax_rate: l.tax_rate, tax_amount: l.tax_amount, line_total: l.line_total,
        }))
      );
    }
    await supabase.from('quotations').update({ status: 'converted', converted_invoice_id: inv?.id }).eq('id', q.id);
    toast.success('Converted to Invoice');
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Quotations</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Quotation</Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No quotations yet</TableCell></TableRow>
              ) : quotations.map(q => (
                <TableRow key={q.id}>
                  <TableCell>{q.quotation_date}</TableCell>
                  <TableCell className="font-mono font-medium">{q.quotation_number}</TableCell>
                  <TableCell>{q.contacts?.name || '—'}</TableCell>
                  <TableCell>{q.valid_until || '—'}</TableCell>
                  <TableCell className="text-right font-medium">RM {(+q.total_amount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={(statusColors[q.status] || 'secondary') as any}>{q.status}</Badge></TableCell>
                  <TableCell>
                    {(q.status === 'accepted' || q.status === 'draft' || q.status === 'sent') && (
                      <Button variant="ghost" size="sm" onClick={() => convertToInvoice(q)}>
                        <FileText className="h-3 w-3 mr-1" />Convert
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Create Quotation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Quotation No.</Label><Input value={form.quotation_number} onChange={e => setForm(f => ({ ...f, quotation_number: e.target.value }))} placeholder="QT-001" /></div>
              <div>
                <Label>Customer</Label>
                <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={form.quotation_date} onChange={e => setForm(f => ({ ...f, quotation_date: e.target.value }))} /></div>
              <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="mb-2 block">Line Items</Label>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                  <Input placeholder="Description" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  <Input type="number" placeholder="Qty" value={l.quantity || ''} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                  <Input type="number" placeholder="Unit Price" value={l.unit_price || ''} onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                  <Input type="number" placeholder="Tax %" value={l.tax_rate || ''} onChange={e => updateLine(i, 'tax_rate', e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div className="text-sm space-x-4">
                <span>Subtotal: <strong>RM {subtotal.toFixed(2)}</strong></span>
                <span>Tax: <strong>RM {taxTotal.toFixed(2)}</strong></span>
                <span>Total: <strong>RM {(subtotal + taxTotal).toFixed(2)}</strong></span>
              </div>
              <Button onClick={handleCreate}>Create Quotation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotationsPage;
