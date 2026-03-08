import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const paymentTypes = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'online_banking', label: 'Online Banking' },
  { value: 'other', label: 'Other' },
];

interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  type: string;
  bank_name: string | null;
  account_number: string | null;
  account_id: string | null;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
}

const emptyForm = {
  name: '',
  code: '',
  type: 'bank_transfer',
  bank_name: '',
  account_number: '',
  is_default: false,
  notes: '',
};

const PaymentMethodsPage = () => {
  const { selectedCompany } = useCompany();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMethods = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('name');
    setMethods((data || []) as PaymentMethod[]);
    setLoading(false);
  };

  useEffect(() => { fetchMethods(); }, [selectedCompany?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setForm({
      name: m.name,
      code: m.code,
      type: m.type,
      bank_name: m.bank_name || '',
      account_number: m.account_number || '',
      is_default: m.is_default,
      notes: m.notes || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedCompany) return;
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and Code are required');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      type: form.type,
      bank_name: form.bank_name.trim() || null,
      account_number: form.account_number.trim() || null,
      is_default: form.is_default,
      notes: form.notes.trim() || null,
      company_id: selectedCompany.id,
    };

    if (editing) {
      const { error } = await supabase.from('payment_methods').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Payment method updated');
    } else {
      const { error } = await supabase.from('payment_methods').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Payment method created');
    }
    setSaving(false);
    setShowDialog(false);
    fetchMethods();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment method?')) return;
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Payment method deleted');
    fetchMethods();
  };

  const toggleActive = async (m: PaymentMethod) => {
    const { error } = await supabase.from('payment_methods').update({ is_active: !m.is_active }).eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    fetchMethods();
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Payment Methods</h1>
          <p className="text-muted-foreground text-sm">Manage payment methods for transactions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Payment Method
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : methods.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No payment methods yet
                </TableCell></TableRow>
              ) : methods.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">{m.code}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {paymentTypes.find(t => t.value === m.type)?.label || m.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.bank_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{m.account_number || '—'}</TableCell>
                  <TableCell>{m.is_default && <Badge>Default</Badge>}</TableCell>
                  <TableCell>
                    <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Edit' : 'Add'} Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={set('name')} placeholder="e.g. Maybank Current" />
              </div>
              <div>
                <Label>Code *</Label>
                <Input value={form.code} onChange={set('code')} placeholder="e.g. MBB-01" />
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {paymentTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={set('bank_name')} placeholder="e.g. Maybank" />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input value={form.account_number} onChange={set('account_number')} placeholder="e.g. 5123456789" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={set('notes')} placeholder="Optional notes" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
              <Label>Set as default payment method</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Payment Method'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethodsPage;
