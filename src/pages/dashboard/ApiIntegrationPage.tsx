import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { autoCountApi } from '@/lib/autocount-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Key, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, ArrowDownToLine, ArrowUpFromLine,
  FileText, Users, Package, Receipt, Wallet, Layers, Truck, BarChart3, Clock, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SYNC_MODULES = [
  { key: 'debtor', label: 'Customers (Debtors)', icon: Users, api: 'debtor' },
  { key: 'creditor', label: 'Suppliers (Creditors)', icon: Users, api: 'creditor' },
  { key: 'product', label: 'Products / Stock Items', icon: Package, api: 'product' },
  { key: 'invoice', label: 'Invoices', icon: FileText, api: 'invoice' },
  { key: 'creditNote', label: 'Credit Notes', icon: Receipt, api: 'creditNote' },
  { key: 'payment', label: 'Payments (Cash Book)', icon: Wallet, api: 'payment' },
  { key: 'journalEntry', label: 'Journal Entries', icon: Layers, api: 'journalEntry' },
  { key: 'quotation', label: 'Quotations', icon: FileText, api: 'quotation' },
  { key: 'purchaseInvoice', label: 'Purchase Invoices', icon: Truck, api: 'purchaseInvoice' },
  { key: 'purchaseOrder', label: 'Purchase Orders', icon: Truck, api: 'purchaseOrder' },
  { key: 'stockAdjustment', label: 'Stock Adjustments', icon: Package, api: 'stockAdjustment' },
  { key: 'stockTransfer', label: 'Stock Transfers', icon: Truck, api: 'stockTransfer' },
];

const ApiIntegrationPage = () => {
  const { selectedCompany } = useCompany();
  const [apiConfig, setApiConfig] = useState({ key_id: '', api_key: '', account_book_id: '', endpoint_url: 'https://accounting-api.autocountcloud.com', description: '' });
  const [existingConfig, setExistingConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, any>>({});

  const fetchConfig = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase
      .from('autocount_api_keys' as any)
      .select('*')
      .eq('company_id', selectedCompany.id)
      .maybeSingle();
    if (data) {
      setExistingConfig(data);
      setApiConfig({
        key_id: (data as any).key_id || '',
        api_key: (data as any).api_key || '',
        account_book_id: (data as any).account_book_id || '',
        endpoint_url: (data as any).endpoint_url || 'https://accounting-api.autocountcloud.com',
        description: (data as any).description || '',
      });
    } else {
      setExistingConfig(null);
      setApiConfig({ key_id: '', api_key: '', account_book_id: '', endpoint_url: 'https://accounting-api.autocountcloud.com', description: '' });
    }
  };

  const fetchLogs = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase
      .from('autocount_sync_log' as any)
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setSyncLogs(data as any[]);
  };

  useEffect(() => { fetchConfig(); fetchLogs(); }, [selectedCompany]);

  const handleSave = async () => {
    if (!selectedCompany) return;
    if (!apiConfig.key_id || !apiConfig.api_key || !apiConfig.account_book_id) {
      toast.error('Key ID, API Key, and Account Book ID are required');
      return;
    }
    setSaving(true);
    const payload = {
      company_id: selectedCompany.id,
      key_id: apiConfig.key_id,
      api_key: apiConfig.api_key,
      account_book_id: apiConfig.account_book_id,
      endpoint_url: apiConfig.endpoint_url,
      description: apiConfig.description || null,
    };
    let error;
    if (existingConfig) {
      ({ error } = await supabase.from('autocount_api_keys' as any).update(payload).eq('id', (existingConfig as any).id));
    } else {
      ({ error } = await supabase.from('autocount_api_keys' as any).insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('API credentials saved');
    fetchConfig();
  };

  const handleDelete = async () => {
    if (!existingConfig) return;
    const { error } = await supabase.from('autocount_api_keys' as any).delete().eq('id', (existingConfig as any).id);
    if (error) { toast.error(error.message); return; }
    toast.success('API credentials removed');
    setExistingConfig(null);
    setApiConfig({ key_id: '', api_key: '', account_book_id: '', endpoint_url: 'https://accounting-api.autocountcloud.com', description: '' });
  };

  const handleTest = async () => {
    if (!selectedCompany) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await autoCountApi.companyProfile.getProfile(selectedCompany.id);
      if (result.success) {
        setTestResult({ ok: true, message: `Connected! Company: ${(result.data as any)?.companyName || 'OK'}` });
      } else {
        setTestResult({ ok: false, message: `Error ${result.status}: ${JSON.stringify(result.data)}` });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message });
    }
    setTesting(false);
  };

  const handleSync = async (moduleKey: string) => {
    if (!selectedCompany) return;
    setSyncing(moduleKey);
    try {
      const apiModule = (autoCountApi as any)[moduleKey];
      if (!apiModule?.list) { toast.error('Module not available'); setSyncing(null); return; }
      const result = await apiModule.list(selectedCompany.id, { page: 1 });
      setSyncResults(prev => ({ ...prev, [moduleKey]: result }));
      if (result.success) {
        const count = Array.isArray(result.data) ? result.data.length : (result.data?.data?.length || 0);
        toast.success(`Fetched ${count} records from AutoCount`);
      } else {
        toast.error(`Sync failed: ${result.status}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setSyncing(null);
    fetchLogs();
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a company to configure API integration.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Key className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">AutoCount API Integration</h1>
          <p className="text-sm text-muted-foreground">Connect to AutoCount Cloud Accounting for data sync</p>
        </div>
      </div>

      <Tabs defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials">API Credentials</TabsTrigger>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="logs">Sync History</TabsTrigger>
        </TabsList>

        {/* ─── CREDENTIALS TAB ─── */}
        <TabsContent value="credentials" className="mt-6 space-y-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                AutoCount Cloud API Key
              </CardTitle>
              <CardDescription>
                Configure your API credentials from the AutoCount Cloud Accounting Settings → API Keys tab.
                See <a href="https://accounting-api.autocountcloud.com/documentation/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">API Documentation</a>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Account Book ID *</Label>
                  <Input value={apiConfig.account_book_id} onChange={e => setApiConfig(f => ({ ...f, account_book_id: e.target.value }))} placeholder="e.g. 13830" />
                  <p className="text-xs text-muted-foreground mt-1">Found in AutoCount Settings → API Keys tab</p>
                </div>
                <div>
                  <Label>Endpoint URL</Label>
                  <Input value={apiConfig.endpoint_url} onChange={e => setApiConfig(f => ({ ...f, endpoint_url: e.target.value }))} placeholder="https://accounting-api.autocountcloud.com" />
                </div>
              </div>
              <div>
                <Label>Key ID *</Label>
                <Input value={apiConfig.key_id} onChange={e => setApiConfig(f => ({ ...f, key_id: e.target.value }))} placeholder="Enter Key ID" />
              </div>
              <div>
                <Label>API Key *</Label>
                <div className="relative">
                  <Input type={showKey ? 'text' : 'password'} value={apiConfig.api_key} onChange={e => setApiConfig(f => ({ ...f, api_key: e.target.value }))} placeholder="Enter API Key" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input value={apiConfig.description} onChange={e => setApiConfig(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Production API Key" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? 'Saving...' : existingConfig ? 'Update Credentials' : 'Save Credentials'}
                </Button>
                {existingConfig && (
                  <>
                    <Button variant="outline" onClick={handleTest} disabled={testing}>
                      {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span className="ml-2">Test</span>
                    </Button>
                    <Button variant="outline" className="text-destructive" onClick={handleDelete}>Remove</Button>
                  </>
                )}
              </div>

              {testResult && (
                <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${testResult.ok ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-400'}`}>
                  {testResult.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              {existingConfig && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p>✅ API configured</p>
                  <p>Account Book: <span className="font-medium text-foreground">{(existingConfig as any).account_book_id}</span></p>
                  <p>Last updated: {format(new Date((existingConfig as any).updated_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="font-display text-base">Available API Endpoints</CardTitle>
              <CardDescription>The following AutoCount API modules are available for sync</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['Account', 'Area', 'Company Profile', 'Credit Note', 'Creditor', 'Debtor', 'Department', 'DocNo Format', 'Invoice', 'Journal Entry', 'Knock Off Entry', 'Location', 'Payment', 'Product', 'Purchase Invoice', 'Purchase Order', 'Purchase Return', 'Quotation', 'Sales Agent', 'Stock Adjustment', 'Stock Transfer'].map(name => (
                  <Badge key={name} variant="secondary" className="justify-center py-1.5">{name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SYNC TAB ─── */}
        <TabsContent value="sync" className="mt-6">
          {!existingConfig ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Configure API credentials first to enable data sync.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SYNC_MODULES.map(mod => {
                const Icon = mod.icon;
                const result = syncResults[mod.key];
                return (
                  <Card key={mod.key}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <span className="font-medium text-sm">{mod.label}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled={syncing === mod.key} onClick={() => handleSync(mod.key)}>
                            {syncing === mod.key ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
                            <span className="ml-1.5 text-xs">Pull</span>
                          </Button>
                        </div>
                      </div>
                      {result && (
                        <div className={`text-xs rounded p-2 ${result.success ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
                          {result.success
                            ? `✓ ${Array.isArray(result.data) ? result.data.length : (result.data?.data?.length || 0)} records`
                            : `✗ Error ${result.status}`}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── LOGS TAB ─── */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-display">Sync History</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchLogs}><RefreshCw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No sync activity yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{format(new Date(log.created_at), 'dd MMM HH:mm:ss')}</TableCell>
                        <TableCell className="font-medium">{log.sync_type}</TableCell>
                        <TableCell>
                          {log.direction === 'pull' ? (
                            <Badge variant="secondary" className="text-xs"><ArrowDownToLine className="h-3 w-3 mr-1" />Pull</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs"><ArrowUpFromLine className="h-3 w-3 mr-1" />Push</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {log.records_processed || 0}
                          {log.records_failed > 0 && <span className="text-destructive ml-1">({log.records_failed} failed)</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiIntegrationPage;
