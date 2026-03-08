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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import CustomFieldsSection, { saveCustomFieldValues } from '@/components/CustomFieldsSection';

const emptyForm = {
  name: '', email: '', phone: '', type: 'customer', tax_id: '',
  address: '', city: '', state: '', postcode: '', country: 'Malaysia',
  credit_limit: '', credit_terms: '30', overdue_limit: '',
  bank_name: '', bank_account_no: '',
};

const ContactsPage = () => {
  const { selectedCompany } = useCompany();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).order('name');
    setContacts(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.name) { toast.error('Name is required'); return; }
    const payload = {
      company_id: selectedCompany.id, name: form.name, email: form.email || null,
      phone: form.phone || null, type: form.type, tax_id: form.tax_id || null,
      address: form.address || null, city: form.city || null, state: form.state || null,
      postcode: form.postcode || null, country: form.country || 'Malaysia',
      credit_limit: +form.credit_limit || 0, credit_terms: +form.credit_terms || 30,
      overdue_limit: +form.overdue_limit || 0, bank_name: form.bank_name || null,
      bank_account_no: form.bank_account_no || null,
    };

    let entityId = editingId;
    if (editingId) {
      const { error } = await supabase.from('contacts').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success('Contact updated');
    } else {
      const { data, error } = await supabase.from('contacts').insert(payload).select('id').single();
      if (error) { toast.error(error.message); return; }
      entityId = data.id;
      toast.success('Contact added');
    }

    // Save custom field values
    const cfEntityType = form.type === 'supplier' ? 'supplier' : 'customer';
    if (entityId) {
      await saveCustomFieldValues(selectedCompany.id, cfEntityType, entityId, customValues);
    }

    closeDialog();
    fetchData();
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setCustomValues({});
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name || '', email: c.email || '', phone: c.phone || '',
      type: c.type || 'customer', tax_id: c.tax_id || '',
      address: c.address || '', city: c.city || '', state: c.state || '',
      postcode: c.postcode || '', country: c.country || 'Malaysia',
      credit_limit: c.credit_limit?.toString() || '', credit_terms: c.credit_terms?.toString() || '30',
      overdue_limit: c.overdue_limit?.toString() || '',
      bank_name: c.bank_name || '', bank_account_no: c.bank_account_no || '',
    });
    setCustomValues({});
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Contact deleted');
    fetchData();
  };

  const filtered = contacts.filter(c => {
    if (activeTab !== 'all' && c.type !== activeTab && !(activeTab === 'customer' && c.type === 'both') && !(activeTab === 'supplier' && c.type === 'both')) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.email || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Contacts</h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Contact</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">{editingId ? 'Edit Contact' : 'Add Contact'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div><Label>Tax ID / SSM</Label><Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
                <div><Label>Postcode</Label><Input value={form.postcode} onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))} /></div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-medium text-foreground mb-3">Credit Control</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Credit Limit (RM)</Label><Input type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} /></div>
                  <div><Label>Credit Terms (days)</Label><Input type="number" value={form.credit_terms} onChange={e => setForm(f => ({ ...f, credit_terms: e.target.value }))} /></div>
                  <div><Label>Overdue Limit (RM)</Label><Input type="number" value={form.overdue_limit} onChange={e => setForm(f => ({ ...f, overdue_limit: e.target.value }))} /></div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-medium text-foreground mb-3">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} /></div>
                  <div><Label>Account No.</Label><Input value={form.bank_account_no} onChange={e => setForm(f => ({ ...f, bank_account_no: e.target.value }))} /></div>
                </div>
              </div>

              <CustomFieldsSection
                entityType={form.type === 'supplier' ? 'supplier' : 'customer'}
                entityId={editingId}
                values={customValues}
                onChange={setCustomValues}
              />

              <Button onClick={handleCreate} className="w-full">{editingId ? 'Update Contact' : 'Add Contact'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All ({contacts.length})</TabsTrigger>
            <TabsTrigger value="customer">Customers ({contacts.filter(c => c.type === 'customer' || c.type === 'both').length})</TabsTrigger>
            <TabsTrigger value="supplier">Suppliers ({contacts.filter(c => c.type === 'supplier' || c.type === 'both').length})</TabsTrigger>
          </TabsList>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <TabsContent value={activeTab}>
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tax ID</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No contacts</TableCell></TableRow>
                  ) : filtered.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
                      <TableCell>{c.email || '—'}</TableCell>
                      <TableCell>{c.phone || '—'}</TableCell>
                      <TableCell>{c.tax_id || '—'}</TableCell>
                      <TableCell className="text-right">{c.credit_limit ? `RM ${Number(c.credit_limit).toFixed(2)}` : '—'}</TableCell>
                      <TableCell>{c.credit_terms ? `${c.credit_terms}d` : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete "{c.name}". This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </div>
  );
};

export default ContactsPage;
