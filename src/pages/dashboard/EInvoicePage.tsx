import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Globe, Send, AlertCircle, XCircle, Eye, Loader2, Search, CheckCircle, Clock,
  FileText, Users, QrCode, Download, Shield, BarChart3, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInHours, differenceInMinutes, format } from 'date-fns';

const EInvoicePage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; invoiceId: string; uuid: string }>({ open: false, invoiceId: '', uuid: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tinSearchOpen, setTinSearchOpen] = useState(false);
  const [tinSearchType, setTinSearchType] = useState('BRN');
  const [tinSearchValue, setTinSearchValue] = useState('');
  const [tinResult, setTinResult] = useState<any>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [sales, purchase, creds] = await Promise.all([
      supabase.from('invoices').select('*, contacts(name, tax_id)')
        .eq('company_id', selectedCompany.id).eq('invoice_type', 'sales')
        .order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, contacts(name, tax_id)')
        .eq('company_id', selectedCompany.id).eq('invoice_type', 'purchase')
        .order('created_at', { ascending: false }),
      supabase.from('lhdn_credentials').select('id').eq('company_id', selectedCompany.id).maybeSingle(),
    ]);
    setInvoices(sales.data || []);
    setPurchaseInvoices(purchase.data || []);
    setHasCredentials(!!creds.data);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const callEdgeFunction = async (payload: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Please sign in'); return null; }
    const res = await supabase.functions.invoke('lhdn-myinvois', { body: payload });
    if (res.error) { toast.error(typeof res.error === 'object' && 'message' in res.error ? res.error.message : String(res.error)); return null; }
    if (res.data?.error) { toast.error(res.data.error); return null; }
    return res.data;
  };

  // Single submit
  const handleSubmit = async (invoiceId: string) => {
    if (!selectedCompany) return;
    setLoading(invoiceId);
    const result = await callEdgeFunction({ action: 'submit', company_id: selectedCompany.id, invoice_id: invoiceId });
    if (result) {
      const accepted = result.data?.acceptedDocuments?.length || 0;
      if (accepted > 0) toast.success('e-Invoice submitted to LHDN!');
      else {
        const errors = result.data?.rejectedDocuments?.[0]?.error?.details || [];
        toast.error(`Rejected: ${errors.map((e: any) => e.message).join(', ') || 'Unknown error'}`);
      }
      fetchData();
    }
    setLoading(null);
  };

  // Batch submit
  const handleBatchSubmit = async () => {
    if (!selectedCompany || selectedIds.length === 0) return;
    setLoading('batch');
    const result = await callEdgeFunction({ action: 'batch_submit', company_id: selectedCompany.id, invoice_ids: selectedIds });
    if (result) {
      const accepted = result.data?.acceptedDocuments?.length || 0;
      const rejected = result.data?.rejectedDocuments?.length || 0;
      toast.success(`Batch submit: ${accepted} accepted, ${rejected} rejected`);
      setSelectedIds([]);
      fetchData();
    }
    setLoading(null);
  };

  // Consolidated submit
  const handleConsolidatedSubmit = async () => {
    if (!selectedCompany || selectedIds.length === 0) return;
    setLoading('consolidated');
    const result = await callEdgeFunction({ action: 'submit_consolidated', company_id: selectedCompany.id, invoice_ids: selectedIds });
    if (result) {
      toast.success('Consolidated e-Invoice submitted!');
      setSelectedIds([]);
      fetchData();
    }
    setLoading(null);
  };

  // Self-billed submit
  const handleSelfBilledSubmit = async (invoiceId: string) => {
    if (!selectedCompany) return;
    setLoading(invoiceId);
    const result = await callEdgeFunction({ action: 'submit_self_billed', company_id: selectedCompany.id, invoice_id: invoiceId });
    if (result) {
      toast.success('Self-billed e-Invoice submitted!');
      fetchData();
    }
    setLoading(null);
  };

  // Cancel
  const handleCancel = async () => {
    if (!selectedCompany || !cancelDialog.uuid) return;
    setLoading('cancel');
    const result = await callEdgeFunction({
      action: 'cancel', company_id: selectedCompany.id, invoice_id: cancelDialog.invoiceId,
      document_uuid: cancelDialog.uuid, reason: cancelReason,
    });
    if (result) { toast.success('e-Invoice cancelled'); fetchData(); }
    setCancelDialog({ open: false, invoiceId: '', uuid: '' });
    setCancelReason('');
    setLoading(null);
  };

  // View document
  const handleGetDocument = async (uuid: string) => {
    if (!selectedCompany) return;
    setLoading(uuid);
    const result = await callEdgeFunction({ action: 'get_document', company_id: selectedCompany.id, document_uuid: uuid });
    if (result) setDetailDialog({ open: true, data: result.data });
    setLoading(null);
  };

  // TIN Search
  const handleTinSearch = async () => {
    if (!selectedCompany) return;
    setLoading('tin');
    const result = await callEdgeFunction({ action: 'search_tin', company_id: selectedCompany.id, id_type: tinSearchType, id_value: tinSearchValue });
    if (result) setTinResult(result.data);
    setLoading(null);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    const unsubmitted = invoices.filter(i => !i.einvoice_status);
    if (selectedIds.length === unsubmitted.length) setSelectedIds([]);
    else setSelectedIds(unsubmitted.map(i => i.id));
  };

  // Cancellation countdown
  const getCancellationCountdown = (submittedAt: string) => {
    if (!submittedAt) return null;
    const submitted = new Date(submittedAt);
    const deadline = new Date(submitted.getTime() + 72 * 60 * 60 * 1000);
    const now = new Date();
    if (now > deadline) return { expired: true, text: 'Expired', hours: 0, percent: 0 };
    const hoursLeft = differenceInHours(deadline, now);
    const minutesLeft = differenceInMinutes(deadline, now) % 60;
    const percent = ((72 * 60 - differenceInMinutes(deadline, now)) / (72 * 60)) * 100;
    return { expired: false, text: `${hoursLeft}h ${minutesLeft}m left`, hours: hoursLeft, percent };
  };

  // Profile readiness check
  const getProfileReadiness = () => {
    if (!selectedCompany) return { score: 0, missing: [] };
    const fields = [
      { key: 'name', label: 'Company Name' },
      { key: 'einvoice_tin', label: 'TIN' },
      { key: 'registration_no', label: 'Registration No (SSM)' },
      { key: 'msic_code', label: 'MSIC Code' },
      { key: 'address_line1', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'postcode', label: 'Postcode' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ];
    const filled = fields.filter(f => selectedCompany[f.key]);
    const missing = fields.filter(f => !selectedCompany[f.key]);
    return { score: Math.round((filled.length / fields.length) * 100), missing };
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { valid: 'default', submitted: 'secondary', cancelled: 'outline', rejected: 'destructive', consolidated: 'default' };
    return (map[status] || 'secondary') as any;
  };

  const profileReadiness = getProfileReadiness();
  const submittedCount = invoices.filter(i => i.einvoice_status === 'submitted' || i.einvoice_status === 'valid').length;
  const rejectedCount = invoices.filter(i => i.einvoice_status === 'rejected').length;
  const pendingCount = invoices.filter(i => !i.einvoice_status).length;
  const unsubmittedInvoices = invoices.filter(i => !i.einvoice_status);

  // QR code data URL (simple text-based)
  const qrData = selectedCompany ? `https://myinvois.hasil.gov.my/taxpayer/${selectedCompany.einvoice_tin || 'NA'}` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Malaysian e-Invoice</h1>
          <p className="text-muted-foreground">LHDN MyInvois compliant electronic invoicing — submit, track, cancel & import</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTinSearchOpen(true)}><Search className="mr-2 h-4 w-4" />TIN Search</Button>
          <Button variant="outline" onClick={() => setQrDialogOpen(true)}><QrCode className="mr-2 h-4 w-4" />QR Code</Button>
        </div>
      </div>

      {/* Alerts */}
      {!selectedCompany.einvoice_enabled && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-foreground">e-Invoice Not Enabled</p>
              <p className="text-sm text-muted-foreground">Enable e-Invoice in Settings → e-Invoice tab and provide your TIN.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCompany.einvoice_enabled && hasCredentials === false && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">LHDN API Credentials Required</p>
              <p className="text-sm text-muted-foreground">Go to Settings → e-Invoice tab to configure your LHDN MyInvois Client ID and Client Secret.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="submit"><Send className="h-4 w-4 mr-1" />Submit</TabsTrigger>
          <TabsTrigger value="consolidated"><Layers className="h-4 w-4 mr-1" />Consolidated</TabsTrigger>
          <TabsTrigger value="self-billed"><FileText className="h-4 w-4 mr-1" />Self-Billed</TabsTrigger>
          <TabsTrigger value="import"><Download className="h-4 w-4 mr-1" />Import</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pendingCount}</p></div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div><p className="text-sm text-muted-foreground">Submitted/Valid</p><p className="text-2xl font-bold">{submittedCount}</p></div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <div><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold">{rejectedCount}</p></div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">MyInvois Ready</p>
                <span className="text-sm font-bold">{profileReadiness.score}%</span>
              </div>
              <Progress value={profileReadiness.score} className="h-2" />
              {profileReadiness.missing.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Missing: {profileReadiness.missing.map(m => m.label).join(', ')}</p>
              )}
            </CardContent></Card>
          </div>

          {/* Recent submissions with countdown */}
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Submissions — 72-Hour Cancellation Window</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Invoice #</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead><TableHead>Countdown</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.filter(i => i.einvoice_status).slice(0, 10).map(inv => {
                    const countdown = getCancellationCountdown(inv.einvoice_submitted_at);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{(inv.contacts as any)?.name || '—'}</TableCell>
                        <TableCell>{fmt(Number(inv.total_amount))}</TableCell>
                        <TableCell><Badge variant={statusBadge(inv.einvoice_status)}>{inv.einvoice_status}</Badge></TableCell>
                        <TableCell>
                          {countdown && !countdown.expired ? (
                            <div className="flex items-center gap-2">
                              <Progress value={countdown.percent} className="h-2 w-16" />
                              <span className="text-xs font-medium text-yellow-600">{countdown.text}</span>
                            </div>
                          ) : countdown?.expired ? (
                            <span className="text-xs text-muted-foreground">Window closed</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {inv.einvoice_uuid && (inv.einvoice_status === 'valid' || inv.einvoice_status === 'submitted') && countdown && !countdown.expired && (
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelDialog({ open: true, invoiceId: inv.id, uuid: inv.einvoice_uuid })}>
                                <XCircle className="h-3 w-3 mr-1" />Cancel
                              </Button>
                            )}
                            {inv.einvoice_uuid && (
                              <Button size="sm" variant="ghost" onClick={() => handleGetDocument(inv.einvoice_uuid)} disabled={loading === inv.einvoice_uuid}>
                                {loading === inv.einvoice_uuid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {invoices.filter(i => i.einvoice_status).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No submitted invoices yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submit Tab — Individual & Batch */}
        <TabsContent value="submit" className="space-y-4">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedIds.length} invoice(s) selected</span>
              <Button size="sm" onClick={handleBatchSubmit} disabled={loading === 'batch'}>
                {loading === 'batch' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Batch Submit to LHDN
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />Sales Invoices — e-Invoice Submission</CardTitle>
              <CardDescription>Submit individual or batch invoices to LHDN MyInvois. Select multiple and click "Batch Submit".</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.length === unsubmittedInvoices.length && unsubmittedInvoices.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>Invoice #</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead>
                  <TableHead>e-Invoice Status</TableHead><TableHead>UUID</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No sales invoices</TableCell></TableRow>
                  ) : invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        {!inv.einvoice_status && <Checkbox checked={selectedIds.includes(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} />}
                      </TableCell>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{(inv.contacts as any)?.name || '—'}</TableCell>
                      <TableCell>RM {Number(inv.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        {inv.einvoice_status ? (
                          <Badge variant={statusBadge(inv.einvoice_status)}>{inv.einvoice_status}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not submitted</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">{inv.einvoice_uuid || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!inv.einvoice_status && selectedCompany.einvoice_enabled && hasCredentials && (
                            <Button size="sm" variant="outline" onClick={() => handleSubmit(inv.id)} disabled={loading === inv.id}>
                              {loading === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}Submit
                            </Button>
                          )}
                          {inv.einvoice_uuid && (
                            <Button size="sm" variant="ghost" onClick={() => handleGetDocument(inv.einvoice_uuid)} disabled={loading === inv.einvoice_uuid}>
                              {loading === inv.einvoice_uuid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consolidated Tab */}
        <TabsContent value="consolidated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />Consolidated e-Invoice</CardTitle>
              <CardDescription>
                Submit multiple invoices as a single consolidated e-Invoice to MyInvois. Ideal for businesses that submit once a month for multiple buyers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-4">
                  <span className="text-sm font-medium">{selectedIds.length} invoice(s) selected for consolidation</span>
                  <Button size="sm" onClick={handleConsolidatedSubmit} disabled={loading === 'consolidated'}>
                    {loading === 'consolidated' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Layers className="h-3 w-3 mr-1" />}
                    Submit as Consolidated
                  </Button>
                </div>
              )}
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.length === unsubmittedInvoices.length && unsubmittedInvoices.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Invoice #</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {unsubmittedInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell><Checkbox checked={selectedIds.includes(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} /></TableCell>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{(inv.contacts as any)?.name || '—'}</TableCell>
                      <TableCell>{inv.invoice_date}</TableCell>
                      <TableCell>RM {Number(inv.total_amount).toFixed(2)}</TableCell>
                      <TableCell><span className="text-muted-foreground text-sm">Pending</span></TableCell>
                    </TableRow>
                  ))}
                  {unsubmittedInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">All invoices have been submitted</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Self-Billed Tab */}
        <TabsContent value="self-billed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Self-Billed e-Invoice</CardTitle>
              <CardDescription>
                When suppliers cannot provide an e-Invoice, you must issue a self-billed e-Invoice for purchase transactions. 
                This is required for individuals ineligible to issue e-Invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Invoice #</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {purchaseInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{(inv.contacts as any)?.name || '—'}</TableCell>
                      <TableCell>{inv.invoice_date}</TableCell>
                      <TableCell>RM {Number(inv.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        {inv.einvoice_status ? (
                          <Badge variant={statusBadge(inv.einvoice_status)}>{inv.einvoice_status}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not submitted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!inv.einvoice_status && selectedCompany.einvoice_enabled && hasCredentials && (
                          <Button size="sm" variant="outline" onClick={() => handleSelfBilledSubmit(inv.id)} disabled={loading === inv.id}>
                            {loading === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                            Self-Bill
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {purchaseInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchase invoices</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" />Import Supplier e-Invoice</CardTitle>
              <CardDescription>
                Automatically import purchase invoices from the LHDN portal. Eliminate manual data entry and ensure accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-muted p-8 text-center">
                <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Import from LHDN MyInvois</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Fetch recent supplier e-Invoices from the LHDN portal and automatically create purchase entries in your system.
                </p>
                <Button disabled={!hasCredentials || !selectedCompany.einvoice_enabled} onClick={async () => {
                  setLoading('import');
                  const result = await callEdgeFunction({
                    action: 'get_recent_documents', company_id: selectedCompany.id,
                    params: { direction: 'Received', pageSize: '20', status: 'Valid' },
                  });
                  if (result) {
                    toast.success(`Found ${result.data?.result?.length || 0} supplier documents`);
                    setDetailDialog({ open: true, data: result.data });
                  }
                  setLoading(null);
                }}>
                  {loading === 'import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Fetch Supplier e-Invoices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* TIN Search Dialog */}
      <Dialog open={tinSearchOpen} onOpenChange={setTinSearchOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>TIN Search — LHDN Taxpayer Lookup</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Search for customer TIN numbers directly from LHDN's database. No more chasing customers for their TIN!</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>ID Type</Label>
                <Select value={tinSearchType} onValueChange={setTinSearchType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRN">SSM (BRN)</SelectItem>
                    <SelectItem value="NRIC">IC Number</SelectItem>
                    <SelectItem value="PASSPORT">Passport</SelectItem>
                    <SelectItem value="ARMY">Army ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>ID Value</Label>
                <div className="flex gap-2">
                  <Input value={tinSearchValue} onChange={e => setTinSearchValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTinSearch()} placeholder="Enter registration/IC number" />
                  <Button onClick={handleTinSearch} disabled={loading === 'tin' || !tinSearchValue}>
                    {loading === 'tin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            {tinResult && (
              <Card><CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-foreground">TIN Found</span>
                </div>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(tinResult, null, 2)}</pre>
              </CardContent></Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Smart QR Code — Customer Data Collection</DialogTitle></DialogHeader>
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Generate a QR code for customers to scan and fill in their e-Invoice details automatically.</p>
            <div className="p-6 bg-muted rounded-lg inline-block mx-auto">
              <div className="w-48 h-48 bg-foreground/10 rounded flex items-center justify-center mx-auto">
                <QrCode className="h-24 w-24 text-foreground/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono break-all">{qrData}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Customers scan this QR code → fill in their TIN, SSM & address → data auto-populates in your invoices
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => { if (!open) setCancelDialog({ open: false, invoiceId: '', uuid: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel e-Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This will cancel the e-Invoice within the 72-hour window. This action cannot be undone.</p>
            <div><Label>Reason for Cancellation</Label><Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Enter reason..." /></div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCancelDialog({ open: false, invoiceId: '', uuid: '' })}>Go Back</Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={!cancelReason || loading === 'cancel'}>
                {loading === 'cancel' ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => { if (!open) setDetailDialog({ open: false, data: null }); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>e-Invoice Document Details</DialogTitle></DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap">
            {JSON.stringify(detailDialog.data, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EInvoicePage;
