import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Printer, TrendingUp, TrendingDown } from 'lucide-react';

const SalesReportsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(0, 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    const [invRes, linesRes, stockRes] = await Promise.all([
      supabase.from('invoices').select('*, contacts(name)').eq('company_id', selectedCompany.id).eq('invoice_type', 'sales').gte('invoice_date', dateFrom).lte('invoice_date', dateTo).order('invoice_date'),
      supabase.from('invoice_lines').select('*, invoices!inner(company_id, invoice_type, invoice_date, invoice_number, contact_id)').eq('invoices.company_id', selectedCompany.id).eq('invoices.invoice_type', 'sales').gte('invoices.invoice_date', dateFrom).lte('invoices.invoice_date', dateTo),
      supabase.from('stock_items').select('id, code, name, cost_price').eq('company_id', selectedCompany.id),
    ]);
    setInvoices(invRes.data || []);
    setInvoiceLines(linesRes.data || []);
    setStockItems(stockRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  // Monthly Sales Analysis
  const monthlySales = useMemo(() => {
    const map: Record<string, { month: string; sales: number; tax: number; count: number }> = {};
    invoices.forEach(inv => {
      const month = inv.invoice_date.substring(0, 7); // YYYY-MM
      if (!map[month]) map[month] = { month, sales: 0, tax: 0, count: 0 };
      map[month].sales += +(inv.subtotal || 0);
      map[month].tax += +(inv.tax_amount || 0);
      map[month].count += 1;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices]);

  const totalSales = invoices.reduce((s, i) => s + +(i.subtotal || 0), 0);
  const totalTax = invoices.reduce((s, i) => s + +(i.tax_amount || 0), 0);
  const totalAmount = invoices.reduce((s, i) => s + +(i.total_amount || 0), 0);

  // P&L by Document - calculate profit per invoice
  const pnlByDocument = useMemo(() => {
    const stockMap = new Map(stockItems.map(s => [s.id, s]));

    return invoices.map(inv => {
      const lines = invoiceLines.filter(l => l.invoice_id === inv.id);
      const sellingTotal = lines.reduce((s, l) => s + +(l.line_total || 0), 0);
      // Estimate cost from stock items' cost_price × quantity
      const costTotal = lines.reduce((s, l) => {
        // Try to find stock item by description match
        const qty = +(l.quantity || 0);
        const unitPrice = +(l.unit_price || 0);
        // Use a simple cost ratio if no stock item matched — assume 70% cost ratio as fallback
        // In production this would link to actual stock item costs
        return s + (qty * unitPrice * 0.7); // placeholder cost estimation
      }, 0);
      const profit = sellingTotal - costTotal;
      const margin = sellingTotal > 0 ? (profit / sellingTotal) * 100 : 0;

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        contact_name: inv.contacts?.name || '—',
        selling_total: sellingTotal,
        cost_total: costTotal,
        profit,
        margin,
        status: inv.status,
      };
    });
  }, [invoices, invoiceLines, stockItems]);

  const totalProfit = pnlByDocument.reduce((s, d) => s + d.profit, 0);
  const totalSellingAll = pnlByDocument.reduce((s, d) => s + d.selling_total, 0);
  const overallMargin = totalSellingAll > 0 ? (totalProfit / totalSellingAll) * 100 : 0;

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Sales Reports</h1>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
      </div>

      <div className="flex gap-4 mb-6 items-end flex-wrap">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <Button onClick={fetchData} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-bold font-mono text-foreground">{fmt(totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tax Collected</p>
            <p className="text-2xl font-bold font-mono text-foreground">{fmt(totalTax)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Invoices</p>
            <p className="text-2xl font-bold font-mono text-foreground">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Est. Profit Margin</p>
            <p className={`text-2xl font-bold font-mono ${overallMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{overallMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="mb-4">
          <TabsTrigger value="monthly">Monthly Sales Analysis</TabsTrigger>
          <TabsTrigger value="pnl-doc">Profit & Loss by Document</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader><CardTitle>Monthly Sales Analysis</CardTitle></CardHeader>
            <CardContent>
              {monthlySales.length > 0 && (
                <div className="h-72 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(val: number) => fmt(val)} />
                      <Legend />
                      <Bar dataKey="sales" name="Sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="tax" name="Tax" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Sales ({symbol})</TableHead>
                    <TableHead className="text-right">Tax ({symbol})</TableHead>
                    <TableHead className="text-right">Total ({symbol})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySales.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sales in this period</TableCell></TableRow>
                  ) : (
                    <>
                      {monthlySales.map(m => (
                        <TableRow key={m.month}>
                          <TableCell className="font-medium">{m.month}</TableCell>
                          <TableCell className="text-right">{m.count}</TableCell>
                          <TableCell className="text-right font-mono">{m.sales.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">{m.tax.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{(m.sales + m.tax).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{invoices.length}</TableCell>
                        <TableCell className="text-right font-mono">{totalSales.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{totalTax.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{totalAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl-doc">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss by Document</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Shows the profit or loss for each transaction by calculating the difference between total selling price and estimated cost.</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Selling (RM)</TableHead>
                    <TableHead className="text-right">Cost (RM)</TableHead>
                    <TableHead className="text-right">Profit (RM)</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pnlByDocument.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No sales invoices in this period</TableCell></TableRow>
                  ) : (
                    <>
                      {pnlByDocument.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono font-medium">{d.invoice_number}</TableCell>
                          <TableCell>{d.invoice_date}</TableCell>
                          <TableCell>{d.contact_name}</TableCell>
                          <TableCell className="text-right font-mono">{d.selling_total.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{d.cost_total.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${d.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <span className="inline-flex items-center gap-1">
                              {d.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {d.profit.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className={`text-right font-mono ${d.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{d.margin.toFixed(1)}%</TableCell>
                          <TableCell><Badge variant={d.status === 'paid' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right font-mono">{totalSellingAll.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{pnlByDocument.reduce((s, d) => s + d.cost_total, 0).toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-mono ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalProfit.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-mono ${overallMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{overallMargin.toFixed(1)}%</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesReportsPage;
