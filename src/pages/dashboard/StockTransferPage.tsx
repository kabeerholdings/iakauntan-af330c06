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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const StockTransferPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    transfer_no: '', transfer_date: new Date().toISOString().split('T')[0],
    from_warehouse_id: '', to_warehouse_id: '', description: '',
    lines: [{ stock_item_id: '', quantity: 0, unit_cost: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [t, si, wh] = await Promise.all([
      supabase.from('stock_transfers').select('*, stock_transfer_lines(*, stock_items(name))').eq('company_id', selectedCompany.id).order('transfer_date', { ascending: false }),
      supabase.from('stock_items').select('id, name, sku').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('warehouses').select('id, name').eq('company_id', selectedCompany.id).eq('is_active', true),
    ]);
    setTransfers(t.data || []);
    setStockItems(si.data || []);
    setWarehouses(wh.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { stock_item_id: '', quantity: 0, unit_cost: 0 }] }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const handleCreate = async () => {
    if (!selectedCompany || !form.transfer_no) { toast.error('Transfer number required'); return; }
    if (form.from_warehouse_id === form.to_warehouse_id && form.from_warehouse_id) { toast.error('From and To warehouse must be different'); return; }
    const { data, error } = await supabase.from('stock_transfers').insert({
      company_id: selectedCompany.id, transfer_no: form.transfer_no,
      transfer_date: form.transfer_date, description: form.description || null,
      from_warehouse_id: form.from_warehouse_id || null, to_warehouse_id: form.to_warehouse_id || null,
      created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await supabase.from('stock_transfer_lines').insert(
        form.lines.filter(l => l.stock_item_id).map(l => ({
          stock_transfer_id: data.id, stock_item_id: l.stock_item_id,
          quantity: +l.quantity || 0, unit_cost: +l.unit_cost || 0,
        }))
      );
    }
    toast.success('Stock transfer created');
    setOpen(false);
    setForm({ transfer_no: '', transfer_date: new Date().toISOString().split('T')[0], from_warehouse_id: '', to_warehouse_id: '', description: '', lines: [{ stock_item_id: '', quantity: 0, unit_cost: 0 }] });
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Stock Transfer</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Transfer</Button>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>No.</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transfers yet</TableCell></TableRow>
              ) : transfers.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.transfer_date}</TableCell>
                  <TableCell className="font-mono font-medium">{t.transfer_no}</TableCell>
                  <TableCell className="flex items-center gap-1">{warehouses.find(w => w.id === t.from_warehouse_id)?.name || '—'} <ArrowRight className="h-3 w-3" /> {warehouses.find(w => w.id === t.to_warehouse_id)?.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{t.description || '—'}</TableCell>
                  <TableCell>{t.stock_transfer_lines?.length || 0}</TableCell>
                  <TableCell><Badge variant={t.status === 'posted' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">New Stock Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Transfer No.</Label><Input value={form.transfer_no} onChange={e => setForm(f => ({ ...f, transfer_no: e.target.value }))} placeholder="ST-001" /></div>
              <div><Label>Date</Label><Input type="date" value={form.transfer_date} onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Warehouse</Label>
                <Select value={form.from_warehouse_id} onValueChange={v => setForm(f => ({ ...f, from_warehouse_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Warehouse</Label>
                <Select value={form.to_warehouse_id} onValueChange={v => setForm(f => ({ ...f, to_warehouse_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Items</Label>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <select className="border border-input rounded-md px-3 py-2 text-sm bg-background" value={l.stock_item_id} onChange={e => updateLine(i, 'stock_item_id', e.target.value)}>
                    <option value="">Select item</option>
                    {stockItems.map(si => <option key={si.id} value={si.id}>{si.sku ? `${si.sku} - ` : ''}{si.name}</option>)}
                  </select>
                  <Input type="number" placeholder="Quantity" value={l.quantity || ''} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                  <Input type="number" placeholder="Unit Cost" value={l.unit_cost || ''} onChange={e => updateLine(i, 'unit_cost', e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <Button onClick={handleCreate}>Create Transfer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTransferPage;
