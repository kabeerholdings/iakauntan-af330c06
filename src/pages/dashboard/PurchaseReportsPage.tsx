import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Printer } from 'lucide-react';

const PurchaseReportsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const [docs, setDocs] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(0, 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('purchase_documents')
      .select('*, contacts(name), purchase_document_lines(*)')
      .eq('company_id', selectedCompany.id)
      .gte('doc_date', dateFrom)
      .lte('doc_date', dateTo)
      .order('doc_date');
    setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  // Monthly Purchase Analysis
  const monthlyPurchase = useMemo(() => {
    const map: Record<string, { month: string; purchases: number; tax: number; count: number }> = {};
    docs.filter(d => d.doc_type === 'purchase_invoice' || d.doc_type === 'purchase_order').forEach(doc => {
      const month = doc.doc_date.substring(0, 7);
      if (!map[month]) map[month] = { month, purchases: 0, tax: 0, count: 0 };
      map[month].purchases += +(doc.subtotal || 0);
      map[month].tax += +(doc.tax_amount || 0);
      map[month].count += 1;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [docs]);

  const totalPurchases = monthlyPurchase.reduce((s, m) => s + m.purchases, 0);
  const totalTax = monthlyPurchase.reduce((s, m) => s + m.tax, 0);
  const totalCount = monthlyPurchase.reduce((s, m) => s + m.count, 0);

  // Returns summary
  const returnsSummary = useMemo(() => {
    const returns = docs.filter(d => d.doc_type === 'purchase_return');
    return {
      count: returns.length,
      total: returns.reduce((s, r) => s + +(r.total_amount || 0), 0),
    };
  }, [docs]);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Purchase Reports</h1>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" />Print
        </Button>
      </div>

      <div className="flex items-end gap-4 mb-6">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
        <Button onClick={fetchData} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Purchases</p>
            <p className="text-2xl font-bold text-foreground">RM {totalPurchases.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Tax</p>
            <p className="text-2xl font-bold text-foreground">RM {totalTax.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Documents</p>
            <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Returns</p>
            <p className="text-2xl font-bold text-foreground">{returnsSummary.count} (RM {returnsSummary.total.toFixed(2)})</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Monthly Purchase Analysis</CardTitle></CardHeader>
        <CardContent>
          {monthlyPurchase.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No purchase data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyPurchase}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value: number) => fmt(value)} />
                <Legend />
                <Bar dataKey="purchases" fill="hsl(var(--primary))" name="Purchases" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tax" fill="hsl(var(--muted-foreground))" name="Tax" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Monthly Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Documents</TableHead>
                <TableHead className="text-right">Purchases ({symbol})</TableHead>
                <TableHead className="text-right">Tax ({symbol})</TableHead>
                <TableHead className="text-right">Total ({symbol})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyPurchase.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              ) : (
                <>
                  {monthlyPurchase.map(m => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right">{m.count}</TableCell>
                      <TableCell className="text-right">{fmt(m.purchases)}</TableCell>
                      <TableCell className="text-right">{fmt(m.tax)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(m.purchases + m.tax)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totalCount}</TableCell>
                    <TableCell className="text-right">{fmt(totalPurchases)}</TableCell>
                    <TableCell className="text-right">{fmt(totalTax)}</TableCell>
                    <TableCell className="text-right">{fmt(totalPurchases + totalTax)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseReportsPage;
