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
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

const ContactsPage = () => {
  const { selectedCompany } = useCompany();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', type: 'customer', tax_id: '',
    address: '', city: '', state: '', postcode: '', country: 'Malaysia',
    credit_limit: '', credit_terms: '30', overdue_limit: '',
    bank_name: '', bank_account_no: '',
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).order('name');
    setContacts(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.name) { toast.error('Name is required'); return; }
    const { error } = await supabase.from('contacts').insert({
      company_id: selectedCompany.id, name: form.name, email: form.email || null,
      phone: form.phone || null, type: form.type, tax_id: form.tax_id || null,
      address: form.address || null, city: form.city || null, state: form.state || null,
      postcode: form.postcode || null, country: form.country || 'Malaysia',
      credit_limit: +form.credit_limit || 0, credit_terms: +form.credit_terms || 30,
      overdue_limit: +form.overdue_limit || 0, bank_name: form.bank_name || null,
      bank_account_no: form.bank_account_no || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Contact added');
    setOpen(false);
    setForm({ name: '', email: '', phone: '', type: 'customer', tax_id: '', address: '', city: '', state: '', postcode: '', country: 'Malaysia', credit_limit: '', credit_terms: '30', overdue_limit: '', bank_name: '', bank_account_no: '' });
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Contact</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Add Contact</DialogTitle></DialogHeader>
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

              <Button onClick={handleCreate} className="w-full">Add Contact</Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No contacts</TableCell></TableRow>
                  ) : filtered.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
                      <TableCell>{c.email || '—'}</TableCell>
                      <TableCell>{c.phone || '—'}</TableCell>
                      <TableCell>{c.tax_id || '—'}</TableCell>
                      <TableCell className="text-right">{c.credit_limit ? `RM ${Number(c.credit_limit).toFixed(2)}` : '—'}</TableCell>
                      <TableCell>{c.credit_terms ? `${c.credit_terms}d` : '—'}</TableCell>
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
