import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, Link2, CheckCircle2, Clock, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import { format } from 'date-fns';

type BankFeed = { id: string; bank_name: string | null; account_number: string | null; is_active: boolean; last_synced_at: string | null; bank_account_id: string | null; chart_of_accounts?: { name: string } | null };
type Transaction = { id: string; transaction_date: string; description: string | null; amount: number; transaction_type: string; status: string; category: string | null };

const BankFeedsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const [feeds, setFeeds] = useState<BankFeed[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [form, setForm] = useState({ bank_name: '', account_number: '', bank_account_id: '' });
  const [importData, setImportData] = useState<{ date: string; description: string; amount: string; type: string }[]>([{ date: '', description: '', amount: '', type: 'debit' }]);

  useEffect(() => { if (selectedCompany) fetchData(); }, [selectedCompany]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: f }, { data: t }, { data: a }] = await Promise.all([
      supabase.from('bank_feeds').select('*, chart_of_accounts:bank_account_id(name)').eq('company_id', selectedCompany!.id),
      supabase.from('bank_feed_transactions').select('*').eq('company_id', selectedCompany!.id).order('transaction_date', { ascending: false }).limit(100),
      supabase.from('chart_of_accounts').select('id, code, name').eq('company_id', selectedCompany!.id).in('account_type', ['asset']).ilike('name', '%bank%'),
    ]);
    setFeeds(f || []);
    setTransactions(t || []);
    setAccounts(a || []);
    setLoading(false);
  };

  const handleCreateFeed = async () => {
    if (!form.bank_name.trim()) { toast.error('Bank name required'); return; }
    const { error } = await supabase.from('bank_feeds').insert({ company_id: selectedCompany!.id, bank_name: form.bank_name, account_number: form.account_number || null, bank_account_id: form.bank_account_id || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Bank feed created');
    setShowDialog(false);
    setForm({ bank_name: '', account_number: '', bank_account_id: '' });
    fetchData();
  };

  const handleImport = async () => {
    if (!selectedFeed) { toast.error('Select a bank feed'); return; }
    const valid = importData.filter(d => d.date && d.amount);
    if (valid.length === 0) { toast.error('No valid transactions'); return; }
    const { error } = await supabase.from('bank_feed_transactions').insert(
      valid.map(d => ({ bank_feed_id: selectedFeed, company_id: selectedCompany!.id, transaction_date: d.date, description: d.description, amount: Math.abs(+d.amount), transaction_type: d.type }))
    );
    if (error) { toast.error(error.message); return; }
    toast.success(`${valid.length} transactions imported`);
    setShowImport(false);
    setImportData([{ date: '', description: '', amount: '', type: 'debit' }]);
    fetchData();
  };

  const handleMatch = async (txId: string) => {
    await supabase.from('bank_feed_transactions').update({ status: 'matched' }).eq('id', txId);
    toast.success('Transaction matched');
    fetchData();
  };

  const pending = transactions.filter(t => t.status === 'pending');
  const matched = transactions.filter(t => t.status === 'matched');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">Bank Feeds</h1><p className="text-muted-foreground">Import and match bank transactions</p></div>
        <div className="flex gap-2">
          <Dialog open={showImport} onOpenChange={setShowImport}>
            <DialogTrigger asChild><Button variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Import</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Import Transactions</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Bank Feed</Label>
                  <Select value={selectedFeed || ''} onValueChange={setSelectedFeed}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>{feeds.map(f => <SelectItem key={f.id} value={f.id}>{f.bank_name} - {f.account_number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {importData.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2">
                      <Input type="date" value={row.date} onChange={(e) => { const d = [...importData]; d[idx].date = e.target.value; setImportData(d); }} />
                      <Input placeholder="Description" value={row.description} onChange={(e) => { const d = [...importData]; d[idx].description = e.target.value; setImportData(d); }} />
                      <Input type="number" placeholder="Amount" value={row.amount} onChange={(e) => { const d = [...importData]; d[idx].amount = e.target.value; setImportData(d); }} />
                      <Select value={row.type} onValueChange={(v) => { const d = [...importData]; d[idx].type = v; setImportData(d); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="debit">Debit</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent>
                      </Select>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setImportData([...importData, { date: '', description: '', amount: '', type: 'debit' }])}><Plus className="h-3 w-3 mr-1" />Add Row</Button>
                </div>
                <Button onClick={handleImport}>Import</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Bank</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Bank Feed</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
                <div><Label>Account Number</Label><Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></div>
                <div><Label>Link to Account</Label>
                  <Select value={form.bank_account_id} onValueChange={(v) => setForm({ ...form, bank_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateFeed}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Connected Banks</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{feeds.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{pending.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Matched</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{matched.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Imported</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{transactions.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList><TabsTrigger value="pending"><Clock className="h-4 w-4 mr-1" />Pending ({pending.length})</TabsTrigger><TabsTrigger value="matched"><CheckCircle2 className="h-4 w-4 mr-1" />Matched ({matched.length})</TabsTrigger><TabsTrigger value="feeds"><Landmark className="h-4 w-4 mr-1" />Banks ({feeds.length})</TabsTrigger></TabsList>
        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {pending.length === 0 ? <p className="text-muted-foreground">No pending transactions</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pending.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{format(new Date(t.transaction_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{t.description || '-'}</TableCell>
                        <TableCell><Badge variant={t.transaction_type === 'credit' ? 'default' : 'secondary'}>{t.transaction_type}</Badge></TableCell>
                        <TableCell className={`text-right font-medium ${t.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{t.transaction_type === 'credit' ? '+' : '-'}{fmt(t.amount)}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => handleMatch(t.id)}><Link2 className="h-3 w-3 mr-1" />Match</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="matched">
          <Card><CardContent className="pt-6">
            {matched.length === 0 ? <p className="text-muted-foreground">No matched transactions</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>{matched.map(t => (
                  <TableRow key={t.id}><TableCell>{format(new Date(t.transaction_date), 'dd MMM yyyy')}</TableCell><TableCell>{t.description || '-'}</TableCell><TableCell><Badge variant="outline">{t.transaction_type}</Badge></TableCell><TableCell className="text-right">{fmt(t.amount)}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="feeds">
          <Card><CardContent className="pt-6">
            {feeds.length === 0 ? <p className="text-muted-foreground">No bank feeds configured</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Bank</TableHead><TableHead>Account</TableHead><TableHead>Linked Account</TableHead><TableHead>Last Synced</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{feeds.map(f => (
                  <TableRow key={f.id}><TableCell className="font-medium">{f.bank_name}</TableCell><TableCell>{f.account_number || '-'}</TableCell><TableCell>{f.chart_of_accounts?.name || '-'}</TableCell><TableCell>{f.last_synced_at ? format(new Date(f.last_synced_at), 'dd MMM yyyy HH:mm') : 'Never'}</TableCell><TableCell><Badge variant={f.is_active ? 'default' : 'secondary'}>{f.is_active ? 'Active' : 'Inactive'}</Badge></TableCell></TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BankFeedsPage;
