import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Lock, Unlock, Plus, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const lockTypes = [
  { value: 'period_lock', label: 'Period Lock', description: 'Prevent modifications to transactions before a specific date' },
  { value: 'invoice_lock', label: 'Invoice Lock', description: 'Lock finalized invoices from editing' },
  { value: 'journal_lock', label: 'Journal Entry Lock', description: 'Lock posted journal entries' },
  { value: 'payroll_lock', label: 'Payroll Lock', description: 'Lock processed payroll periods' },
  { value: 'stock_lock', label: 'Stock Lock', description: 'Lock stock adjustments and movements' },
  { value: 'user_access_lock', label: 'User Access Lock', description: 'Restrict user access during maintenance' },
];

const SecurityLockPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [locks, setLocks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lock_type: 'period_lock', lock_date: '', notes: '' });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('security_locks').select('*')
      .eq('company_id', selectedCompany.id).order('created_at', { ascending: false });
    setLocks(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.lock_type) return;
    const { error } = await supabase.from('security_locks').insert({
      company_id: selectedCompany.id,
      lock_type: form.lock_type,
      lock_date: form.lock_date || null,
      is_active: true,
      locked_by: user?.id,
      notes: form.notes,
    });
    if (error) toast.error(error.message);
    else { toast.success('Security lock created'); setOpen(false); setForm({ lock_type: 'period_lock', lock_date: '', notes: '' }); fetchData(); }
  };

  const toggleLock = async (id: string, currentState: boolean) => {
    const { error } = await supabase.from('security_locks').update({ is_active: !currentState }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`Lock ${!currentState ? 'activated' : 'deactivated'}`); fetchData(); }
  };

  const deleteLock = async (id: string) => {
    const { error } = await supabase.from('security_locks').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Lock removed'); fetchData(); }
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const activeLocks = locks.filter(l => l.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Advanced Security Lock</h1>
            <p className="text-sm text-muted-foreground">Control and restrict access to sensitive transactions and periods</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Lock</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Security Lock</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Lock Type</Label>
                <Select value={form.lock_type} onValueChange={v => setForm({ ...form, lock_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {lockTypes.map(lt => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{lockTypes.find(lt => lt.value === form.lock_type)?.description}</p>
              </div>
              <div>
                <Label>Lock Date (transactions before this date are locked)</Label>
                <Input type="date" value={form.lock_date} onChange={e => setForm({ ...form, lock_date: e.target.value })} />
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Reason for lock..." /></div>
              <Button onClick={handleCreate} className="w-full">Create Lock</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Locks</p>
                <p className="text-2xl font-bold font-display text-primary">{activeLocks}</p>
              </div>
              <Lock className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive Locks</p>
                <p className="text-2xl font-bold font-display">{locks.length - activeLocks}</p>
              </div>
              <Unlock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lock Types</p>
                <p className="text-2xl font-bold font-display">{new Set(locks.map(l => l.lock_type)).size}</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lock Types Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lockTypes.map(lt => {
          const lock = locks.find(l => l.lock_type === lt.value && l.is_active);
          return (
            <Card key={lt.value} className={`shadow-card ${lock ? 'border-primary/30' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {lock ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                      <h3 className="font-display font-semibold text-sm">{lt.label}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{lt.description}</p>
                    {lock?.lock_date && (
                      <p className="text-xs mt-2 flex items-center gap-1"><Calendar className="h-3 w-3" /> Locked before: {lock.lock_date}</p>
                    )}
                  </div>
                  <Badge variant={lock ? 'default' : 'secondary'}>{lock ? 'Locked' : 'Open'}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All Locks Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">All Security Locks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Lock Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locks.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No security locks configured</TableCell></TableRow>
              ) : locks.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{lockTypes.find(lt => lt.value === l.lock_type)?.label || l.lock_type}</TableCell>
                  <TableCell>{l.lock_date || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.notes || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={l.is_active} onCheckedChange={() => toggleLock(l.id, l.is_active)} />
                      <Badge variant={l.is_active ? 'default' : 'secondary'}>{l.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteLock(l.id)}>Remove</Button>
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

export default SecurityLockPage;
