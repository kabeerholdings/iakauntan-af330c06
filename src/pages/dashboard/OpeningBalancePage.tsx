import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Clock } from 'lucide-react';
import { toast } from 'sonner';

const OpeningBalancePage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [balances, setBalances] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [openTerm, setOpenTerm] = useState(false);
  const [balDate, setBalDate] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0];
  });
  const [entries, setEntries] = useState<{ account_id: string; debit: string; credit: string }[]>([]);
  const [termForm, setTermForm] = useState({ name: '', days: '30', description: '' });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [ob, acc, pt] = await Promise.all([
      supabase.from('opening_balances').select('*, chart_of_accounts(code, name, account_type)').eq('company_id', selectedCompany.id).order('balance_date'),
      supabase.from('chart_of_accounts').select('id, code, name, account_type').eq('company_id', selectedCompany.id).eq('is_active', true).order('code'),
      supabase.from('payment_terms').select('*').eq('company_id', selectedCompany.id).order('days'),
    ]);
    setBalances(ob.data || []);
    setAccounts(acc.data || []);
    setPaymentTerms(pt.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const fmt = (n: number) => `RM ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const addEntry = () => setEntries(e => [...e, { account_id: '', debit: '', credit: '' }]);
  const updateEntry = (i: number, field: string, value: string) => setEntries(e => e.map((en, idx) => idx === i ? { ...en, [field]: value } : en));

  const handleSaveBalances = async () => {
    if (!selectedCompany) return;
    const validEntries = entries.filter(e => e.account_id && (+e.debit || +e.credit));
    if (validEntries.length === 0) { toast.error('Add at least one entry'); return; }

    const totalDebit = validEntries.reduce((s, e) => s + (+e.debit || 0), 0);
    const totalCredit = validEntries.reduce((s, e) => s + (+e.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error(`Debits (${fmt(totalDebit)}) must equal Credits (${fmt(totalCredit)})`);
      return;
    }

    for (const entry of validEntries) {
      const { error } = await supabase.from('opening_balances').upsert({
        company_id: selectedCompany.id, account_id: entry.account_id,
        balance_date: balDate, debit_amount: +entry.debit || 0,
        credit_amount: +entry.credit || 0, created_by: user?.id,
      }, { onConflict: 'company_id,account_id,balance_date' });
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Opening balances saved');
    setOpen(false);
    setEntries([]);
    fetchData();
  };

  const handleCreateTerm = async () => {
    if (!selectedCompany || !termForm.name) { toast.error('Name required'); return; }
    const { error } = await supabase.from('payment_terms').insert({
      company_id: selectedCompany.id, name: termForm.name,
      days: +termForm.days || 30, description: termForm.description || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Payment term created');
    setOpenTerm(false);
    setTermForm({ name: '', days: '30', description: '' });
    fetchData();
  };

  const totalDebit = balances.reduce((s, b) => s + (Number(b.debit_amount) || 0), 0);
  const totalCredit = balances.reduce((s, b) => s + (Number(b.credit_amount) || 0), 0);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Opening Balance & Payment Terms</h1>
            <p className="text-sm text-muted-foreground">Set up initial account balances and configure payment terms</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="opening">
        <TabsList>
          <TabsTrigger value="opening">Opening Balances</TabsTrigger>
          <TabsTrigger value="payment-terms">Payment Terms</TabsTrigger>
        </TabsList>

        <TabsContent value="opening" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="grid sm:grid-cols-3 gap-4 flex-1 mr-4">
              <Card className="shadow-card"><CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-xl font-bold font-display">{fmt(totalDebit)}</p>
              </CardContent></Card>
              <Card className="shadow-card"><CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-xl font-bold font-display">{fmt(totalCredit)}</p>
              </CardContent></Card>
              <Card className="shadow-card"><CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className={`text-xl font-bold font-display ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-primary' : 'text-destructive'}`}>
                  {fmt(Math.abs(totalDebit - totalCredit))}
                  {Math.abs(totalDebit - totalCredit) < 0.01 && ' ✓'}
                </p>
              </CardContent></Card>
            </div>
            <Button onClick={() => { setOpen(true); if (entries.length === 0) addEntry(); }}><Plus className="h-4 w-4 mr-2" />Set Balances</Button>
          </div>

          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead><TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead><TableHead>Balance Date</TableHead>
                    <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No opening balances set. Click "Set Balances" to begin.</TableCell></TableRow>
                  ) : balances.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.chart_of_accounts?.code}</TableCell>
                      <TableCell className="font-medium">{b.chart_of_accounts?.name}</TableCell>
                      <TableCell><Badge variant="secondary">{b.chart_of_accounts?.account_type}</Badge></TableCell>
                      <TableCell>{b.balance_date}</TableCell>
                      <TableCell className="text-right">{Number(b.debit_amount) > 0 ? fmt(Number(b.debit_amount)) : ''}</TableCell>
                      <TableCell className="text-right">{Number(b.credit_amount) > 0 ? fmt(Number(b.credit_amount)) : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {balances.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right">{fmt(totalDebit)}</TableCell>
                      <TableCell className="text-right">{fmt(totalCredit)}</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-terms" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenTerm(true)}><Plus className="h-4 w-4 mr-2" />Add Payment Term</Button>
          </div>
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Days</TableHead>
                    <TableHead>Description</TableHead><TableHead>Default</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentTerms.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payment terms configured</TableCell></TableRow>
                  ) : paymentTerms.map(pt => (
                    <TableRow key={pt.id}>
                      <TableCell className="font-medium">{pt.name}</TableCell>
                      <TableCell>{pt.days} days</TableCell>
                      <TableCell className="text-muted-foreground">{pt.description || '—'}</TableCell>
                      <TableCell>{pt.is_default ? <Badge>Default</Badge> : '—'}</TableCell>
                      <TableCell>{pt.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Opening Balance Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Set Opening Balances</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Balance Date</Label><Input type="date" value={balDate} onChange={e => setBalDate(e.target.value)} /></div>
            <p className="text-sm text-muted-foreground">Enter the opening balances for each account. Total debits must equal total credits.</p>
            {entries.map((e, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <Select value={e.account_id} onValueChange={v => updateEntry(i, 'account_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Debit" value={e.debit} onChange={ev => updateEntry(i, 'debit', ev.target.value)} />
                <Input type="number" placeholder="Credit" value={e.credit} onChange={ev => updateEntry(i, 'credit', ev.target.value)} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addEntry}><Plus className="h-3 w-3 mr-1" />Add Row</Button>
            <div className="flex justify-between border-t border-border pt-3">
              <div className="text-sm">
                Debit: <strong>{fmt(entries.reduce((s, e) => s + (+e.debit || 0), 0))}</strong> |
                Credit: <strong>{fmt(entries.reduce((s, e) => s + (+e.credit || 0), 0))}</strong>
              </div>
              <Button onClick={handleSaveBalances}>Save Opening Balances</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Term Dialog */}
      <Dialog open={openTerm} onOpenChange={setOpenTerm}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Payment Term</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={termForm.name} onChange={e => setTermForm(f => ({ ...f, name: e.target.value }))} placeholder="Net 30" /></div>
            <div><Label>Days</Label><Input type="number" value={termForm.days} onChange={e => setTermForm(f => ({ ...f, days: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={termForm.description} onChange={e => setTermForm(f => ({ ...f, description: e.target.value }))} placeholder="Payment due within 30 days" /></div>
            <Button onClick={handleCreateTerm} className="w-full">Create Term</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpeningBalancePage;
