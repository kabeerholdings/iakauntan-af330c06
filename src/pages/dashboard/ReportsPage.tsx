import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AccountBalance = { id: string; code: string; name: string; account_type: string; debit: number; credit: number; balance: number };

const ReportsPage = () => {
  const { selectedCompany } = useCompany();
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    // Get all accounts and journal entry lines within date range
    const [accRes, lineRes] = await Promise.all([
      supabase.from('chart_of_accounts').select('id, code, name, account_type').eq('company_id', selectedCompany.id).eq('is_active', true).order('code'),
      supabase.from('journal_entry_lines').select('account_id, debit, credit, journal_entries!inner(entry_date, company_id, status)')
        .eq('journal_entries.company_id', selectedCompany.id)
        .gte('journal_entries.entry_date', dateFrom)
        .lte('journal_entries.entry_date', dateTo),
    ]);

    const accounts = accRes.data || [];
    const lines = lineRes.data || [];

    const balances: AccountBalance[] = accounts.map(acc => {
      const accLines = lines.filter((l: any) => l.account_id === acc.id);
      const totalDebit = accLines.reduce((s: number, l: any) => s + (+l.debit || 0), 0);
      const totalCredit = accLines.reduce((s: number, l: any) => s + (+l.credit || 0), 0);
      let balance = 0;
      if (['asset', 'expense'].includes(acc.account_type)) {
        balance = totalDebit - totalCredit;
      } else {
        balance = totalCredit - totalDebit;
      }
      return { id: acc.id, code: acc.code, name: acc.name, account_type: acc.account_type, debit: totalDebit, credit: totalCredit, balance };
    });

    setAccountBalances(balances);
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [selectedCompany, dateFrom, dateTo]);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const hasActivity = accountBalances.some(a => a.debit > 0 || a.credit > 0);
  const tbAccounts = accountBalances.filter(a => a.debit > 0 || a.credit > 0);
  const tbDebitTotal = tbAccounts.reduce((s, a) => s + a.debit, 0);
  const tbCreditTotal = tbAccounts.reduce((s, a) => s + a.credit, 0);

  // P&L
  const revenue = accountBalances.filter(a => a.account_type === 'revenue');
  const expenses = accountBalances.filter(a => a.account_type === 'expense');
  const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Balance Sheet
  const assets = accountBalances.filter(a => a.account_type === 'asset');
  const liabilities = accountBalances.filter(a => a.account_type === 'liability');
  const equity = accountBalances.filter(a => a.account_type === 'equity');
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0) + netProfit;

  const { fmt } = useCurrency();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-4">Financial Reports</h1>
      <div className="flex items-end gap-4 mb-6">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <Button onClick={fetchReport} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
      </div>

      <Tabs defaultValue="trial-balance">
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="ledger">Ledger Report</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Trial Balance — {dateFrom} to {dateTo}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tbAccounts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions in this period</TableCell></TableRow>
                  ) : tbAccounts.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono">{a.code}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{a.account_type}</TableCell>
                      <TableCell className="text-right">{a.debit > 0 ? fmt(a.debit) : '—'}</TableCell>
                      <TableCell className="text-right">{a.credit > 0 ? fmt(a.credit) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {tbAccounts.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">{fmt(tbDebitTotal)}</TableCell>
                      <TableCell className="text-right">{fmt(tbCreditTotal)}</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Profit & Loss Statement — {dateFrom} to {dateTo}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-display font-semibold text-foreground mb-2">Revenue</h3>
                <Table>
                  <TableBody>
                    {revenue.filter(a => a.balance !== 0).map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono">{a.code}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(a.balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2 border-border">
                      <TableCell colSpan={2}>Total Revenue</TableCell>
                      <TableCell className="text-right">{fmt(totalRevenue)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-2">Expenses</h3>
                <Table>
                  <TableBody>
                    {expenses.filter(a => a.balance !== 0).map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono">{a.code}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(a.balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2 border-border">
                      <TableCell colSpan={2}>Total Expenses</TableCell>
                      <TableCell className="text-right">{fmt(totalExpenses)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className={`p-4 rounded-lg ${netProfit >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-display text-lg font-bold">{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span>
                  <span className={`font-display text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(netProfit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bs" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Balance Sheet — As at {dateTo}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-display font-semibold text-foreground mb-2">Assets</h3>
                <Table>
                  <TableBody>
                    {assets.filter(a => a.balance !== 0).map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono">{a.code}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(a.balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2 border-border">
                      <TableCell colSpan={2}>Total Assets</TableCell>
                      <TableCell className="text-right">{fmt(totalAssets)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-2">Liabilities</h3>
                <Table>
                  <TableBody>
                    {liabilities.filter(a => a.balance !== 0).map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono">{a.code}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(a.balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2 border-border">
                      <TableCell colSpan={2}>Total Liabilities</TableCell>
                      <TableCell className="text-right">{fmt(totalLiabilities)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-2">Equity</h3>
                <Table>
                  <TableBody>
                    {equity.filter(a => a.balance !== 0).map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono">{a.code}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(a.balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-mono">—</TableCell>
                      <TableCell className="italic">Current Year Earnings</TableCell>
                      <TableCell className="text-right font-medium">{fmt(netProfit)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold border-t-2 border-border">
                      <TableCell colSpan={2}>Total Equity</TableCell>
                      <TableCell className="text-right">{fmt(totalEquity)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between items-center">
                  <span className="font-display font-bold">Liabilities + Equity</span>
                  <span className="font-display text-lg font-bold">{fmt(totalLiabilities + totalEquity)}</span>
                </div>
                {Math.abs(totalAssets - (totalLiabilities + totalEquity)) > 0.01 && (
                  <p className="text-destructive text-sm mt-1">⚠ Balance sheet does not balance. Difference: {fmt(totalAssets - totalLiabilities - totalEquity)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <LedgerReport companyId={selectedCompany.id} dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const LedgerReport = ({ companyId, dateFrom, dateTo }: { companyId: string; dateFrom: string; dateTo: string }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('chart_of_accounts').select('id, code, name').eq('company_id', companyId).eq('is_active', true).order('code')
      .then(({ data }) => setAccounts(data || []));
  }, [companyId]);

  useEffect(() => {
    if (!selectedAccount) { setLines([]); return; }
    supabase.from('journal_entry_lines').select('*, journal_entries!inner(entry_date, reference, description, status)')
      .eq('account_id', selectedAccount)
      .eq('journal_entries.company_id', companyId)
      .gte('journal_entries.entry_date', dateFrom)
      .lte('journal_entries.entry_date', dateTo)
      .order('created_at')
      .then(({ data }) => setLines(data || []));
  }, [selectedAccount, dateFrom, dateTo]);

  let runningBalance = 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Ledger Report</CardTitle>
        <div className="mt-2">
          <select className="border border-input rounded-md px-3 py-2 text-sm bg-background w-full max-w-sm" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
            <option value="">Select an account...</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{selectedAccount ? 'No transactions' : 'Select an account'}</TableCell></TableRow>
            ) : lines.map(l => {
              runningBalance += (+l.debit || 0) - (+l.credit || 0);
              return (
                <TableRow key={l.id}>
                  <TableCell>{(l.journal_entries as any)?.entry_date}</TableCell>
                  <TableCell className="font-medium">{(l.journal_entries as any)?.reference || '—'}</TableCell>
                  <TableCell>{l.description || (l.journal_entries as any)?.description || '—'}</TableCell>
                  <TableCell className="text-right">{+l.debit > 0 ? `RM ${Number(l.debit).toFixed(2)}` : '—'}</TableCell>
                  <TableCell className="text-right">{+l.credit > 0 ? `RM ${Number(l.credit).toFixed(2)}` : '—'}</TableCell>
                  <TableCell className="text-right font-medium">RM {runningBalance.toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ReportsPage;
