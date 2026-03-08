import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText, CreditCard, Users, TrendingUp } from 'lucide-react';

const DashboardHome = () => {
  const { selectedCompany } = useCompany();
  const [stats, setStats] = useState({ invoices: 0, expenses: 0, contacts: 0, revenue: 0 });

  useEffect(() => {
    if (!selectedCompany) return;
    const fetchStats = async () => {
      const [inv, exp, con] = await Promise.all([
        supabase.from('invoices').select('id, total_amount', { count: 'exact' }).eq('company_id', selectedCompany.id),
        supabase.from('expenses').select('id', { count: 'exact' }).eq('company_id', selectedCompany.id),
        supabase.from('contacts').select('id', { count: 'exact' }).eq('company_id', selectedCompany.id),
      ]);
      const revenue = (inv.data || []).reduce((sum: number, i: any) => sum + (Number(i.total_amount) || 0), 0);
      setStats({
        invoices: inv.count || 0,
        expenses: exp.count || 0,
        contacts: con.count || 0,
        revenue,
      });
    };
    fetchStats();
  }, [selectedCompany]);

  const cards = [
    { title: 'Total Invoices', value: stats.invoices, icon: FileText, color: 'text-primary' },
    { title: 'Revenue (MYR)', value: `RM ${stats.revenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-success' },
    { title: 'Total Expenses', value: stats.expenses, icon: CreditCard, color: 'text-warning' },
    { title: 'Contacts', value: stats.contacts, icon: Users, color: 'text-info' },
  ];

  if (!selectedCompany) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Welcome to iAkauntan</h2>
        <p className="text-muted-foreground">Please create a company in Settings to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((c) => (
          <Card key={c.title} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-display text-card-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
