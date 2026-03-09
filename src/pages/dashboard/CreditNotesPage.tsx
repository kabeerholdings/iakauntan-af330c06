import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import DocumentPrintPreview from '@/components/DocumentPrintPreview';
import NoteStatusBadge from '@/components/notes/NoteStatusBadge';
import NoteFormDialog, { type NoteLine } from '@/components/notes/NoteFormDialog';
import NoteActionsMenu from '@/components/notes/NoteActionsMenu';
import { exportNoteToCSV, generatePublicLink, generatePDFFromPreview } from '@/lib/note-utils';

const CreditNotesPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [noteType, setNoteType] = useState<'sales' | 'purchase'>('sales');
  const [printPreview, setPrintPreview] = useState<{ note: any; template: any } | null>(null);
  // Apply as payment dialog
  const [applyDialog, setApplyDialog] = useState<{ note: any; invoiceId: string } | null>(null);
  // Refund dialog
  const [refundDialog, setRefundDialog] = useState<{ note: any; amount: string; method: string } | null>(null);
  // Convert dialog
  const [convertDialog, setConvertDialog] = useState<any | null>(null);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [n, c, inv, tpl] = await Promise.all([
      supabase.from('credit_notes').select('*, contacts(name, email), credit_note_lines(*)').eq('company_id', selectedCompany.id).order('note_date', { ascending: false }),
      supabase.from('contacts').select('id, name, type, email').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('invoices').select('id, invoice_number, contact_id, total_amount, amount_paid').eq('company_id', selectedCompany.id),
      supabase.from('document_templates').select('*').eq('company_id', selectedCompany.id).in('template_type', ['invoice', 'credit_note']),
    ]);
    setNotes(n.data || []);
    setContacts(c.data || []);
    setInvoices(inv.data || []);
    setTemplates(tpl.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const calcLine = (l: NoteLine) => {
    const gross = (+l.quantity || 0) * (+l.unit_price || 0);
    const discount = gross * (+l.discount_rate || 0) / 100;
    const sub = gross - discount;
    const tax = sub * (+l.tax_rate || 0) / 100;
    return { sub, tax, total: sub + tax, discount };
  };

  const handleCreate = async (form: any) => {
    if (!selectedCompany || !form.note_number) { toast.error('Note number required'); return; }
    const validLines = form.lines.filter((l: NoteLine) => l.description);
    const subtotal = validLines.reduce((s: number, l: NoteLine) => s + calcLine(l).sub, 0);
    const taxTotal = validLines.reduce((s: number, l: NoteLine) => s + calcLine(l).tax, 0);

    const { data, error } = await supabase.from('credit_notes').insert({
      company_id: selectedCompany.id, note_type: noteType, note_number: form.note_number,
      note_date: form.note_date, contact_id: form.contact_id || null,
      invoice_id: form.invoice_id || null, reason: form.reason || null,
      subtotal, tax_amount: taxTotal, total_amount: subtotal + taxTotal,
      created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    if (data && validLines.length > 0) {
      await supabase.from('credit_note_lines').insert(
        validLines.map((l: NoteLine) => ({
          credit_note_id: data.id, description: l.description,
          quantity: +l.quantity || 1, unit_price: +l.unit_price || 0,
          tax_rate: +l.tax_rate || 0, tax_amount: calcLine(l).tax, line_total: calcLine(l).total,
        }))
      );
    }
    toast.success(`${noteType === 'sales' ? 'Credit' : 'Debit'} Note created`);
    setCreateOpen(false);
    fetchData();
  };

  // Status change
  const handleStatusChange = async (note: any, newStatus: string) => {
    const { error } = await supabase.from('credit_notes').update({ status: newStatus }).eq('id', note.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Note ${newStatus === 'void' ? 'voided' : 'posted'}`);
    fetchData();
  };

  // Preview
  const handlePreview = async (n: any) => {
    const { data: lines } = await supabase.from('credit_note_lines').select('*').eq('credit_note_id', n.id);
    const defaultTpl = templates.find(t => t.is_default) || templates[0] || null;
    setPrintPreview({ note: { ...n, lines: lines || [] }, template: defaultTpl });
  };

  // Download PDF
  const handleDownloadPDF = (n: any) => {
    handlePreview(n).then(() => {
      setTimeout(() => generatePDFFromPreview(n.note_number), 500);
    });
  };

  // Export CSV
  const handleExportCSV = async (n: any) => {
    const { data: lines } = await supabase.from('credit_note_lines').select('*').eq('credit_note_id', n.id);
    exportNoteToCSV(n, lines || [], selectedCompany?.name || '');
    toast.success('CSV exported');
  };

  // Email
  const handleEmail = (n: any) => {
    const email = n.contacts?.email;
    if (!email) { toast.error('No email address for this contact'); return; }
    const subject = encodeURIComponent(`${n.note_type === 'sales' ? 'Credit' : 'Debit'} Note ${n.note_number}`);
    const body = encodeURIComponent(`Dear ${n.contacts?.name},\n\nPlease find attached ${n.note_type === 'sales' ? 'Credit' : 'Debit'} Note ${n.note_number} dated ${n.note_date} for ${fmt(+n.total_amount)}.\n\nReason: ${n.reason || 'N/A'}\n\nRegards,\n${selectedCompany?.name}`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  // Share public link
  const handleShareLink = (n: any) => {
    const kind = n.note_type === 'sales' ? 'credit' : 'debit';
    const link = generatePublicLink(n.id, kind as 'credit' | 'debit');
    navigator.clipboard.writeText(link);
    toast.success('Public link copied to clipboard');
  };

  // Apply credit as invoice payment
  const handleApplyAsPayment = async () => {
    if (!applyDialog || !applyDialog.invoiceId) { toast.error('Select an invoice'); return; }
    const note = applyDialog.note;
    const inv = invoices.find(i => i.id === applyDialog.invoiceId);
    if (!inv) return;
    
    // Create a payment record
    const { error } = await supabase.from('payments').insert({
      company_id: selectedCompany!.id,
      payment_type: 'receipt',
      payment_date: new Date().toISOString().split('T')[0],
      contact_id: note.contact_id,
      amount: +note.total_amount,
      reference: `Applied from ${note.note_number}`,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }

    await supabase.from('credit_notes').update({ status: 'applied' }).eq('id', note.id);
    toast.success(`Credit applied to ${inv.invoice_number}`);
    setApplyDialog(null);
    fetchData();
  };

  // Refund
  const handleRefund = async () => {
    if (!refundDialog) return;
    const note = refundDialog.note;
    const amount = +refundDialog.amount || +note.total_amount;

    const { error } = await supabase.from('payments').insert({
      company_id: selectedCompany!.id,
      payment_type: 'payment',
      payment_date: new Date().toISOString().split('T')[0],
      contact_id: note.contact_id,
      amount,
      reference: `Refund for ${note.note_number}`,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }

    await supabase.from('credit_notes').update({ status: 'refunded' }).eq('id', note.id);
    toast.success('Refund recorded');
    setRefundDialog(null);
    fetchData();
  };

  // Convert credit note to invoice / debit note to bill
  const handleConvert = async (note: any) => {
    if (!selectedCompany) return;
    const { data: lines } = await supabase.from('credit_note_lines').select('*').eq('credit_note_id', note.id);
    const isCredit = note.note_type === 'sales';

    if (isCredit) {
      // Convert to Invoice
      const { data: inv, error } = await supabase.from('invoices').insert([{
        company_id: selectedCompany.id,
        invoice_number: `INV-${note.note_number}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        contact_id: note.contact_id,
        subtotal: note.subtotal,
        tax_amount: note.tax_amount,
        total_amount: note.total_amount,
        notes: `Converted from Credit Note ${note.note_number}`,
      }]).select().single();
      if (error) { toast.error(error.message); return; }
      if (inv && lines) {
        await supabase.from('invoice_lines').insert(
          lines.map((l: any) => ({
            invoice_id: inv.id, description: l.description,
            quantity: l.quantity, unit_price: l.unit_price,
            tax_rate: l.tax_rate, tax_amount: l.tax_amount, line_total: l.line_total,
          }))
        );
      }
      toast.success(`Converted to Invoice ${inv?.invoice_number}`);
    } else {
      // Convert debit note to purchase bill (expense)
      const { error } = await supabase.from('expenses').insert({
        company_id: selectedCompany.id,
        description: `Bill from Debit Note ${note.note_number}`,
        amount: +note.total_amount,
        expense_date: new Date().toISOString().split('T')[0],
        contact_id: note.contact_id,
        reference: note.note_number,
        created_by: user?.id,
      });
      if (error) { toast.error(error.message); return; }
      toast.success(`Converted to Bill/Expense`);
    }

    await supabase.from('credit_notes').update({ status: 'converted' }).eq('id', note.id);
    fetchData();
  };

  // Bulk export
  const handleBulkExport = async () => {
    const allLines: string[] = ['Note Number,Date,Type,Contact,Reason,Subtotal,Tax,Total,Status'];
    notes.forEach(n => {
      allLines.push([
        n.note_number, n.note_date, n.note_type === 'sales' ? 'Credit' : 'Debit',
        n.contacts?.name || '', n.reason || '', n.subtotal, n.tax_amount, n.total_amount, n.status,
      ].join(','));
    });
    const blob = new Blob([allLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credit-debit-notes.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('All notes exported');
  };

  const openNew = (type: 'sales' | 'purchase') => {
    setNoteType(type);
    setCreateOpen(true);
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const salesNotes = notes.filter(n => n.note_type === 'sales');
  const purchaseNotes = notes.filter(n => n.note_type === 'purchase');

  const renderTable = (data: any[], kind: 'credit' | 'debit') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>No.</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No {kind} notes yet</TableCell></TableRow>
        ) : data.map(n => (
          <TableRow key={n.id}>
            <TableCell>{n.note_date}</TableCell>
            <TableCell className="font-mono font-medium">{n.note_number}</TableCell>
            <TableCell>{n.contacts?.name || '—'}</TableCell>
            <TableCell className="text-muted-foreground max-w-[200px] truncate">{n.reason || '—'}</TableCell>
            <TableCell className="text-right font-medium">{fmt(+n.total_amount)}</TableCell>
            <TableCell><NoteStatusBadge status={n.status || 'draft'} /></TableCell>
            <TableCell>
              <NoteActionsMenu
                note={n}
                noteKind={kind}
                onPreview={() => handlePreview(n)}
                onDownloadPDF={() => handleDownloadPDF(n)}
                onExportCSV={() => handleExportCSV(n)}
                onEmail={() => handleEmail(n)}
                onShareLink={() => handleShareLink(n)}
                onConvert={() => handleConvert(n)}
                onApplyAsPayment={() => setApplyDialog({ note: n, invoiceId: '' })}
                onRefund={() => setRefundDialog({ note: n, amount: String(n.total_amount), method: 'bank_transfer' })}
                onChangeStatus={(status) => handleStatusChange(n, status)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Credit & Debit Notes</h1>
            <p className="text-sm text-muted-foreground">Manage credit notes, debit notes, refunds, and conversions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBulkExport}><Download className="h-4 w-4 mr-2" />Export All</Button>
          <Button onClick={() => openNew('sales')}><Plus className="h-4 w-4 mr-2" />Credit Note</Button>
          <Button onClick={() => openNew('purchase')} variant="outline"><Plus className="h-4 w-4 mr-2" />Debit Note</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Credit Notes', value: salesNotes.length, amount: salesNotes.reduce((s, n) => s + (+n.total_amount || 0), 0) },
          { label: 'Total Debit Notes', value: purchaseNotes.length, amount: purchaseNotes.reduce((s, n) => s + (+n.total_amount || 0), 0) },
          { label: 'Applied/Refunded', value: notes.filter(n => ['applied', 'refunded', 'partially_applied'].includes(n.status)).length, amount: notes.filter(n => ['applied', 'refunded'].includes(n.status)).reduce((s, n) => s + (+n.total_amount || 0), 0) },
          { label: 'Outstanding', value: notes.filter(n => ['draft', 'posted'].includes(n.status || 'draft')).length, amount: notes.filter(n => ['draft', 'posted'].includes(n.status || 'draft')).reduce((s, n) => s + (+n.total_amount || 0), 0) },
        ].map((c, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold font-display">{fmt(c.amount)}</p>
              <p className="text-xs text-muted-foreground">{c.value} notes</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="all">All ({notes.length})</TabsTrigger>
                <TabsTrigger value="credit">Credit Notes ({salesNotes.length})</TabsTrigger>
                <TabsTrigger value="debit">Debit Notes ({purchaseNotes.length})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="all">{renderTable(notes, notes.length > 0 ? (notes[0].note_type === 'sales' ? 'credit' : 'debit') : 'credit')}</TabsContent>
            <TabsContent value="credit">{renderTable(salesNotes, 'credit')}</TabsContent>
            <TabsContent value="debit">{renderTable(purchaseNotes, 'debit')}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <NoteFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        noteType={noteType}
        contacts={contacts}
        invoices={invoices}
        onSubmit={handleCreate}
        title={noteType === 'sales' ? 'New Credit Note' : 'New Debit Note'}
      />

      {/* Print Preview */}
      {printPreview && (
        <DocumentPrintPreview
          open={!!printPreview}
          onClose={() => setPrintPreview(null)}
          documentType={printPreview.note.note_type === 'sales' ? 'CREDIT NOTE' : 'DEBIT NOTE'}
          documentNumber={printPreview.note.note_number}
          documentDate={printPreview.note.note_date}
          contactName={printPreview.note.contacts?.name}
          lines={printPreview.note.lines || []}
          subtotal={+printPreview.note.subtotal || 0}
          taxAmount={+printPreview.note.tax_amount || 0}
          totalAmount={+printPreview.note.total_amount || 0}
          notes={printPreview.note.reason}
          template={printPreview.template}
          templates={templates}
          company={selectedCompany}
          onChangeTemplate={tpl => setPrintPreview(prev => prev ? { ...prev, template: tpl } : null)}
          extraFields={[
            ...(printPreview.note.reason ? [{ label: 'Reason', value: printPreview.note.reason }] : []),
            { label: 'Status', value: printPreview.note.status || 'draft' },
          ]}
        />
      )}

      {/* Apply as Payment Dialog */}
      <Dialog open={!!applyDialog} onOpenChange={() => setApplyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Credit as Invoice Payment</DialogTitle>
            <DialogDescription>Apply {applyDialog?.note?.note_number} ({fmt(+(applyDialog?.note?.total_amount || 0))}) to an invoice.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Invoice</Label>
              <Select value={applyDialog?.invoiceId || ''} onValueChange={v => setApplyDialog(prev => prev ? { ...prev, invoiceId: v } : null)}>
                <SelectTrigger><SelectValue placeholder="Choose invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices
                    .filter(inv => applyDialog?.note?.contact_id ? inv.contact_id === applyDialog.note.contact_id : true)
                    .map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {fmt(+inv.total_amount)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialog(null)}>Cancel</Button>
            <Button onClick={handleApplyAsPayment}>Apply Credit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={!!refundDialog} onOpenChange={() => setRefundDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Refund</DialogTitle>
            <DialogDescription>Issue a refund for {refundDialog?.note?.note_number}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Refund Amount</Label>
              <Input type="number" value={refundDialog?.amount || ''} onChange={e => setRefundDialog(prev => prev ? { ...prev, amount: e.target.value } : null)} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={refundDialog?.method || 'bank_transfer'} onValueChange={v => setRefundDialog(prev => prev ? { ...prev, method: v } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(null)}>Cancel</Button>
            <Button onClick={handleRefund}>Process Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditNotesPage;
