import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, FileText, Shield } from 'lucide-react';

const AdminPage = () => {
  const { isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, companies: 0, invoices: 0 });

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      const [p, c, i] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('invoices').select('*, companies(name)').order('created_at', { ascending: false }).limit(50),
      ]);
      setUsers(p.data || []);
      setCompanies(c.data || []);
      setInvoices(i.data || []);
      setStats({ users: (p.data || []).length, companies: (c.data || []).length, invoices: (i.data || []).length });
    };
    fetchData();
  }, [isAdmin]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const statCards = [
    { title: 'Total Users', value: stats.users, icon: Users },
    { title: 'Companies', value: stats.companies, icon: Building2 },
    { title: 'Invoices', value: stats.invoices, icon: FileText },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin CMS</h1>
          <p className="text-sm text-muted-foreground">Manage all users, companies, and data</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {statCards.map(s => (
          <Card key={s.title} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display text-card-foreground">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.first_name} {u.last_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.mobile_no || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{u.account_type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Reg No</TableHead>
                    <TableHead>Tax ID</TableHead>
                    <TableHead>e-Invoice</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.registration_no || '—'}</TableCell>
                      <TableCell>{c.tax_id || '—'}</TableCell>
                      <TableCell>{c.einvoice_enabled ? <Badge>Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>e-Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.invoice_number}</TableCell>
                      <TableCell>{(i as any).companies?.name || '—'}</TableCell>
                      <TableCell>RM {Number(i.total_amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="secondary">{i.status}</Badge></TableCell>
                      <TableCell>{i.einvoice_status ? <Badge>{i.einvoice_status}</Badge> : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
