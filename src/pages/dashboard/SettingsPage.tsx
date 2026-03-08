import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Shield, Eye, EyeOff, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import EditCompanyDialog from '@/components/EditCompanyDialog';

const SettingsPage = () => {
  const { profile } = useAuth();
  const { selectedCompany, companies, refetchCompanies } = useCompany();
  const { user } = useAuth();
  const [newCompany, setNewCompany] = useState({ name: '', registration_no: '', tax_id: '', einvoice_tin: '' });
  const [openNew, setOpenNew] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);

  // LHDN credentials state
  const [lhdnCreds, setLhdnCreds] = useState({ client_id: '', client_secret: '', environment: 'sandbox' });
  const [existingCreds, setExistingCreds] = useState<any>(null);
  const [savingCreds, setSavingCreds] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const fetchLhdnCreds = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase
      .from('lhdn_credentials')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .maybeSingle();
    if (data) {
      setExistingCreds(data);
      setLhdnCreds({
        client_id: data.client_id,
        client_secret: data.client_secret,
        environment: data.environment,
      });
    } else {
      setExistingCreds(null);
      setLhdnCreds({ client_id: '', client_secret: '', environment: 'sandbox' });
    }
  };

  useEffect(() => { fetchLhdnCreds(); }, [selectedCompany]);

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

  const handleSaveLhdnCreds = async () => {
    if (!selectedCompany) return;
    if (!lhdnCreds.client_id || !lhdnCreds.client_secret) {
      toast.error('Client ID and Client Secret are required');
      return;
    }
    setSavingCreds(true);
    if (existingCreds) {
      const { error } = await supabase.from('lhdn_credentials').update({
        client_id: lhdnCreds.client_id,
        client_secret: lhdnCreds.client_secret,
        environment: lhdnCreds.environment,
      }).eq('id', existingCreds.id);
      if (error) { toast.error(error.message); setSavingCreds(false); return; }
    } else {
      const { error } = await supabase.from('lhdn_credentials').insert({
        company_id: selectedCompany.id,
        client_id: lhdnCreds.client_id,
        client_secret: lhdnCreds.client_secret,
        environment: lhdnCreds.environment,
      });
      if (error) { toast.error(error.message); setSavingCreds(false); return; }
    }
    toast.success('LHDN API credentials saved');
    fetchLhdnCreds();
    setSavingCreds(false);
  };

  const handleDeleteLhdnCreds = async () => {
    if (!existingCreds) return;
    const { error } = await supabase.from('lhdn_credentials').delete().eq('id', existingCreds.id);
    if (error) { toast.error(error.message); return; }
    toast.success('LHDN credentials removed');
    setExistingCreds(null);
    setLhdnCreds({ client_id: '', client_secret: '', environment: 'sandbox' });
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
                    <Button variant="ghost" size="sm" onClick={() => setEditCompany(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="einvoice" className="mt-6 space-y-6">
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

          {selectedCompany && selectedCompany.einvoice_enabled && (
            <Card className="shadow-card max-w-lg">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  LHDN MyInvois API Credentials
                </CardTitle>
                <CardDescription>
                  Enter your Client ID and Client Secret from the{' '}
                  <a href="https://myinvois.hasil.gov.my" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    LHDN MyInvois portal
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Environment</Label>
                  <Select value={lhdnCreds.environment} onValueChange={v => setLhdnCreds(f => ({ ...f, environment: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">
                        <div className="flex items-center gap-2">
                          Sandbox (Testing)
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="production">Production (Live)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lhdnCreds.environment === 'sandbox'
                      ? 'Uses preprod-api.myinvois.hasil.gov.my for testing'
                      : 'Uses api.myinvois.hasil.gov.my — real submissions to LHDN'}
                  </p>
                </div>

                <div>
                  <Label>Client ID</Label>
                  <Input
                    value={lhdnCreds.client_id}
                    onChange={e => setLhdnCreds(f => ({ ...f, client_id: e.target.value }))}
                    placeholder="Enter LHDN Client ID"
                  />
                </div>

                <div>
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={lhdnCreds.client_secret}
                      onChange={e => setLhdnCreds(f => ({ ...f, client_secret: e.target.value }))}
                      placeholder="Enter LHDN Client Secret"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSaveLhdnCreds} disabled={savingCreds} className="flex-1">
                    {savingCreds ? 'Saving...' : existingCreds ? 'Update Credentials' : 'Save Credentials'}
                  </Button>
                  {existingCreds && (
                    <Button variant="outline" className="text-destructive" onClick={handleDeleteLhdnCreds}>
                      Remove
                    </Button>
                  )}
                </div>

                {existingCreds && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <p>✅ Credentials configured</p>
                    <p>Environment: <span className="font-medium text-foreground">{existingCreds.environment === 'sandbox' ? 'Sandbox' : 'Production'}</span></p>
                    <p>Last updated: {new Date(existingCreds.updated_at).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <EditCompanyDialog
        company={editCompany}
        open={!!editCompany}
        onOpenChange={(open) => { if (!open) setEditCompany(null); }}
        onSaved={refetchCompanies}
      />
    </div>
  );
};

export default SettingsPage;
