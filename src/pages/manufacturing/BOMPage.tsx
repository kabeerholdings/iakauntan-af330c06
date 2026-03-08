import { useEffect, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Eye, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BOM = {
  id: string; bom_code: string; bom_name: string; description: string | null;
  product_id: string; output_quantity: number; output_uom: string;
  labour_cost: number; machine_cost: number; overhead_cost: number;
  total_material_cost: number; total_cost: number; is_active: boolean;
  stock_items?: { code: string; name: string } | null;
};

type BOMLine = {
  id: string; stock_item_id: string; quantity: number; uom: string;
  unit_cost: number; total_cost: number; wastage_percent: number;
  effective_quantity: number; sort_order: number;
  stock_items?: { code: string; name: string; purchase_price: number } | null;
};

type StockItem = { id: string; code: string; name: string; purchase_price: number; base_uom: string };

const BOMPage = () => {
  const { selectedCompany } = useCompany();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);
  const [viewingBom, setViewingBom] = useState<BOM | null>(null);
  const [bomLines, setBomLines] = useState<BOMLine[]>([]);
  const [form, setForm] = useState({ bom_code: '', bom_name: '', description: '', product_id: '', output_quantity: '1', output_uom: 'unit', labour_cost: '0', machine_cost: '0', overhead_cost: '0' });
  const [lines, setLines] = useState<{ id: string; stock_item_id: string; quantity: string; wastage_percent: string }[]>([]);

  const fetchBoms = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('bill_of_materials').select('*, stock_items!bill_of_materials_product_id_fkey(code, name)')
      .eq('company_id', selectedCompany.id).order('bom_code');
    setBoms((data || []) as any);
  };

  const fetchStockItems = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('stock_items').select('id, code, name, purchase_price, base_uom')
      .eq('company_id', selectedCompany.id).eq('is_active', true).order('code');
    setStockItems((data || []) as StockItem[]);
  };

  useEffect(() => { fetchBoms(); fetchStockItems(); }, [selectedCompany]);

  const fetchBomLines = async (bomId: string) => {
    const { data } = await supabase.from('bom_lines').select('*, stock_items(code, name, purchase_price)')
      .eq('bom_id', bomId).order('sort_order');
    setBomLines((data || []) as any);
  };

  const openNew = () => {
    setEditingBom(null);
    setForm({ bom_code: '', bom_name: '', description: '', product_id: '', output_quantity: '1', output_uom: 'unit', labour_cost: '0', machine_cost: '0', overhead_cost: '0' });
    setLines([{ id: crypto.randomUUID(), stock_item_id: '', quantity: '1', wastage_percent: '0' }]);
    setShowForm(true);
  };

  const openEdit = async (bom: BOM) => {
    setEditingBom(bom);
    setForm({
      bom_code: bom.bom_code, bom_name: bom.bom_name, description: bom.description || '',
      product_id: bom.product_id, output_quantity: String(bom.output_quantity), output_uom: bom.output_uom || 'unit',
      labour_cost: String(bom.labour_cost), machine_cost: String(bom.machine_cost), overhead_cost: String(bom.overhead_cost),
    });
    const { data } = await supabase.from('bom_lines').select('*').eq('bom_id', bom.id).order('sort_order');
    setLines((data || []).map((l: any) => ({ id: l.id, stock_item_id: l.stock_item_id, quantity: String(l.quantity), wastage_percent: String(l.wastage_percent) })));
    setShowForm(true);
  };

  const openView = (bom: BOM) => { setViewingBom(bom); fetchBomLines(bom.id); };

  const addLine = () => setLines(prev => [...prev, { id: crypto.randomUUID(), stock_item_id: '', quantity: '1', wastage_percent: '0' }]);
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));
  const updateLine = (id: string, field: string, value: string) => setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));

  const calcLineCost = (line: typeof lines[0]) => {
    const item = stockItems.find(s => s.id === line.stock_item_id);
    const qty = parseFloat(line.quantity) || 0;
    const wastage = parseFloat(line.wastage_percent) || 0;
    const effectiveQty = qty * (1 + wastage / 100);
    const cost = effectiveQty * (item?.purchase_price || 0);
    return { effectiveQty, cost, unitCost: item?.purchase_price || 0 };
  };

  const totalMaterialCost = lines.reduce((s, l) => s + calcLineCost(l).cost, 0);
  const totalCost = totalMaterialCost + (parseFloat(form.labour_cost) || 0) + (parseFloat(form.machine_cost) || 0) + (parseFloat(form.overhead_cost) || 0);

  const saveBom = async () => {
    if (!selectedCompany || !form.bom_code || !form.product_id) { toast.error('Fill required fields'); return; }
    const validLines = lines.filter(l => l.stock_item_id);
    const bomData = {
      company_id: selectedCompany.id,
      bom_code: form.bom_code, bom_name: form.bom_name, description: form.description || null,
      product_id: form.product_id, output_quantity: parseFloat(form.output_quantity) || 1, output_uom: form.output_uom,
      labour_cost: parseFloat(form.labour_cost) || 0, machine_cost: parseFloat(form.machine_cost) || 0,
      overhead_cost: parseFloat(form.overhead_cost) || 0, total_material_cost: totalMaterialCost, total_cost: totalCost,
    };

    try {
      let bomId: string;
      if (editingBom) {
        await supabase.from('bill_of_materials').update(bomData).eq('id', editingBom.id);
        bomId = editingBom.id;
        await supabase.from('bom_lines').delete().eq('bom_id', bomId);
      } else {
        const { data, error } = await supabase.from('bill_of_materials').insert(bomData).select('id').single();
        if (error) throw error;
        bomId = data.id;
      }

      if (validLines.length > 0) {
        await supabase.from('bom_lines').insert(validLines.map((l, i) => {
          const calc = calcLineCost(l);
          return {
            bom_id: bomId, stock_item_id: l.stock_item_id, quantity: parseFloat(l.quantity) || 0,
            uom: stockItems.find(s => s.id === l.stock_item_id)?.base_uom || 'unit',
            unit_cost: calc.unitCost, total_cost: calc.cost,
            wastage_percent: parseFloat(l.wastage_percent) || 0, effective_quantity: calc.effectiveQty, sort_order: i,
          };
        }));
      }

      toast.success(editingBom ? 'BOM updated' : 'BOM created');
      setShowForm(false);
      fetchBoms();
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteBom = async (id: string) => {
    await supabase.from('bom_lines').delete().eq('bom_id', id);
    await supabase.from('bill_of_materials').delete().eq('id', id);
    toast.success('BOM deleted');
    fetchBoms();
  };

  const fmt = (n: number) => `RM ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Bill of Materials (BOM)</h1>
          <p className="text-sm text-muted-foreground">Define recipes and material requirements for finished products</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New BOM</Button>
      </div>

      {/* BOM List */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Product</TableHead>
                <TableHead className="text-right">Output Qty</TableHead><TableHead className="text-right">Material Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead><TableHead>Status</TableHead><TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boms.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No BOMs created yet</TableCell></TableRow>
              ) : boms.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono">{b.bom_code}</TableCell>
                  <TableCell className="font-medium">{b.bom_name}</TableCell>
                  <TableCell>{(b.stock_items as any)?.code} - {(b.stock_items as any)?.name}</TableCell>
                  <TableCell className="text-right">{b.output_quantity} {b.output_uom}</TableCell>
                  <TableCell className="text-right">{fmt(b.total_material_cost)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(b.total_cost)}</TableCell>
                  <TableCell><Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(b)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBom(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* BOM Detail View */}
      {viewingBom && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display">{viewingBom.bom_code} — {viewingBom.bom_name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setViewingBom(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Product:</span> {(viewingBom.stock_items as any)?.name}</div>
              <div><span className="text-muted-foreground">Output:</span> {viewingBom.output_quantity} {viewingBom.output_uom}</div>
              <div><span className="text-muted-foreground">Labour:</span> {fmt(viewingBom.labour_cost)}</div>
              <div><span className="text-muted-foreground">Total Cost:</span> <strong>{fmt(viewingBom.total_cost)}</strong></div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead><TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Wastage %</TableHead><TableHead className="text-right">Effective Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomLines.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{(l.stock_items as any)?.code} - {(l.stock_items as any)?.name}</TableCell>
                    <TableCell className="text-right">{l.quantity} {l.uom}</TableCell>
                    <TableCell className="text-right">{l.wastage_percent}%</TableCell>
                    <TableCell className="text-right">{Number(l.effective_quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{fmt(l.unit_cost)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(l.total_cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold"><TableCell colSpan={5}>Total Material Cost</TableCell><TableCell className="text-right">{fmt(viewingBom.total_material_cost)}</TableCell></TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* BOM Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editingBom ? 'Edit BOM' : 'New Bill of Materials'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>BOM Code *</Label><Input value={form.bom_code} onChange={e => setForm(f => ({ ...f, bom_code: e.target.value }))} placeholder="BOM-001" /></div>
              <div><Label>BOM Name *</Label><Input value={form.bom_name} onChange={e => setForm(f => ({ ...f, bom_name: e.target.value }))} placeholder="Product Recipe" /></div>
              <div><Label>Finished Product *</Label>
                <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{stockItems.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-5 gap-3">
              <div><Label>Output Qty</Label><Input type="number" value={form.output_quantity} onChange={e => setForm(f => ({ ...f, output_quantity: e.target.value }))} /></div>
              <div><Label>UOM</Label><Input value={form.output_uom} onChange={e => setForm(f => ({ ...f, output_uom: e.target.value }))} /></div>
              <div><Label>Labour Cost</Label><Input type="number" value={form.labour_cost} onChange={e => setForm(f => ({ ...f, labour_cost: e.target.value }))} /></div>
              <div><Label>Machine Cost</Label><Input type="number" value={form.machine_cost} onChange={e => setForm(f => ({ ...f, machine_cost: e.target.value }))} /></div>
              <div><Label>Overhead Cost</Label><Input type="number" value={form.overhead_cost} onChange={e => setForm(f => ({ ...f, overhead_cost: e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Raw Materials / Components</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Material</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead><TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead className="w-[80px]">Wastage %</TableHead><TableHead className="text-right w-[80px]">Eff. Qty</TableHead>
                    <TableHead className="text-right w-[100px]">Cost</TableHead><TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(l => {
                    const calc = calcLineCost(l);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Select value={l.stock_item_id} onValueChange={v => updateLine(l.id, 'stock_item_id', v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{stockItems.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" value={l.quantity} onChange={e => updateLine(l.id, 'quantity', e.target.value)} className="h-8" /></TableCell>
                        <TableCell><Input type="number" value={l.wastage_percent} onChange={e => updateLine(l.id, 'wastage_percent', e.target.value)} className="h-8" /></TableCell>
                        <TableCell className="text-right text-sm">{calc.effectiveQty.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmt(calc.cost)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(l.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Material Cost:</span><span>{fmt(totalMaterialCost)}</span></div>
              <div className="flex justify-between"><span>Labour + Machine + Overhead:</span><span>{fmt((parseFloat(form.labour_cost)||0)+(parseFloat(form.machine_cost)||0)+(parseFloat(form.overhead_cost)||0))}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2"><span>Total Production Cost:</span><span>{fmt(totalCost)}</span></div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={saveBom}>{editingBom ? 'Update BOM' : 'Create BOM'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BOMPage;
