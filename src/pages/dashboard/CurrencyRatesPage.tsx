import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const CurrencyRatesPage = () => {
  const { selectedCompany } = useCompany();
  const [rates, setRates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currency_code: '', rate: '', effective_date: new Date().toISOString().split('T')[0] });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('currency_rates').select('*').eq('company_id', selectedCompany.id).order('effective_date', { ascending: false });
    setRates(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.currency_code || !form.rate) { toast.error('Currency and Rate required'); return; }
    const { error } = await supabase.from('currency_rates').insert({
      company_id: selectedCompany.id, currency_code: form.currency_code.toUpperCase(),
      rate: +form.rate, effective_date: form.effective_date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Rate added');
    setOpen(false);
    setForm({ currency_code: '', rate: '', effective_date: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Currency Rates</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Rate</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add Exchange Rate</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Currency Code</Label><Input value={form.currency_code} onChange={e => setForm(f => ({ ...f, currency_code: e.target.value }))} placeholder="USD" /></div>
                <div><Label>Rate (to {selectedCompany.base_currency || 'MYR'})</Label><Input type="number" step="0.0001" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="4.4700" /></div>
              </div>
              <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Add Rate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Currency</TableHead><TableHead>Rate</TableHead><TableHead>Effective Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rates.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No exchange rates</TableCell></TableRow>
              ) : rates.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-medium">{r.currency_code}</TableCell>
                  <TableCell>{Number(r.rate).toFixed(4)}</TableCell>
                  <TableCell>{r.effective_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencyRatesPage;
