import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Package, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';

type CompositeItem = {
  id: string;
  stock_item_id: string;
  composite_type: string;
  sale_price: number;
  cost_price: number;
  auto_assemble: boolean;
  is_active: boolean;
  notes: string | null;
  stock_items?: { code: string; name: string } | null;
};

type StockItem = { id: string; code: string; name: string; selling_price: number | null };

const CompositeItemsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const [items, setItems] = useState<CompositeItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ stock_item_id: '', composite_type: 'bundle', sale_price: 0, cost_price: 0, auto_assemble: false, notes: '' });
  const [components, setComponents] = useState<{ stock_item_id: string; quantity: number }[]>([]);

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: ci }, { data: si }] = await Promise.all([
      supabase.from('composite_items').select('*, stock_items(code, name)').eq('company_id', selectedCompany!.id),
      supabase.from('stock_items').select('id, code, name, selling_price').eq('company_id', selectedCompany!.id),
    ]);
    setItems((ci as CompositeItem[]) || []);
    setStockItems((si as StockItem[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.stock_item_id) { toast.error('Select a product'); return; }
    const { data: composite, error } = await supabase.from('composite_items').insert({
      company_id: selectedCompany!.id,
      stock_item_id: form.stock_item_id,
      composite_type: form.composite_type,
      sale_price: form.sale_price,
      cost_price: form.cost_price,
      auto_assemble: form.auto_assemble,
      notes: form.notes || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (components.length > 0) {
      await supabase.from('composite_item_lines').insert(
        components.map((c, i) => ({ composite_item_id: composite.id, component_stock_item_id: c.stock_item_id, quantity: c.quantity, sort_order: i }))
      );
    }
    toast.success('Composite item created');
    setShowDialog(false);
    setForm({ stock_item_id: '', composite_type: 'bundle', sale_price: 0, cost_price: 0, auto_assemble: false, notes: '' });
    setComponents([]);
    fetchData();
  };

  const addComponent = () => setComponents([...components, { stock_item_id: '', quantity: 1 }]);
  const removeComponent = (idx: number) => setComponents(components.filter((_, i) => i !== idx));
  const updateComponent = (idx: number, field: string, value: any) => {
    const updated = [...components];
    (updated[idx] as any)[field] = value;
    setComponents(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Composite Items</h1>
          <p className="text-muted-foreground">Manage bundled and assembled products</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Create Composite</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Composite Item</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product</Label>
                  <Select value={form.stock_item_id} onValueChange={(v) => setForm({ ...form, stock_item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {stockItems.map((s) => <SelectItem key={s.id} value={s.id}>{s.item_code} - {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.composite_type} onValueChange={(v) => setForm({ ...form, composite_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bundle">Bundle</SelectItem>
                      <SelectItem value="kit">Kit</SelectItem>
                      <SelectItem value="assembled">Assembled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Sale Price</Label><Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: +e.target.value })} /></div>
                <div><Label>Cost Price</Label><Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Components</Label>
                  <Button size="sm" variant="outline" onClick={addComponent}><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
                {components.map((c, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Select value={c.stock_item_id} onValueChange={(v) => updateComponent(idx, 'stock_item_id', v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Component" /></SelectTrigger>
                      <SelectContent>
                        {stockItems.map((s) => <SelectItem key={s.id} value={s.id}>{s.item_code} - {s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" className="w-24" value={c.quantity} onChange={(e) => updateComponent(idx, 'quantity', +e.target.value)} placeholder="Qty" />
                    <Button size="icon" variant="ghost" onClick={() => removeComponent(idx)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Composites</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Bundles</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{items.filter(i => i.composite_type === 'bundle').length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Kits</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{items.filter(i => i.composite_type === 'kit').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Composite Items</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : items.length === 0 ? <p className="text-muted-foreground">No composite items yet</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.stock_items?.item_code} - {item.stock_items?.name}</TableCell>
                    <TableCell><Badge variant="outline">{item.composite_type}</Badge></TableCell>
                    <TableCell className="text-right">{fmt(item.sale_price)}</TableCell>
                    <TableCell className="text-right">{fmt(item.cost_price)}</TableCell>
                    <TableCell><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompositeItemsPage;
