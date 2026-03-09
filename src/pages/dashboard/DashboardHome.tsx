import { useEffect, useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText, CreditCard, Users, TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RePieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, parseISO } from 'date-fns';

const CHART_COLORS = [
  'hsl(215, 90%, 42%)', 'hsl(168, 72%, 40%)', 'hsl(32, 90%, 55%)',
  'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)', 'hsl(190, 80%, 42%)',
  'hsl(45, 90%, 50%)', 'hsl(340, 70%, 50%)',
];

type SalesData = { doc_date: string; total_amount: number; contact_id: string | null; doc_type: string; status: string | null };
type InvoiceData = { invoice_date: string; total_amount: number; contact_id: string | null; status: string | null };
type ExpenseData = { expense_date: string; amount: number; category: string | null };
type PaymentData = { payment_date: string; amount: number; payment_type: string };
type ContactData = { id: string; name: string; type: string; created_at: string; state: string | null; city: string | null };
type QuotationData = { doc_date: string; doc_type: string; status: string | null; total_amount: number };

const DashboardHome = () => {
  const { selectedCompany } = useCompany();
  const [sales, setSales] = useState<SalesData[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_year');

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'last_month': return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
      case 'this_year': return { from: startOfYear(now), to: endOfYear(now) };
      case 'last_year': return { from: startOfYear(subYears(now, 1)), to: endOfYear(subYears(now, 1)) };
      default: return { from: startOfYear(now), to: endOfYear(now) };
    }
  }, [period]);

  const prevDateRange = useMemo(() => {
    const offset = period.includes('year') ? 1 : 0;
    return {
      from: subYears(dateRange.from, 1),
      to: subYears(dateRange.to, 1),
    };
  }, [dateRange]);

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    const prevFromStr = format(prevDateRange.from, 'yyyy-MM-dd');
    const prevToStr = format(prevDateRange.to, 'yyyy-MM-dd');

    Promise.all([
      supabase.from('sales_documents').select('doc_date, total_amount, contact_id, doc_type, status')
        .eq('company_id', selectedCompany.id).gte('doc_date', prevFromStr).lte('doc_date', toStr),
      supabase.from('invoices').select('invoice_date, total_amount, contact_id, status')
        .eq('company_id', selectedCompany.id).gte('invoice_date', prevFromStr).lte('invoice_date', toStr),
      supabase.from('expenses').select('expense_date, amount, category')
        .eq('company_id', selectedCompany.id).gte('expense_date', prevFromStr).lte('expense_date', toStr),
      supabase.from('payments').select('payment_date, amount, payment_type')
        .eq('company_id', selectedCompany.id).gte('payment_date', fromStr).lte('payment_date', toStr),
      supabase.from('contacts').select('id, name, type, created_at, state, city')
        .eq('company_id', selectedCompany.id),
      supabase.from('sales_documents').select('doc_date, doc_type, status, total_amount')
        .eq('company_id', selectedCompany.id).eq('doc_type', 'quotation').gte('doc_date', fromStr).lte('doc_date', toStr),
    ]).then(([salesRes, invRes, expRes, payRes, conRes, quotRes]) => {
      setSales((salesRes.data || []) as SalesData[]);
      setInvoices((invRes.data || []) as InvoiceData[]);
      setExpenses((expRes.data || []) as ExpenseData[]);
      setPayments((payRes.data || []) as PaymentData[]);
      setContacts((conRes.data || []) as ContactData[]);
      setQuotations((quotRes.data || []) as QuotationData[]);
      setLoading(false);
    });
  }, [selectedCompany, dateRange, prevDateRange]);

  // --- Computed metrics ---
  const fromStr = format(dateRange.from, 'yyyy-MM-dd');
  const toStr = format(dateRange.to, 'yyyy-MM-dd');
  const prevFromStr = format(prevDateRange.from, 'yyyy-MM-dd');

  const currentSales = sales.filter(s => s.doc_date >= fromStr && s.doc_date <= toStr && s.doc_type !== 'quotation');
  const prevSales = sales.filter(s => s.doc_date >= prevFromStr && s.doc_date < fromStr && s.doc_type !== 'quotation');
  const currentInvoices = invoices.filter(i => i.invoice_date >= fromStr && i.invoice_date <= toStr);
  const prevInvoices = invoices.filter(i => i.invoice_date >= prevFromStr && i.invoice_date < fromStr);
  const currentExpenses = expenses.filter(e => e.expense_date >= fromStr && e.expense_date <= toStr);
  const prevExpenses = expenses.filter(e => e.expense_date >= prevFromStr && e.expense_date < fromStr);

  const totalSales = currentSales.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
  const prevTotalSales = prevSales.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
  const totalInvoiced = currentInvoices.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
  const prevTotalInvoiced = prevInvoices.reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
  const totalExpense = currentExpenses.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const prevTotalExpense = prevExpenses.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalCollected = payments.filter(p => p.payment_type === 'receipt').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const profit = totalSales - totalExpense;
  const prevProfit = prevTotalSales - prevTotalExpense;

  const pctChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  // --- Monthly sales trend ---
  const monthlyTrend = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const currMonth = currentSales.filter(s => s.doc_date.substring(5, 7) === monthStr);
      const prevMonth = prevSales.filter(s => s.doc_date.substring(5, 7) === monthStr);
      return {
        month: format(new Date(2024, i), 'MMM'),
        current: currMonth.reduce((s, d) => s + (Number(d.total_amount) || 0), 0),
        previous: prevMonth.reduce((s, d) => s + (Number(d.total_amount) || 0), 0),
      };
    });
    return months;
  }, [currentSales, prevSales, dateRange]);

  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    currentSales.forEach(s => {
      if (s.contact_id) map.set(s.contact_id, (map.get(s.contact_id) || 0) + (Number(s.total_amount) || 0));
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return sorted.map(([id, amount]) => {
      const contact = contacts.find(c => c.id === id);
      return { name: contact?.name || 'Unknown', amount };
    });
  }, [currentSales, contacts]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    currentExpenses.forEach(e => {
      const cat = e.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + (Number(e.amount) || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [currentExpenses]);

  const customerGeo = useMemo(() => {
    const map = new Map<string, number>();
    contacts.filter(c => c.type === 'customer').forEach(c => {
      const loc = c.state || c.city || 'Unknown';
      map.set(loc, (map.get(loc) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [contacts]);

  const customerRetention = useMemo(() => {
    const customers = contacts.filter(c => c.type === 'customer');
    const newCust = customers.filter(c => c.created_at >= fromStr).length;
    const existing = customers.length - newCust;
    return [
      { name: 'New Customers', value: newCust },
      { name: 'Existing Customers', value: existing },
    ];
  }, [contacts, fromStr]);

  const quotationStats = useMemo(() => {
    const total = quotations.length;
    const converted = quotations.filter(q => q.status === 'confirmed' || q.status === 'converted').length;
    const pending = quotations.filter(q => q.status === 'draft' || q.status === 'pending').length;
    const cancelled = quotations.filter(q => q.status === 'cancelled' || q.status === 'void').length;
    return { total, converted, pending, cancelled, rate: total > 0 ? (converted / total) * 100 : 0 };
  }, [quotations]);

  const cashFlowData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const receipts = payments.filter(p => p.payment_type === 'receipt' && p.payment_date.substring(5, 7) === monthStr);
      const pays = payments.filter(p => p.payment_type === 'payment' && p.payment_date.substring(5, 7) === monthStr);
      return {
        month: format(new Date(2024, i), 'MMM'),
        inflow: receipts.reduce((s, d) => s + (Number(d.amount) || 0), 0),
        outflow: pays.reduce((s, d) => s + (Number(d.amount) || 0), 0),
      };
    });
  }, [payments]);

  const outstanding = useMemo(() => {
    return currentInvoices.filter(i => i.status !== 'paid' && i.status !== 'void')
      .reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  }, [currentInvoices]);

  const fmt = (n: number) => formatCurrency(n, selectedCompany?.base_currency);

  if (!selectedCompany) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">Welcome to iAkauntan</h2>
        <p className="text-muted-foreground text-sm">Please create a company in Settings to get started.</p>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, change, color }: { title: string; value: string; icon: any; change?: number; color: string }) => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{title}</CardTitle>
        <div className={`p-1.5 sm:p-2 rounded-lg bg-${color}/10`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}`} />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <p className="text-lg sm:text-2xl font-bold font-display text-card-foreground truncate">{value}</p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span className="truncate">{Math.abs(change).toFixed(1)}% vs prev</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px] sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="last_year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid-5">
        <StatCard title="Total Sales" value={fmt(totalSales)} icon={TrendingUp} change={pctChange(totalSales, prevTotalSales)} color="primary" />
        <StatCard title="Total Invoiced" value={fmt(totalInvoiced)} icon={FileText} change={pctChange(totalInvoiced, prevTotalInvoiced)} color="primary" />
        <StatCard title="Expenses" value={fmt(totalExpense)} icon={CreditCard} change={pctChange(totalExpense, prevTotalExpense)} color="destructive" />
        <StatCard title="Net Profit" value={fmt(profit)} icon={DollarSign} change={pctChange(profit, prevProfit)} color="accent" />
        <StatCard title="Collections" value={fmt(totalCollected)} icon={ShoppingCart} color="accent" />
      </div>

      {/* Secondary KPIs */}
      <div className="stats-grid">
        <Card className="shadow-card">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Outstanding</p>
                <p className="text-lg sm:text-xl font-bold font-display text-destructive truncate">{fmt(outstanding)}</p>
              </div>
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/30 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Quotations</p>
                <p className="text-lg sm:text-xl font-bold font-display">{quotationStats.total}</p>
              </div>
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/30 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Conversion</p>
                <p className="text-lg sm:text-xl font-bold font-display text-primary">{quotationStats.rate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/30 shrink-0" />
            </div>
            <div className="flex gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
              <span className="text-emerald-600">✓ {quotationStats.converted}</span>
              <span className="text-amber-500">⏳ {quotationStats.pending}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Contacts</p>
                <p className="text-lg sm:text-xl font-bold font-display">{contacts.length}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/30 shrink-0" />
            </div>
            <div className="flex gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
              <span>{contacts.filter(c => c.type === 'customer').length} cust</span>
              <span>{contacts.filter(c => c.type === 'supplier').length} supp</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4 tabs-scroll">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="sales" className="text-xs sm:text-sm">Sales</TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs sm:text-sm">Cash Flow</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs sm:text-sm">Customers</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
        </TabsList>

        {/* Sales Analysis Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="font-display text-sm sm:text-lg">Monthly Sales Trend</CardTitle>
                <CardDescription className="text-xs sm:text-sm">This year vs last year</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="current" name="This Year" fill="hsl(215, 90%, 42%)" radius={[4, 4, 0, 0]} />
                    <Line dataKey="previous" name="Last Year" stroke="hsl(168, 72%, 40%)" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="font-display text-sm sm:text-lg">Top Customers</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Highest revenue</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                {topCustomers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12 text-sm">No sales data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topCustomers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="amount" fill="hsl(215, 90%, 42%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="font-display text-sm sm:text-lg">Cumulative Sales Growth</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthlyTrend.map((m, i, arr) => ({
                  ...m,
                  cumulative: arr.slice(0, i + 1).reduce((s, x) => s + x.current, 0),
                  prevCumulative: arr.slice(0, i + 1).reduce((s, x) => s + x.previous, 0),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area dataKey="cumulative" name="This Year" fill="hsl(215, 90%, 42%)" fillOpacity={0.15} stroke="hsl(215, 90%, 42%)" strokeWidth={2} />
                  <Area dataKey="prevCumulative" name="Last Year" fill="hsl(168, 72%, 40%)" fillOpacity={0.1} stroke="hsl(168, 72%, 40%)" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="font-display text-sm sm:text-lg">Monthly Cash Flow</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Inflows vs Outflows</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="inflow" name="Cash In" fill="hsl(168, 72%, 40%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Cash Out" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="font-display text-sm sm:text-lg">Net Cash Flow Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={cashFlowData.map(d => ({ ...d, net: d.inflow - d.outflow }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Area dataKey="net" name="Net Cash Flow" fill="hsl(215, 90%, 42%)" fillOpacity={0.15} stroke="hsl(215, 90%, 42%)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Analysis Tab */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="font-display text-sm sm:text-lg">Customer Retention</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie data={customerRetention} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {customerRetention.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="font-display text-sm sm:text-lg">Customer Location</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                {customerGeo.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12 text-sm">No location data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={customerGeo} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Customers" fill="hsl(168, 72%, 40%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="font-display text-sm sm:text-lg">Quotation Funnel</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
                {[
                  { label: 'Issued', value: quotationStats.total, color: 'bg-primary/10 text-primary' },
                  { label: 'Pending', value: quotationStats.pending, color: 'bg-amber-100 text-amber-700' },
                  { label: 'Converted', value: quotationStats.converted, color: 'bg-emerald-100 text-emerald-700' },
                  { label: 'Cancelled', value: quotationStats.cancelled, color: 'bg-red-100 text-red-600' },
                ].map(item => (
                  <div key={item.label} className={`rounded-lg p-3 sm:p-4 ${item.color}`}>
                    <p className="text-xl sm:text-3xl font-bold font-display">{item.value}</p>
                    <p className="text-xs sm:text-sm mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Breakdown Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="font-display text-sm sm:text-lg">By Category</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                {expenseByCategory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12 text-sm">No expense data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <RePieChart>
                      <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="font-display text-sm sm:text-lg">Monthly Profit Margin</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={monthlyTrend.map((m, i) => {
                    const monthStr = String(i + 1).padStart(2, '0');
                    const monthExp = currentExpenses.filter(e => e.expense_date.substring(5, 7) === monthStr)
                      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
                    return { month: m.month, sales: m.current, expenses: monthExp, profit: m.current - monthExp };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="sales" name="Sales" fill="hsl(215, 90%, 42%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    <Line dataKey="profit" name="Profit" stroke="hsl(168, 72%, 40%)" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardHome;
