import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const StockAdjustmentPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [form, setForm] = useState({
    adjustment_no: '', adjustment_date: new Date().toISOString().split('T')[0], description: '',
    lines: [{ stock_item_id: '', warehouse_id: '', quantity: 0, unit_cost: 0, description: '' }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [a, si, wh] = await Promise.all([
      supabase.from('stock_adjustments').select('*, stock_adjustment_lines(*, stock_items(name))').eq('company_id', selectedCompany.id).order('adjustment_date', { ascending: false }),
      supabase.from('stock_items').select('id, name, sku').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('warehouses').select('id, name').eq('company_id', selectedCompany.id).eq('is_active', true),
    ]);
    setAdjustments(a.data || []);
    setStockItems(si.data || []);
    setWarehouses(wh.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { stock_item_id: '', warehouse_id: '', quantity: 0, unit_cost: 0, description: '' }] }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const handleCreate = async () => {
    if (!selectedCompany || !form.adjustment_no) { toast.error('Adjustment number required'); return; }
    const { data, error } = await supabase.from('stock_adjustments').insert({
      company_id: selectedCompany.id, adjustment_no: form.adjustment_no,
      adjustment_date: form.adjustment_date, description: form.description || null,
      created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await supabase.from('stock_adjustment_lines').insert(
        form.lines.filter(l => l.stock_item_id).map(l => ({
          stock_adjustment_id: data.id, stock_item_id: l.stock_item_id,
          quantity: +l.quantity || 0, unit_cost: +l.unit_cost || 0, reason: l.reason || null,
        }))
      );
    }
    toast.success('Stock adjustment created');
    setOpen(false);
    setForm({ adjustment_no: '', adjustment_date: new Date().toISOString().split('T')[0], description: '', lines: [{ stock_item_id: '', quantity: 0, unit_cost: 0, reason: '' }] });
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Stock Adjustment</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Adjustment</Button>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No adjustments yet</TableCell></TableRow>
              ) : adjustments.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.adjustment_date}</TableCell>
                  <TableCell className="font-mono font-medium">{a.adjustment_no}</TableCell>
                  <TableCell className="text-muted-foreground">{a.description || '—'}</TableCell>
                  <TableCell>{a.stock_adjustment_lines?.length || 0}</TableCell>
                  <TableCell><Badge variant={a.status === 'posted' ? 'default' : a.status === 'void' ? 'destructive' : 'secondary'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">New Stock Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Adjustment No.</Label><Input value={form.adjustment_no} onChange={e => setForm(f => ({ ...f, adjustment_no: e.target.value }))} placeholder="SA-001" /></div>
              <div><Label>Date</Label><Input type="date" value={form.adjustment_date} onChange={e => setForm(f => ({ ...f, adjustment_date: e.target.value }))} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Reason for adjustment" /></div>
            </div>
            <div>
              <Label className="mb-2 block">Items (positive qty = add, negative = deduct)</Label>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                  <select className="border border-input rounded-md px-3 py-2 text-sm bg-background" value={l.stock_item_id} onChange={e => updateLine(i, 'stock_item_id', e.target.value)}>
                    <option value="">Select item</option>
                    {stockItems.map(si => <option key={si.id} value={si.id}>{si.sku ? `${si.sku} - ` : ''}{si.name}</option>)}
                  </select>
                  <Input type="number" placeholder="Qty (+/-)" value={l.quantity || ''} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                  <Input type="number" placeholder="Unit Cost" value={l.unit_cost || ''} onChange={e => updateLine(i, 'unit_cost', e.target.value)} />
                  <Input placeholder="Reason" value={l.reason} onChange={e => updateLine(i, 'reason', e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <Button onClick={handleCreate}>Create Adjustment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockAdjustmentPage;
