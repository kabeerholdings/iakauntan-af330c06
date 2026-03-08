import { useEffect, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';

const JournalEntriesPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    reference: '', description: '',
    lines: [{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [je, acc] = await Promise.all([
      supabase.from('journal_entries').select('*, journal_entry_lines(*)').eq('company_id', selectedCompany.id).order('entry_date', { ascending: false }),
      supabase.from('chart_of_accounts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).order('code'),
    ]);
    setEntries(je.data || []);
    setAccounts(acc.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { account_id: '', debit: 0, credit: 0, description: '' }] }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const totalDebit = form.lines.reduce((s, l) => s + (+l.debit || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (+l.credit || 0), 0);

  const handleCreate = async () => {
    if (!selectedCompany) return;
    if (Math.abs(totalDebit - totalCredit) > 0.01) { toast.error('Debits must equal credits'); return; }
    const { data: je, error } = await supabase.from('journal_entries').insert({
      company_id: selectedCompany.id, entry_date: form.entry_date,
      reference: form.reference || null, description: form.description || null,
      created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (je) {
      await supabase.from('journal_entry_lines').insert(
        form.lines.filter(l => l.account_id).map(l => ({
          journal_entry_id: je.id, account_id: l.account_id,
          debit: +l.debit || 0, credit: +l.credit || 0, description: l.description || null,
        }))
      );
    }
    toast.success('Journal entry created');
    setOpen(false);
    setForm({ entry_date: new Date().toISOString().split('T')[0], reference: '', description: '', lines: [{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }] });
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Journal Entries</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Entry</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Create Journal Entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} /></div>
                <div><Label>Reference</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="JE-001" /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="mb-2 block">Lines</Label>
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                    <select className="border border-input rounded-md px-3 py-2 text-sm bg-background" value={l.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)}>
                      <option value="">Select account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                    <Input type="number" placeholder="Debit" value={l.debit || ''} onChange={e => updateLine(i, 'debit', e.target.value)} />
                    <Input type="number" placeholder="Credit" value={l.credit || ''} onChange={e => updateLine(i, 'credit', e.target.value)} />
                    <Input placeholder="Note" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <div className="text-sm space-x-4">
                  <span>Debit: <strong>RM {totalDebit.toFixed(2)}</strong></span>
                  <span>Credit: <strong>RM {totalCredit.toFixed(2)}</strong></span>
                  {Math.abs(totalDebit - totalCredit) > 0.01 && <span className="text-destructive font-medium">Unbalanced!</span>}
                </div>
                <Button onClick={handleCreate} disabled={Math.abs(totalDebit - totalCredit) > 0.01}>Post Entry</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No journal entries yet</TableCell></TableRow>
              ) : entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.entry_date}</TableCell>
                  <TableCell className="font-medium">{e.reference || '—'}</TableCell>
                  <TableCell>{e.description || '—'}</TableCell>
                  <TableCell>{e.journal_entry_lines?.length || 0}</TableCell>
                  <TableCell><Badge variant={e.status === 'posted' ? 'default' : 'secondary'}>{e.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntriesPage;
