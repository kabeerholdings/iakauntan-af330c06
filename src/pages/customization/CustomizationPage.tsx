import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Code, FileText, Puzzle, Trash2, Edit, BarChart3, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

const ENTITY_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'stock_item', label: 'Stock Item' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'employee', label: 'Employee' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'memo', label: 'Memo / Long Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
];

const MODULES = ['General', 'GL/AR/AP', 'Sales/Purchase/Stock', 'Payroll', 'Manufacturing'];

const CustomizationPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  // DIY Fields
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldForm, setFieldForm] = useState({
    entity_type: 'customer', field_name: '', field_label: '', field_type: 'text', is_required: false, field_options: '[]',
  });

  // Custom Reports
  const [customReports, setCustomReports] = useState<any[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    report_name: '', report_type: 'listing', module: 'general', description: '',
  });

  // Script Customizations
  const [scripts, setScripts] = useState<any[]>([]);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptForm, setScriptForm] = useState({
    title: '', category: 'diy', module: 'general', description: '', script_code: '',
  });

  const fetchAll = async () => {
    if (!selectedCompany) return;
    const [f, r, s] = await Promise.all([
      supabase.from('custom_fields').select('*').eq('company_id', selectedCompany.id).order('entity_type').order('sort_order'),
      supabase.from('custom_reports').select('*').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('script_customizations').select('*').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
    ]);
    setCustomFields(f.data || []);
    setCustomReports(r.data || []);
    setScripts(s.data || []);
  };

  useEffect(() => { fetchAll(); }, [selectedCompany]);

  const saveField = async () => {
    if (!selectedCompany || !fieldForm.field_name || !fieldForm.field_label) return;
    let options: any[] = [];
    try { options = JSON.parse(fieldForm.field_options); } catch { options = []; }
    const payload = {
      company_id: selectedCompany.id,
      entity_type: fieldForm.entity_type,
      field_name: fieldForm.field_name.toLowerCase().replace(/\s+/g, '_'),
      field_label: fieldForm.field_label,
      field_type: fieldForm.field_type,
      is_required: fieldForm.is_required,
      field_options: options,
    };

    if (editingFieldId) {
      const { error } = await supabase.from('custom_fields').update(payload).eq('id', editingFieldId);
      if (error) { toast.error(error.message); return; }
      toast.success('Custom field updated');
    } else {
      const { error } = await supabase.from('custom_fields').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Custom field created');
    }
    closeFieldDialog();
    fetchAll();
  };

  const closeFieldDialog = () => {
    setFieldOpen(false);
    setEditingFieldId(null);
    setFieldForm({ entity_type: 'customer', field_name: '', field_label: '', field_type: 'text', is_required: false, field_options: '[]' });
  };

  const openEditField = (f: any) => {
    setEditingFieldId(f.id);
    setFieldForm({
      entity_type: f.entity_type,
      field_name: f.field_name,
      field_label: f.field_label,
      field_type: f.field_type,
      is_required: f.is_required || false,
      field_options: JSON.stringify(f.field_options || []),
    });
    setFieldOpen(true);
  };

  const deleteField = async (id: string) => {
    await supabase.from('custom_fields').delete().eq('id', id);
    toast.success('Field deleted');
    fetchAll();
  };

  // Custom Reports CRUD
  const createReport = async () => {
    if (!selectedCompany || !reportForm.report_name) return;
    const { error } = await supabase.from('custom_reports').insert({
      company_id: selectedCompany.id, ...reportForm, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Custom report created');
    setReportOpen(false);
    setReportForm({ report_name: '', report_type: 'listing', module: 'general', description: '' });
    fetchAll();
  };

  const deleteReport = async (id: string) => {
    await supabase.from('custom_reports').delete().eq('id', id);
    toast.success('Report deleted');
    fetchAll();
  };

  // Script Customizations CRUD
  const createScript = async () => {
    if (!selectedCompany || !scriptForm.title) return;
    const { error } = await supabase.from('script_customizations').insert({
      company_id: selectedCompany.id, ...scriptForm, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Script customization created');
    setScriptOpen(false);
    setScriptForm({ title: '', category: 'diy', module: 'general', description: '', script_code: '' });
    fetchAll();
  };

  const deleteScript = async (id: string) => {
    await supabase.from('script_customizations').delete().eq('id', id);
    toast.success('Script deleted');
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customization Hub</h1>
        <p className="text-muted-foreground">DIY fields, custom reports & script customizations — tailor the system to your business</p>
      </div>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields"><Puzzle className="h-4 w-4 mr-1" />DIY Fields</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1" />Custom Reports</TabsTrigger>
          <TabsTrigger value="scripts"><Code className="h-4 w-4 mr-1" />Script Catalogue</TabsTrigger>
        </TabsList>

        {/* DIY Fields Tab */}
        <TabsContent value="fields" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">DIY Custom Fields</h2>
              <p className="text-sm text-muted-foreground">Create unlimited custom data fields for any document or entity — text, date, memo, dropdown & more.</p>
            </div>
            <Dialog open={fieldOpen} onOpenChange={setFieldOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Field</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Custom Field</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Entity / Document</Label>
                    <Select value={fieldForm.entity_type} onValueChange={v => setFieldForm({ ...fieldForm, entity_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Field Label</Label><Input value={fieldForm.field_label} onChange={e => setFieldForm({ ...fieldForm, field_label: e.target.value, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g. Custom Reference No" /></div>
                  <div><Label>Field Name (auto)</Label><Input value={fieldForm.field_name} disabled /></div>
                  <div><Label>Field Type</Label>
                    <Select value={fieldForm.field_type} onValueChange={v => setFieldForm({ ...fieldForm, field_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELD_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {fieldForm.field_type === 'dropdown' && (
                    <div><Label>Options (JSON array)</Label><Input value={fieldForm.field_options} onChange={e => setFieldForm({ ...fieldForm, field_options: e.target.value })} placeholder='["Option 1", "Option 2"]' /></div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch checked={fieldForm.is_required} onCheckedChange={v => setFieldForm({ ...fieldForm, is_required: v })} />
                    <Label>Required field</Label>
                  </div>
                  <Button onClick={createField} className="w-full">Create Field</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card><Table>
            <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead>Label</TableHead><TableHead>Field Name</TableHead><TableHead>Type</TableHead><TableHead>Required</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {customFields.map(f => (
                <TableRow key={f.id}>
                  <TableCell><Badge variant="outline">{f.entity_type}</Badge></TableCell>
                  <TableCell className="font-medium">{f.field_label}</TableCell>
                  <TableCell className="font-mono text-xs">{f.field_name}</TableCell>
                  <TableCell><Badge variant="secondary">{f.field_type}</Badge></TableCell>
                  <TableCell>{f.is_required ? '✓' : '-'}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => deleteField(f.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
              {customFields.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No custom fields. Create your first DIY field.</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Custom Report Templates</h2>
              <p className="text-sm text-muted-foreground">Design reports tailored to your business — listing, summary, commission, driver reports & more.</p>
            </div>
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Report</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Custom Report</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Report Name</Label><Input value={reportForm.report_name} onChange={e => setReportForm({ ...reportForm, report_name: e.target.value })} placeholder="e.g. Driver Commission Report" /></div>
                  <div><Label>Report Type</Label>
                    <Select value={reportForm.report_type} onValueChange={v => setReportForm({ ...reportForm, report_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="listing">Listing</SelectItem>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="statement">Statement</SelectItem>
                        <SelectItem value="commission">Commission</SelectItem>
                        <SelectItem value="custom">Custom Design</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Module</Label>
                    <Select value={reportForm.module} onValueChange={v => setReportForm({ ...reportForm, module: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Description</Label><Textarea value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Describe this report..." /></div>
                  <Button onClick={createReport} className="w-full">Create Report</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customReports.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{r.report_name}</CardTitle>
                      <CardDescription className="mt-1">{r.description || 'No description'}</CardDescription>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteReport(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant="outline">{r.report_type}</Badge>
                    <Badge variant="secondary">{r.module}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {customReports.length === 0 && (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No custom reports. Create your first report template.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Script Customizations Tab */}
        <TabsContent value="scripts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Script Customization Catalogue</h2>
              <p className="text-sm text-muted-foreground">DIY scripts for multiple payment methods, recurring billing, bonus point systems, import tools & more.</p>
            </div>
            <Dialog open={scriptOpen} onOpenChange={setScriptOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Script</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create Script Customization</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Title</Label><Input value={scriptForm.title} onChange={e => setScriptForm({ ...scriptForm, title: e.target.value })} placeholder="e.g. Multiple Payment Method in Cash Sales" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Category</Label>
                      <Select value={scriptForm.category} onValueChange={v => setScriptForm({ ...scriptForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diy">DIY Customization</SelectItem>
                          <SelectItem value="report">Report Design</SelectItem>
                          <SelectItem value="automation">Automation</SelectItem>
                          <SelectItem value="integration">Integration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Module</Label>
                      <Select value={scriptForm.module} onValueChange={v => setScriptForm({ ...scriptForm, module: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Description</Label><Textarea value={scriptForm.description} onChange={e => setScriptForm({ ...scriptForm, description: e.target.value })} placeholder="What does this customization do?" /></div>
                  <div><Label>Script Code (optional)</Label><Textarea value={scriptForm.script_code} onChange={e => setScriptForm({ ...scriptForm, script_code: e.target.value })} placeholder="// Your customization script..." className="font-mono text-sm min-h-[120px]" /></div>
                  <Button onClick={createScript} className="w-full">Create Script</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Pre-built catalogue items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {[
              { title: 'Multiple Payment Method in Cash Sales', category: 'diy', desc: 'Accept multiple payment types in a single cash sale transaction.' },
              { title: 'Bonus Voucher Point System', category: 'diy', desc: 'Reward customers with point-based vouchers for repeat purchases.' },
              { title: 'Recurring Billing System', category: 'automation', desc: 'Auto-generate monthly water/maintenance bills for tenants.' },
              { title: 'Import Batch Documents to DO', category: 'diy', desc: 'Bulk import delivery orders from Excel spreadsheets.' },
              { title: 'Override Print Count with Password', category: 'diy', desc: 'Require password approval when printing more than once.' },
              { title: 'Customer Statement by Category', category: 'report', desc: 'Group customer statements by company category.' },
              { title: 'Driver Commission Report', category: 'report', desc: 'Calculate per-trip commission rates from invoices.' },
              { title: 'Photocopier Meter Reading', category: 'diy', desc: 'Track photocopier usage with meter reading entries.' },
            ].map((item, i) => (
              <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{item.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* User's custom scripts */}
          {scripts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Your Customizations</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Module</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {scripts.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div><span className="font-medium">{s.title}</span>
                          {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{s.module}</Badge></TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => deleteScript(s.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomizationPage;
