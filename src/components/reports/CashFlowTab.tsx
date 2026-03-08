import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

interface Props {
  balances: AccountBalance[];
  journalLines: any[];
  accounts: any[];
}

const CashFlowTab = ({ balances, journalLines, accounts }: Props) => {
  const cashFlow = useMemo(() => {
    // Identify cash/bank accounts (code starts with 10)
    const cashAccIds = accounts.filter(a => a.account_type === 'asset' && (a.code.startsWith('10'))).map(a => a.id);
    const cashLines = journalLines.filter(l => cashAccIds.includes(l.account_id));

    // Operating: revenue & expense related cash movements
    const revenueAccIds = accounts.filter(a => a.account_type === 'revenue').map(a => a.id);
    const expenseAccIds = accounts.filter(a => a.account_type === 'expense').map(a => a.id);

    // Group cash lines by the OTHER side of the journal entry
    let operating = 0;
    let investing = 0;
    let financing = 0;

    // Simple approach: categorize by account type of the counter-entry
    cashLines.forEach(cl => {
      const amount = (+cl.debit || 0) - (+cl.credit || 0); // positive = cash in
      // Find other lines in same journal entry
      const otherLines = journalLines.filter(l => l.journal_entry_id === cl.journal_entry_id && l.id !== cl.id);
      const otherAccTypes = otherLines.map(l => {
        const acc = accounts.find(a => a.id === l.account_id);
        return acc?.account_type || '';
      });

      if (otherAccTypes.some(t => t === 'revenue' || t === 'expense' || t === 'liability')) {
        operating += amount;
      } else if (otherAccTypes.some(t => t === 'asset')) {
        investing += amount;
      } else if (otherAccTypes.some(t => t === 'equity')) {
        financing += amount;
      } else {
        operating += amount; // default to operating
      }
    });

    const netChange = operating + investing + financing;

    return { operating, investing, financing, netChange };
  }, [balances, journalLines, accounts]);

  const renderRow = (label: string, amount: number, bold = false) => (
    <div className={`flex justify-between py-2 px-2 ${bold ? 'font-bold text-lg border-t-2 border-border mt-2' : ''}`}>
      <span>{label}</span>
      <span className={`font-mono ${amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
        RM {Math.abs(amount).toFixed(2)} {amount < 0 ? '(Out)' : ''}
      </span>
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle>Cash Flow Statement</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">Operating Activities</h3>
        {renderRow('Cash from Operations', cashFlow.operating)}
        <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
          <span>Net Cash from Operating</span>
          <span className="font-mono">RM {cashFlow.operating.toFixed(2)}</span>
        </div>

        <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2 mt-4">Investing Activities</h3>
        {renderRow('Cash from Investing', cashFlow.investing)}
        <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
          <span>Net Cash from Investing</span>
          <span className="font-mono">RM {cashFlow.investing.toFixed(2)}</span>
        </div>

        <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2 mt-4">Financing Activities</h3>
        {renderRow('Cash from Financing', cashFlow.financing)}
        <div className="flex justify-between py-2 px-2 font-semibold border-t border-border">
          <span>Net Cash from Financing</span>
          <span className="font-mono">RM {cashFlow.financing.toFixed(2)}</span>
        </div>

        {renderRow('Net Change in Cash', cashFlow.netChange, true)}

        {cashFlow.operating === 0 && cashFlow.investing === 0 && cashFlow.financing === 0 && (
          <p className="text-center text-muted-foreground py-4">No cash movements found in this period. Post journal entries with cash/bank accounts to see cash flow data.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CashFlowTab;
