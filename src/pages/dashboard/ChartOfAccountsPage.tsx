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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const defaultAccountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const typeColors: Record<string, string> = { asset: 'default', liability: 'secondary', equity: 'outline', revenue: 'default', expense: 'destructive' };

const ChartOfAccountsPage = () => {
  const { selectedCompany } = useCompany();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', account_type: 'asset', description: '' });
  const [customType, setCustomType] = useState('');
  const [showCustomType, setShowCustomType] = useState(false);

  const existingTypes = Array.from(new Set(accounts.map(a => a.account_type))).filter(t => !defaultAccountTypes.includes(t));
  const accountTypes = [...defaultAccountTypes, ...existingTypes];

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('chart_of_accounts').select('*').eq('company_id', selectedCompany.id).order('code');
    setAccounts(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const resetForm = () => {
    setForm({ code: '', name: '', account_type: 'asset', description: '' });
    setCustomType('');
    setShowCustomType(false);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (account: any) => {
    const isCustom = !defaultAccountTypes.includes(account.account_type) && !existingTypes.includes(account.account_type);
    setForm({
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      description: account.description || '',
    });
    if (isCustom) {
      setShowCustomType(true);
      setCustomType(account.account_type);
    } else {
      setShowCustomType(false);
      setCustomType('');
    }
    setEditingId(account.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCompany || !form.code || !form.name || !form.account_type) {
      toast.error('Code, Name and Type are required');
      return;
    }

    if (editingId) {
      const { error } = await supabase.from('chart_of_accounts').update({
        code: form.code,
        name: form.name,
        account_type: form.account_type,
        description: form.description || null,
      }).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success('Account updated');
    } else {
      const { error } = await supabase.from('chart_of_accounts').insert({
        company_id: selectedCompany.id,
        code: form.code,
        name: form.name,
        account_type: form.account_type,
        description: form.description || null,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Account created');
    }

    setOpen(false);
    resetForm();
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Chart of Accounts</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Account</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{editingId ? 'Edit Account' : 'Add Account'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="1000" /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={showCustomType ? '__other__' : form.account_type} onValueChange={v => {
                    if (v === '__other__') {
                      setShowCustomType(true);
                      setForm(f => ({ ...f, account_type: customType || '' }));
                    } else {
                      setShowCustomType(false);
                      setCustomType('');
                      setForm(f => ({ ...f, account_type: v }));
                    }
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {accountTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                      <SelectItem value="__other__">Other (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {showCustomType && (
                <div>
                  <Label>Custom Type Name</Label>
                  <Input value={customType} onChange={e => { setCustomType(e.target.value); setForm(f => ({ ...f, account_type: e.target.value.toLowerCase().trim() })); }} placeholder="e.g. contra-asset" />
                </div>
              )}
              <div><Label>Account Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cash at Bank" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <Button onClick={handleSave} className="w-full">{editingId ? 'Update Account' : 'Add Account'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No accounts yet</TableCell></TableRow>
              ) : accounts.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.code}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell><Badge variant={(typeColors[a.account_type] || 'secondary') as any}>{a.account_type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{a.description || '—'}</TableCell>
                  <TableCell>{a.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
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

export default ChartOfAccountsPage;
