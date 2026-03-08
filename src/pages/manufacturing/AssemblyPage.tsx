import { useEffect, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Assembly = {
  id: string; assembly_number: string; assembly_type: string; product_id: string;
  quantity: number; assembly_date: string; batch_no: string | null; status: string;
  total_material_cost: number; labour_cost: number; total_cost: number;
  stock_items?: { code: string; name: string } | null;
  bill_of_materials?: { bom_code: string } | null;
};

type BOM = { id: string; bom_code: string; bom_name: string; product_id: string };
type StockItem = { id: string; code: string; name: string; purchase_price: number; base_uom: string };

const AssemblyPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [assemblyType, setAssemblyType] = useState<'assembly' | 'disassembly'>('assembly');
  const [form, setForm] = useState({ assembly_number: '', bom_id: '', product_id: '', quantity: '1', assembly_date: new Date().toISOString().split('T')[0], batch_no: '', labour_cost: '0', machine_cost: '0', overhead_cost: '0', notes: '' });
  const [lines, setLines] = useState<{ id: string; stock_item_id: string; quantity: string }[]>([]);

  const fetch = async () => {
    if (!selectedCompany) return;
    const [aRes, bRes, sRes] = await Promise.all([
      supabase.from('assemblies').select('*, stock_items!assemblies_product_id_fkey(code, name), bill_of_materials(bom_code)')
        .eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('bill_of_materials').select('id, bom_code, bom_name, product_id')
        .eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('stock_items').select('id, code, name, purchase_price, base_uom')
        .eq('company_id', selectedCompany.id).eq('is_active', true).order('code'),
    ]);
    setAssemblies((aRes.data || []) as any);
    setBoms((bRes.data || []) as BOM[]);
    setStockItems((sRes.data || []) as StockItem[]);
  };

  useEffect(() => { fetch(); }, [selectedCompany]);

  const loadBomLines = async (bomId: string) => {
    const { data } = await supabase.from('bom_lines').select('stock_item_id, effective_quantity').eq('bom_id', bomId);
    const qty = parseFloat(form.quantity) || 1;
    setLines((data || []).map((l: any) => ({ id: crypto.randomUUID(), stock_item_id: l.stock_item_id, quantity: String(Number(l.effective_quantity) * qty) })));
  };

  const selectBom = (bomId: string) => {
    const bom = boms.find(b => b.id === bomId);
    setForm(f => ({ ...f, bom_id: bomId, product_id: bom?.product_id || '' }));
    loadBomLines(bomId);
  };

  const addLine = () => setLines(p => [...p, { id: crypto.randomUUID(), stock_item_id: '', quantity: '1' }]);
  const removeLine = (id: string) => setLines(p => p.filter(l => l.id !== id));

  const totalMaterialCost = lines.reduce((s, l) => {
    const item = stockItems.find(i => i.id === l.stock_item_id);
    return s + ((item?.purchase_price || 0) * (parseFloat(l.quantity) || 0));
  }, 0);

  const save = async () => {
    if (!selectedCompany || !user || !form.assembly_number || !form.product_id) { toast.error('Fill required fields'); return; }
    const validLines = lines.filter(l => l.stock_item_id);

    try {
      const totalCost = totalMaterialCost + (parseFloat(form.labour_cost) || 0) + (parseFloat(form.machine_cost) || 0) + (parseFloat(form.overhead_cost) || 0);
      const { data: asm, error } = await supabase.from('assemblies').insert({
        company_id: selectedCompany.id, assembly_number: form.assembly_number, assembly_type: assemblyType,
        bom_id: form.bom_id || null, product_id: form.product_id,
        quantity: parseFloat(form.quantity) || 1, assembly_date: form.assembly_date,
        batch_no: form.batch_no || null, status: 'draft',
        total_material_cost: totalMaterialCost, labour_cost: parseFloat(form.labour_cost) || 0,
        machine_cost: parseFloat(form.machine_cost) || 0, overhead_cost: parseFloat(form.overhead_cost) || 0,
        total_cost: totalCost, notes: form.notes || null, created_by: user.id,
      }).select('id').single();
      if (error) throw error;

      if (validLines.length > 0) {
        await supabase.from('assembly_lines').insert(validLines.map(l => {
          const item = stockItems.find(i => i.id === l.stock_item_id);
          const qty = parseFloat(l.quantity) || 0;
          return { assembly_id: asm.id, stock_item_id: l.stock_item_id, quantity: qty, unit_cost: item?.purchase_price || 0, total_cost: qty * (item?.purchase_price || 0) };
        }));
      }

      toast.success(`${assemblyType === 'assembly' ? 'Assembly' : 'Disassembly'} created`);
      setShowForm(false);
      fetch();
    } catch (err: any) { toast.error(err.message); }
  };

  const confirmAssembly = async (asm: Assembly) => {
    await supabase.from('assemblies').update({ status: 'confirmed' }).eq('id', asm.id);
    toast.success('Assembly confirmed');
    fetch();
  };

  const { fmt } = useCurrency();

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Assembly / Disassembly</h1>
          <p className="text-sm text-muted-foreground">Build finished products or break them down into raw materials</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setAssemblyType('disassembly'); setShowForm(true); }}>Disassembly</Button>
          <Button onClick={() => { setAssemblyType('assembly'); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Assembly</Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead><TableHead>Type</TableHead><TableHead>Product</TableHead><TableHead>BOM</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead>Batch</TableHead><TableHead>Date</TableHead>
                <TableHead className="text-right">Cost</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assemblies.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No assemblies yet</TableCell></TableRow>
              ) : assemblies.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">{a.assembly_number}</TableCell>
                  <TableCell><Badge variant={a.assembly_type === 'assembly' ? 'default' : 'secondary'} className={a.assembly_type === 'assembly' ? 'bg-primary' : ''}>{a.assembly_type}</Badge></TableCell>
                  <TableCell>{(a.stock_items as any)?.code} - {(a.stock_items as any)?.name}</TableCell>
                  <TableCell>{(a.bill_of_materials as any)?.bom_code || '—'}</TableCell>
                  <TableCell className="text-right">{a.quantity}</TableCell>
                  <TableCell>{a.batch_no || '—'}</TableCell>
                  <TableCell>{a.assembly_date}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(a.total_cost)}</TableCell>
                  <TableCell><Badge variant={a.status === 'confirmed' ? 'default' : 'outline'} className={a.status === 'confirmed' ? 'bg-emerald-600' : ''}>{a.status}</Badge></TableCell>
                  <TableCell>
                    {a.status === 'draft' && <Button variant="ghost" size="sm" onClick={() => confirmAssembly(a)}>Confirm</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display capitalize">New {assemblyType}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Number *</Label><Input value={form.assembly_number} onChange={e => setForm(f => ({ ...f, assembly_number: e.target.value }))} placeholder={assemblyType === 'assembly' ? 'AS-001' : 'DS-001'} /></div>
              <div><Label>BOM (optional)</Label>
                <Select value={form.bom_id} onValueChange={selectBom}>
                  <SelectTrigger><SelectValue placeholder="Select BOM" /></SelectTrigger>
                  <SelectContent>{boms.map(b => <SelectItem key={b.id} value={b.id}>{b.bom_code} - {b.bom_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{assemblyType === 'assembly' ? 'Output Product' : 'Product to Break Down'} *</Label>
                <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{stockItems.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>Date</Label><Input type="date" value={form.assembly_date} onChange={e => setForm(f => ({ ...f, assembly_date: e.target.value }))} /></div>
              <div><Label>Batch No</Label><Input value={form.batch_no} onChange={e => setForm(f => ({ ...f, batch_no: e.target.value }))} /></div>
              <div><Label>Labour Cost</Label><Input type="number" value={form.labour_cost} onChange={e => setForm(f => ({ ...f, labour_cost: e.target.value }))} /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">{assemblyType === 'assembly' ? 'Materials Consumed' : 'Materials Produced'}</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="w-[100px]">Qty</TableHead><TableHead className="text-right w-[100px]">Cost</TableHead><TableHead className="w-[40px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {lines.map(l => {
                    const item = stockItems.find(i => i.id === l.stock_item_id);
                    const cost = (item?.purchase_price || 0) * (parseFloat(l.quantity) || 0);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Select value={l.stock_item_id} onValueChange={v => setLines(p => p.map(x => x.id === l.id ? { ...x, stock_item_id: v } : x))}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{stockItems.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" value={l.quantity} onChange={e => setLines(p => p.map(x => x.id === l.id ? { ...x, quantity: e.target.value } : x))} className="h-8" /></TableCell>
                        <TableCell className="text-right text-sm">{fmt(cost)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(l.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter><TableRow className="font-bold"><TableCell colSpan={2}>Total Material Cost</TableCell><TableCell className="text-right">{fmt(totalMaterialCost)}</TableCell><TableCell /></TableRow></TableFooter>
              </Table>
            </div>

            <Button onClick={save} className="w-full">Create {assemblyType === 'assembly' ? 'Assembly' : 'Disassembly'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssemblyPage;
