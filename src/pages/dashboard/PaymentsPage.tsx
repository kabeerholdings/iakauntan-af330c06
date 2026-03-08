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
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const PaymentsPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('receipt');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    payment_type: 'receipt', contact_id: '', payment_date: new Date().toISOString().split('T')[0],
    reference: '', payment_method: 'cash', bank_account_id: '', amount: '',
    currency: 'MYR', cheque_no: '', cheque_date: '', is_post_dated: false, notes: '', project: '',
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [pay, con, acc] = await Promise.all([
      supabase.from('payments').select('*, contacts(name)').eq('company_id', selectedCompany.id).order('payment_date', { ascending: false }),
      supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('chart_of_accounts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).in('account_type', ['asset']).order('code'),
    ]);
    setPayments(pay.data || []);
    setContacts(con.data || []);
    setAccounts(acc.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.amount) { toast.error('Amount required'); return; }
    const { error } = await supabase.from('payments').insert({
      company_id: selectedCompany.id, payment_type: form.payment_type,
      contact_id: form.contact_id || null, payment_date: form.payment_date,
      reference: form.reference || null, payment_method: form.payment_method,
      bank_account_id: form.bank_account_id || null, amount: +form.amount,
      currency: form.currency, cheque_no: form.cheque_no || null,
      cheque_date: form.cheque_date || null, is_post_dated: form.is_post_dated,
      notes: form.notes || null, project: form.project || null, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${form.payment_type === 'receipt' ? 'Receipt' : 'Payment'} recorded`);
    setOpen(false);
    setForm({ payment_type: activeTab, contact_id: '', payment_date: new Date().toISOString().split('T')[0], reference: '', payment_method: 'cash', bank_account_id: '', amount: '', currency: 'MYR', cheque_no: '', cheque_date: '', is_post_dated: false, notes: '', project: '' });
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const filtered = payments.filter(p => p.payment_type === activeTab);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New {activeTab === 'receipt' ? 'Receipt' : 'Payment'}</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Record {form.payment_type === 'receipt' ? 'Receipt' : 'Payment'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.payment_type} onValueChange={v => setForm(f => ({ ...f, payment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Customer Receipt</SelectItem>
                      <SelectItem value="payment">Supplier Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{form.payment_type === 'receipt' ? 'Customer' : 'Supplier'}</Label>
                  <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{contacts.filter(c => form.payment_type === 'receipt' ? ['customer', 'both'].includes(c.type) : ['supplier', 'both'].includes(c.type)).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
                <div><Label>Amount ({form.currency})</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Method</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bank Account</Label>
                  <Select value={form.bank_account_id} onValueChange={v => setForm(f => ({ ...f, bank_account_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {form.payment_method === 'cheque' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Cheque No.</Label><Input value={form.cheque_no} onChange={e => setForm(f => ({ ...f, cheque_no: e.target.value }))} /></div>
                  <div><Label>Cheque Date</Label><Input type="date" value={form.cheque_date} onChange={e => setForm(f => ({ ...f, cheque_date: e.target.value }))} /></div>
                </div>
              )}
              {form.payment_method === 'cheque' && (
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_post_dated} onCheckedChange={v => setForm(f => ({ ...f, is_post_dated: v }))} />
                  <Label>Post-dated cheque</Label>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Reference</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
                <div><Label>Project</Label><Input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="receipt">Receipts ({payments.filter(p => p.payment_type === 'receipt').length})</TabsTrigger>
          <TabsTrigger value="payment">Payments ({payments.filter(p => p.payment_type === 'payment').length})</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>{activeTab === 'receipt' ? 'Customer' : 'Supplier'}</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No {activeTab}s yet</TableCell></TableRow>
                  ) : filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.payment_date}</TableCell>
                      <TableCell className="font-medium">{p.contacts?.name || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{p.payment_method}</Badge></TableCell>
                      <TableCell>{p.reference || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{p.currency} {Number(p.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'posted' ? 'default' : 'secondary'}>{p.status}</Badge>
                        {p.is_bounced && <Badge variant="destructive" className="ml-1">Bounced</Badge>}
                        {p.is_post_dated && <Badge variant="outline" className="ml-1">PDC</Badge>}
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

export default PaymentsPage;
