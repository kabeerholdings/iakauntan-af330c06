import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Calculator, TrendingUp, DollarSign, Users, Settings2, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CommissionPage = () => {
  const { selectedCompany } = useCompany();
  const [rules, setRules] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [openRule, setOpenRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({ rule_name: '', calculation_basis: 'invoice_date', tier_type: 'flat' });
  const [tierForm, setTierForm] = useState({ min_amount: '', max_amount: '', rate: '', flat_amount: '' });
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [r, t, c, con, s, p] = await Promise.all([
      supabase.from('commission_rules').select('*').eq('company_id', selectedCompany.id).order('created_at'),
      supabase.from('commission_tiers').select('*, commission_rules!inner(company_id)').eq('commission_rules.company_id', selectedCompany.id),
      supabase.from('salesman_commissions').select('*, contacts(name)').eq('company_id', selectedCompany.id).order('period_year', { ascending: false }).order('period_month', { ascending: false }),
      supabase.from('contacts').select('id, name, type').eq('company_id', selectedCompany.id).eq('type', 'salesman'),
      supabase.from('sales_documents').select('doc_date, total_amount, contact_id, salesman_id, status').eq('company_id', selectedCompany.id),
      supabase.from('payments').select('payment_date, amount, payment_type, contact_id').eq('company_id', selectedCompany.id).eq('payment_type', 'receipt'),
    ]);
    setRules(r.data || []);
    setTiers(t.data || []);
    setCommissions(c.data || []);
    setContacts(con.data || []);
    setSales((s.data || []) as any[]);
    setPayments((p.data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreateRule = async () => {
    if (!selectedCompany || !ruleForm.rule_name) return;
    const { error } = await supabase.from('commission_rules').insert({
      company_id: selectedCompany.id,
      ...ruleForm,
    });
    if (error) toast.error(error.message);
    else { toast.success('Commission rule created'); setOpenRule(false); fetchData(); }
  };

  const handleAddTier = async () => {
    if (!selectedRule) return;
    const { error } = await supabase.from('commission_tiers').insert({
      rule_id: selectedRule,
      min_amount: Number(tierForm.min_amount) || 0,
      max_amount: tierForm.max_amount ? Number(tierForm.max_amount) : null,
      rate: Number(tierForm.rate) || 0,
      flat_amount: Number(tierForm.flat_amount) || 0,
    });
    if (error) toast.error(error.message);
    else { toast.success('Tier added'); setTierForm({ min_amount: '', max_amount: '', rate: '', flat_amount: '' }); fetchData(); }
  };

  const calculateCommission = (amount: number, ruleTiers: any[]) => {
    if (ruleTiers.length === 0) return 0;
    const sorted = [...ruleTiers].sort((a, b) => (a.min_amount || 0) - (b.min_amount || 0));
    let commission = 0;
    for (const tier of sorted) {
      const min = Number(tier.min_amount) || 0;
      const max = tier.max_amount ? Number(tier.max_amount) : Infinity;
      if (amount >= min) {
        const applicable = Math.min(amount, max) - min;
        if (applicable > 0) {
          commission += applicable * (Number(tier.rate) / 100) + (Number(tier.flat_amount) || 0);
        }
      }
    }
    return commission;
  };

  const handleGenerate = async () => {
    if (!selectedCompany || rules.length === 0) { toast.error('Create commission rules first'); return; }
    setGenerating(true);
    const activeRule = rules.find(r => r.is_active) || rules[0];
    const ruleTiers = tiers.filter(t => t.rule_id === activeRule.id);
    const monthStr = String(genMonth).padStart(2, '0');
    const fromDate = `${genYear}-${monthStr}-01`;
    const toDate = `${genYear}-${monthStr}-${new Date(genYear, genMonth, 0).getDate()}`;

    // Get all salesmen from contacts
    const salesmen = contacts;
    const records: any[] = [];

    for (const sm of salesmen) {
      let totalAmount = 0;
      if (activeRule.calculation_basis === 'invoice_date') {
        totalAmount = sales
          .filter(s => s.salesman_id === sm.id && s.doc_date >= fromDate && s.doc_date <= toDate)
          .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
      } else {
        totalAmount = payments
          .filter(p => p.contact_id === sm.id && p.payment_date >= fromDate && p.payment_date <= toDate)
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      }

      const commAmt = calculateCommission(totalAmount, ruleTiers);
      records.push({
        company_id: selectedCompany.id,
        salesman_id: sm.id,
        period_month: genMonth,
        period_year: genYear,
        total_sales: totalAmount,
        commission_rate: ruleTiers.length > 0 ? Number(ruleTiers[0].rate) : 0,
        commission_amount: commAmt,
        calculation_basis: activeRule.calculation_basis,
        status: 'calculated',
      });
    }

    if (records.length === 0) { toast.info('No salesmen found'); setGenerating(false); return; }
    const { error } = await supabase.from('salesman_commissions').insert(records);
    if (error) toast.error(error.message);
    else { toast.success(`Generated commissions for ${records.length} salesmen`); fetchData(); }
    setGenerating(false);
  };

  const { fmt } = useCurrency();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const totalCommission = commissions.reduce((s, c) => s + (Number(c.commission_amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Salesman Commission</h1>
            <p className="text-sm text-muted-foreground">Automated commission calculation based on invoice or payment date</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold font-display">{rules.filter(r => r.is_active).length}</p>
              </div>
              <Settings2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Salesmen</p>
                <p className="text-2xl font-bold font-display">{contacts.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Commission (YTD)</p>
                <p className="text-2xl font-bold font-display text-primary">{fmt(totalCommission)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate Commission</TabsTrigger>
          <TabsTrigger value="history">Commission History</TabsTrigger>
          <TabsTrigger value="rules">Commission Rules</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="mt-4 space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Generate Monthly Commission</CardTitle>
              <CardDescription>Select month/year and generate commissions for all salesmen based on active rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div>
                  <Label>Month</Label>
                  <Select value={String(genMonth)} onValueChange={v => setGenMonth(Number(v))}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Input type="number" value={genYear} onChange={e => setGenYear(Number(e.target.value))} className="w-[120px]" />
                </div>
                <Button onClick={handleGenerate} disabled={generating}>
                  <Play className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : 'Generate Commission'}
                </Button>
              </div>
              {rules.length === 0 && (
                <p className="text-sm text-muted-foreground">⚠ No commission rules configured. Go to the Rules tab to create one first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Salesman</TableHead>
                    <TableHead>Basis</TableHead>
                    <TableHead className="text-right">Sales Amount</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No commission records yet</TableCell></TableRow>
                  ) : commissions.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{months[(c.period_month || 1) - 1]} {c.period_year}</TableCell>
                      <TableCell>{(c as any).contacts?.name || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{c.calculation_basis === 'invoice_date' ? 'Invoice Date' : 'Payment Received'}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(c.total_sales)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{fmt(c.commission_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'approved' ? 'default' : 'secondary'}>
                          {c.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {commissions.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right">{fmt(totalCommission)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-semibold">Commission Rules</h3>
            <Dialog open={openRule} onOpenChange={setOpenRule}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Rule</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Commission Rule</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Rule Name</Label><Input value={ruleForm.rule_name} onChange={e => setRuleForm({ ...ruleForm, rule_name: e.target.value })} placeholder="e.g. Standard Commission" /></div>
                  <div>
                    <Label>Calculation Basis</Label>
                    <Select value={ruleForm.calculation_basis} onValueChange={v => setRuleForm({ ...ruleForm, calculation_basis: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invoice_date">Invoice Date</SelectItem>
                        <SelectItem value="payment_date">Payment Received Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tier Type</Label>
                    <Select value={ruleForm.tier_type} onValueChange={v => setRuleForm({ ...ruleForm, tier_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="tiered">Tiered / Volume-Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateRule} className="w-full">Create Rule</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {rules.map(rule => (
            <Card key={rule.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display">{rule.rule_name}</CardTitle>
                    <CardDescription>
                      Basis: {rule.calculation_basis === 'invoice_date' ? 'Invoice Date' : 'Payment Received'} | Type: {rule.tier_type}
                    </CardDescription>
                  </div>
                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="text-sm font-medium mb-2">Commission Tiers</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Min Amount</TableHead>
                      <TableHead>Max Amount</TableHead>
                      <TableHead>Rate (%)</TableHead>
                      <TableHead>Flat Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiers.filter(t => t.rule_id === rule.id).map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{fmt(t.min_amount)}</TableCell>
                        <TableCell>{t.max_amount ? fmt(t.max_amount) : 'Unlimited'}</TableCell>
                        <TableCell>{t.rate}%</TableCell>
                        <TableCell>{fmt(t.flat_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-end gap-3 mt-4">
                  <div><Label className="text-xs">Min</Label><Input value={selectedRule === rule.id ? tierForm.min_amount : ''} onChange={e => { setSelectedRule(rule.id); setTierForm({ ...tierForm, min_amount: e.target.value }); }} placeholder="0" className="w-24" /></div>
                  <div><Label className="text-xs">Max</Label><Input value={selectedRule === rule.id ? tierForm.max_amount : ''} onChange={e => { setSelectedRule(rule.id); setTierForm({ ...tierForm, max_amount: e.target.value }); }} placeholder="∞" className="w-24" /></div>
                  <div><Label className="text-xs">Rate %</Label><Input value={selectedRule === rule.id ? tierForm.rate : ''} onChange={e => { setSelectedRule(rule.id); setTierForm({ ...tierForm, rate: e.target.value }); }} placeholder="5" className="w-20" /></div>
                  <div><Label className="text-xs">Flat</Label><Input value={selectedRule === rule.id ? tierForm.flat_amount : ''} onChange={e => { setSelectedRule(rule.id); setTierForm({ ...tierForm, flat_amount: e.target.value }); }} placeholder="0" className="w-20" /></div>
                  <Button size="sm" onClick={() => { setSelectedRule(rule.id); handleAddTier(); }}>Add Tier</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionPage;
