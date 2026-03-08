import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const EInvoicePage = () => {
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState<any[]>([]);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('invoices').select('*, contacts(name)')
      .eq('company_id', selectedCompany.id)
      .eq('invoice_type', 'sales')
      .order('created_at', { ascending: false });
    setInvoices(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleSubmit = async (invoiceId: string) => {
    // Placeholder - actual LHDN API integration would go through an edge function
    const { error } = await supabase.from('invoices').update({
      einvoice_status: 'submitted',
      einvoice_submitted_at: new Date().toISOString(),
    }).eq('id', invoiceId);
    if (error) { toast.error(error.message); return; }
    toast.success('e-Invoice submitted (simulation). LHDN API integration required for production.');
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Malaysian e-Invoice</h1>
      <p className="text-muted-foreground mb-6">LHDN MyInvois compliant electronic invoicing</p>

      {!selectedCompany.einvoice_enabled && (
        <Card className="mb-6 border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-foreground">e-Invoice Not Enabled</p>
              <p className="text-sm text-muted-foreground">Enable e-Invoice in company settings and provide your TIN to start submitting.</p>
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
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sales invoices</TableCell></TableRow>
              ) : invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.contacts?.name || '—'}</TableCell>
                  <TableCell>RM {Number(inv.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    {inv.einvoice_status ? (
                      <Badge variant={inv.einvoice_status === 'valid' ? 'default' : inv.einvoice_status === 'submitted' ? 'secondary' : 'destructive'}>
                        {inv.einvoice_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not submitted</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!inv.einvoice_status && selectedCompany.einvoice_enabled && (
                      <Button size="sm" variant="outline" onClick={() => handleSubmit(inv.id)}>
                        <Send className="h-3 w-3 mr-1" />Submit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EInvoicePage;
