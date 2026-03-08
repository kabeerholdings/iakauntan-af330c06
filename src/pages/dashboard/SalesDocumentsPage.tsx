import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const docTypes = [
  { value: 'quotation', label: 'Quotation' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
];

const SalesDocumentsPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('quotation');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    doc_type: 'quotation', doc_number: '', contact_id: '',
    doc_date: new Date().toISOString().split('T')[0], due_date: '',
    reference: '', currency: 'MYR', notes: '', project: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, stock_item_id: '', discount_percent: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [sd, con, si] = await Promise.all([
      supabase.from('sales_documents').select('*, contacts(name), sales_document_lines(*)').eq('company_id', selectedCompany.id).order('doc_date', { ascending: false }),
      supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).in('type', ['customer', 'both']),
      supabase.from('stock_items').select('id, code, name, selling_price, tax_rate').eq('company_id', selectedCompany.id).eq('is_active', true),
    ]);
    setDocs(sd.data || []);
    setContacts(con.data || []);
    setStockItems(si.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, stock_item_id: '', discount_percent: 0 }] }));
  const updateLine = (i: number, field: string, value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  };

  const selectItem = (i: number, itemId: string) => {
    const item = stockItems.find(s => s.id === itemId);
    if (item) {
      setForm(f => ({
        ...f, lines: f.lines.map((l, idx) => idx === i ? {
          ...l, stock_item_id: itemId, description: item.name,
          unit_price: Number(item.selling_price), tax_rate: Number(item.tax_rate),
        } : l)
      }));
    }
  };

  const calcLine = (l: any) => {
    const sub = l.quantity * l.unit_price;
    const disc = sub * (l.discount_percent / 100);
    const afterDisc = sub - disc;
    const tax = afterDisc * (l.tax_rate / 100);
    return afterDisc + tax;
  };

  const total = form.lines.reduce((s, l) => s + calcLine(l), 0);
  const subtotal = form.lines.reduce((s, l) => s + l.quantity * l.unit_price * (1 - l.discount_percent / 100), 0);
  const taxTotal = form.lines.reduce((s, l) => {
    const afterDisc = l.quantity * l.unit_price * (1 - l.discount_percent / 100);
    return s + afterDisc * (l.tax_rate / 100);
  }, 0);

  const handleCreate = async () => {
    if (!selectedCompany || !form.doc_number) { toast.error('Document number required'); return; }
    const { data: doc, error } = await supabase.from('sales_documents').insert({
      company_id: selectedCompany.id, doc_type: form.doc_type, doc_number: form.doc_number,
      contact_id: form.contact_id || null, doc_date: form.doc_date, due_date: form.due_date || null,
      reference: form.reference || null, currency: form.currency, subtotal, tax_amount: taxTotal,
      total_amount: total, notes: form.notes || null, project: form.project || null, created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (doc) {
      await supabase.from('sales_document_lines').insert(
        form.lines.filter(l => l.description).map(l => ({
          document_id: doc.id, stock_item_id: l.stock_item_id || null,
          description: l.description, quantity: l.quantity, unit_price: l.unit_price,
          discount_percent: l.discount_percent, discount_amount: l.quantity * l.unit_price * (l.discount_percent / 100),
          tax_rate: l.tax_rate, tax_amount: l.quantity * l.unit_price * (1 - l.discount_percent / 100) * (l.tax_rate / 100),
          line_total: calcLine(l),
        }))
      );
    }
    toast.success('Document created');
    setOpen(false);
    setForm({ doc_type: activeTab, doc_number: '', contact_id: '', doc_date: new Date().toISOString().split('T')[0], due_date: '', reference: '', currency: 'MYR', notes: '', project: '', lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, stock_item_id: '', discount_percent: 0 }] });
    fetchData();
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { draft: 'secondary', confirmed: 'default', delivered: 'default', cancelled: 'outline', completed: 'default' };
    return (map[s] || 'secondary') as any;
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const filteredDocs = docs.filter(d => d.doc_type === activeTab);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Sales</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Document</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Create Sales Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.doc_type} onValueChange={v => setForm(f => ({ ...f, doc_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{docTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Document No.</Label><Input value={form.doc_number} onChange={e => setForm(f => ({ ...f, doc_number: e.target.value }))} placeholder="QT-001" /></div>
                <div>
                  <Label>Customer</Label>
                  <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.doc_date} onChange={e => setForm(f => ({ ...f, doc_date: e.target.value }))} /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
                <div><Label>Project</Label><Input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="mb-2 block">Line Items</Label>
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 mb-2">
                    <Select value={l.stock_item_id} onValueChange={v => selectItem(i, v)}>
                      <SelectTrigger className="col-span-1"><SelectValue placeholder="Item" /></SelectTrigger>
                      <SelectContent>{stockItems.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Description" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                    <Input type="number" placeholder="Qty" value={l.quantity || ''} onChange={e => updateLine(i, 'quantity', +e.target.value)} />
                    <Input type="number" placeholder="Price" value={l.unit_price || ''} onChange={e => updateLine(i, 'unit_price', +e.target.value)} />
                    <Input type="number" placeholder="Disc %" value={l.discount_percent || ''} onChange={e => updateLine(i, 'discount_percent', +e.target.value)} />
                    <Input type="number" placeholder="Tax %" value={l.tax_rate || ''} onChange={e => updateLine(i, 'tax_rate', +e.target.value)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <div className="text-sm space-x-4">
                  <span>Subtotal: <strong>RM {subtotal.toFixed(2)}</strong></span>
                  <span>Tax: <strong>RM {taxTotal.toFixed(2)}</strong></span>
                  <span className="text-lg font-bold">Total: RM {total.toFixed(2)}</span>
                </div>
                <Button onClick={handleCreate}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {docTypes.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label} ({docs.filter(d => d.doc_type === t.value).length})</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doc #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No {docTypes.find(t => t.value === activeTab)?.label}s yet</TableCell></TableRow>
                  ) : filteredDocs.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.doc_number}</TableCell>
                      <TableCell>{d.contacts?.name || '—'}</TableCell>
                      <TableCell>{d.doc_date}</TableCell>
                      <TableCell>{d.currency}</TableCell>
                      <TableCell className="text-right">RM {Number(d.total_amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={statusColor(d.status)}>{d.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesDocumentsPage;
