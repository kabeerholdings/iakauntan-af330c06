import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/hooks/useCurrency';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

const ExpensesSummaryTab = ({ balances }: { balances: AccountBalance[] }) => {
  const { fmt } = useCurrency();
  const expenses = balances.filter(b => b.account_type === 'expense');
  const totalExpenses = expenses.reduce((s, b) => s + b.balance, 0);

  // Group by category (based on code ranges from Malaysian COA)
  const costOfSales = expenses.filter(e => e.code >= '5000' && e.code < '6000');
  const operatingExpenses = expenses.filter(e => e.code >= '6000' && e.code < '7000');
  const taxExpenses = expenses.filter(e => e.code >= '7000');

  const renderSection = (title: string, items: typeof expenses) => {
    if (items.length === 0) return null;
    const sectionTotal = items.reduce((s, e) => s + e.balance, 0);
    return (
      <>
        <TableRow className="bg-muted/30">
          <TableCell colSpan={5} className="font-semibold text-sm uppercase text-muted-foreground">{title}</TableCell>
        </TableRow>
        {items.map(expense => (
          <TableRow key={expense.id}>
            <TableCell className="font-mono pl-6">{expense.code}</TableCell>
            <TableCell>{expense.name}</TableCell>
            <TableCell className="text-right font-mono">{expense.debit_total > 0 ? fmt(expense.debit_total) : '—'}</TableCell>
            <TableCell className="text-right font-mono">{expense.credit_total > 0 ? fmt(expense.credit_total) : '—'}</TableCell>
            <TableCell className="text-right font-mono">{fmt(expense.balance)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t">
          <TableCell colSpan={4} className="text-right text-sm text-muted-foreground">Subtotal {title}</TableCell>
          <TableCell className="text-right font-mono font-medium">{fmt(sectionTotal)}</TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No expense accounts with activity in this period</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSection('Cost of Sales', costOfSales)}
                {renderSection('Operating Expenses', operatingExpenses)}
                {renderSection('Tax & Other', taxExpenses)}
                <TableRow className="font-bold border-t-2 bg-muted/50">
                  <TableCell colSpan={4}>Total Expenses</TableCell>
                  <TableCell className="text-right font-mono text-lg">{fmt(totalExpenses)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Cost of Sales</p>
                  <p className="text-lg font-bold">{fmt(costOfSales.reduce((s, e) => s + e.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Operating Expenses</p>
                  <p className="text-lg font-bold">{fmt(operatingExpenses.reduce((s, e) => s + e.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Tax & Other</p>
                  <p className="text-lg font-bold">{fmt(taxExpenses.reduce((s, e) => s + e.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                  <p className="text-lg font-bold">{expenses.length}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpensesSummaryTab;
