import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FileText, Plus, Palette, Eye, Star, Trash2, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import TemplateGallery from '@/components/templates/TemplateGallery';
import { type ReportTemplate } from '@/lib/report-templates';

const templateTypes = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'statement', label: 'Statement of Account' },
];

const paperSizes = ['A4', 'A5', 'Letter', 'Legal'];
const fonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans Pro', 'Poppins', 'Montserrat'];

const DocumentTemplatesPage = () => {
  const { selectedCompany } = useCompany();
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [selectedGalleryTemplate, setSelectedGalleryTemplate] = useState<string | null>(null);
  const [form, setForm] = useState({
    template_name: '', template_type: 'invoice', header_html: '', body_html: '', footer_html: '',
    primary_color: '#1a56db', font_family: 'Inter', paper_size: 'A4',
    show_logo: true, show_payment_info: true, show_notes: true,
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('document_templates').select('*')
      .eq('company_id', selectedCompany.id).order('created_at');
    setTemplates(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.template_name) return;
    const { error } = await supabase.from('document_templates').insert({
      company_id: selectedCompany.id,
      ...form,
    });
    if (error) toast.error(error.message);
    else { toast.success('Template created'); setOpen(false); fetchData(); }
  };

  const handleSelectFromGallery = async (template: ReportTemplate) => {
    if (!selectedCompany) return;
    setSelectedGalleryTemplate(template.id);

    // Map gallery category to template_type
    const typeMap: Record<string, string> = {
      sales_invoice: 'invoice', einvoice: 'invoice', sales_quotation: 'quotation',
      sales_delivery_order: 'delivery_order', sales_order: 'invoice',
      sales_credit_note: 'credit_note', sales_debit_note: 'debit_note',
      purchase_invoice: 'invoice', purchase_order: 'purchase_order',
      purchase_debit_note: 'debit_note', customer_statement: 'statement',
      customer_aging: 'statement', customer_payment: 'receipt',
      payment_voucher: 'receipt', official_receipt: 'receipt',
      cash_sales: 'invoice', cheque_format: 'receipt',
      goods_received: 'delivery_order', payslip: 'receipt',
      stock_barcode: 'invoice', general_ledger: 'statement',
    };

    const { error } = await supabase.from('document_templates').insert({
      company_id: selectedCompany.id,
      template_name: template.name,
      template_type: typeMap[template.category] || 'invoice',
      primary_color: template.primaryColor,
      font_family: template.fontFamily,
      paper_size: template.paperSize,
      show_logo: template.showLogo,
      show_payment_info: template.showPaymentInfo,
      show_notes: template.showNotes,
      header_html: null,
      body_html: null,
      footer_html: template.showNotes ? 'Thank you for your business.' : null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Template "${template.name}" added to your templates`);
      fetchData();
    }
  };

  const setDefault = async (id: string, type: string) => {
    await supabase.from('document_templates').update({ is_default: false })
      .eq('company_id', selectedCompany!.id).eq('template_type', type);
    await supabase.from('document_templates').update({ is_default: true }).eq('id', id);
    toast.success('Default template updated');
    fetchData();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('document_templates').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Template deleted'); fetchData(); }
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Report Templates</h1>
            <p className="text-sm text-muted-foreground">Browse, select, and manage invoice and report printing formats</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Custom Template</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Custom Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Template Name</Label><Input value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} placeholder="Professional Blue" /></div>
                <div>
                  <Label>Document Type</Label>
                  <Select value={form.template_type} onValueChange={v => setForm({ ...form, template_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{templateTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-10 p-1" />
                    <Input value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Font</Label>
                  <Select value={form.font_family} onValueChange={v => setForm({ ...form, font_family: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{fonts.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Paper Size</Label>
                  <Select value={form.paper_size} onValueChange={v => setForm({ ...form, paper_size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{paperSizes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.show_logo} onCheckedChange={v => setForm({ ...form, show_logo: v })} /><Label>Show Logo</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.show_payment_info} onCheckedChange={v => setForm({ ...form, show_payment_info: v })} /><Label>Payment Info</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.show_notes} onCheckedChange={v => setForm({ ...form, show_notes: v })} /><Label>Notes</Label></div>
              </div>
              <div><Label>Header HTML (optional)</Label><Textarea value={form.header_html} onChange={e => setForm({ ...form, header_html: e.target.value })} rows={3} placeholder="Custom header HTML..." /></div>
              <div><Label>Body HTML (optional)</Label><Textarea value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} rows={4} placeholder="Custom body layout HTML..." /></div>
              <div><Label>Footer HTML (optional)</Label><Textarea value={form.footer_html} onChange={e => setForm({ ...form, footer_html: e.target.value })} rows={2} placeholder="Thank you for your business!" /></div>
              <Button onClick={handleCreate} className="w-full">Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="gallery" className="w-full">
        <TabsList>
          <TabsTrigger value="gallery" className="gap-1.5"><LayoutGrid className="h-4 w-4" />Template Gallery</TabsTrigger>
          <TabsTrigger value="my-templates" className="gap-1.5"><FileText className="h-4 w-4" />My Templates ({templates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Report Template Gallery</CardTitle>
              <p className="text-sm text-muted-foreground">
                Browse pre-built invoice and report templates. Click to preview and add to your templates.
              </p>
            </CardHeader>
            <CardContent>
              <TemplateGallery
                onSelectTemplate={handleSelectFromGallery}
                selectedTemplateId={selectedGalleryTemplate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-templates" className="mt-4 space-y-4">
          {/* Template Overview by Type */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {templateTypes.slice(0, 4).map(tt => {
              const count = templates.filter(t => t.template_type === tt.value).length;
              const def = templates.find(t => t.template_type === tt.value && t.is_default);
              return (
                <Card key={tt.value} className="shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <Badge variant="secondary">{count} template{count !== 1 ? 's' : ''}</Badge>
                    </div>
                    <h3 className="font-display font-semibold">{tt.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: {def?.template_name || 'System Default'}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* All Templates Table */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">All Templates</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Font</TableHead>
                    <TableHead>Paper</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No templates yet — browse the gallery to get started</TableCell></TableRow>
                  ) : templates.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.template_name}</TableCell>
                      <TableCell><Badge variant="secondary">{templateTypes.find(tt => tt.value === t.template_type)?.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: t.primary_color }} />
                          <span className="text-xs font-mono">{t.primary_color}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{t.font_family}</TableCell>
                      <TableCell>{t.paper_size}</TableCell>
                      <TableCell>
                        {t.is_default ? (
                          <Badge><Star className="h-3 w-3 mr-1" />Default</Badge>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setDefault(t.id, t.template_type)}>Set Default</Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreview(t)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {preview && (
        <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Template Preview: {preview.template_name}</DialogTitle></DialogHeader>
            <div className="border rounded-lg p-6" style={{ fontFamily: preview.font_family }}>
              <div className="border-b pb-4 mb-4" style={{ borderColor: preview.primary_color }}>
                <h2 className="text-xl font-bold" style={{ color: preview.primary_color }}>
                  {selectedCompany?.name || 'Company Name'}
                </h2>
                <p className="text-sm text-muted-foreground">{selectedCompany?.address_line1}</p>
                {preview.header_html && <div className="mt-2 text-sm" dangerouslySetInnerHTML={{ __html: preview.header_html }} />}
              </div>
              <div className="mb-4">
                <h3 className="font-bold text-lg" style={{ color: preview.primary_color }}>
                  {templateTypes.find(t => t.value === preview.template_type)?.label?.toUpperCase()}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div><span className="text-muted-foreground">Doc No:</span> INV-0001</div>
                  <div><span className="text-muted-foreground">Date:</span> {new Date().toLocaleDateString()}</div>
                </div>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr style={{ backgroundColor: preview.primary_color + '15' }}>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Sample Item</td><td className="text-right p-2">2</td><td className="text-right p-2">RM 50.00</td><td className="text-right p-2">RM 100.00</td></tr>
                </tbody>
              </table>
              <div className="text-right font-bold" style={{ color: preview.primary_color }}>Total: RM 100.00</div>
              {preview.show_notes && <div className="mt-4 text-sm text-muted-foreground border-t pt-2">Notes: Thank you for your business!</div>}
              {preview.footer_html && <div className="mt-2 text-xs" dangerouslySetInnerHTML={{ __html: preview.footer_html }} />}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentTemplatesPage;
