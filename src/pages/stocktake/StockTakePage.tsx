import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, ScanBarcode, ClipboardCheck, Package, AlertTriangle, CheckCircle, Truck } from 'lucide-react';
import { toast } from 'sonner';

const StockTakePage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [stockTakes, setStockTakes] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [selectedTake, setSelectedTake] = useState<any>(null);
  const [takeLines, setTakeLines] = useState<any[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [priceCheckOpen, setPriceCheckOpen] = useState(false);
  const [priceCheckSearch, setPriceCheckSearch] = useState('');
  const [priceCheckResult, setPriceCheckResult] = useState<any>(null);
  const [scanInput, setScanInput] = useState('');
  const [form, setForm] = useState({ take_number: '', warehouse_id: '', notes: '' });
  const scanRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    if (!selectedCompany) return;
    const [st, wh, si] = await Promise.all([
      supabase.from('stock_takes').select('*, warehouses(name)').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*').eq('company_id', selectedCompany.id),
      supabase.from('stock_items').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).order('name'),
    ]);
    setStockTakes(st.data || []);
    setWarehouses(wh.data || []);
    setStockItems(si.data || []);
  };

  useEffect(() => { fetchAll(); }, [selectedCompany]);

  const loadTakeLines = async (takeId: string) => {
    const { data } = await supabase.from('stock_take_lines').select('*, stock_items(name, code, barcode)').eq('stock_take_id', takeId);
    setTakeLines(data || []);
  };

  const createStockTake = async () => {
    if (!selectedCompany || !form.take_number) return;
    const { data, error } = await supabase.from('stock_takes').insert({
      company_id: selectedCompany.id, take_number: form.take_number,
      warehouse_id: form.warehouse_id || null, notes: form.notes || null,
      status: 'in_progress', created_by: user?.id,
    }).select('*, warehouses(name)').single();
    if (error) { toast.error(error.message); return; }
    toast.success('Stock take created');
    setNewOpen(false);
    setForm({ take_number: '', warehouse_id: '', notes: '' });
    setSelectedTake(data);
    setTakeLines([]);
    fetchAll();
  };

  const handleScan = async () => {
    if (!selectedTake || !scanInput.trim()) return;
    const item = stockItems.find(i => i.barcode === scanInput.trim() || i.code === scanInput.trim());
    if (!item) { toast.error('Item not found'); setScanInput(''); return; }

    const existing = takeLines.find(l => l.stock_item_id === item.id);
    if (existing) {
      const newQty = existing.counted_qty + 1;
      const variance = newQty - existing.system_qty;
      await supabase.from('stock_take_lines').update({
        counted_qty: newQty, variance, variance_value: variance * (existing.unit_cost || 0),
      }).eq('id', existing.id);
    } else {
      await supabase.from('stock_take_lines').insert({
        stock_take_id: selectedTake.id, stock_item_id: item.id,
        system_qty: 0, counted_qty: 1, variance: 1,
        unit_cost: item.purchase_price || 0, variance_value: item.purchase_price || 0,
        barcode: item.barcode,
      });
    }
    setScanInput('');
    loadTakeLines(selectedTake.id);
    toast.success(`Scanned: ${item.name}`);
    scanRef.current?.focus();
  };

  const updateCountedQty = async (lineId: string, qty: number, systemQty: number, unitCost: number) => {
    const variance = qty - systemQty;
    await supabase.from('stock_take_lines').update({
      counted_qty: qty, variance, variance_value: variance * unitCost,
    }).eq('id', lineId);
    loadTakeLines(selectedTake.id);
  };

  const completeStockTake = async () => {
    if (!selectedTake) return;
    await supabase.from('stock_takes').update({ status: 'completed' }).eq('id', selectedTake.id);
    toast.success('Stock take completed');
    setSelectedTake({ ...selectedTake, status: 'completed' });
    fetchAll();
  };

  const checkPrice = () => {
    const item = stockItems.find(i =>
      i.barcode?.toLowerCase() === priceCheckSearch.toLowerCase() ||
      i.code?.toLowerCase() === priceCheckSearch.toLowerCase() ||
      i.name?.toLowerCase().includes(priceCheckSearch.toLowerCase())
    );
    setPriceCheckResult(item || null);
    if (!item) toast.error('Item not found');
  };

  const totalVariance = takeLines.reduce((s, l) => s + (l.variance_value || 0), 0);
  const itemsWithVariance = takeLines.filter(l => l.variance !== 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Take</h1>
          <p className="text-muted-foreground">Physical inventory count & adjustments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPriceCheckOpen(true)}><ScanBarcode className="mr-2 h-4 w-4" />Price Checker</Button>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Stock Take</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Stock Take</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Take Number</Label><Input value={form.take_number} onChange={e => setForm({ ...form, take_number: e.target.value })} placeholder="ST-001" /></div>
                <div><Label>Warehouse</Label>
                  <Select value={form.warehouse_id} onValueChange={v => setForm({ ...form, warehouse_id: v })}>
                    <SelectTrigger><SelectValue placeholder="All warehouses" /></SelectTrigger>
                    <SelectContent><SelectItem value="">All</SelectItem>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={createStockTake} className="w-full">Create Stock Take</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="takes">
        <TabsList><TabsTrigger value="takes">Stock Takes</TabsTrigger><TabsTrigger value="counting" disabled={!selectedTake}>Counting</TabsTrigger><TabsTrigger value="picking">Picking List</TabsTrigger></TabsList>

        <TabsContent value="takes" className="space-y-4">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Take #</TableHead><TableHead>Date</TableHead><TableHead>Warehouse</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {stockTakes.map(st => (
                <TableRow key={st.id} className={selectedTake?.id === st.id ? 'bg-muted' : ''}>
                  <TableCell className="font-medium">{st.take_number}</TableCell>
                  <TableCell>{st.take_date}</TableCell>
                  <TableCell>{(st.warehouses as any)?.name || 'All'}</TableCell>
                  <TableCell><Badge variant={st.status === 'completed' ? 'default' : st.status === 'synced' ? 'default' : 'secondary'}>{st.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedTake(st); loadTakeLines(st.id); }}>
                      <ClipboardCheck className="h-3 w-3 mr-1" />Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {stockTakes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No stock takes. Create one to get started.</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="counting" className="space-y-4">
          {selectedTake && (
            <>
              <div className="flex items-center gap-4">
                <Card className="flex-1"><CardContent className="pt-4 flex items-center gap-3"><Package className="h-6 w-6 text-primary" /><div><p className="text-sm text-muted-foreground">Items Counted</p><p className="text-xl font-bold">{takeLines.length}</p></div></CardContent></Card>
                <Card className="flex-1"><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-yellow-500" /><div><p className="text-sm text-muted-foreground">Variances</p><p className="text-xl font-bold">{itemsWithVariance}</p></div></CardContent></Card>
                <Card className="flex-1"><CardContent className="pt-4 flex items-center gap-3"><span className={`text-xl font-bold ${totalVariance < 0 ? 'text-destructive' : 'text-green-600'}`}>RM {totalVariance.toFixed(2)}</span><p className="text-sm text-muted-foreground">Variance Value</p></CardContent></Card>
              </div>

              {selectedTake.status !== 'completed' && (
                <div className="flex gap-2">
                  <Input ref={scanRef} value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} placeholder="Scan barcode or type item code..." className="flex-1" autoFocus />
                  <Button onClick={handleScan}><ScanBarcode className="mr-2 h-4 w-4" />Add</Button>
                  <Button variant="outline" onClick={completeStockTake}><CheckCircle className="mr-2 h-4 w-4" />Complete</Button>
                </div>
              )}

              <Card><Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Barcode</TableHead><TableHead>System Qty</TableHead><TableHead>Counted</TableHead><TableHead>Variance</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                <TableBody>
                  {takeLines.map(l => (
                    <TableRow key={l.id} className={l.variance !== 0 ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{(l.stock_items as any)?.name}</TableCell>
                      <TableCell>{l.barcode || (l.stock_items as any)?.barcode || '-'}</TableCell>
                      <TableCell>{l.system_qty}</TableCell>
                      <TableCell>
                        {selectedTake.status !== 'completed' ? (
                          <Input type="number" className="w-20 h-8" value={l.counted_qty} onChange={e => updateCountedQty(l.id, parseFloat(e.target.value) || 0, l.system_qty, l.unit_cost)} />
                        ) : l.counted_qty}
                      </TableCell>
                      <TableCell className={l.variance < 0 ? 'text-destructive font-semibold' : l.variance > 0 ? 'text-green-600 font-semibold' : ''}>{l.variance > 0 ? '+' : ''}{l.variance}</TableCell>
                      <TableCell className={l.variance_value < 0 ? 'text-destructive' : ''}>RM {(l.variance_value || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {takeLines.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Scan items to start counting</TableCell></TableRow>}
                </TableBody>
              </Table></Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="picking" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Picking List</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Verify item types, quantities, shelf locations and batch numbers for order fulfillment.</p>
              <Table>
                <TableHeader><TableRow><TableHead>Item Code</TableHead><TableHead>Item Name</TableHead><TableHead>Barcode</TableHead><TableHead>Qty on Hand</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stockItems.slice(0, 50).map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.code}</TableCell>
                      <TableCell>{i.name}</TableCell>
                      <TableCell>{i.barcode || '-'}</TableCell>
                      <TableCell>{i.quantity_on_hand || 0}</TableCell>
                      <TableCell>{i.location || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Price Checker Dialog */}
      <Dialog open={priceCheckOpen} onOpenChange={setPriceCheckOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Price Checker</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={priceCheckSearch} onChange={e => setPriceCheckSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkPrice()} placeholder="Scan barcode or search item..." />
              <Button onClick={checkPrice}><Search className="h-4 w-4" /></Button>
            </div>
            {priceCheckResult && (
              <Card><CardContent className="pt-4 space-y-2">
                <p className="font-bold text-lg">{priceCheckResult.name}</p>
                <p className="text-sm text-muted-foreground">Code: {priceCheckResult.code}</p>
                {priceCheckResult.barcode && <p className="text-sm text-muted-foreground">Barcode: {priceCheckResult.barcode}</p>}
                <p className="text-2xl font-bold text-primary">RM {(priceCheckResult.selling_price || 0).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Cost: RM {(priceCheckResult.purchase_price || 0).toFixed(2)}</p>
              </CardContent></Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTakePage;
