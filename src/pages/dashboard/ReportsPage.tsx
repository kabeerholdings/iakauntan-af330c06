import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/contexts/CompanyContext';
import { BarChart3, FileText, TrendingUp } from 'lucide-react';

const ReportsPage = () => {
  const { selectedCompany } = useCompany();

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const reports = [
    { title: 'Trial Balance', desc: 'View all account balances in a debit/credit format', icon: BarChart3 },
    { title: 'Profit & Loss', desc: 'Revenue vs expenses for the selected period', icon: TrendingUp },
    { title: 'Balance Sheet', desc: 'Assets, liabilities, and equity snapshot', icon: FileText },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Reports</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {reports.map(r => (
          <Card key={r.title} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center mb-2">
                <r.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-lg">{r.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-muted-foreground text-sm mt-8">Detailed report generation coming soon. Journal entries and invoices data feeds into these reports automatically.</p>
    </div>
  );
};

export default ReportsPage;
