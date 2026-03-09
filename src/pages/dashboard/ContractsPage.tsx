import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';

type Contract = {
  id: string;
  contract_number: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  currency: string;
  renewal_type: string;
  auto_renew: boolean;
  contact_id: string | null;
  contacts?: { name: string } | null;
};

const ContractsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ contract_number: '', title: '', description: '', status: 'draft', start_date: '', end_date: '', amount: 0, renewal_type: 'none', auto_renew: false, contact_id: '' });

  useEffect(() => { if (selectedCompany) fetchData(); }, [selectedCompany]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: c }, { data: ct }] = await Promise.all([
      supabase.from('contracts').select('*, contacts(name)').eq('company_id', selectedCompany!.id).order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, name').eq('company_id', selectedCompany!.id),
    ]);
    setContracts(c || []);
    setContacts(ct || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.contract_number.trim() || !form.title.trim()) { toast.error('Contract number and title required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('contracts').insert({
      company_id: selectedCompany!.id,
      contract_number: form.contract_number,
      title: form.title,
      description: form.description || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      amount: form.amount,
      renewal_type: form.renewal_type,
      auto_renew: form.auto_renew,
      contact_id: form.contact_id || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Contract created');
    setShowDialog(false);
    setForm({ contract_number: '', title: '', description: '', status: 'draft', start_date: '', end_date: '', amount: 0, renewal_type: 'none', auto_renew: false, contact_id: '' });
    fetchData();
  };

  const statusColor = (status: string) => {
    switch (status) { case 'draft': return 'secondary'; case 'active': return 'default'; case 'expired': return 'destructive'; case 'terminated': return 'outline'; default: return 'secondary'; }
  };

  const active = contracts.filter(c => c.status === 'active');
  const expiringSoon = contracts.filter(c => c.end_date && differenceInDays(parseISO(c.end_date), new Date()) <= 30 && differenceInDays(parseISO(c.end_date), new Date()) > 0);
  const expired = contracts.filter(c => c.end_date && isPast(parseISO(c.end_date)));
  const totalValue = contracts.reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">Contracts</h1><p className="text-muted-foreground">Manage agreements and renewals</p></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Contract</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Contract</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contract #</Label><Input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Customer</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
                <div><Label>Renewal</Label>
                  <Select value={form.renewal_type} onValueChange={(v) => setForm({ ...form, renewal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(totalValue)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{active.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{expiringSoon.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{expired.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({contracts.length})</TabsTrigger>
          <TabsTrigger value="active"><CheckCircle className="h-4 w-4 mr-1" />Active ({active.length})</TabsTrigger>
          <TabsTrigger value="expiring"><AlertTriangle className="h-4 w-4 mr-1" />Expiring ({expiringSoon.length})</TabsTrigger>
        </TabsList>
        {['all', 'active', 'expiring'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="pt-6">
                {loading ? <p className="text-muted-foreground">Loading...</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Contract #</TableHead><TableHead>Title</TableHead><TableHead>Customer</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(tab === 'all' ? contracts : tab === 'active' ? active : expiringSoon).map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.contract_number}</TableCell>
                          <TableCell className="font-medium">{c.title}</TableCell>
                          <TableCell>{c.contacts?.name || '-'}</TableCell>
                          <TableCell className="text-sm">{c.start_date && c.end_date ? `${format(parseISO(c.start_date), 'dd MMM yy')} - ${format(parseISO(c.end_date), 'dd MMM yy')}` : '-'}</TableCell>
                          <TableCell className="text-right">{fmt(c.amount)}</TableCell>
                          <TableCell><Badge variant={statusColor(c.status)}>{c.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ContractsPage;
