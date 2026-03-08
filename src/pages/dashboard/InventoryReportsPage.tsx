import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, BarChart3, TrendingDown, Calendar, ClipboardList, ArrowUpDown, ArrowDownToLine, ArrowUpFromLine, Printer } from 'lucide-react';

const InventoryReportsPage = () => {
  const { selectedCompany } = useCompany();
  const [items, setItems] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedItem, setSelectedItem] = useState<string>('');

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [si, bal, wh, adj, tr] = await Promise.all([
      supabase.from('stock_items').select('*, stock_categories(name)').eq('company_id', selectedCompany.id).order('code'),
      supabase.from('stock_balances').select('*, stock_items!inner(company_id, code, name), warehouses(name)')
        .eq('stock_items.company_id', selectedCompany.id),
      supabase.from('warehouses').select('*').eq('company_id', selectedCompany.id),
      supabase.from('stock_adjustments').select('*, stock_adjustment_lines(*, stock_items(code, name))')
        .eq('company_id', selectedCompany.id)
        .gte('adjustment_date', dateFrom).lte('adjustment_date', dateTo)
        .order('adjustment_date', { ascending: false }),
      supabase.from('stock_transfers').select('*, stock_transfer_lines(*, stock_items(code, name))')
        .eq('company_id', selectedCompany.id)
        .gte('transfer_date', dateFrom).lte('transfer_date', dateTo)
        .order('transfer_date', { ascending: false }),
    ]);
    setItems(si.data || []);
    setBalances(bal.data || []);
    setWarehouses(wh.data || []);
    setAdjustments(adj.data || []);
    setTransfers(tr.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany, dateFrom, dateTo]);

  const { fmt } = useCurrency();

  // Stock Card data
  const stockCards = useMemo(() => {
    return items.map(item => {
      const itemBals = balances.filter(b => b.stock_item_id === item.id);
      const totalQty = itemBals.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
      const avgCost = Number(item.purchase_price) || 0;
      const totalValue = totalQty * avgCost;
      return { ...item, totalQty, avgCost, totalValue, balances: itemBals };
    });
  }, [items, balances]);

  // Stock Aging
  const stockAging = useMemo(() => {
    const now = new Date();
    return stockCards.filter(s => s.totalQty > 0).map(item => {
      const daysSinceCreated = Math.floor((now.getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
      let aging = '0-30 days';
      if (daysSinceCreated > 180) aging = '> 180 days';
      else if (daysSinceCreated > 90) aging = '91-180 days';
      else if (daysSinceCreated > 60) aging = '61-90 days';
      else if (daysSinceCreated > 30) aging = '31-60 days';
      return { ...item, daysSinceCreated, aging };
    });
  }, [stockCards]);

  // Aging Summary buckets
  const agingSummary = useMemo(() => {
    const buckets = { '0-30 days': { count: 0, value: 0 }, '31-60 days': { count: 0, value: 0 }, '61-90 days': { count: 0, value: 0 }, '91-180 days': { count: 0, value: 0 }, '> 180 days': { count: 0, value: 0 } };
    stockAging.forEach(item => {
      if (buckets[item.aging as keyof typeof buckets]) {
        buckets[item.aging as keyof typeof buckets].count++;
        buckets[item.aging as keyof typeof buckets].value += item.totalValue;
      }
    });
    return buckets;
  }, [stockAging]);

  // Month End Balance
  const monthEndBalance = useMemo(() => {
    const totalValue = stockCards.reduce((s, i) => s + i.totalValue, 0);
    const totalItems = stockCards.filter(s => s.totalQty > 0).length;
    return { totalValue, totalItems, totalQty: stockCards.reduce((s, i) => s + i.totalQty, 0) };
  }, [stockCards]);

  // Physical Worksheet
  const physicalWorksheet = useMemo(() => {
    return stockCards.map(item => ({
      code: item.code, name: item.name, uom: item.base_uom || 'unit',
      systemQty: item.totalQty, costPerUnit: item.avgCost,
    }));
  }, [stockCards]);

  // Reorder alerts
  const reorderAlerts = useMemo(() => {
    return stockCards.filter(item => {
      const reorderLevel = Number(item.reorder_level) || 0;
      return reorderLevel > 0 && item.totalQty <= reorderLevel;
    });
  }, [stockCards]);

  // Stock Issued (negative adjustments + transfer OUT lines)
  const stockIssued = useMemo(() => {
    const lines: any[] = [];
    adjustments.forEach(adj => {
      (adj.stock_adjustment_lines || []).forEach((line: any) => {
        if (Number(line.quantity) < 0) {
          lines.push({
            date: adj.adjustment_date, docNo: adj.adjustment_no, type: 'Adjustment',
            itemCode: line.stock_items?.code || '—', itemName: line.stock_items?.name || '—',
            quantity: Math.abs(Number(line.quantity)), unitCost: Number(line.unit_cost) || 0,
            totalCost: Math.abs(Number(line.quantity)) * (Number(line.unit_cost) || 0),
            reason: line.description || adj.description || '—',
          });
        }
      });
    });
    transfers.forEach(tr => {
      (tr.stock_transfer_lines || []).forEach((line: any) => {
        lines.push({
          date: tr.transfer_date, docNo: tr.transfer_no, type: 'Transfer Out',
          itemCode: line.stock_items?.code || '—', itemName: line.stock_items?.name || '—',
          quantity: Number(line.quantity) || 0, unitCost: Number(line.unit_cost) || 0,
          totalCost: (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0),
          reason: tr.description || '—',
        });
      });
    });
    return lines.sort((a, b) => b.date.localeCompare(a.date));
  }, [adjustments, transfers]);

  // Stock Received (positive adjustments + transfer IN lines)
  const stockReceived = useMemo(() => {
    const lines: any[] = [];
    adjustments.forEach(adj => {
      (adj.stock_adjustment_lines || []).forEach((line: any) => {
        if (Number(line.quantity) > 0) {
          lines.push({
            date: adj.adjustment_date, docNo: adj.adjustment_no, type: 'Adjustment',
            itemCode: line.stock_items?.code || '—', itemName: line.stock_items?.name || '—',
            quantity: Number(line.quantity), unitCost: Number(line.unit_cost) || 0,
            totalCost: Number(line.quantity) * (Number(line.unit_cost) || 0),
            reason: line.description || adj.description || '—',
          });
        }
      });
    });
    transfers.forEach(tr => {
      (tr.stock_transfer_lines || []).forEach((line: any) => {
        lines.push({
          date: tr.transfer_date, docNo: tr.transfer_no, type: 'Transfer In',
          itemCode: line.stock_items?.code || '—', itemName: line.stock_items?.name || '—',
          quantity: Number(line.quantity) || 0, unitCost: Number(line.unit_cost) || 0,
          totalCost: (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0),
          reason: tr.description || '—',
        });
      });
    });
    return lines.sort((a, b) => b.date.localeCompare(a.date));
  }, [adjustments, transfers]);

  // Stock Card detail for selected item
  const stockCardDetail = useMemo(() => {
    if (!selectedItem) return [];
    const movements: any[] = [];
    // From adjustments
    adjustments.forEach(adj => {
      (adj.stock_adjustment_lines || []).forEach((line: any) => {
        if (line.stock_item_id === selectedItem) {
          movements.push({
            date: adj.adjustment_date, docNo: adj.adjustment_no, type: 'Adjustment',
            qtyIn: Number(line.quantity) > 0 ? Number(line.quantity) : 0,
            qtyOut: Number(line.quantity) < 0 ? Math.abs(Number(line.quantity)) : 0,
            unitCost: Number(line.unit_cost) || 0,
            description: line.description || adj.description || '',
          });
        }
      });
    });
    // From transfers
    transfers.forEach(tr => {
      (tr.stock_transfer_lines || []).forEach((line: any) => {
        if (line.stock_item_id === selectedItem) {
          movements.push({
            date: tr.transfer_date, docNo: tr.transfer_no, type: 'Transfer',
            qtyIn: 0, qtyOut: Number(line.quantity) || 0,
            unitCost: Number(line.unit_cost) || 0,
            description: tr.description || '',
          });
        }
      });
    });
    movements.sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    return movements.map(m => {
      running += m.qtyIn - m.qtyOut;
      return { ...m, balance: running };
    });
  }, [selectedItem, adjustments, transfers]);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const renderMovementTable = (data: any[], title: string, emptyMsg: string) => (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">{title}</CardTitle>
        <CardDescription>{data.length} transactions in period {dateFrom} to {dateTo}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Doc No.</TableHead><TableHead>Type</TableHead>
              <TableHead>Item Code</TableHead><TableHead>Item Name</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{emptyMsg}</TableCell></TableRow>
            ) : data.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.date}</TableCell>
                <TableCell className="font-mono font-medium">{row.docNo}</TableCell>
                <TableCell><Badge variant="secondary">{row.type}</Badge></TableCell>
                <TableCell className="font-mono">{row.itemCode}</TableCell>
                <TableCell className="font-medium">{row.itemName}</TableCell>
                <TableCell className="text-right">{row.quantity}</TableCell>
                <TableCell className="text-right">{fmt(row.unitCost)}</TableCell>
                <TableCell className="text-right font-medium">{fmt(row.totalCost)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{row.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={5}>Total</TableCell>
                <TableCell className="text-right">{data.reduce((s, r) => s + r.quantity, 0)}</TableCell>
                <TableCell />
                <TableCell className="text-right">{fmt(data.reduce((s, r) => s + r.totalCost, 0))}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Inventory Tracking & Reports</h1>
          <p className="text-sm text-muted-foreground">Stock Card, Aging, Month End Balance, Physical Worksheet, Stock Issue & Received</p>
        </div>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <Button onClick={fetchData} variant="outline">Refresh</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
      </div>

      <div className="grid sm:grid-cols-5 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold font-display">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In Stock</p>
            <p className="text-2xl font-bold font-display text-primary">{monthEndBalance.totalItems}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Stock Value</p>
            <p className="text-2xl font-bold font-display">{fmt(monthEndBalance.totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Reorder Alerts</p>
            <p className="text-2xl font-bold font-display text-destructive">{reorderAlerts.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Slow Stock (&gt;90d)</p>
            <p className="text-2xl font-bold font-display text-destructive/80">{stockAging.filter(s => s.daysSinceCreated > 90).length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock-card">
        <TabsList className="flex-wrap">
          <TabsTrigger value="stock-card">Stock Card</TabsTrigger>
          <TabsTrigger value="stock-balance">Stock Balance</TabsTrigger>
          <TabsTrigger value="profit-margin">Profit Margin</TabsTrigger>
          <TabsTrigger value="month-end">Month End Balance</TabsTrigger>
          <TabsTrigger value="aging">Stock Aging</TabsTrigger>
          <TabsTrigger value="physical">Physical Worksheet</TabsTrigger>
          <TabsTrigger value="stock-issued">Stock Issued</TabsTrigger>
          <TabsTrigger value="stock-received">Stock Received</TabsTrigger>
          <TabsTrigger value="reorder">Reorder List</TabsTrigger>
        </TabsList>

        {/* Stock Card */}
        <TabsContent value="stock-card" className="mt-4 space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <Label>Drill into Item</Label>
              <select className="border border-input rounded-md px-3 py-2 text-sm bg-background w-64" value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                <option value="">— All Items (Summary) —</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
              </select>
            </div>
          </div>

          {!selectedItem ? (
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">Stock Card — Item Balances by Warehouse</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead><TableHead>Item Name</TableHead><TableHead>Category</TableHead>
                      <TableHead>UOM</TableHead><TableHead className="text-right">Qty on Hand</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead><TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockCards.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No stock items</TableCell></TableRow>
                    ) : stockCards.map(item => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedItem(item.id)}>
                        <TableCell className="font-mono">{item.code}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{(item as any).stock_categories?.name || '—'}</TableCell>
                        <TableCell>{item.base_uom || 'unit'}</TableCell>
                        <TableCell className="text-right">{item.totalQty}</TableCell>
                        <TableCell className="text-right">{fmt(item.avgCost)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(item.totalValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right">{monthEndBalance.totalQty}</TableCell>
                      <TableCell />
                      <TableCell className="text-right">{fmt(monthEndBalance.totalValue)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">
                  Stock Card — {items.find(i => i.id === selectedItem)?.code} {items.find(i => i.id === selectedItem)?.name}
                </CardTitle>
                <CardDescription>Movement detail for selected period</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>Doc No.</TableHead><TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty In</TableHead><TableHead className="text-right">Qty Out</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Running Bal</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockCardDetail.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No movements in this period</TableCell></TableRow>
                    ) : stockCardDetail.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>{m.date}</TableCell>
                        <TableCell className="font-mono font-medium">{m.docNo}</TableCell>
                        <TableCell><Badge variant="secondary">{m.type}</Badge></TableCell>
                        <TableCell className="text-right text-primary">{m.qtyIn > 0 ? `+${m.qtyIn}` : ''}</TableCell>
                        <TableCell className="text-right text-destructive">{m.qtyOut > 0 ? `-${m.qtyOut}` : ''}</TableCell>
                        <TableCell className="text-right">{fmt(m.unitCost)}</TableCell>
                        <TableCell className="text-right font-medium">{m.balance}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stock Balance by Location */}
        <TabsContent value="stock-balance" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Stock Balance by Location</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Item Name</TableHead><TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No stock balances</TableCell></TableRow>
                  ) : balances.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{b.stock_items?.code}</TableCell>
                      <TableCell className="font-medium">{b.stock_items?.name}</TableCell>
                      <TableCell>{b.warehouses?.name || 'Default'}</TableCell>
                      <TableCell className="text-right">{Number(b.quantity)}</TableCell>
                      <TableCell className="text-right">{fmt(Number(b.unit_cost || 0))}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(b.quantity) * Number(b.unit_cost || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Profit Margin */}
        <TabsContent value="profit-margin" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Product Profit Margin</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead><TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No products</TableCell></TableRow>
                  ) : items.map(item => {
                    const sell = Number(item.selling_price) || 0;
                    const cost = Number(item.purchase_price) || 0;
                    const profit = sell - cost;
                    const margin = sell > 0 ? (profit / sell * 100) : 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.code}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{fmt(sell)}</TableCell>
                        <TableCell className="text-right">{fmt(cost)}</TableCell>
                        <TableCell className={`text-right font-medium ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(profit)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={margin >= 20 ? 'default' : margin >= 0 ? 'secondary' : 'destructive'}>{margin.toFixed(1)}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Month End Balance */}
        <TabsContent value="month-end" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Stock Month End Balance Summary</CardTitle>
              <CardDescription>Inventory valuation as at {dateTo}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6 mb-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Items in Stock</p>
                  <p className="text-3xl font-bold font-display">{monthEndBalance.totalItems}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Quantity</p>
                  <p className="text-3xl font-bold font-display">{monthEndBalance.totalQty}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                  <p className="text-3xl font-bold font-display text-primary">{fmt(monthEndBalance.totalValue)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockCards.filter(s => s.totalQty > 0).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.totalQty}</TableCell>
                      <TableCell className="text-right">{fmt(item.avgCost)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(item.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{monthEndBalance.totalQty}</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{fmt(monthEndBalance.totalValue)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Aging */}
        <TabsContent value="aging" className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-5 gap-3">
            {Object.entries(agingSummary).map(([band, data]) => (
              <Card key={band} className="shadow-card">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">{band}</p>
                  <p className="text-lg font-bold font-display">{data.count} items</p>
                  <p className="text-sm text-muted-foreground">{fmt(data.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Stock Aging Report</CardTitle>
              <CardDescription>Identify slow-moving and obsolete stock</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead>
                    <TableHead>Days</TableHead><TableHead>Aging Band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockAging.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No stock to age</TableCell></TableRow>
                  ) : stockAging.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.totalQty}</TableCell>
                      <TableCell className="text-right">{fmt(item.totalValue)}</TableCell>
                      <TableCell>{item.daysSinceCreated}d</TableCell>
                      <TableCell>
                        <Badge variant={item.daysSinceCreated > 90 ? 'destructive' : item.daysSinceCreated > 30 ? 'secondary' : 'default'}>
                          {item.aging}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Physical Worksheet */}
        <TabsContent value="physical" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display">Physical Stock Worksheet</CardTitle>
                  <CardDescription>Print-ready worksheet for physical stock count</CardDescription>
                </div>
                <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print Worksheet</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Item Name</TableHead><TableHead>UOM</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Physical Qty</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Checked By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {physicalWorksheet.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell className="text-right">{item.systemQty}</TableCell>
                      <TableCell className="text-right text-muted-foreground">________</TableCell>
                      <TableCell className="text-right text-muted-foreground">________</TableCell>
                      <TableCell className="text-muted-foreground">________</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Issued */}
        <TabsContent value="stock-issued" className="mt-4">
          {renderMovementTable(stockIssued, 'Stock Issued Report', 'No stock issues in this period')}
        </TabsContent>

        {/* Stock Received */}
        <TabsContent value="stock-received" className="mt-4">
          {renderMovementTable(stockReceived, 'Stock Received Report', 'No stock received in this period')}
        </TabsContent>

        {/* Reorder List */}
        <TabsContent value="reorder" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Reorder Alerts</CardTitle>
              <CardDescription>Items at or below reorder level</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Item</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead><TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderAlerts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">All items above reorder level ✓</TableCell></TableRow>
                  ) : reorderAlerts.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.totalQty}</TableCell>
                      <TableCell className="text-right">{item.reorder_level}</TableCell>
                      <TableCell className="text-right">{item.reorder_qty || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={item.totalQty === 0 ? 'destructive' : 'secondary'}>
                          {item.totalQty === 0 ? 'Out of Stock' : 'Low Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReportsPage;
