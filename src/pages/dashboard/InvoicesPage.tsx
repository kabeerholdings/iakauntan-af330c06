import { useEffect, useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Eye, Palette, Printer, MoreHorizontal, Copy, XCircle, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCustomFields, saveCustomFieldValues } from '@/components/CustomFieldsSection';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DocumentPrintPreview from '@/components/DocumentPrintPreview';

const InvoicesPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt, symbol } = useCurrency();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [copyFromQOpen, setCopyFromQOpen] = useState(false);
  const [knockOffDetail, setKnockOffDetail] = useState<any>(null);
  const [knockOffLines, setKnockOffLines] = useState<any[]>([]);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [form, setForm] = useState({
    invoice_number: '', contact_id: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', invoice_type: 'sales' as string, notes: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
  });
  const { values: customValues, setValues: setCustomValues, renderFieldsFor, renderUnpositionedFields } = useCustomFields('invoice');

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [inv, con, tpl, qt] = await Promise.all([
      supabase.from('invoices').select('*, contacts(name), invoice_lines(*)').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('document_templates').select('*').eq('company_id', selectedCompany.id),
      supabase.from('sales_documents').select('*, contacts(name), sales_document_lines(*)').eq('company_id', selectedCompany.id).eq('doc_type', 'quotation').eq('status', 'confirmed'),
    ]);
    setInvoices(inv.data || []);
    setContacts(con.data || []);
    const tpls = tpl.data || [];
    setTemplates(tpls);
    if (tpls.length > 0 && !selectedTemplate) setSelectedTemplate(tpls.find(t => t.is_default) || tpls[0]);
    setQuotations(qt.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  // 12-month summary like AutoCount
  const monthlySummary = useMemo(() => {
    const months: Record<string, { month: string; unpaid: number; partial: number; paid: number; void: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().substring(0, 7);
      months[key] = { month: key, unpaid: 0, partial: 0, paid: 0, void: 0 };
    }
    invoices.forEach(inv => {
      const m = inv.invoice_date?.substring(0, 7);
      if (months[m]) {
        const amt = Number(inv.total_amount) || 0;
        if (inv.status === 'paid') months[m].paid += amt;
        else if (inv.status === 'cancelled') months[m].void += amt;
        else if (inv.status === 'partial') months[m].partial += amt;
        else months[m].unpaid += amt;
      }
    });
    return Object.values(months);
  }, [invoices]);

  // Status breakdown counts
  const statusCounts = useMemo(() => {
    const counts = { unpaid: 0, partial: 0, paid: 0, void: 0 };
    invoices.forEach(inv => {
      if (inv.status === 'paid') counts.paid++;
      else if (inv.status === 'cancelled') counts.void++;
      else if (inv.status === 'partial') counts.partial++;
      else counts.unpaid++;
    });
    return counts;
  }, [invoices]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }));
  const updateLine = (idx: number, field: string, value: any) => {
    setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l) }));
  };

  const handleCreate = async () => {
    if (!selectedCompany || !form.invoice_number) { toast.error('Invoice number required'); return; }
    const subtotal = form.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
    const taxAmt = form.lines.reduce((s, l) => s + (l.quantity * l.unit_price * l.tax_rate / 100), 0);
    const { data: inv, error } = await supabase.from('invoices').insert({
      company_id: selectedCompany.id, contact_id: form.contact_id || null, invoice_type: form.invoice_type,
      invoice_number: form.invoice_number, invoice_date: form.invoice_date, due_date: form.due_date || null,
      subtotal, tax_amount: taxAmt, total_amount: subtotal + taxAmt, notes: form.notes || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (inv) {
      await supabase.from('invoice_lines').insert(
        form.lines.map(l => ({
          invoice_id: inv.id, description: l.description, quantity: l.quantity, unit_price: l.unit_price,
          tax_rate: l.tax_rate, tax_amount: l.quantity * l.unit_price * l.tax_rate / 100,
          line_total: l.quantity * l.unit_price * (1 + l.tax_rate / 100),
        }))
      );
      await saveCustomFieldValues(selectedCompany.id, 'invoice', inv.id, customValues);
    }
    toast.success('Invoice created');
    setOpen(false);
    setForm({ invoice_number: '', contact_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', invoice_type: 'sales', notes: '', lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] });
    setCustomValues({});
    fetchData();
  };

  const copyFromQuotation = (q: any) => {
    setForm({
      invoice_number: '', contact_id: q.contact_id || '', invoice_date: new Date().toISOString().split('T')[0],
      due_date: '', invoice_type: 'sales', notes: q.notes || '',
      lines: (q.sales_document_lines || []).map((l: any) => ({
        description: l.description, quantity: Number(l.quantity), unit_price: Number(l.unit_price), tax_rate: Number(l.tax_rate || 0),
      })),
    });
    setCopyFromQOpen(false);
    setOpen(true);
    toast.info(`Copied from ${q.doc_number}`);
  };

  const handleVoid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', id);
    toast.success('Invoice voided');
    fetchData();
  };

  const handleUnvoid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'draft' }).eq('id', id);
    toast.success('Invoice restored');
    fetchData();
  };

  const viewKnockOff = async (inv: any) => {
    const { data } = await supabase.from('knock_off_lines').select('*, knock_off_entries(knock_off_date, description, contacts(name))')
      .eq('target_id', inv.id).eq('target_type', 'invoice');
    setKnockOffDetail(inv);
    setKnockOffLines(data || []);
  };

  const openPreview = async (invoice: any) => {
    const { data: lines } = await supabase.from('invoice_lines').select('*').eq('invoice_id', invoice.id);
    setPreviewDoc({ ...invoice, lines: lines || [] });
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { draft: 'secondary', sent: 'default', paid: 'default', overdue: 'destructive', cancelled: 'outline', partial: 'secondary' };
    return (map[s] || 'secondary') as any;
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Invoices</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/document-templates')}>
            <Palette className="h-4 w-4 mr-2" />Templates
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setOpen(true)}>New Blank Invoice</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCopyFromQOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />Copy from Quotation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Section - AutoCount style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unpaid</p><p className="text-2xl font-bold text-foreground">{statusCounts.unpaid}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Partial Payment</p><p className="text-2xl font-bold text-foreground">{statusCounts.partial}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Full Payment</p><p className="text-2xl font-bold text-primary">{statusCounts.paid}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Void</p><p className="text-2xl font-bold text-muted-foreground">{statusCounts.void}</p></CardContent></Card>
      </div>

      {/* 12-Month Summary Chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm">12-Month Invoice Summary</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlySummary}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="paid" stackId="a" fill="hsl(var(--primary))" name="Paid" />
              <Bar dataKey="unpaid" stackId="a" fill="hsl(var(--muted-foreground))" name="Unpaid" />
              <Bar dataKey="partial" stackId="a" fill="hsl(var(--accent-foreground))" name="Partial" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Listing */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>e-Invoice</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices yet</TableCell></TableRow>
              ) : invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.contacts?.name || '—'}</TableCell>
                  <TableCell>{inv.invoice_date}</TableCell>
                  <TableCell className="text-right">{fmt(Number(inv.total_amount))}</TableCell>
                  <TableCell><Badge variant={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                  <TableCell>
                    {inv.einvoice_status ? (
                      <Badge variant={inv.einvoice_status === 'valid' ? 'default' : 'secondary'}>{inv.einvoice_status}</Badge>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPreview(inv)}>
                          <Eye className="h-4 w-4 mr-2" />View / Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => viewKnockOff(inv)}>
                          <Link2 className="h-4 w-4 mr-2" />View Knock Off
                        </DropdownMenuItem>
                        {inv.status !== 'cancelled' ? (
                          <DropdownMenuItem onClick={() => handleVoid(inv.id)} className="text-destructive">
                            <XCircle className="h-4 w-4 mr-2" />Void
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleUnvoid(inv.id)}>
                            <XCircle className="h-4 w-4 mr-2" />Unvoid
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

      {/* Create Invoice Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Invoice Number</Label><Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-001" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.invoice_type} onValueChange={v => setForm(f => ({ ...f, invoice_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sales">Sales Invoice</SelectItem><SelectItem value="purchase">Purchase Invoice</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Contact</Label>
                <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
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
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div className="text-lg font-semibold font-display text-foreground">
                Total: RM {form.lines.reduce((s, l) => s + l.quantity * l.unit_price * (1 + l.tax_rate / 100), 0).toFixed(2)}
              </div>
              <Button onClick={handleCreate}>Create Invoice</Button>
            </div>
            {renderFieldsFor('notes', 'after')}
            {renderUnpositionedFields()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy from Quotation Dialog */}
      <Dialog open={copyFromQOpen} onOpenChange={setCopyFromQOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Copy from Quotation</DialogTitle></DialogHeader>
          {quotations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No confirmed quotations available</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {quotations.map(q => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer" onClick={() => copyFromQuotation(q)}>
                  <div>
                    <p className="font-medium">{q.doc_number}</p>
                    <p className="text-sm text-muted-foreground">{q.contacts?.name || 'No contact'} · {q.doc_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">RM {Number(q.total_amount).toFixed(2)}</p>
                    <Button variant="ghost" size="sm"><Copy className="h-3 w-3 mr-1" />Copy</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Knock Off Details Dialog */}
      <Dialog open={!!knockOffDetail} onOpenChange={() => setKnockOffDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Knock Off Details — {knockOffDetail?.invoice_number}</DialogTitle></DialogHeader>
          {knockOffLines.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No knock off records found for this invoice</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Applied (RM)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {knockOffLines.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{l.knock_off_entries?.knock_off_date}</TableCell>
                    <TableCell>{l.source_type} — {l.knock_off_entries?.description || l.knock_off_entries?.contacts?.name || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{Number(l.applied_amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Preview */}
      {previewDoc && (
        <DocumentPrintPreview
          open={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentType={previewDoc.invoice_type === 'purchase' ? 'PURCHASE INVOICE' as any : 'INVOICE'}
          documentNumber={previewDoc.invoice_number}
          documentDate={previewDoc.invoice_date}
          dueDate={previewDoc.due_date}
          contactName={previewDoc.contacts?.name}
          lines={(previewDoc.lines || []).map((l: any) => ({
            id: l.id, description: l.description, quantity: Number(l.quantity),
            unit_price: Number(l.unit_price), tax_rate: Number(l.tax_rate), line_total: Number(l.line_total),
          }))}
          subtotal={Number(previewDoc.subtotal)}
          taxAmount={Number(previewDoc.tax_amount)}
          totalAmount={Number(previewDoc.total_amount)}
          notes={previewDoc.notes}
          currency="RM"
          template={selectedTemplate}
          templates={templates}
          company={selectedCompany}
          onChangeTemplate={setSelectedTemplate}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
