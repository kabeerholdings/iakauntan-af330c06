import { useEffect, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const ExpensesPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt, symbol } = useCurrency();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], category: '', tax_amount: '0' });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('expenses').select('*').eq('company_id', selectedCompany.id).order('expense_date', { ascending: false });
    setExpenses(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.description || !form.amount) { toast.error('Fill required fields'); return; }
    const { error } = await supabase.from('expenses').insert({
      company_id: selectedCompany.id,
      description: form.description,
      amount: +form.amount,
      expense_date: form.expense_date,
      category: form.category || null,
      tax_amount: +form.tax_amount || 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Expense added');
    setOpen(false);
    setForm({ description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], category: '', tax_amount: '0' });
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="page-header">
        <h1 className="page-title">Expenses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1 sm:mr-2" />Add Expense</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Add Expense</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="form-grid-2">
                <div><Label>Amount ({symbol})</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div><Label>Tax Amount</Label><Input type="number" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} /></div>
              </div>
              <div className="form-grid-2">
                <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
                <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Office Supplies" /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">Add Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="table-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">No expenses yet</TableCell></TableRow>
                ) : expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{e.expense_date}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{e.description}</span>
                        <span className="block sm:hidden text-xs text-muted-foreground">{e.category || ''}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{e.category || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(Number(e.amount))}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{e.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;