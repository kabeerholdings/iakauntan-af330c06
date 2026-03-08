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
import { BarChart3, TrendingUp, Clock, FileText, Package, DollarSign, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

const AdvancedReportsPage = () => {
  const { selectedCompany } = useCompany();
  const [sales, setSales] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); d.setMonth(0, 1); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [s, i, c, si] = await Promise.all([
      supabase.from('sales_documents').select('*, contacts(name)').eq('company_id', selectedCompany.id).gte('doc_date', dateFrom).lte('doc_date', dateTo).order('doc_date', { ascending: false }),
      supabase.from('invoices').select('*, contacts(name)').eq('company_id', selectedCompany.id).order('due_date'),
      supabase.from('contacts').select('*').eq('company_id', selectedCompany.id),
      supabase.from('stock_items').select('*').eq('company_id', selectedCompany.id),
    ]);
    setSales(s.data || []);
    setInvoices(i.data || []);
    setContacts(c.data || []);
    setItems(si.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany, dateFrom, dateTo]);

  const fmt = (n: number) => `RM ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  // Yearly Sales Analysis
  const yearlySalesData = useMemo(() => {
    const thisYr = String(new Date().getFullYear());
    const lastYr = String(new Date().getFullYear() - 1);
    return Array.from({ length: 12 }, (_, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const thisYear = sales.filter(s => s.doc_date?.substring(5, 7) === monthStr && s.doc_date?.substring(0, 4) === thisYr);
      const lastYear = sales.filter(s => s.doc_date?.substring(5, 7) === monthStr && s.doc_date?.substring(0, 4) === lastYr);
      return {
        month: format(new Date(2024, i), 'MMM'),
        thisYear: thisYear.reduce((s, d) => s + (Number(d.total_amount) || 0), 0),
        lastYear: lastYear.reduce((s, d) => s + (Number(d.total_amount) || 0), 0),
      };
    });
  }, [sales]);

  const yearlyTotals = useMemo(() => ({
    thisYear: yearlySalesData.reduce((s, m) => s + m.thisYear, 0),
    lastYear: yearlySalesData.reduce((s, m) => s + m.lastYear, 0),
  }), [yearlySalesData]);

  // Price History with margin analysis
  const priceHistory = useMemo(() => {
    return items.map(item => ({
      code: item.code, name: item.name,
      currentPrice: Number(item.selling_price) || 0,
      purchasePrice: Number(item.purchase_price) || 0,
      margin: ((Number(item.selling_price) || 0) - (Number(item.purchase_price) || 0)),
      marginPct: (Number(item.selling_price) || 0) > 0
        ? (((Number(item.selling_price) || 0) - (Number(item.purchase_price) || 0)) / (Number(item.selling_price) || 0) * 100)
        : 0,
      category: item.stock_categories?.name || '—',
    })).sort((a, b) => b.margin - a.margin);
  }, [items]);

  // Outstanding Invoices with aging buckets
  const outstandingInvoices = useMemo(() => {
    return invoices.filter(i => i.status !== 'paid' && i.status !== 'void').map(inv => ({
      ...inv,
      daysOverdue: inv.due_date ? Math.max(0, Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0,
    })).sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [invoices]);

  const totalOutstanding = outstandingInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);

  // Aging buckets summary
  const agingBuckets = useMemo(() => {
    const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    outstandingInvoices.forEach(inv => {
      const amt = Number(inv.total_amount) || 0;
      if (inv.daysOverdue === 0) buckets.current += amt;
      else if (inv.daysOverdue <= 30) buckets['1-30'] += amt;
      else if (inv.daysOverdue <= 60) buckets['31-60'] += amt;
      else if (inv.daysOverdue <= 90) buckets['61-90'] += amt;
      else buckets['90+'] += amt;
    });
    return buckets;
  }, [outstandingInvoices]);

  // Top Customers by sales
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    sales.forEach(s => {
      const name = (s as any).contacts?.name || 'Unknown';
      const existing = map.get(name) || { name, total: 0, count: 0 };
      existing.total += Number(s.total_amount) || 0;
      existing.count++;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [sales]);

  // Picking List
  const pickingList = useMemo(() => {
    return sales.filter(s => s.doc_type === 'sales_order' && s.status === 'confirmed')
      .map(so => ({
        docNo: so.doc_number, date: so.doc_date,
        customer: (so as any).contacts?.name || '—',
        amount: Number(so.total_amount) || 0, status: so.status,
      }));
  }, [sales]);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Advanced Sales & Purchase Reports</h1>
            <p className="text-sm text-muted-foreground">Price History, Yearly Analysis, Picking List, Outstanding, Top Customers</p>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <Button onClick={fetchData}>Refresh</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-5 gap-4">
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">This Year Sales</p>
          <p className="text-xl font-bold font-display text-primary">{fmt(yearlyTotals.thisYear)}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Last Year Sales</p>
          <p className="text-xl font-bold font-display">{fmt(yearlyTotals.lastYear)}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">YoY Growth</p>
          <p className={`text-xl font-bold font-display ${yearlyTotals.lastYear > 0 && yearlyTotals.thisYear > yearlyTotals.lastYear ? 'text-primary' : 'text-destructive'}`}>
            {yearlyTotals.lastYear > 0 ? `${((yearlyTotals.thisYear - yearlyTotals.lastYear) / yearlyTotals.lastYear * 100).toFixed(1)}%` : '—'}
          </p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-xl font-bold font-display text-destructive">{fmt(totalOutstanding)}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Pending Pick</p>
          <p className="text-xl font-bold font-display">{pickingList.length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="yearly">
        <TabsList className="flex-wrap">
          <TabsTrigger value="yearly">Yearly Sales</TabsTrigger>
          <TabsTrigger value="top-customers">Top Customers</TabsTrigger>
          <TabsTrigger value="price">Price History</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="picking">Picking List</TabsTrigger>
        </TabsList>

        {/* Yearly Sales */}
        <TabsContent value="yearly" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Yearly Sales — This Year vs Last Year</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={yearlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="thisYear" name="This Year" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lastYear" name="Last Year" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead><TableHead className="text-right">This Year</TableHead>
                    <TableHead className="text-right">Last Year</TableHead><TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlySalesData.map(m => {
                    const change = m.lastYear > 0 ? ((m.thisYear - m.lastYear) / m.lastYear * 100) : 0;
                    return (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">{m.month}</TableCell>
                        <TableCell className="text-right">{fmt(m.thisYear)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(m.lastYear)}</TableCell>
                        <TableCell className={`text-right ${change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {change !== 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{fmt(yearlyTotals.thisYear)}</TableCell>
                    <TableCell className="text-right">{fmt(yearlyTotals.lastYear)}</TableCell>
                    <TableCell className="text-right">
                      {yearlyTotals.lastYear > 0 ? `${((yearlyTotals.thisYear - yearlyTotals.lastYear) / yearlyTotals.lastYear * 100).toFixed(1)}%` : '—'}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Customers */}
        <TabsContent value="top-customers" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Top 10 Customers by Sales</CardTitle>
              <CardDescription>Ranked by total sales amount in selected period</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead><TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Avg per Txn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sales data</TableCell></TableRow>
                  ) : topCustomers.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant={i < 3 ? 'default' : 'secondary'}>{i + 1}</Badge></TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(c.total)}</TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(c.count > 0 ? c.total / c.count : 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price History */}
        <TabsContent value="price" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Item Price History & Margin Analysis</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Item</TableHead>
                    <TableHead className="text-right">Selling</TableHead><TableHead className="text-right">Purchase</TableHead>
                    <TableHead className="text-right">Margin</TableHead><TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items</TableCell></TableRow>
                  ) : priceHistory.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{fmt(item.currentPrice)}</TableCell>
                      <TableCell className="text-right">{fmt(item.purchasePrice)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(item.margin)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.marginPct > 20 ? 'default' : item.marginPct >= 0 ? 'secondary' : 'destructive'}>{item.marginPct.toFixed(1)}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outstanding */}
        <TabsContent value="outstanding" className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-5 gap-3">
            {Object.entries(agingBuckets).map(([band, amount]) => (
              <Card key={band} className="shadow-card">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground uppercase">{band === 'current' ? 'Current' : `${band} days`}</p>
                  <p className="text-lg font-bold font-display">{fmt(amount)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display">Outstanding Invoice List</CardTitle>
                  <CardDescription>Unpaid invoices sorted by days overdue</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  <p className="text-xl font-bold font-display text-destructive">{fmt(totalOutstanding)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead><TableHead>Customer</TableHead><TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead><TableHead>Days Overdue</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingInvoices.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No outstanding invoices ✓</TableCell></TableRow>
                  ) : outstandingInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{(inv as any).contacts?.name || '—'}</TableCell>
                      <TableCell>{inv.due_date || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(inv.total_amount))}</TableCell>
                      <TableCell>
                        <Badge variant={inv.daysOverdue > 60 ? 'destructive' : inv.daysOverdue > 30 ? 'secondary' : 'default'}>
                          {inv.daysOverdue > 0 ? `${inv.daysOverdue} days` : 'Current'}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{inv.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Picking List */}
        <TabsContent value="picking" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Picking List — Confirmed Sales Orders</CardTitle>
              <CardDescription>Orders ready for fulfillment ({pickingList.length} pending)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pickingList.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No pending orders for picking</TableCell></TableRow>
                  ) : pickingList.map((so, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{so.docNo}</TableCell>
                      <TableCell>{so.date}</TableCell>
                      <TableCell>{so.customer}</TableCell>
                      <TableCell className="text-right">{fmt(so.amount)}</TableCell>
                      <TableCell><Badge>Ready to Pick</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {pickingList.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">{fmt(pickingList.reduce((s, p) => s + p.amount, 0))}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReportsPage;
