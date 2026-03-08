import { useEffect, useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ArrowDownLeft, ArrowUpRight, MoreHorizontal, XCircle, Printer, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

const CashBookPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<'receipt' | 'payment'>('receipt');
  const [form, setForm] = useState({
    voucher_date: new Date().toISOString().split('T')[0], voucher_no: '', contact_id: '', payee_name: '',
    description: '', payment_method_id: '', cheque_no: '', bank_charge: 0,
    lines: [{ account_id: '', description: '', amount: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [e, c, a, pm] = await Promise.all([
      supabase.from('cash_book_entries').select('*, cash_book_lines(*), contacts(name), payment_methods(name)').eq('company_id', selectedCompany.id).order('voucher_date', { ascending: false }),
      supabase.from('contacts').select('id, name, type').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('chart_of_accounts').select('id, code, name').eq('company_id', selectedCompany.id).eq('is_active', true).order('code'),
      supabase.from('payment_methods').select('id, name, type').eq('company_id', selectedCompany.id).eq('is_active', true),
    ]);
    setEntries(e.data || []);
    setContacts(c.data || []);
    setAccounts(a.data || []);
    setPaymentMethods(pm.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  // 12-month summary like AutoCount
  const monthlySummary = useMemo(() => {
    const months: Record<string, { month: string; receipts: number; payments: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().substring(0, 7);
      months[key] = { month: key, receipts: 0, payments: 0 };
    }
    entries.filter(e => e.status !== 'void').forEach(entry => {
      const m = entry.voucher_date?.substring(0, 7);
      if (months[m]) {
        const amt = Number(entry.total_amount) || 0;
        if (entry.voucher_type === 'receipt') months[m].receipts += amt;
        else months[m].payments += amt;
      }
    });
    return Object.values(months);
  }, [entries]);

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts = { unapplied: 0, partial: 0, applied: 0, void: 0 };
    entries.forEach(e => {
      if (e.status === 'void') counts.void++;
      else if (e.status === 'applied') counts.applied++;
      else if (e.status === 'partial_applied') counts.partial++;
      else counts.unapplied++;
    });
    return counts;
  }, [entries]);

  const totalAmount = form.lines.reduce((s, l) => s + (+l.amount || 0), 0);
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { account_id: '', description: '', amount: 0 }] }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const openNew = (type: 'receipt' | 'payment') => {
    setVoucherType(type);
    setForm({ voucher_date: new Date().toISOString().split('T')[0], voucher_no: '', contact_id: '', payee_name: '', description: '', payment_method_id: '', cheque_no: '', bank_charge: 0, lines: [{ account_id: '', description: '', amount: 0 }] });
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedCompany || totalAmount <= 0) { toast.error('Amount must be greater than 0'); return; }
    const { data, error } = await supabase.from('cash_book_entries').insert({
      company_id: selectedCompany.id, voucher_type: voucherType, voucher_date: form.voucher_date,
      voucher_no: form.voucher_no || null, contact_id: form.contact_id || null, payee_name: form.payee_name || null,
      description: form.description || null, payment_method_id: form.payment_method_id || null,
      cheque_no: form.cheque_no || null, bank_charge: +form.bank_charge || 0, total_amount: totalAmount, created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await supabase.from('cash_book_lines').insert(
        form.lines.filter(l => l.account_id && +l.amount > 0).map(l => ({
          cash_book_entry_id: data.id, account_id: l.account_id, description: l.description || null, amount: +l.amount,
        }))
      );
    }
    toast.success(`${voucherType === 'receipt' ? 'Receipt' : 'Payment'} Voucher created`);
    setOpen(false);

    // Prompt to create knock off if contact is selected (AutoCount behavior)
    if (form.contact_id) {
      toast.info('You may want to create a Knock Off Entry for this payment.', {
        action: { label: 'Go to Knock Off', onClick: () => navigate('/dashboard/knock-off') },
        duration: 8000,
      });
    }
    fetchData();
  };

  const handleVoid = async (id: string) => {
    await supabase.from('cash_book_entries').update({ status: 'void' }).eq('id', id);
    toast.success('Voucher voided');
    fetchData();
  };

  const handleUnvoid = async (id: string) => {
    await supabase.from('cash_book_entries').update({ status: 'active' }).eq('id', id);
    toast.success('Voucher restored');
    fetchData();
  };

  const receipts = entries.filter(e => e.voucher_type === 'receipt' && e.status !== 'void');
  const payments = entries.filter(e => e.voucher_type === 'payment' && e.status !== 'void');
  const totalReceipts = receipts.reduce((s, e) => s + (+e.total_amount || 0), 0);
  const totalPayments = payments.reduce((s, e) => s + (+e.total_amount || 0), 0);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const renderTable = (data: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead><TableHead>Voucher No</TableHead><TableHead>Type</TableHead>
          <TableHead>Payee / Contact</TableHead><TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No entries yet</TableCell></TableRow>
        ) : data.map(e => (
          <TableRow key={e.id}>
            <TableCell>{e.voucher_date}</TableCell>
            <TableCell className="font-mono font-medium">{e.voucher_no || '—'}</TableCell>
            <TableCell>
              <Badge variant={e.voucher_type === 'receipt' ? 'default' : 'secondary'}>
                {e.voucher_type === 'receipt' ? 'Receipt' : 'Payment'}
              </Badge>
            </TableCell>
            <TableCell>{e.contacts?.name || e.payee_name || '—'}</TableCell>
            <TableCell className="text-muted-foreground max-w-[200px] truncate">{e.description || '—'}</TableCell>
            <TableCell className="text-right font-medium">{fmt(+e.total_amount)}</TableCell>
            <TableCell>
              <Badge variant={e.status === 'void' ? 'destructive' : e.status === 'applied' ? 'default' : 'secondary'}>{e.status}</Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/dashboard/knock-off')}>
                    <Link2 className="h-4 w-4 mr-2" />Apply (Knock Off)
                  </DropdownMenuItem>
                  {e.status === 'void' ? (
                    <DropdownMenuItem onClick={() => handleUnvoid(e.id)}>Unvoid</DropdownMenuItem>
                  ) : e.status === 'active' ? (
                    <DropdownMenuItem onClick={() => handleVoid(e.id)} className="text-destructive">
                      <XCircle className="h-4 w-4 mr-2" />Void
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Cash Book Entry</h1>
        <div className="flex gap-2">
          <Button onClick={() => openNew('receipt')} variant="default"><ArrowDownLeft className="h-4 w-4 mr-2" />Receipt Voucher</Button>
          <Button onClick={() => openNew('payment')} variant="outline"><ArrowUpRight className="h-4 w-4 mr-2" />Payment Voucher</Button>
        </div>
      </div>

      {/* Status Summary Cards - AutoCount style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unapplied</p><p className="text-2xl font-bold">{statusCounts.unapplied}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Partial Applied</p><p className="text-2xl font-bold">{statusCounts.partial}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Applied</p><p className="text-2xl font-bold text-primary">{statusCounts.applied}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Void</p><p className="text-2xl font-bold text-muted-foreground">{statusCounts.void}</p></CardContent></Card>
      </div>

      {/* 12-Month Chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm">12-Month Cash Flow Summary</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlySummary}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="receipts" fill="hsl(var(--primary))" name="Receipts" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payments" fill="hsl(var(--muted-foreground))" name="Payments" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Totals Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Receipts</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{fmt(totalReceipts)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Payments</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{fmt(totalPayments)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Cash Flow</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${totalReceipts - totalPayments >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(totalReceipts - totalPayments)}</p></CardContent></Card>
      </div>

      {/* Listing */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
                <TabsTrigger value="receipts">Receipts ({receipts.length})</TabsTrigger>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="all">{renderTable(entries)}</TabsContent>
            <TabsContent value="receipts">{renderTable(receipts)}</TabsContent>
            <TabsContent value="payments">{renderTable(payments)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{voucherType === 'receipt' ? 'New Receipt Voucher' : 'New Payment Voucher'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Date</Label><Input type="date" value={form.voucher_date} onChange={e => setForm(f => ({ ...f, voucher_date: e.target.value }))} /></div>
              <div><Label>Voucher No</Label><Input value={form.voucher_no} onChange={e => setForm(f => ({ ...f, voucher_no: e.target.value }))} placeholder="Auto" /></div>
              <div>
                <Label>{voucherType === 'receipt' ? 'Debtor' : 'Creditor'}</Label>
                <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>
                    {contacts.filter(c => voucherType === 'receipt' ? ['customer', 'both'].includes(c.type) : ['supplier', 'both'].includes(c.type)).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Payee Name</Label><Input value={form.payee_name} onChange={e => setForm(f => ({ ...f, payee_name: e.target.value }))} placeholder="If not a contact" /></div>
              <div>
                <Label>Payment Method</Label>
                <Select value={form.payment_method_id} onValueChange={v => setForm(f => ({ ...f, payment_method_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cheque No</Label><Input value={form.cheque_no} onChange={e => setForm(f => ({ ...f, cheque_no: e.target.value }))} /></div>
              <div><Label>Bank Charge</Label><Input type="number" value={form.bank_charge || ''} onChange={e => setForm(f => ({ ...f, bank_charge: +e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <Label className="mb-2 block">Detail Lines</Label>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <Select value={l.account_id} onValueChange={v => updateLine(i, 'account_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Description" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  <Input type="number" placeholder="Amount" value={l.amount || ''} onChange={e => updateLine(i, 'amount', e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div className="text-sm">
                <span>Total: <strong>RM {totalAmount.toFixed(2)}</strong></span>
                {+form.bank_charge > 0 && <span className="ml-4">Bank Charge: <strong>RM {(+form.bank_charge).toFixed(2)}</strong></span>}
              </div>
              <Button onClick={handleCreate} disabled={totalAmount <= 0}>Save Voucher</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashBookPage;
