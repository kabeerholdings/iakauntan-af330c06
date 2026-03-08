import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, FileText, Calculator } from 'lucide-react';
import { toast } from 'sonner';

const SSTPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [taxCodes, setTaxCodes] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [openCode, setOpenCode] = useState(false);
  const [openReturn, setOpenReturn] = useState(false);
  const [codeForm, setCodeForm] = useState({ code: '', description: '', tax_type: 'sales', rate: '0', tariff_code: '' });
  const [returnForm, setReturnForm] = useState({
    return_period: '', period_from: '', period_to: '', notes: '',
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [tc, ret, inv] = await Promise.all([
      supabase.from('sst_tax_codes').select('*').eq('company_id', selectedCompany.id).order('code'),
      supabase.from('sst_returns').select('*').eq('company_id', selectedCompany.id).order('period_from', { ascending: false }),
      supabase.from('invoices').select('*, invoice_lines(*)').eq('company_id', selectedCompany.id).neq('status', 'cancelled'),
    ]);
    setTaxCodes(tc.data || []);
    setReturns(ret.data || []);
    setInvoices(inv.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreateCode = async () => {
    if (!selectedCompany || !codeForm.code) { toast.error('Tax code required'); return; }
    const { error } = await supabase.from('sst_tax_codes').insert({
      company_id: selectedCompany.id, code: codeForm.code, description: codeForm.description || null,
      tax_type: codeForm.tax_type, rate: Number(codeForm.rate), tariff_code: codeForm.tariff_code || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Tax code created');
    setOpenCode(false);
    setCodeForm({ code: '', description: '', tax_type: 'sales', rate: '0', tariff_code: '' });
    fetchData();
  };

  const handleCreateReturn = async () => {
    if (!selectedCompany || !returnForm.return_period || !returnForm.period_from || !returnForm.period_to) {
      toast.error('Period details required'); return;
    }
    // Calculate tax totals from invoices in this period
    const periodInvoices = invoices.filter(inv =>
      inv.invoice_date >= returnForm.period_from && inv.invoice_date <= returnForm.period_to
    );
    const salesTax = periodInvoices
      .filter(inv => inv.invoice_type === 'sales')
      .reduce((s, inv) => s + Number(inv.tax_amount || 0), 0);
    const serviceTax = periodInvoices
      .filter(inv => inv.invoice_type === 'service')
      .reduce((s, inv) => s + Number(inv.tax_amount || 0), 0);

    const { error } = await supabase.from('sst_returns').insert({
      company_id: selectedCompany.id, return_period: returnForm.return_period,
      period_from: returnForm.period_from, period_to: returnForm.period_to,
      total_sales_tax: salesTax, total_service_tax: serviceTax, total_tax: salesTax + serviceTax,
      notes: returnForm.notes || null, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('SST-02 Return created');
    setOpenReturn(false);
    setReturnForm({ return_period: '', period_from: '', period_to: '', notes: '' });
    fetchData();
  };

  // Tax Transaction Listing
  const taxTransactions = useMemo(() => {
    return invoices.filter(inv => Number(inv.tax_amount) > 0).map(inv => ({
      id: inv.id,
      type: inv.invoice_type,
      number: inv.invoice_number,
      date: inv.invoice_date,
      subtotal: Number(inv.subtotal || 0),
      tax: Number(inv.tax_amount || 0),
      total: Number(inv.total_amount || 0),
      status: inv.status,
    }));
  }, [invoices]);

  // Outstanding Service Tax
  const outstandingServiceTax = useMemo(() => {
    return invoices
      .filter(inv => inv.invoice_type === 'service' && Number(inv.tax_amount) > 0 && inv.status !== 'paid')
      .reduce((s, inv) => s + Number(inv.tax_amount || 0), 0);
  }, [invoices]);

  // Tax Payment Collection
  const taxPaymentCollection = useMemo(() => {
    return invoices
      .filter(inv => Number(inv.tax_amount) > 0 && inv.status === 'paid')
      .reduce((s, inv) => s + Number(inv.tax_amount || 0), 0);
  }, [invoices]);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">SST Management</h1>
          <p className="text-sm text-muted-foreground">Sales & Service Tax compliance — SST-02 Return processing</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tax Codes</p>
            <p className="text-2xl font-bold text-foreground">{taxCodes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tax Collected</p>
            <p className="text-2xl font-bold text-foreground">RM {taxPaymentCollection.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding Service Tax</p>
            <p className="text-2xl font-bold text-destructive">RM {outstandingServiceTax.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Returns Filed</p>
            <p className="text-2xl font-bold text-foreground">{returns.filter(r => r.status === 'submitted').length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tax-codes">
        <TabsList>
          <TabsTrigger value="tax-codes">Tax Codes</TabsTrigger>
          <TabsTrigger value="sst-returns">SST-02 Returns</TabsTrigger>
          <TabsTrigger value="tax-transactions">Tax Transaction Listing</TabsTrigger>
        </TabsList>

        {/* Tax Codes Tab */}
        <TabsContent value="tax-codes" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={openCode} onOpenChange={setOpenCode}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Tax Code</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add SST Tax Code</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Code</Label><Input value={codeForm.code} onChange={e => setCodeForm(f => ({ ...f, code: e.target.value }))} placeholder="SR-6" /></div>
                    <div>
                      <Label>Tax Type</Label>
                      <Select value={codeForm.tax_type} onValueChange={v => setCodeForm(f => ({ ...f, tax_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Sales Tax</SelectItem>
                          <SelectItem value="service">Service Tax</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Description</Label><Input value={codeForm.description} onChange={e => setCodeForm(f => ({ ...f, description: e.target.value }))} placeholder="Sales Tax 6%" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Rate (%)</Label><Input type="number" value={codeForm.rate} onChange={e => setCodeForm(f => ({ ...f, rate: e.target.value }))} /></div>
                    <div><Label>Tariff Code</Label><Input value={codeForm.tariff_code} onChange={e => setCodeForm(f => ({ ...f, tariff_code: e.target.value }))} placeholder="Optional" /></div>
                  </div>
                  <Button onClick={handleCreateCode} className="w-full">Create Tax Code</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead>Tariff Code</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxCodes.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tax codes. Add your SST tax codes to get started.</TableCell></TableRow>
                  ) : taxCodes.map(tc => (
                    <TableRow key={tc.id}>
                      <TableCell className="font-medium font-mono">{tc.code}</TableCell>
                      <TableCell>{tc.description || '—'}</TableCell>
                      <TableCell><Badge variant={tc.tax_type === 'sales' ? 'default' : 'secondary'}>{tc.tax_type === 'sales' ? 'Sales Tax' : 'Service Tax'}</Badge></TableCell>
                      <TableCell className="text-right">{Number(tc.rate).toFixed(1)}%</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{tc.tariff_code || '—'}</TableCell>
                      <TableCell><Badge variant={tc.is_active ? 'default' : 'outline'}>{tc.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SST-02 Returns Tab */}
        <TabsContent value="sst-returns" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={openReturn} onOpenChange={setOpenReturn}>
              <DialogTrigger asChild><Button size="sm"><Calculator className="h-4 w-4 mr-1" />Process SST-02</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Process SST-02 Return</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Return Period</Label><Input value={returnForm.return_period} onChange={e => setReturnForm(f => ({ ...f, return_period: e.target.value }))} placeholder="e.g. Jan-Feb 2026" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Period From</Label><Input type="date" value={returnForm.period_from} onChange={e => setReturnForm(f => ({ ...f, period_from: e.target.value }))} /></div>
                    <div><Label>Period To</Label><Input type="date" value={returnForm.period_to} onChange={e => setReturnForm(f => ({ ...f, period_to: e.target.value }))} /></div>
                  </div>
                  <div><Label>Notes</Label><Input value={returnForm.notes} onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <Button onClick={handleCreateReturn} className="w-full">Generate SST-02 Return</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Sales Tax ({symbol})</TableHead>
                    <TableHead className="text-right">Service Tax ({symbol})</TableHead>
                    <TableHead className="text-right">Total Tax ({symbol})</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No SST returns processed yet</TableCell></TableRow>
                  ) : returns.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.return_period}</TableCell>
                      <TableCell>{r.period_from}</TableCell>
                      <TableCell>{r.period_to}</TableCell>
                      <TableCell className="text-right">{fmt(Number(r.total_sales_tax))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(r.total_service_tax))}</TableCell>
                      <TableCell className="text-right font-bold">{fmt(Number(r.total_tax))}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'submitted' ? 'default' : r.status === 'draft' ? 'secondary' : 'outline'}>
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Transaction Listing Tab */}
        <TabsContent value="tax-transactions" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Tax Transaction Listing</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doc #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Subtotal (RM)</TableHead>
                    <TableHead className="text-right">Tax (RM)</TableHead>
                    <TableHead className="text-right">Total (RM)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxTransactions.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No taxable transactions found</TableCell></TableRow>
                  ) : taxTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.number}</TableCell>
                      <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                      <TableCell>{t.date}</TableCell>
                      <TableCell className="text-right">{t.subtotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{t.tax.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{t.total.toFixed(2)}</TableCell>
                      <TableCell><Badge variant={t.status === 'paid' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {taxTransactions.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">{taxTransactions.reduce((s, t) => s + t.subtotal, 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{taxTransactions.reduce((s, t) => s + t.tax, 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{taxTransactions.reduce((s, t) => s + t.total, 0).toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
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

export default SSTPage;
