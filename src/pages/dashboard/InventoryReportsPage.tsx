import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, BarChart3, TrendingDown, Calendar, ClipboardList, ArrowUpDown } from 'lucide-react';

const InventoryReportsPage = () => {
  const { selectedCompany } = useCompany();
  const [items, setItems] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [si, bal, wh] = await Promise.all([
      supabase.from('stock_items').select('*, stock_categories(name)').eq('company_id', selectedCompany.id).order('code'),
      supabase.from('stock_balances').select('*, stock_items!inner(company_id, code, name), warehouses(name)')
        .eq('stock_items.company_id', selectedCompany.id),
      supabase.from('warehouses').select('*').eq('company_id', selectedCompany.id),
    ]);
    setItems(si.data || []);
    setBalances(bal.data || []);
    setWarehouses(wh.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const fmt = (n: number) => `RM ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

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

  // Stock Aging (based on last movement date simulation)
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

  // Month End Balance
  const monthEndBalance = useMemo(() => {
    const totalValue = stockCards.reduce((s, i) => s + i.totalValue, 0);
    const totalItems = stockCards.filter(s => s.totalQty > 0).length;
    return { totalValue, totalItems, totalQty: stockCards.reduce((s, i) => s + i.totalQty, 0) };
  }, [stockCards]);

  // Physical Worksheet
  const physicalWorksheet = useMemo(() => {
    return stockCards.map(item => ({
      code: item.code,
      name: item.name,
      uom: item.base_uom || 'unit',
      systemQty: item.totalQty,
      physicalQty: 0,
      variance: 0,
      costPerUnit: item.avgCost,
    }));
  }, [stockCards]);

  // Reorder alerts
  const reorderAlerts = useMemo(() => {
    return stockCards.filter(item => {
      const reorderLevel = Number(item.reorder_level) || 0;
      return reorderLevel > 0 && item.totalQty <= reorderLevel;
    });
  }, [stockCards]);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Inventory Tracking & Reports</h1>
          <p className="text-sm text-muted-foreground">Stock Card, Aging, Month End Balance, Physical Worksheet</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
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
      </div>

      <Tabs defaultValue="stock-card">
        <TabsList className="flex-wrap">
          <TabsTrigger value="stock-card">Stock Card</TabsTrigger>
          <TabsTrigger value="stock-balance">Stock Balance</TabsTrigger>
          <TabsTrigger value="profit-margin">Product Profit Margin</TabsTrigger>
          <TabsTrigger value="month-end">Month End Balance</TabsTrigger>
          <TabsTrigger value="aging">Stock Aging</TabsTrigger>
          <TabsTrigger value="physical">Physical Worksheet</TabsTrigger>
          <TabsTrigger value="reorder">Reorder List</TabsTrigger>
        </TabsList>

        {/* Stock Card */}
        <TabsContent value="stock-card" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Stock Card — Item Balances by Warehouse</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Qty on Hand</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockCards.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No stock items</TableCell></TableRow>
                  ) : stockCards.map(item => (
                    <TableRow key={item.id}>
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
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
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
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Aging */}
        <TabsContent value="aging" className="mt-4">
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
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Aging Band</TableHead>
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
              <CardTitle className="font-display">Physical Stock Worksheet</CardTitle>
              <CardDescription>Print-ready worksheet for physical stock count</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Item Name</TableHead><TableHead>UOM</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Physical Qty</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead>
                    <TableHead>Status</TableHead>
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
