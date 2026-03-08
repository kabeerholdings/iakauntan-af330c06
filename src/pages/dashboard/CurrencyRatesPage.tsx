import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' }, { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'EUR', name: 'Euro' }, { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' }, { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' }, { code: 'THB', name: 'Thai Baht' },
  { code: 'IDR', name: 'Indonesian Rupiah' }, { code: 'PHP', name: 'Philippine Peso' },
  { code: 'INR', name: 'Indian Rupee' }, { code: 'KRW', name: 'Korean Won' },
  { code: 'TWD', name: 'Taiwan Dollar' }, { code: 'HKD', name: 'Hong Kong Dollar' },
];

const CurrencyRatesPage = () => {
  const { selectedCompany } = useCompany();
  const [rates, setRates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [form, setForm] = useState({ currency_code: '', rate: '', effective_date: new Date().toISOString().split('T')[0] });
  const [convertForm, setConvertForm] = useState({ from: 'USD', to: 'MYR', amount: '100' });

  const baseCurrency = selectedCompany?.base_currency || 'MYR';

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('currency_rates').select('*').eq('company_id', selectedCompany.id).order('effective_date', { ascending: false });
    setRates(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.currency_code || !form.rate) { toast.error('Currency and Rate required'); return; }
    const { error } = await supabase.from('currency_rates').insert({
      company_id: selectedCompany.id, currency_code: form.currency_code.toUpperCase(),
      rate: +form.rate, effective_date: form.effective_date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Rate added');
    setOpen(false);
    setForm({ currency_code: '', rate: '', effective_date: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  // Unique currencies with latest rates
  const latestRates = useMemo(() => {
    const map = new Map<string, any>();
    rates.forEach(r => {
      if (!map.has(r.currency_code)) map.set(r.currency_code, r);
    });
    return Array.from(map.values());
  }, [rates]);

  // Rate change indicators
  const rateChanges = useMemo(() => {
    const changes: Record<string, { current: number; previous: number; change: number; pct: number }> = {};
    const grouped = new Map<string, any[]>();
    rates.forEach(r => {
      if (!grouped.has(r.currency_code)) grouped.set(r.currency_code, []);
      grouped.get(r.currency_code)!.push(r);
    });
    grouped.forEach((entries, code) => {
      const sorted = entries.sort((a: any, b: any) => b.effective_date.localeCompare(a.effective_date));
      const current = Number(sorted[0]?.rate) || 0;
      const previous = sorted.length > 1 ? Number(sorted[1]?.rate) || 0 : current;
      const change = current - previous;
      const pct = previous > 0 ? (change / previous * 100) : 0;
      changes[code] = { current, previous, change, pct };
    });
    return changes;
  }, [rates]);

  // Rate history chart data
  const chartData = useMemo(() => {
    const dateMap = new Map<string, any>();
    rates.forEach(r => {
      if (!dateMap.has(r.effective_date)) dateMap.set(r.effective_date, { date: r.effective_date });
      dateMap.get(r.effective_date)![r.currency_code] = Number(r.rate);
    });
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [rates]);

  const uniqueCurrencies = useMemo(() => [...new Set(rates.map(r => r.currency_code))], [rates]);

  // Conversion result
  const conversionResult = useMemo(() => {
    const amount = Number(convertForm.amount) || 0;
    if (convertForm.from === baseCurrency) {
      const toRate = rateChanges[convertForm.to]?.current;
      return toRate ? (amount / toRate) : null;
    }
    if (convertForm.to === baseCurrency) {
      const fromRate = rateChanges[convertForm.from]?.current;
      return fromRate ? (amount * fromRate) : null;
    }
    const fromRate = rateChanges[convertForm.from]?.current;
    const toRate = rateChanges[convertForm.to]?.current;
    if (fromRate && toRate) return (amount * fromRate) / toRate;
    return null;
  }, [convertForm, rateChanges, baseCurrency]);

  const colors = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Multi-Currency Management</h1>
            <p className="text-sm text-muted-foreground">Exchange rates, conversion, rate history · Base: {baseCurrency}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConvertOpen(true)}>
            <ArrowUpDown className="h-4 w-4 mr-2" />Convert
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Rate</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Exchange Rate</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Currency</Label>
                  <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" value={form.currency_code} onChange={e => setForm(f => ({ ...f, currency_code: e.target.value }))}>
                    <option value="">Select or type below</option>
                    {COMMON_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                  <Input className="mt-2" value={form.currency_code} onChange={e => setForm(f => ({ ...f, currency_code: e.target.value.toUpperCase() }))} placeholder="Or type currency code" maxLength={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Rate (1 {form.currency_code || 'FCY'} = ? {baseCurrency})</Label><Input type="number" step="0.0001" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="4.4700" /></div>
                  <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full">Add Rate</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Currencies Tracked</p>
            <p className="text-2xl font-bold font-display">{uniqueCurrencies.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Rate Entries</p>
            <p className="text-2xl font-bold font-display">{rates.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Base Currency</p>
            <p className="text-2xl font-bold font-display text-primary">{baseCurrency}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Latest Update</p>
            <p className="text-2xl font-bold font-display">{rates[0]?.effective_date || '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rates">
        <TabsList>
          <TabsTrigger value="rates">Current Rates</TabsTrigger>
          <TabsTrigger value="history">Rate History</TabsTrigger>
          <TabsTrigger value="all">All Entries</TabsTrigger>
        </TabsList>

        {/* Current Rates */}
        <TabsContent value="rates" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Latest Exchange Rates</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead><TableHead>Rate (1 FCY = {baseCurrency})</TableHead>
                    <TableHead>Effective Date</TableHead><TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Change %</TableHead><TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestRates.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No exchange rates configured</TableCell></TableRow>
                  ) : latestRates.map(r => {
                    const ch = rateChanges[r.currency_code];
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-bold text-lg">{r.currency_code}</TableCell>
                        <TableCell className="font-mono text-lg">{Number(r.rate).toFixed(4)}</TableCell>
                        <TableCell>{r.effective_date}</TableCell>
                        <TableCell className={`text-right font-mono ${ch?.change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {ch?.change !== 0 ? `${ch?.change >= 0 ? '+' : ''}${ch?.change.toFixed(4)}` : '—'}
                        </TableCell>
                        <TableCell className={`text-right ${ch?.pct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {ch?.pct !== 0 ? `${ch?.pct >= 0 ? '+' : ''}${ch?.pct.toFixed(2)}%` : '—'}
                        </TableCell>
                        <TableCell>
                          {ch?.change > 0 ? <TrendingUp className="h-4 w-4 text-primary" /> :
                           ch?.change < 0 ? <TrendingDown className="h-4 w-4 text-destructive" /> :
                           <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rate History Chart */}
        <TabsContent value="history" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Exchange Rate History</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Add rates with different dates to see trends</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    {uniqueCurrencies.map((c, i) => (
                      <Line key={c} type="monotone" dataKey={c} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Entries */}
        <TabsContent value="all" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">All Rate Entries</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Currency</TableHead><TableHead>Rate</TableHead><TableHead>Effective Date</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {rates.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No exchange rates</TableCell></TableRow>
                  ) : rates.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.currency_code}</TableCell>
                      <TableCell>{Number(r.rate).toFixed(4)}</TableCell>
                      <TableCell>{r.effective_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conversion Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Currency Converter</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Amount</Label>
                <Input type="number" value={convertForm.amount} onChange={e => setConvertForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>From</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" value={convertForm.from} onChange={e => setConvertForm(f => ({ ...f, from: e.target.value }))}>
                  <option value={baseCurrency}>{baseCurrency}</option>
                  {uniqueCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>To</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" value={convertForm.to} onChange={e => setConvertForm(f => ({ ...f, to: e.target.value }))}>
                  <option value={baseCurrency}>{baseCurrency}</option>
                  {uniqueCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setConvertForm(f => ({ ...f, from: f.to, to: f.from }))}>
              <RefreshCw className="h-4 w-4 mr-2" />Swap
            </Button>
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-sm text-muted-foreground mb-1">{convertForm.amount} {convertForm.from} =</p>
              <p className="text-3xl font-bold font-display text-primary">
                {conversionResult !== null ? `${conversionResult.toFixed(4)} ${convertForm.to}` : 'Rate not available'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CurrencyRatesPage;
