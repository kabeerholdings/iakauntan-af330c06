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
import { Plus, Search, ScanBarcode, ClipboardCheck, Package, AlertTriangle, CheckCircle, Truck, RefreshCw, ArrowUpDown } from 'lucide-react';
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
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('takes');
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
        system_qty: item.quantity_on_hand || 0, counted_qty: 1,
        variance: 1 - (item.quantity_on_hand || 0),
        unit_cost: item.purchase_price || 0,
        variance_value: (1 - (item.quantity_on_hand || 0)) * (item.purchase_price || 0),
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

  // Sync stock take to accounting - create stock adjustment
  const syncToAccounting = async () => {
    if (!selectedTake || !selectedCompany || selectedTake.status !== 'completed') return;
    setSyncing(true);
    try {
      const varianceLines = takeLines.filter(l => l.variance !== 0);
      if (varianceLines.length === 0) {
        toast.info('No variances to adjust');
        setSyncing(false);
        return;
      }

      // Use existing stock_adjustments schema (reference, description instead of adjustment_number, reason)
      const adjRef = `ADJ-${selectedTake.take_number}`;
      const { data: adj, error: adjErr } = await supabase.from('stock_adjustments').insert({
        company_id: selectedCompany.id,
        reference: adjRef,
        description: `Auto-generated from stock take ${selectedTake.take_number}. Total variance: RM ${totalVariance.toFixed(2)}`,
        status: 'posted',
        created_by: user?.id,
      }).select().single();

      if (adjErr) throw adjErr;

      // Use existing stock_adjustment_lines schema (quantity, warehouse_id required)
      const defaultWarehouseId = selectedTake.warehouse_id || warehouses[0]?.id;
      if (!defaultWarehouseId) {
        toast.error('No warehouse found. Please create a warehouse first.');
        setSyncing(false);
        return;
      }

      const lines = varianceLines.map(l => ({
        adjustment_id: adj.id,
        stock_item_id: l.stock_item_id,
        quantity: l.variance, // variance is the adjustment quantity
        unit_cost: l.unit_cost || 0,
        warehouse_id: defaultWarehouseId,
        description: `System: ${l.system_qty}, Counted: ${l.counted_qty}`,
      }));

      const { error: lineErr } = await supabase.from('stock_adjustment_lines').insert(lines);
      if (lineErr) throw lineErr;

      // Update stock take status to synced
      await supabase.from('stock_takes').update({ status: 'synced' }).eq('id', selectedTake.id);
      setSelectedTake({ ...selectedTake, status: 'synced' });

      toast.success(`Stock adjustment ${adjRef} created & synced. ${varianceLines.length} items adjusted.`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
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
          <p className="text-muted-foreground">Physical inventory count, adjustments & sync</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="takes">Stock Takes</TabsTrigger>
          <TabsTrigger value="counting" disabled={!selectedTake}>Counting</TabsTrigger>
          <TabsTrigger value="picking">Picking List</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="takes" className="space-y-4">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Take #</TableHead><TableHead>Date</TableHead><TableHead>Warehouse</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {stockTakes.map(st => (
                <TableRow key={st.id} className={selectedTake?.id === st.id ? 'bg-muted' : ''}>
                  <TableCell className="font-medium">{st.take_number}</TableCell>
                  <TableCell>{st.take_date}</TableCell>
                  <TableCell>{(st.warehouses as any)?.name || 'All'}</TableCell>
                  <TableCell>
                    <Badge variant={st.status === 'synced' ? 'default' : st.status === 'completed' ? 'secondary' : 'outline'}>
                      {st.status === 'synced' ? '✓ Synced' : st.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedTake(st); loadTakeLines(st.id); setActiveTab('counting'); }}>
                        <ClipboardCheck className="h-3 w-3 mr-1" />Open
                      </Button>
                    </div>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="h-6 w-6 text-primary" /><div><p className="text-sm text-muted-foreground">Items Counted</p><p className="text-xl font-bold">{takeLines.length}</p></div></CardContent></Card>
                <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-yellow-500" /><div><p className="text-sm text-muted-foreground">Variances</p><p className="text-xl font-bold">{itemsWithVariance}</p></div></CardContent></Card>
                <Card><CardContent className="pt-4 flex items-center gap-3"><span className={`text-xl font-bold ${totalVariance < 0 ? 'text-destructive' : 'text-green-600'}`}>RM {totalVariance.toFixed(2)}</span><p className="text-sm text-muted-foreground">Variance Value</p></CardContent></Card>
                <Card><CardContent className="pt-4 flex items-center gap-3">
                  <Badge variant={selectedTake.status === 'synced' ? 'default' : 'secondary'} className="text-sm">
                    {selectedTake.status === 'synced' ? '✓ Synced to Accounting' : selectedTake.status}
                  </Badge>
                </CardContent></Card>
              </div>

              {selectedTake.status === 'in_progress' && (
                <div className="flex gap-2">
                  <Input ref={scanRef} value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} placeholder="Scan barcode or type item code..." className="flex-1" autoFocus />
                  <Button onClick={handleScan}><ScanBarcode className="mr-2 h-4 w-4" />Add</Button>
                  <Button variant="outline" onClick={completeStockTake}><CheckCircle className="mr-2 h-4 w-4" />Complete</Button>
                </div>
              )}

              {selectedTake.status === 'completed' && (
                <div className="flex gap-2 items-center p-3 rounded-lg bg-muted">
                  <ArrowUpDown className="h-5 w-5 text-primary" />
                  <span className="text-sm flex-1">Stock take completed. Sync to create stock adjustments automatically.</span>
                  <Button onClick={syncToAccounting} disabled={syncing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync to Accounting'}
                  </Button>
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
                        {selectedTake.status === 'in_progress' ? (
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

        <TabsContent value="adjustments" className="space-y-4">
          <StockAdjustmentsTab companyId={selectedCompany?.id} />
        </TabsContent>
      </Tabs>

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
                <p className="text-sm text-muted-foreground">Stock on Hand: {priceCheckResult.quantity_on_hand || 0} {priceCheckResult.uom || 'units'}</p>
              </CardContent></Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-component: Stock Adjustments history
const StockAdjustmentsTab = ({ companyId }: { companyId?: string }) => {
  const [adjustments, setAdjustments] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    supabase.from('stock_adjustments').select('*').eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAdjustments(data || []));
  }, [companyId]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5" />Stock Adjustments</CardTitle></CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">Auto-generated stock adjustments from completed stock takes synced to accounting.</p>
        <Table>
          <TableHeader><TableRow><TableHead>Adjustment #</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Total Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {adjustments.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.adjustment_number}</TableCell>
                <TableCell>{a.adjustment_date}</TableCell>
                <TableCell className="max-w-xs truncate">{a.reason}</TableCell>
                <TableCell className={a.total_value < 0 ? 'text-destructive' : ''}>RM {(a.total_value || 0).toFixed(2)}</TableCell>
                <TableCell><Badge variant="default">{a.status}</Badge></TableCell>
              </TableRow>
            ))}
            {adjustments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No adjustments yet. Complete a stock take and sync to generate adjustments.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default StockTakePage;
