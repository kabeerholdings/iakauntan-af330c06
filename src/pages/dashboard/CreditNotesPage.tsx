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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import DocumentPrintPreview from '@/components/DocumentPrintPreview';

const CreditNotesPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [noteType, setNoteType] = useState<'sales' | 'purchase'>('sales');
  const [printPreview, setPrintPreview] = useState<{ note: any; template: any } | null>(null);
  const [form, setForm] = useState({
    note_number: '', note_date: new Date().toISOString().split('T')[0],
    contact_id: '', invoice_id: '', reason: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [n, c, inv, tpl] = await Promise.all([
      supabase.from('credit_notes').select('*, contacts(name), credit_note_lines(*)').eq('company_id', selectedCompany.id).order('note_date', { ascending: false }),
      supabase.from('contacts').select('id, name, type').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('invoices').select('id, invoice_number, contact_id').eq('company_id', selectedCompany.id),
      supabase.from('document_templates').select('*').eq('company_id', selectedCompany.id).in('template_type', ['invoice', 'credit_note']),
    ]);
    setNotes(n.data || []);
    setContacts(c.data || []);
    setInvoices(inv.data || []);
    setTemplates(tpl.data || []);
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

  const openNew = (type: 'sales' | 'purchase') => {
    setNoteType(type);
    setForm({ note_number: '', note_date: new Date().toISOString().split('T')[0], contact_id: '', invoice_id: '', reason: '', lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] });
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedCompany || !form.note_number) { toast.error('Note number required'); return; }
    const { data, error } = await supabase.from('credit_notes').insert({
      company_id: selectedCompany.id, note_type: noteType, note_number: form.note_number,
      note_date: form.note_date, contact_id: form.contact_id || null,
      invoice_id: form.invoice_id || null, reason: form.reason || null,
      subtotal, tax_amount: taxTotal, total_amount: subtotal + taxTotal,
      created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await supabase.from('credit_note_lines').insert(
        form.lines.filter(l => l.description).map(l => ({
          credit_note_id: data.id, description: l.description,
          quantity: +l.quantity || 1, unit_price: +l.unit_price || 0,
          tax_rate: +l.tax_rate || 0, tax_amount: calcLine(l).tax, line_total: calcLine(l).total,
        }))
      );
    }
    toast.success(`${noteType === 'sales' ? 'Credit' : 'Debit'} Note created`);
    setOpen(false);
    fetchData();
  };

  const handlePrintPreview = async (n: any) => {
    const { data: lines } = await supabase.from('credit_note_lines').select('*').eq('credit_note_id', n.id);
    const defaultTpl = templates.find(t => t.is_default) || templates[0] || null;
    setPrintPreview({ note: { ...n, lines: lines || [] }, template: defaultTpl });
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const salesNotes = notes.filter(n => n.note_type === 'sales');
  const purchaseNotes = notes.filter(n => n.note_type === 'purchase');

  const renderTable = (data: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>No.</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No notes yet</TableCell></TableRow>
        ) : data.map(n => (
          <TableRow key={n.id}>
            <TableCell>{n.note_date}</TableCell>
            <TableCell className="font-mono font-medium">{n.note_number}</TableCell>
            <TableCell><Badge variant={n.note_type === 'sales' ? 'default' : 'secondary'}>{n.note_type === 'sales' ? 'Credit Note' : 'Debit Note'}</Badge></TableCell>
            <TableCell>{n.contacts?.name || '—'}</TableCell>
            <TableCell className="text-muted-foreground">{n.reason || '—'}</TableCell>
            <TableCell className="text-right font-medium">RM {(+n.total_amount).toFixed(2)}</TableCell>
            <TableCell><Badge variant={n.status === 'void' ? 'destructive' : n.status === 'posted' ? 'default' : 'secondary'}>{n.status}</Badge></TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={() => handlePrintPreview(n)}>
                <Eye className="h-3 w-3 mr-1" />Preview
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Credit & Debit Notes</h1>
        <div className="flex gap-2">
          <Button onClick={() => openNew('sales')}><Plus className="h-4 w-4 mr-2" />Credit Note</Button>
          <Button onClick={() => openNew('purchase')} variant="outline"><Plus className="h-4 w-4 mr-2" />Debit Note</Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="all">All ({notes.length})</TabsTrigger>
                <TabsTrigger value="sales">Credit Notes ({salesNotes.length})</TabsTrigger>
                <TabsTrigger value="purchase">Debit Notes ({purchaseNotes.length})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="all">{renderTable(notes)}</TabsContent>
            <TabsContent value="sales">{renderTable(salesNotes)}</TabsContent>
            <TabsContent value="purchase">{renderTable(purchaseNotes)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{noteType === 'sales' ? 'New Credit Note' : 'New Debit Note'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Note No.</Label><Input value={form.note_number} onChange={e => setForm(f => ({ ...f, note_number: e.target.value }))} placeholder="CN-001" /></div>
              <div><Label>Date</Label><Input type="date" value={form.note_date} onChange={e => setForm(f => ({ ...f, note_date: e.target.value }))} /></div>
              <div>
                <Label>Contact</Label>
                <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {contacts.filter(c => noteType === 'sales' ? c.type === 'customer' : c.type === 'supplier').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Against Invoice</Label>
                <Select value={form.invoice_id} onValueChange={v => setForm(f => ({ ...f, invoice_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{invoices.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Damaged goods, etc." /></div>
            </div>
            <div>
              <Label className="mb-2 block">Lines</Label>
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
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div className="text-sm space-x-4">
                <span>Subtotal: <strong>RM {subtotal.toFixed(2)}</strong></span>
                <span>Tax: <strong>RM {taxTotal.toFixed(2)}</strong></span>
                <span>Total: <strong>RM {(subtotal + taxTotal).toFixed(2)}</strong></span>
              </div>
              <Button onClick={handleCreate}>Create Note</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {printPreview && (
        <DocumentPrintPreview
          open={!!printPreview}
          onClose={() => setPrintPreview(null)}
          documentType={printPreview.note.note_type === 'sales' ? 'CREDIT NOTE' : 'DEBIT NOTE'}
          documentNumber={printPreview.note.note_number}
          documentDate={printPreview.note.note_date}
          contactName={printPreview.note.contacts?.name}
          lines={printPreview.note.lines || []}
          subtotal={+printPreview.note.subtotal || 0}
          taxAmount={+printPreview.note.tax_amount || 0}
          totalAmount={+printPreview.note.total_amount || 0}
          notes={printPreview.note.reason}
          template={printPreview.template}
          templates={templates}
          company={selectedCompany}
          onChangeTemplate={tpl => setPrintPreview(prev => prev ? { ...prev, template: tpl } : null)}
          extraFields={printPreview.note.reason ? [{ label: 'Reason', value: printPreview.note.reason }] : undefined}
        />
      )}
    </div>
  );
};

export default CreditNotesPage;
