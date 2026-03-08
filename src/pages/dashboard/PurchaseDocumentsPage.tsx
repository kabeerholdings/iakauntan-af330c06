import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Eye, MoreHorizontal, XCircle, Copy, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import DocumentPrintPreview from '@/components/DocumentPrintPreview';

const docTypes = [
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'purchase_invoice', label: 'Purchase Invoice' },
  { value: 'purchase_return', label: 'Purchase Return' },
];

const PurchaseDocumentsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt, symbol } = useCurrency();
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('purchase_order');
  const [open, setOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [form, setForm] = useState({
    doc_type: 'purchase_order', doc_number: '', contact_id: '',
    doc_date: new Date().toISOString().split('T')[0], due_date: '',
    reference: '', currency: 'MYR', notes: '', project: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, stock_item_id: '', discount_percent: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [pd, con, si, tpl] = await Promise.all([
      supabase.from('purchase_documents').select('*, contacts(name), purchase_document_lines(*)').eq('company_id', selectedCompany.id).order('doc_date', { ascending: false }),
      supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).in('type', ['supplier', 'both']),
      supabase.from('stock_items').select('id, code, name, purchase_price, tax_rate').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('document_templates').select('*').eq('company_id', selectedCompany.id),
    ]);
    setDocs(pd.data || []);
    setContacts(con.data || []);
    setStockItems(si.data || []);
    const tpls = tpl.data || [];
    setTemplates(tpls);
    if (tpls.length > 0 && !selectedTemplate) setSelectedTemplate(tpls.find(t => t.is_default) || tpls[0]);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const resetForm = () => setForm({ doc_type: activeTab, doc_number: '', contact_id: '', doc_date: new Date().toISOString().split('T')[0], due_date: '', reference: '', currency: 'MYR', notes: '', project: '', lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, stock_item_id: '', discount_percent: 0 }] });

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, stock_item_id: '', discount_percent: 0 }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const selectItem = (i: number, itemId: string) => {
    const item = stockItems.find(s => s.id === itemId);
    if (item) {
      setForm(f => ({
        ...f, lines: f.lines.map((l, idx) => idx === i ? {
          ...l, stock_item_id: itemId, description: item.name,
          unit_price: Number(item.purchase_price), tax_rate: Number(item.tax_rate),
        } : l)
      }));
    }
  };

  const calcLine = (l: any) => {
    const sub = l.quantity * l.unit_price;
    const disc = sub * (l.discount_percent / 100);
    const afterDisc = sub - disc;
    return afterDisc + afterDisc * (l.tax_rate / 100);
  };
  const total = form.lines.reduce((s, l) => s + calcLine(l), 0);
  const subtotal = form.lines.reduce((s, l) => s + l.quantity * l.unit_price * (1 - l.discount_percent / 100), 0);
  const taxTotal = total - subtotal;

  const handleCreate = async () => {
    if (!selectedCompany || !form.doc_number) { toast.error('Document number required'); return; }
    if (editDoc) {
      const { error } = await supabase.from('purchase_documents').update({
        doc_type: form.doc_type, doc_number: form.doc_number,
        contact_id: form.contact_id || null, doc_date: form.doc_date, due_date: form.due_date || null,
        reference: form.reference || null, currency: form.currency, subtotal, tax_amount: taxTotal,
        total_amount: total, notes: form.notes || null, project: form.project || null,
      }).eq('id', editDoc.id);
      if (error) { toast.error(error.message); return; }
      await supabase.from('purchase_document_lines').delete().eq('document_id', editDoc.id);
      await supabase.from('purchase_document_lines').insert(
        form.lines.filter(l => l.description).map(l => ({
          document_id: editDoc.id, stock_item_id: l.stock_item_id || null,
          description: l.description, quantity: l.quantity, unit_price: l.unit_price,
          discount_percent: l.discount_percent, discount_amount: l.quantity * l.unit_price * (l.discount_percent / 100),
          tax_rate: l.tax_rate, tax_amount: l.quantity * l.unit_price * (1 - l.discount_percent / 100) * (l.tax_rate / 100),
          line_total: calcLine(l),
        }))
      );
      toast.success('Document updated');
    } else {
      const { data: doc, error } = await supabase.from('purchase_documents').insert({
        company_id: selectedCompany.id, doc_type: form.doc_type, doc_number: form.doc_number,
        contact_id: form.contact_id || null, doc_date: form.doc_date, due_date: form.due_date || null,
        reference: form.reference || null, currency: form.currency, subtotal, tax_amount: taxTotal,
        total_amount: total, notes: form.notes || null, project: form.project || null, created_by: user?.id,
      }).select().single();
      if (error) { toast.error(error.message); return; }
      if (doc) {
        await supabase.from('purchase_document_lines').insert(
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
    }
    setOpen(false);
    setEditDoc(null);
    resetForm();
    fetchData();
  };

  const handleEdit = (d: any) => {
    setEditDoc(d);
    setForm({
      doc_type: d.doc_type, doc_number: d.doc_number, contact_id: d.contact_id || '',
      doc_date: d.doc_date, due_date: d.due_date || '', reference: d.reference || '',
      currency: d.currency || 'MYR', notes: d.notes || '', project: d.project || '',
      lines: (d.purchase_document_lines || []).map((l: any) => ({
        description: l.description, quantity: Number(l.quantity), unit_price: Number(l.unit_price),
        tax_rate: Number(l.tax_rate || 0), stock_item_id: l.stock_item_id || '', discount_percent: Number(l.discount_percent || 0),
      })),
    });
    setOpen(true);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await supabase.from('purchase_documents').update({ status }).eq('id', id);
    toast.success(`Status updated to ${status}`);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('purchase_document_lines').delete().eq('document_id', id);
    await supabase.from('purchase_documents').delete().eq('id', id);
    toast.success('Document deleted');
    fetchData();
  };

  const handleDuplicate = (d: any) => {
    setEditDoc(null);
    setForm({
      doc_type: d.doc_type, doc_number: '', contact_id: d.contact_id || '',
      doc_date: new Date().toISOString().split('T')[0], due_date: '', reference: d.reference || '',
      currency: d.currency || 'MYR', notes: d.notes || '', project: d.project || '',
      lines: (d.purchase_document_lines || []).map((l: any) => ({
        description: l.description, quantity: Number(l.quantity), unit_price: Number(l.unit_price),
        tax_rate: Number(l.tax_rate || 0), stock_item_id: l.stock_item_id || '', discount_percent: Number(l.discount_percent || 0),
      })),
    });
    setOpen(true);
  };

  const getDocTypeLabel = (type: string) => {
    const map: Record<string, string> = { purchase_order: 'PURCHASE ORDER', purchase_invoice: 'PURCHASE INVOICE', purchase_return: 'PURCHASE RETURN' };
    return map[type] || type.toUpperCase();
  };

  const statusColor = (s: string) => ({ draft: 'secondary', confirmed: 'default', received: 'default', cancelled: 'outline' }[s] || 'secondary') as any;

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;
  const filteredDocs = docs.filter(d => d.doc_type === activeTab);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Purchase Documents</h1>
        <Button onClick={() => { setEditDoc(null); resetForm(); setForm(f => ({ ...f, doc_type: activeTab })); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New Document
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
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
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No documents yet</TableCell></TableRow>
                  ) : filteredDocs.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium font-mono">{d.doc_number}</TableCell>
                      <TableCell>{d.contacts?.name || '—'}</TableCell>
                      <TableCell>{d.doc_date}</TableCell>
                      <TableCell>{d.currency}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(d.total_amount))}</TableCell>
                      <TableCell><Badge variant={statusColor(d.status)}>{d.status}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewDoc(d)}>
                              <Eye className="h-4 w-4 mr-2" />View / Print
                            </DropdownMenuItem>
                            {d.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleEdit(d)}>
                                <FileText className="h-4 w-4 mr-2" />Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicate(d)}>
                              <Copy className="h-4 w-4 mr-2" />Duplicate
                            </DropdownMenuItem>
                            {d.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(d.id, 'confirmed')}>Confirm</DropdownMenuItem>
                            )}
                            {d.status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(d.id, 'received')}>Mark Received</DropdownMenuItem>
                            )}
                            {d.status !== 'cancelled' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(d.id, 'cancelled')} className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" />Cancel
                              </DropdownMenuItem>
                            )}
                            {d.status === 'cancelled' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(d.id, 'draft')}>Restore to Draft</DropdownMenuItem>
                            )}
                            {d.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleDelete(d.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setEditDoc(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editDoc ? 'Edit' : 'Create'} Purchase Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.doc_type} onValueChange={v => setForm(f => ({ ...f, doc_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{docTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Document No.</Label><Input value={form.doc_number} onChange={e => setForm(f => ({ ...f, doc_number: e.target.value }))} placeholder="PO-001" /></div>
              <div>
                <Label>Supplier</Label>
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
                <div key={i} className="grid grid-cols-7 gap-2 mb-2">
                  <Select value={l.stock_item_id} onValueChange={v => selectItem(i, v)}>
                    <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                    <SelectContent>{stockItems.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Description" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  <Input type="number" placeholder="Qty" value={l.quantity || ''} onChange={e => updateLine(i, 'quantity', +e.target.value)} />
                  <Input type="number" placeholder="Price" value={l.unit_price || ''} onChange={e => updateLine(i, 'unit_price', +e.target.value)} />
                  <Input type="number" placeholder="Disc %" value={l.discount_percent || ''} onChange={e => updateLine(i, 'discount_percent', +e.target.value)} />
                  <Input type="number" placeholder="Tax %" value={l.tax_rate || ''} onChange={e => updateLine(i, 'tax_rate', +e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={form.lines.length <= 1}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Reference</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div className="text-sm space-x-4">
                <span>Subtotal: <strong>RM {subtotal.toFixed(2)}</strong></span>
                <span>Tax: <strong>RM {taxTotal.toFixed(2)}</strong></span>
                <span className="text-lg font-bold">Total: RM {total.toFixed(2)}</span>
              </div>
              <Button onClick={handleCreate}>{editDoc ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {previewDoc && (
        <DocumentPrintPreview
          open={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentType={getDocTypeLabel(previewDoc.doc_type) as any}
          documentNumber={previewDoc.doc_number}
          documentDate={previewDoc.doc_date}
          dueDate={previewDoc.due_date}
          contactName={previewDoc.contacts?.name}
          lines={(previewDoc.purchase_document_lines || []).map((l: any) => ({
            id: l.id, description: l.description, quantity: Number(l.quantity),
            unit_price: Number(l.unit_price), tax_rate: Number(l.tax_rate), line_total: Number(l.line_total),
          }))}
          subtotal={Number(previewDoc.subtotal)}
          taxAmount={Number(previewDoc.tax_amount)}
          totalAmount={Number(previewDoc.total_amount)}
          notes={previewDoc.notes}
          currency={previewDoc.currency === 'MYR' ? 'RM' : previewDoc.currency}
          template={selectedTemplate}
          templates={templates}
          company={selectedCompany}
          onChangeTemplate={setSelectedTemplate}
          extraFields={previewDoc.reference ? [{ label: 'Ref', value: previewDoc.reference }] : undefined}
        />
      )}
    </div>
  );
};

export default PurchaseDocumentsPage;
