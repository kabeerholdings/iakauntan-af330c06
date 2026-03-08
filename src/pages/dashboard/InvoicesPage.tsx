import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Palette, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCustomFields, saveCustomFieldValues } from '@/components/CustomFieldsSection';

const InvoicesPage = () => {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [printPreview, setPrintPreview] = useState<{ invoice: any; template: any } | null>(null);
  const [form, setForm] = useState({
    invoice_number: '', contact_id: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', invoice_type: 'sales' as string, notes: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
  });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [inv, con, tpl] = await Promise.all([
      supabase.from('invoices').select('*, contacts(name)').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('document_templates').select('*').eq('company_id', selectedCompany.id).eq('template_type', 'invoice'),
    ]);
    setInvoices(inv.data || []);
    setContacts(con.data || []);
    setTemplates(tpl.data || []);
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
      await saveCustomFieldValues(selectedCompany.id, 'invoice', inv.id, customValues);
    }

    toast.success('Invoice created');
    setOpen(false);
    setForm({ invoice_number: '', contact_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', invoice_type: 'sales', notes: '', lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] });
    setCustomValues({});
    fetchData();
  };

  const handlePrintPreview = async (invoice: any) => {
    // Get the default template or first available
    const defaultTpl = templates.find(t => t.is_default) || templates[0] || null;

    // Fetch invoice lines
    const { data: lines } = await supabase
      .from('invoice_lines')
      .select('*')
      .eq('invoice_id', invoice.id);

    setPrintPreview({
      invoice: { ...invoice, lines: lines || [] },
      template: defaultTpl,
    });
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/document-templates')}>
            <Palette className="h-4 w-4 mr-2" />Templates
            {templates.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{templates.length}</Badge>}
          </Button>
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

                <CustomFieldsSection entityType="invoice" values={customValues} onChange={setCustomValues} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                <TableHead>Actions</TableHead>
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
                  <TableCell>RM {Number(inv.total_amount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                  <TableCell>
                    {inv.einvoice_status ? (
                      <Badge variant={inv.einvoice_status === 'valid' ? 'default' : 'secondary'}>{inv.einvoice_status}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handlePrintPreview(inv)}>
                      <Eye className="h-4 w-4 mr-1" />Preview
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Print Preview Dialog */}
      {printPreview && (
        <InvoicePrintPreview
          invoice={printPreview.invoice}
          template={printPreview.template}
          templates={templates}
          company={selectedCompany}
          open={!!printPreview}
          onClose={() => setPrintPreview(null)}
          onChangeTemplate={(tpl) => setPrintPreview(prev => prev ? { ...prev, template: tpl } : null)}
        />
      )}
    </div>
  );
};

// ─── Invoice Print Preview with Template Selector ───
function InvoicePrintPreview({ invoice, template, templates, company, open, onClose, onChangeTemplate }: {
  invoice: any;
  template: any;
  templates: any[];
  company: any;
  open: boolean;
  onClose: () => void;
  onChangeTemplate: (tpl: any) => void;
}) {
  const navigate = useNavigate();
  const c = template?.primary_color || '#1a56db';
  const font = template?.font_family || 'Inter';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-3">
            Invoice Preview — {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        {/* Template selector */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Template:</span>
          {templates.length > 0 ? (
            <Select
              value={template?.id || ''}
              onValueChange={v => {
                const tpl = templates.find(t => t.id === v);
                if (tpl) onChangeTemplate(tpl);
              }}
            >
              <SelectTrigger className="w-[220px] h-8">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: t.primary_color }} />
                      {t.template_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/document-templates')}>
              <Plus className="h-3 w-3 mr-1" />Add Templates
            </Button>
          )}
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
        </div>

        {/* Rendered Invoice */}
        <div className="border rounded-lg p-8 bg-background print:border-0 print:p-0" style={{ fontFamily: font }}>
          {/* Header */}
          <div className="flex justify-between items-start pb-4 mb-4" style={{ borderBottom: `3px solid ${c}` }}>
            <div>
              {template?.show_logo && (
                <div className="w-14 h-7 rounded mb-1.5 flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ backgroundColor: c }}>
                  {company?.logo_url ? <img src={company.logo_url} alt="Logo" className="h-full" /> : 'LOGO'}
                </div>
              )}
              <h2 className="text-lg font-bold" style={{ color: c }}>{company?.name || 'Company Name'}</h2>
              <p className="text-xs text-muted-foreground">
                {[company?.address_line1, company?.address_line2, company?.city, company?.state, company?.postcode].filter(Boolean).join(', ')}
              </p>
              {company?.phone && <p className="text-xs text-muted-foreground">Tel: {company.phone}</p>}
              {company?.registration_no && <p className="text-xs text-muted-foreground">Reg No: {company.registration_no}</p>}
              {company?.tax_id && <p className="text-xs text-muted-foreground">Tax ID: {company.tax_id}</p>}
              {company?.einvoice_tin && <p className="text-xs text-muted-foreground">TIN: {company.einvoice_tin}</p>}
              {template?.header_html && <div className="mt-1 text-xs" dangerouslySetInnerHTML={{ __html: template.header_html }} />}
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold" style={{ color: c }}>
                {invoice.invoice_type === 'purchase' ? 'PURCHASE INVOICE' : 'SALES INVOICE'}
              </h3>
              <div className="text-sm mt-2 space-y-0.5">
                <div><span className="text-muted-foreground">Invoice No:</span> <strong>{invoice.invoice_number}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> {invoice.invoice_date}</div>
                {invoice.due_date && <div><span className="text-muted-foreground">Due Date:</span> {invoice.due_date}</div>}
                {invoice.einvoice_uuid && <div><span className="text-muted-foreground">UUID:</span> <span className="text-xs font-mono">{invoice.einvoice_uuid}</span></div>}
              </div>
            </div>
          </div>

          {/* Bill To */}
          {invoice.contacts?.name && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">BILL TO:</p>
              <p className="text-sm font-medium">{invoice.contacts.name}</p>
            </div>
          )}

          {/* Line Items */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr style={{ backgroundColor: c + '12' }}>
                <th className="text-left p-2 font-semibold" style={{ color: c }}>#</th>
                <th className="text-left p-2 font-semibold" style={{ color: c }}>Description</th>
                <th className="text-right p-2 font-semibold" style={{ color: c }}>Qty</th>
                <th className="text-right p-2 font-semibold" style={{ color: c }}>Unit Price</th>
                <th className="text-right p-2 font-semibold" style={{ color: c }}>Tax</th>
                <th className="text-right p-2 font-semibold" style={{ color: c }}>Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).length === 0 ? (
                <tr><td colSpan={6} className="text-center p-4 text-muted-foreground text-xs">No line items</td></tr>
              ) : invoice.lines.map((line: any, i: number) => (
                <tr key={line.id || i} className="border-b border-muted">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">{line.description}</td>
                  <td className="text-right p-2">{line.quantity}</td>
                  <td className="text-right p-2">{Number(line.unit_price).toFixed(2)}</td>
                  <td className="text-right p-2 text-muted-foreground">{line.tax_rate ? `${line.tax_rate}%` : '—'}</td>
                  <td className="text-right p-2 font-medium">{Number(line.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="space-y-0.5 min-w-[220px]">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span> <span>RM {Number(invoice.subtotal || 0).toFixed(2)}</span></div>
              {Number(invoice.tax_amount) > 0 && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax:</span> <span>RM {Number(invoice.tax_amount).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t" style={{ color: c, borderColor: c }}>
                <span>Total:</span> <span>RM {Number(invoice.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {template?.show_payment_info && (
            <div className="mt-4 pt-3 border-t border-muted text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Payment Details:</p>
              <p>Please make payment to the account details provided by the company.</p>
            </div>
          )}

          {/* Notes */}
          {template?.show_notes && invoice.notes && (
            <div className="mt-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Notes:</p>
              <p>{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          {template?.footer_html && (
            <div className="mt-3 pt-2 border-t border-muted text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: template.footer_html }} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InvoicesPage;
