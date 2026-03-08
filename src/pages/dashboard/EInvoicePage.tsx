import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Send, AlertCircle, XCircle, RefreshCw, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EInvoicePage = () => {
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; invoiceId: string; uuid: string }>({ open: false, invoiceId: '', uuid: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('invoices').select('*, contacts(name)')
      .eq('company_id', selectedCompany.id)
      .eq('invoice_type', 'sales')
      .order('created_at', { ascending: false });
    setInvoices(data || []);

    // Check if LHDN credentials are configured
    const { data: creds } = await supabase.from('lhdn_credentials')
      .select('id')
      .eq('company_id', selectedCompany.id)
      .maybeSingle();
    setHasCredentials(!!creds);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const callEdgeFunction = async (payload: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Please sign in'); return null; }

    const res = await supabase.functions.invoke('lhdn-myinvois', {
      body: payload,
    });

    if (res.error) {
      const msg = typeof res.error === 'object' && 'message' in res.error ? res.error.message : String(res.error);
      toast.error(msg);
      return null;
    }

    if (res.data?.error) {
      toast.error(res.data.error);
      return null;
    }

    return res.data;
  };

  const handleSubmit = async (invoiceId: string) => {
    if (!selectedCompany) return;
    setLoading(invoiceId);
    const result = await callEdgeFunction({
      action: 'submit',
      company_id: selectedCompany.id,
      invoice_id: invoiceId,
    });
    if (result) {
      const accepted = result.data?.acceptedDocuments?.length || 0;
      const rejected = result.data?.rejectedDocuments?.length || 0;
      if (accepted > 0) {
        toast.success('e-Invoice submitted successfully to LHDN!');
      } else if (rejected > 0) {
        const errors = result.data?.rejectedDocuments?.[0]?.error?.details || [];
        toast.error(`Rejected: ${errors.map((e: any) => e.message).join(', ') || 'Unknown error'}`);
      }
      fetchData();
    }
    setLoading(null);
  };

  const handleCancel = async () => {
    if (!selectedCompany || !cancelDialog.uuid) return;
    setLoading('cancel');
    const result = await callEdgeFunction({
      action: 'cancel',
      company_id: selectedCompany.id,
      invoice_id: cancelDialog.invoiceId,
      document_uuid: cancelDialog.uuid,
      reason: cancelReason,
    });
    if (result) {
      toast.success('e-Invoice cancelled');
      fetchData();
    }
    setCancelDialog({ open: false, invoiceId: '', uuid: '' });
    setCancelReason('');
    setLoading(null);
  };

  const handleGetDocument = async (uuid: string) => {
    if (!selectedCompany) return;
    setLoading(uuid);
    const result = await callEdgeFunction({
      action: 'get_document',
      company_id: selectedCompany.id,
      document_uuid: uuid,
    });
    if (result) {
      setDetailDialog({ open: true, data: result.data });
    }
    setLoading(null);
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'valid': return 'default';
      case 'submitted': return 'secondary';
      case 'cancelled': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Malaysian e-Invoice</h1>
      <p className="text-muted-foreground mb-6">LHDN MyInvois compliant electronic invoicing</p>

      {!selectedCompany.einvoice_enabled && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
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
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">LHDN API Credentials Required</p>
              <p className="text-sm text-muted-foreground">
                Go to Settings → e-Invoice tab to configure your LHDN MyInvois Client ID and Client Secret.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Sales Invoices
          </CardTitle>
          <CardDescription>Submit invoices to LHDN MyInvois system</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>e-Invoice Status</TableHead>
                <TableHead>UUID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No sales invoices</TableCell></TableRow>
              ) : invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.contacts?.name || '—'}</TableCell>
                  <TableCell>RM {Number(inv.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    {inv.einvoice_status ? (
                      <Badge variant={statusBadgeVariant(inv.einvoice_status)}>
                        {inv.einvoice_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not submitted</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">
                    {inv.einvoice_uuid || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!inv.einvoice_status && selectedCompany.einvoice_enabled && hasCredentials && (
                        <Button size="sm" variant="outline" onClick={() => handleSubmit(inv.id)} disabled={loading === inv.id}>
                          {loading === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Submit
                        </Button>
                      )}
                      {inv.einvoice_uuid && inv.einvoice_status === 'valid' && (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => { if (!open) setCancelDialog({ open: false, invoiceId: '', uuid: '' }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Cancel e-Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This will cancel the e-Invoice submission with LHDN. This action cannot be undone.</p>
            <div>
              <Label>Reason for Cancellation</Label>
              <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Enter reason for cancellation..." />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCancelDialog({ open: false, invoiceId: '', uuid: '' })}>
                Go Back
              </Button>
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
          <DialogHeader><DialogTitle className="font-display">e-Invoice Document Details</DialogTitle></DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap">
            {JSON.stringify(detailDialog.data, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EInvoicePage;
