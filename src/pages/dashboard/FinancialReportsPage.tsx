import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';
import TrialBalanceTab from '@/components/reports/TrialBalanceTab';
import ProfitLossTab from '@/components/reports/ProfitLossTab';
import BalanceSheetTab from '@/components/reports/BalanceSheetTab';
import GeneralLedgerTab from '@/components/reports/GeneralLedgerTab';
import JournalListingTab from '@/components/reports/JournalListingTab';
import DebtorAgingTab from '@/components/reports/DebtorAgingTab';
import CreditorAgingTab from '@/components/reports/CreditorAgingTab';
import DebtorStatementTab from '@/components/reports/DebtorStatementTab';
import CreditorStatementTab from '@/components/reports/CreditorStatementTab';
import CashFlowTab from '@/components/reports/CashFlowTab';

export interface AccountBalance {
  id: string;
  code: string;
  name: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
  balance: number;
}

const FinancialReportsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journalLines, setJournalLines] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(0, 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const activeTab = searchParams.get('tab') || 'trial-balance';

  const fetchData = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    const [accRes, linesRes, jeRes, invRes, contRes, payRes] = await Promise.all([
      supabase.from('chart_of_accounts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).order('code'),
      supabase.from('journal_entry_lines').select('*, journal_entries!inner(company_id, entry_date, status, description, reference)').eq('journal_entries.company_id', selectedCompany.id).eq('journal_entries.status', 'posted').gte('journal_entries.entry_date', dateFrom).lte('journal_entries.entry_date', dateTo),
      supabase.from('journal_entries').select('*').eq('company_id', selectedCompany.id).eq('status', 'posted').gte('entry_date', dateFrom).lte('entry_date', dateTo).order('entry_date'),
      supabase.from('invoices').select('*, contact:contacts(name)').eq('company_id', selectedCompany.id),
      supabase.from('contacts').select('*').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('payments').select('*').eq('company_id', selectedCompany.id),
    ]);
    setAccounts(accRes.data || []);
    setJournalLines(linesRes.data || []);
    setJournalEntries(jeRes.data || []);
    setInvoices(invRes.data || []);
    setContacts(contRes.data || []);
    setPayments(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const balances: AccountBalance[] = useMemo(() => accounts.map(acc => {
    const lines = journalLines.filter(l => l.account_id === acc.id);
    const debit_total = lines.reduce((s, l) => s + (+l.debit || 0), 0);
    const credit_total = lines.reduce((s, l) => s + (+l.credit || 0), 0);
    const isDebitNormal = ['asset', 'expense'].includes(acc.account_type);
    const balance = isDebitNormal ? debit_total - credit_total : credit_total - debit_total;
    return { id: acc.id, code: acc.code, name: acc.name, account_type: acc.account_type, debit_total, credit_total, balance };
  }).filter(b => b.debit_total > 0 || b.credit_total > 0), [accounts, journalLines]);

  const exportCSV = () => {
    let csvContent = '';
    if (activeTab === 'trial-balance') {
      csvContent = 'Code,Account,Type,Debit,Credit\n' +
        balances.map(b => `${b.code},"${b.name}",${b.account_type},${b.debit_total.toFixed(2)},${b.credit_total.toFixed(2)}`).join('\n');
    } else if (activeTab === 'pnl') {
      const revenue = balances.filter(b => b.account_type === 'revenue');
      const expenses = balances.filter(b => b.account_type === 'expense');
      csvContent = 'Type,Code,Account,Amount\n' +
        revenue.map(b => `Revenue,${b.code},"${b.name}",${Math.abs(b.balance).toFixed(2)}`).join('\n') + '\n' +
        expenses.map(b => `Expense,${b.code},"${b.name}",${Math.abs(b.balance).toFixed(2)}`).join('\n');
    } else if (activeTab === 'balance-sheet') {
      csvContent = 'Type,Code,Account,Amount\n' +
        balances.filter(b => ['asset', 'liability', 'equity'].includes(b.account_type))
          .map(b => `${b.account_type},${b.code},"${b.name}",${Math.abs(b.balance).toFixed(2)}`).join('\n');
    } else if (activeTab === 'ledger') {
      csvContent = 'Account,Date,Description,Debit,Credit\n' +
        journalLines.map(l => {
          const acc = accounts.find(a => a.id === l.account_id);
          return `"${acc?.code} - ${acc?.name}",${l.journal_entries?.entry_date},"${l.description || ''}",${(+l.debit || 0).toFixed(2)},${(+l.credit || 0).toFixed(2)}`;
        }).join('\n');
    } else if (activeTab === 'journal') {
      csvContent = 'Date,Reference,Description,Account,Debit,Credit\n' +
        journalEntries.flatMap(je =>
          journalLines.filter(l => l.journal_entry_id === je.id).map(l => {
            const acc = accounts.find(a => a.id === l.account_id);
            return `${je.entry_date},${je.reference || ''},"${je.description || ''}","${acc?.code} - ${acc?.name}",${(+l.debit || 0).toFixed(2)},${(+l.credit || 0).toFixed(2)}`;
          })
        ).join('\n');
    } else {
      csvContent = 'Report export not available for this tab';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab}-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Accounting Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 items-end flex-wrap">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <Button onClick={fetchData} disabled={loading}>{loading ? 'Loading...' : 'Generate'}</Button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-foreground">{fmt(balances.filter(b => b.account_type === 'revenue').reduce((s, b) => s + b.balance, 0))}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="text-xl font-bold text-foreground">RM {balances.filter(b => b.account_type === 'expense').reduce((s, b) => s + b.balance, 0).toFixed(2)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Net Income</p>
          {(() => {
            const net = balances.filter(b => b.account_type === 'revenue').reduce((s, b) => s + b.balance, 0) - balances.filter(b => b.account_type === 'expense').reduce((s, b) => s + b.balance, 0);
            return <p className={`text-xl font-bold ${net >= 0 ? 'text-primary' : 'text-destructive'}`}>RM {Math.abs(net).toFixed(2)}</p>;
          })()}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Journal Entries</p>
          <p className="text-xl font-bold text-foreground">{journalEntries.length}</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={v => setSearchParams({ tab: v })}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="journal">Journal Listing</TabsTrigger>
          <TabsTrigger value="debtor-aging">Debtor Aging</TabsTrigger>
          <TabsTrigger value="creditor-aging">Creditor Aging</TabsTrigger>
          <TabsTrigger value="debtor-statement">Debtor Statement</TabsTrigger>
          <TabsTrigger value="creditor-statement">Creditor Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance"><TrialBalanceTab balances={balances} /></TabsContent>
        <TabsContent value="pnl"><ProfitLossTab balances={balances} /></TabsContent>
        <TabsContent value="balance-sheet"><BalanceSheetTab balances={balances} /></TabsContent>
        <TabsContent value="cash-flow"><CashFlowTab balances={balances} journalLines={journalLines} accounts={accounts} /></TabsContent>
        <TabsContent value="ledger"><GeneralLedgerTab balances={balances} journalLines={journalLines} accounts={accounts} /></TabsContent>
        <TabsContent value="journal"><JournalListingTab journalEntries={journalEntries} journalLines={journalLines} accounts={accounts} /></TabsContent>
        <TabsContent value="debtor-aging"><DebtorAgingTab invoices={invoices} contacts={contacts} payments={payments} asOfDate={dateTo} /></TabsContent>
        <TabsContent value="creditor-aging"><CreditorAgingTab invoices={invoices} contacts={contacts} payments={payments} asOfDate={dateTo} /></TabsContent>
        <TabsContent value="debtor-statement"><DebtorStatementTab invoices={invoices} contacts={contacts} payments={payments} dateFrom={dateFrom} dateTo={dateTo} /></TabsContent>
        <TabsContent value="creditor-statement"><CreditorStatementTab invoices={invoices} contacts={contacts} payments={payments} dateFrom={dateFrom} dateTo={dateTo} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReportsPage;
