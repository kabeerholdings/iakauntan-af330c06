import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface AccountBalance {
  code: string;
  name: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
  balance: number;
}

const FinancialReportsPage = () => {
  const { selectedCompany } = useCompany();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journalLines, setJournalLines] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(0, 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    const [accRes, linesRes] = await Promise.all([
      supabase.from('chart_of_accounts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).order('code'),
      supabase.from('journal_entry_lines').select('*, journal_entries!inner(company_id, entry_date, status)').eq('journal_entries.company_id', selectedCompany.id).eq('journal_entries.status', 'posted').gte('journal_entries.entry_date', dateFrom).lte('journal_entries.entry_date', dateTo),
    ]);
    setAccounts(accRes.data || []);
    setJournalLines(linesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const balances: AccountBalance[] = accounts.map(acc => {
    const lines = journalLines.filter(l => l.account_id === acc.id);
    const debit_total = lines.reduce((s, l) => s + (+l.debit || 0), 0);
    const credit_total = lines.reduce((s, l) => s + (+l.credit || 0), 0);
    const isDebitNormal = ['asset', 'expense'].includes(acc.account_type);
    const balance = isDebitNormal ? debit_total - credit_total : credit_total - debit_total;
    return { code: acc.code, name: acc.name, account_type: acc.account_type, debit_total, credit_total, balance };
  }).filter(b => b.debit_total > 0 || b.credit_total > 0);

  const totalDebit = balances.reduce((s, b) => s + b.debit_total, 0);
  const totalCredit = balances.reduce((s, b) => s + b.credit_total, 0);

  // P&L
  const revenue = balances.filter(b => b.account_type === 'revenue');
  const expenses = balances.filter(b => b.account_type === 'expense');
  const totalRevenue = revenue.reduce((s, b) => s + b.balance, 0);
  const totalExpenses = expenses.reduce((s, b) => s + b.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Balance Sheet
  const assets = balances.filter(b => b.account_type === 'asset');
  const liabilities = balances.filter(b => b.account_type === 'liability');
  const equity = balances.filter(b => b.account_type === 'equity');
  const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
  const totalLiabilities = liabilities.reduce((s, b) => s + b.balance, 0);
  const totalEquity = equity.reduce((s, b) => s + b.balance, 0) + netIncome;

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const renderSection = (title: string, items: AccountBalance[], isNeg = false) => (
    <div className="mb-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">{title}</h3>
      {items.map(b => (
        <div key={b.code} className="flex justify-between py-1 px-2 hover:bg-muted/50 rounded text-sm">
          <span>{b.code} - {b.name}</span>
          <span className="font-mono">RM {Math.abs(b.balance).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Financial Reports</h1>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
      </div>

      <div className="flex gap-4 mb-6 items-end">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <Button onClick={fetchData} disabled={loading}>Generate</Button>
      </div>

      <Tabs defaultValue="trial-balance">
        <TabsList className="mb-4">
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="ledger">General Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance">
          <Card>
            <CardHeader><CardTitle>Trial Balance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No posted entries in this period</TableCell></TableRow>
                  ) : (
                    <>
                      {balances.map(b => (
                        <TableRow key={b.code}>
                          <TableCell className="font-mono">{b.code}</TableCell>
                          <TableCell>{b.name}</TableCell>
                          <TableCell className="text-muted-foreground capitalize">{b.account_type}</TableCell>
                          <TableCell className="text-right font-mono">{b.debit_total > 0 ? `RM ${b.debit_total.toFixed(2)}` : ''}</TableCell>
                          <TableCell className="text-right font-mono">{b.credit_total > 0 ? `RM ${b.credit_total.toFixed(2)}` : ''}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right font-mono">RM {totalDebit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">RM {totalCredit.toFixed(2)}</TableCell>
                      </TableRow>
                      {Math.abs(totalDebit - totalCredit) > 0.01 && (
                        <TableRow><TableCell colSpan={5} className="text-destructive text-center font-medium">⚠ Trial Balance is out of balance by RM {Math.abs(totalDebit - totalCredit).toFixed(2)}</TableCell></TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl">
          <Card>
            <CardHeader><CardTitle>Profit & Loss Statement</CardTitle></CardHeader>
            <CardContent>
              {renderSection('Revenue', revenue)}
              <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
                <span>Total Revenue</span>
                <span className="font-mono">RM {totalRevenue.toFixed(2)}</span>
              </div>
              {renderSection('Expenses', expenses)}
              <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
                <span>Total Expenses</span>
                <span className="font-mono">RM {totalExpenses.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between py-3 px-2 font-bold text-lg border-t-2 border-border mt-4 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Net {netIncome >= 0 ? 'Profit' : 'Loss'}</span>
                <span className="font-mono">RM {Math.abs(netIncome).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet">
          <Card>
            <CardHeader><CardTitle>Balance Sheet</CardTitle></CardHeader>
            <CardContent>
              {renderSection('Assets', assets)}
              <div className="flex justify-between py-2 px-2 font-semibold border-t border-border mb-4">
                <span>Total Assets</span>
                <span className="font-mono">RM {totalAssets.toFixed(2)}</span>
              </div>
              {renderSection('Liabilities', liabilities)}
              <div className="flex justify-between py-2 px-2 font-semibold border-t border-border mb-4">
                <span>Total Liabilities</span>
                <span className="font-mono">RM {totalLiabilities.toFixed(2)}</span>
              </div>
              {renderSection('Equity', equity)}
              <div className="flex justify-between py-1 px-2 text-sm">
                <span className="italic">Current Year Earnings</span>
                <span className="font-mono">RM {netIncome.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
                <span>Total Equity</span>
                <span className="font-mono">RM {totalEquity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 px-2 font-bold text-lg border-t-2 border-border mt-4">
                <span>Total Liabilities & Equity</span>
                <span className="font-mono">RM {(totalLiabilities + totalEquity).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader><CardTitle>General Ledger</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {balances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No posted entries in this period</p>
              ) : balances.map(acc => {
                const lines = journalLines.filter(l => l.account_id === accounts.find(a => a.code === acc.code)?.id);
                let runBal = 0;
                return (
                  <div key={acc.code}>
                    <h3 className="font-semibold mb-2">{acc.code} - {acc.name} <span className="text-xs text-muted-foreground capitalize">({acc.account_type})</span></h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map(l => {
                          const isDebitNormal = ['asset', 'expense'].includes(acc.account_type);
                          runBal += isDebitNormal ? (+l.debit || 0) - (+l.credit || 0) : (+l.credit || 0) - (+l.debit || 0);
                          return (
                            <TableRow key={l.id}>
                              <TableCell>{l.journal_entries?.entry_date}</TableCell>
                              <TableCell className="text-muted-foreground">{l.description || '—'}</TableCell>
                              <TableCell className="text-right font-mono">{+l.debit > 0 ? `RM ${(+l.debit).toFixed(2)}` : ''}</TableCell>
                              <TableCell className="text-right font-mono">{+l.credit > 0 ? `RM ${(+l.credit).toFixed(2)}` : ''}</TableCell>
                              <TableCell className="text-right font-mono font-medium">RM {runBal.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReportsPage;
