import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/hooks/useCurrency';
import type { AccountBalance } from '@/pages/dashboard/FinancialReportsPage';

const AssetsSummaryTab = ({ balances }: { balances: AccountBalance[] }) => {
  const { fmt } = useCurrency();
  const assets = balances.filter(b => b.account_type === 'asset');
  const totalAssets = assets.reduce((s, b) => s + b.balance, 0);

  // Group by account code prefix (e.g., 1000s, 1100s, etc.)
  const grouped = assets.reduce((acc, asset) => {
    const prefix = asset.code.substring(0, 2) + '00';
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(asset);
    return acc;
  }, {} as Record<string, AccountBalance[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No asset accounts with activity in this period</p>
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
                {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([prefix, items]) => (
                  <>
                    {items.map(asset => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-mono">{asset.code}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell className="text-right font-mono">{asset.debit_total > 0 ? fmt(asset.debit_total) : '—'}</TableCell>
                        <TableCell className="text-right font-mono">{asset.credit_total > 0 ? fmt(asset.credit_total) : '—'}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{fmt(asset.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
                <TableRow className="font-bold border-t-2 bg-muted/50">
                  <TableCell colSpan={4}>Total Assets</TableCell>
                  <TableCell className="text-right font-mono text-lg">{fmt(totalAssets)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Current Assets</p>
                  <p className="text-lg font-bold">{fmt(assets.filter(a => a.code < '1500').reduce((s, a) => s + a.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Fixed Assets</p>
                  <p className="text-lg font-bold">{fmt(assets.filter(a => a.code >= '1500' && a.code < '1700').reduce((s, a) => s + a.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Intangible Assets</p>
                  <p className="text-lg font-bold">{fmt(assets.filter(a => a.code >= '1700').reduce((s, a) => s + a.balance, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                  <p className="text-lg font-bold">{assets.length}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AssetsSummaryTab;
