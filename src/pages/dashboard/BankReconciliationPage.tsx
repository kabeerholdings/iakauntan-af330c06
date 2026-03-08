import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, CheckCircle, XCircle, Link2, Unlink, ArrowRightLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type BankStatement = {
  id: string;
  statement_date: string;
  reference: string | null;
  description: string | null;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  is_reconciled: boolean;
  matched_payment_id: string | null;
};

type PaymentRecord = {
  id: string;
  payment_date: string;
  reference: string | null;
  amount: number;
  payment_type: string;
  notes: string | null;
  contact_id: string | null;
  contacts?: { name: string } | null;
};

const BankReconciliationPage = () => {
  const { selectedCompany } = useCompany();
  const [bankAccounts, setBankAccounts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showManualMatch, setShowManualMatch] = useState(false);
  const [manualStmtId, setManualStmtId] = useState('');
  const [manualPayId, setManualPayId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!selectedCompany) return;
    supabase.from('chart_of_accounts').select('id, code, name')
      .eq('company_id', selectedCompany.id).eq('is_active', true)
      .eq('account_type', 'asset').like('code', '1%')
      .order('code')
      .then(({ data }) => {
        const bankAccs = (data || []).filter(a => a.name.toLowerCase().includes('bank') || a.code.startsWith('102'));
        setBankAccounts(bankAccs);
      });
  }, [selectedCompany]);

  const fetchData = async () => {
    if (!selectedCompany || !selectedAccount) return;
    setLoading(true);
    const [stmtRes, payRes] = await Promise.all([
      supabase.from('bank_statements').select('*')
        .eq('company_id', selectedCompany.id).eq('bank_account_id', selectedAccount)
        .gte('statement_date', dateFrom).lte('statement_date', dateTo)
        .order('statement_date'),
      supabase.from('payments').select('id, payment_date, reference, amount, payment_type, notes, contact_id, contacts(name)')
        .eq('company_id', selectedCompany.id).eq('bank_account_id', selectedAccount)
        .gte('payment_date', dateFrom).lte('payment_date', dateTo)
        .order('payment_date'),
    ]);
    setStatements((stmtRes.data || []) as BankStatement[]);
    setPayments((payRes.data || []) as PaymentRecord[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedAccount, dateFrom, dateTo]);

  const importCSV = async () => {
    if (!selectedCompany || !selectedAccount || !csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      return {
        company_id: selectedCompany.id,
        bank_account_id: selectedAccount,
        statement_date: cols[0] || new Date().toISOString().split('T')[0],
        reference: cols[1] || null,
        description: cols[2] || null,
        debit_amount: parseFloat(cols[3]) || 0,
        credit_amount: parseFloat(cols[4]) || 0,
        balance: parseFloat(cols[5]) || 0,
      };
    }).filter(r => r.debit_amount > 0 || r.credit_amount > 0);

    if (rows.length === 0) { toast.error('No valid rows found'); return; }
    const { error } = await supabase.from('bank_statements').insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Imported ${rows.length} bank statement entries`);
    setCsvText('');
    setShowImport(false);
    fetchData();
  };

  const autoMatch = async () => {
    if (!statements.length || !payments.length) { toast.info('No data to match'); return; }
    let matched = 0;
    const unmatchedStatements = statements.filter(s => !s.is_reconciled);
    const unmatchedPayments = payments.filter(p => !statements.some(s => s.matched_payment_id === p.id));

    for (const stmt of unmatchedStatements) {
      const amount = stmt.debit_amount > 0 ? stmt.debit_amount : stmt.credit_amount;
      const match = unmatchedPayments.find(p => {
        const pAmt = Number(p.amount);
        if (Math.abs(pAmt - amount) > 0.01) return false;
        if (stmt.reference && p.reference && stmt.reference.toLowerCase().includes(p.reference.toLowerCase())) return true;
        if (Math.abs(new Date(stmt.statement_date).getTime() - new Date(p.payment_date).getTime()) <= 3 * 86400000 &&
          Math.abs(pAmt - amount) < 0.01) return true;
        return false;
      });

      if (match) {
        await supabase.from('bank_statements').update({
          is_reconciled: true,
          matched_payment_id: match.id,
        }).eq('id', stmt.id);
        matched++;
        const idx = unmatchedPayments.indexOf(match);
        if (idx > -1) unmatchedPayments.splice(idx, 1);
      }
    }
    toast.success(`Auto-matched ${matched} entries`);
    fetchData();
  };

  const manualMatch = async () => {
    if (!manualStmtId || !manualPayId) { toast.error('Select both a statement and payment'); return; }
    await supabase.from('bank_statements').update({
      is_reconciled: true,
      matched_payment_id: manualPayId,
    }).eq('id', manualStmtId);
    toast.success('Manually matched');
    setShowManualMatch(false);
    setManualStmtId('');
    setManualPayId('');
    fetchData();
  };

  const unmatch = async (stmtId: string) => {
    await supabase.from('bank_statements').update({
      is_reconciled: false,
      matched_payment_id: null,
    }).eq('id', stmtId);
    toast.success('Unmatched');
    fetchData();
  };

  const toggleReconcile = async (stmt: BankStatement) => {
    await supabase.from('bank_statements').update({
      is_reconciled: !stmt.is_reconciled,
      matched_payment_id: stmt.is_reconciled ? null : stmt.matched_payment_id,
    }).eq('id', stmt.id);
    fetchData();
  };

  const { fmt: fmtCurrency } = useCurrency();
  const fmt = (n: number) => n > 0 ? fmtCurrency(n) : '—';

  const reconciledCount = statements.filter(s => s.is_reconciled).length;
  const unreconciledCount = statements.filter(s => !s.is_reconciled).length;
  const reconciledAmount = statements.filter(s => s.is_reconciled).reduce((s, st) => s + (st.debit_amount || 0) + (st.credit_amount || 0), 0);
  const unreconciledAmount = statements.filter(s => !s.is_reconciled).reduce((s, st) => s + (st.debit_amount || 0) + (st.credit_amount || 0), 0);

  const unmatchedStmts = statements.filter(s => !s.is_reconciled);
  const unmatchedPays = payments.filter(p => !statements.some(s => s.matched_payment_id === p.id));

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Bank Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Match bank statements with accounting records</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showImport} onOpenChange={setShowImport}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Import Statement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-display">Import Bank Statement (CSV)</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">CSV format: Date, Reference, Description, Debit, Credit, Balance</p>
              <Textarea rows={8} value={csvText} onChange={e => setCsvText(e.target.value)} placeholder="Date,Reference,Description,Debit,Credit,Balance&#10;2026-03-01,CHQ001,Office Rent,2500.00,0,..." />
              <Button onClick={importCSV} className="w-full">Import</Button>
            </DialogContent>
          </Dialog>
          <Button onClick={autoMatch} variant="secondary"><Link2 className="h-4 w-4 mr-2" /> Auto Match</Button>
          <Button onClick={() => setShowManualMatch(true)} variant="outline"><ArrowRightLeft className="h-4 w-4 mr-2" /> Manual Match</Button>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-64">
          <Label>Bank Account</Label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
            <SelectContent>
              {bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold font-display">{statements.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Reconciled</p>
              <p className="text-2xl font-bold font-display text-primary">{reconciledCount}</p>
              <p className="text-xs text-muted-foreground">{fmt(reconciledAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">Unreconciled</p>
              <p className="text-2xl font-bold font-display text-destructive">{unreconciledCount}</p>
              <p className="text-xs text-muted-foreground">{fmt(unreconciledAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Match Rate</p>
            <p className="text-2xl font-bold font-display">
              {statements.length > 0 ? Math.round((reconciledCount / statements.length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statement Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Bank Statement Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">✓</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {selectedAccount ? 'No bank statement entries. Import a CSV to get started.' : 'Select a bank account'}
                </TableCell></TableRow>
              ) : statements.map(s => (
                <TableRow key={s.id} className={s.is_reconciled ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <Checkbox checked={s.is_reconciled} onCheckedChange={() => toggleReconcile(s)} />
                  </TableCell>
                  <TableCell>{s.statement_date}</TableCell>
                  <TableCell className="font-mono text-xs">{s.reference || '—'}</TableCell>
                  <TableCell>{s.description || '—'}</TableCell>
                  <TableCell className="text-right">{fmt(s.debit_amount)}</TableCell>
                  <TableCell className="text-right">{fmt(s.credit_amount)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(s.balance)}</TableCell>
                  <TableCell>
                    {s.is_reconciled
                      ? <Badge variant="default">Matched</Badge>
                      : <Badge variant="outline" className="text-destructive border-destructive/30">Pending</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    {s.is_reconciled && (
                      <Button variant="ghost" size="sm" onClick={() => unmatch(s.id)} className="text-xs">
                        <Unlink className="h-3 w-3 mr-1" />Unmatch
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Unmatched payments */}
      {payments.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Accounting Records (Payments & Receipts)</CardTitle>
            <CardDescription>Records from your books that can be matched to bank statements</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Matched</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => {
                  const isMatched = statements.some(s => s.matched_payment_id === p.id);
                  return (
                    <TableRow key={p.id} className={isMatched ? 'bg-primary/5' : ''}>
                      <TableCell>{p.payment_date}</TableCell>
                      <TableCell className="font-mono text-xs">{p.reference || '—'}</TableCell>
                      <TableCell className="capitalize">{p.payment_type}</TableCell>
                      <TableCell>{(p.contacts as any)?.name || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(p.amount))}</TableCell>
                      <TableCell>
                        {isMatched
                          ? <Badge variant="default"><Link2 className="h-3 w-3 mr-1" /> Matched</Badge>
                          : <Badge variant="outline"><Unlink className="h-3 w-3 mr-1" /> Unmatched</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manual Match Dialog */}
      <Dialog open={showManualMatch} onOpenChange={setShowManualMatch}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Manual Match</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">Select an unreconciled bank statement and an unmatched payment to link them.</p>
          <div className="space-y-4">
            <div>
              <Label>Bank Statement Entry</Label>
              <Select value={manualStmtId} onValueChange={setManualStmtId}>
                <SelectTrigger><SelectValue placeholder="Select statement" /></SelectTrigger>
                <SelectContent>
                  {unmatchedStmts.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.statement_date} — {s.reference || s.description || '—'} — {fmt(s.debit_amount > 0 ? s.debit_amount : s.credit_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment / Receipt</Label>
              <Select value={manualPayId} onValueChange={setManualPayId}>
                <SelectTrigger><SelectValue placeholder="Select payment" /></SelectTrigger>
                <SelectContent>
                  {unmatchedPays.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.payment_date} — {p.reference || '—'} — RM {Number(p.amount).toFixed(2)} ({p.payment_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={manualMatch} className="w-full">Match</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankReconciliationPage;
