import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { profile } = useAuth();
  const { selectedCompany, companies, refetchCompanies } = useCompany();
  const { user } = useAuth();
  const [newCompany, setNewCompany] = useState({ name: '', registration_no: '', tax_id: '', einvoice_tin: '' });
  const [openNew, setOpenNew] = useState(false);

  const handleCreateCompany = async () => {
    if (!user || !newCompany.name) { toast.error('Company name required'); return; }
    const { error } = await supabase.from('companies').insert({
      owner_id: user.id,
      name: newCompany.name,
      registration_no: newCompany.registration_no || null,
      tax_id: newCompany.tax_id || null,
      einvoice_tin: newCompany.einvoice_tin || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Company created');
    setOpenNew(false);
    setNewCompany({ name: '', registration_no: '', tax_id: '', einvoice_tin: '' });
    refetchCompanies();
  };

  const toggleEInvoice = async () => {
    if (!selectedCompany) return;
    const { error } = await supabase.from('companies').update({
      einvoice_enabled: !selectedCompany.einvoice_enabled,
    }).eq('id', selectedCompany.id);
    if (error) { toast.error(error.message); return; }
    toast.success('e-Invoice setting updated');
    refetchCompanies();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Settings</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="einvoice">e-Invoice</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="shadow-card max-w-lg">
            <CardHeader>
              <CardTitle className="font-display">Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name</Label><Input value={profile?.first_name || ''} disabled /></div>
                <div><Label>Last Name</Label><Input value={profile?.last_name || ''} disabled /></div>
              </div>
              <div><Label>Email</Label><Input value={profile?.email || ''} disabled /></div>
              <div><Label>Mobile</Label><Input value={profile?.mobile_no || ''} disabled /></div>
              <div><Label>Account Type</Label><Input value={profile?.account_type || ''} disabled /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Your Companies</h2>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Company</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add Company</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Company Name</Label><Input value={newCompany.name} onChange={e => setNewCompany(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>Registration No (SSM)</Label><Input value={newCompany.registration_no} onChange={e => setNewCompany(f => ({ ...f, registration_no: e.target.value }))} /></div>
                  <div><Label>Tax ID</Label><Input value={newCompany.tax_id} onChange={e => setNewCompany(f => ({ ...f, tax_id: e.target.value }))} /></div>
                  <div><Label>e-Invoice TIN</Label><Input value={newCompany.einvoice_tin} onChange={e => setNewCompany(f => ({ ...f, einvoice_tin: e.target.value }))} /></div>
                  <Button onClick={handleCreateCompany} className="w-full">Create Company</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {companies.map(c => (
              <Card key={c.id} className="shadow-card">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.registration_no || 'No SSM'} • {c.tax_id || 'No TIN'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="einvoice" className="mt-6">
          <Card className="shadow-card max-w-lg">
            <CardHeader>
              <CardTitle className="font-display">e-Invoice Settings</CardTitle>
              <CardDescription>Configure LHDN MyInvois integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCompany ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Enable e-Invoice</p>
                      <p className="text-sm text-muted-foreground">Submit invoices to LHDN electronically</p>
                    </div>
                    <Switch checked={!!selectedCompany.einvoice_enabled} onCheckedChange={toggleEInvoice} />
                  </div>
                  <div><Label>TIN</Label><Input value={selectedCompany.einvoice_tin || ''} disabled /></div>
                </>
              ) : (
                <p className="text-muted-foreground">Select a company to configure e-Invoice settings.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
