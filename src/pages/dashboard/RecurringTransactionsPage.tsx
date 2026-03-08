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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, addWeeks, addMonths, addQuarters, addYears, format } from 'date-fns';

const RecurringTransactionsPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    transaction_type: 'invoice', description: '', contact_id: '', amount: '',
    frequency: 'monthly', next_run_date: new Date().toISOString().split('T')[0],
    end_date: '', auto_post: false,
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [rt, con] = await Promise.all([
      supabase.from('recurring_transactions').select('*, contacts(name)').eq('company_id', selectedCompany.id).order('next_run_date'),
      supabase.from('contacts').select('id, name, type').eq('company_id', selectedCompany.id).eq('is_active', true),
    ]);
    setTransactions(rt.data || []);
    setContacts(con.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.description || !form.amount) { toast.error('Description and amount required'); return; }
    const { error } = await supabase.from('recurring_transactions').insert({
      company_id: selectedCompany.id, transaction_type: form.transaction_type,
      description: form.description, contact_id: form.contact_id || null,
      amount: Number(form.amount), frequency: form.frequency,
      next_run_date: form.next_run_date, end_date: form.end_date || null,
      auto_post: form.auto_post, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Recurring transaction created');
    setOpen(false);
    setForm({ transaction_type: 'invoice', description: '', contact_id: '', amount: '', frequency: 'monthly', next_run_date: new Date().toISOString().split('T')[0], end_date: '', auto_post: false });
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('recurring_transactions').update({ is_active: !current }).eq('id', id);
    fetchData();
  };

  const generateNow = async (rt: any) => {
    // Generate the transaction based on type
    if (rt.transaction_type === 'invoice' && rt.contact_id) {
      const invNum = `REC-${format(new Date(), 'yyyyMMdd')}-${rt.total_generated + 1}`;
      const { error } = await supabase.from('invoices').insert({
        company_id: selectedCompany!.id, invoice_number: invNum, invoice_type: 'sales',
        contact_id: rt.contact_id, invoice_date: new Date().toISOString().split('T')[0],
        subtotal: Number(rt.amount), total_amount: Number(rt.amount), notes: `Auto-generated from: ${rt.description}`,
      });
      if (error) { toast.error(error.message); return; }
    } else if (rt.transaction_type === 'journal_entry') {
      const { error } = await supabase.from('journal_entries').insert({
        company_id: selectedCompany!.id, description: `Recurring: ${rt.description}`,
        entry_date: new Date().toISOString().split('T')[0], status: rt.auto_post ? 'posted' : 'draft',
      });
      if (error) { toast.error(error.message); return; }
    }

    // Update next run date
    const nextDate = getNextDate(rt.next_run_date, rt.frequency);
    await supabase.from('recurring_transactions').update({
      last_run_date: new Date().toISOString().split('T')[0],
      next_run_date: nextDate,
      total_generated: (rt.total_generated || 0) + 1,
    }).eq('id', rt.id);

    toast.success('Transaction generated');
    fetchData();
  };

  const getNextDate = (current: string, frequency: string) => {
    const d = new Date(current);
    switch (frequency) {
      case 'weekly': return format(addWeeks(d, 1), 'yyyy-MM-dd');
      case 'monthly': return format(addMonths(d, 1), 'yyyy-MM-dd');
      case 'quarterly': return format(addMonths(d, 3), 'yyyy-MM-dd');
      case 'yearly': return format(addYears(d, 1), 'yyyy-MM-dd');
      default: return format(addMonths(d, 1), 'yyyy-MM-dd');
    }
  };

  const freqLabel = (f: string) => ({ weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }[f] || f);
  const typeLabel = (t: string) => ({ invoice: 'Invoice', journal_entry: 'Journal Entry', payment_voucher: 'Payment Voucher' }[t] || t);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const due = transactions.filter(t => t.is_active && t.next_run_date <= new Date().toISOString().split('T')[0]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Recurring Transactions</h1>
          <p className="text-sm text-muted-foreground">Automate invoices, journal entries, and payment vouchers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Recurring</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Recurring Transaction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Transaction Type</Label>
                <Select value={form.transaction_type} onValueChange={v => setForm(f => ({ ...f, transaction_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="journal_entry">Journal Entry</SelectItem>
                    <SelectItem value="payment_voucher">Payment Voucher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Monthly rental invoice" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contact</Label>
                  <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Amount (RM)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Next Run Date</Label><Input type="date" value={form.next_run_date} onChange={e => setForm(f => ({ ...f, next_run_date: e.target.value }))} /></div>
              </div>
              <div><Label>End Date (optional)</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.auto_post} onCheckedChange={v => setForm(f => ({ ...f, auto_post: v }))} />
                <Label>Auto-post when generated</Label>
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {due.length > 0 && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-primary">{due.length} recurring transaction(s) are due for processing</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Amount (RM)</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No recurring transactions. Create one to automate your bookkeeping.</TableCell></TableRow>
              ) : transactions.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabel(t.transaction_type)}</Badge></TableCell>
                  <TableCell>{t.contacts?.name || '—'}</TableCell>
                  <TableCell>{freqLabel(t.frequency)}</TableCell>
                  <TableCell className="text-right">{Number(t.amount).toFixed(2)}</TableCell>
                  <TableCell>{t.next_run_date}</TableCell>
                  <TableCell className="text-center">{t.total_generated}</TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleActive(t.id, t.is_active)}>
                      {t.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => generateNow(t)} disabled={!t.is_active}>
                      <Play className="h-3 w-3 mr-1" />Run
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecurringTransactionsPage;
