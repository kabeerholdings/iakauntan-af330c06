import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import DocumentPrintPreview from '@/components/DocumentPrintPreview';
import NoteStatusBadge from '@/components/notes/NoteStatusBadge';
import NoteFormDialog, { type NoteLine } from '@/components/notes/NoteFormDialog';
import NoteActionsMenu from '@/components/notes/NoteActionsMenu';
import { exportNoteToCSV, generatePDFFromPreview, generatePublicLink } from '@/lib/note-utils';

const DebitNotesPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [printPreview, setPrintPreview] = useState<{ note: any; template: any } | null>(null);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [n, c, i, tpl] = await Promise.all([
      supabase.from('debit_notes').select('*, contacts(name, email), debit_note_lines(*)').eq('company_id', selectedCompany.id).order('note_date', { ascending: false }),
      supabase.from('contacts').select('id, name, type, email').eq('company_id', selectedCompany.id),
      supabase.from('invoices').select('id, invoice_number').eq('company_id', selectedCompany.id),
      supabase.from('document_templates').select('*').eq('company_id', selectedCompany.id).in('template_type', ['invoice', 'debit_note']),
    ]);
    setNotes(n.data || []);
    setContacts(c.data || []);
    setInvoices(i.data || []);
    setTemplates(tpl.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const calcLine = (l: NoteLine) => {
    const gross = (+l.quantity || 0) * (+l.unit_price || 0);
    const discount = gross * (+l.discount_rate || 0) / 100;
    const sub = gross - discount;
    const tax = sub * (+l.tax_rate || 0) / 100;
    return { sub, tax, total: sub + tax };
  };

  const handleCreate = async (form: any) => {
    if (!selectedCompany || !form.note_number) { toast.error('Note number required'); return; }
    const validLines = form.lines.filter((l: NoteLine) => l.description);
    const subtotal = validLines.reduce((s: number, l: NoteLine) => s + calcLine(l).sub, 0);
    const taxTotal = validLines.reduce((s: number, l: NoteLine) => s + calcLine(l).tax, 0);

    const { data, error } = await supabase.from('debit_notes').insert({
      company_id: selectedCompany.id, note_number: form.note_number,
      note_date: form.note_date, note_type: 'purchase',
      contact_id: form.contact_id || null, invoice_id: form.invoice_id || null,
      reason: form.reason || null, subtotal, tax_amount: taxTotal,
      total_amount: subtotal + taxTotal, created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    if (data && validLines.length > 0) {
      await supabase.from('debit_note_lines').insert(
        validLines.map((l: NoteLine) => ({
          debit_note_id: data.id, description: l.description,
          quantity: +l.quantity || 1, unit_price: +l.unit_price || 0,
          tax_rate: +l.tax_rate || 0,
          tax_amount: calcLine(l).tax, line_total: calcLine(l).total,
        }))
      );
    }
    toast.success('Debit note created');
    setCreateOpen(false);
    fetchData();
  };

  const handleStatusChange = async (note: any, newStatus: string) => {
    const { error } = await supabase.from('debit_notes').update({ status: newStatus }).eq('id', note.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Note ${newStatus === 'void' ? 'voided' : 'posted'}`);
    fetchData();
  };

  const handlePreview = async (n: any) => {
    const { data: lines } = await supabase.from('debit_note_lines').select('*').eq('debit_note_id', n.id);
    const defaultTpl = templates.find(t => t.is_default) || templates[0] || null;
    setPrintPreview({ note: { ...n, lines: lines || [] }, template: defaultTpl });
  };

  const handleExportCSV = async (n: any) => {
    const { data: lines } = await supabase.from('debit_note_lines').select('*').eq('debit_note_id', n.id);
    exportNoteToCSV(n, lines || [], selectedCompany?.name || '');
    toast.success('CSV exported');
  };

  const handleEmail = (n: any) => {
    const email = n.contacts?.email;
    if (!email) { toast.error('No email for this contact'); return; }
    const subject = encodeURIComponent(`Debit Note ${n.note_number}`);
    const body = encodeURIComponent(`Dear ${n.contacts?.name},\n\nPlease find Debit Note ${n.note_number} dated ${n.note_date} for ${fmt(+n.total_amount)}.\n\nReason: ${n.reason || 'N/A'}\n\nRegards,\n${selectedCompany?.name}`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const handleShareLink = (n: any) => {
    const link = generatePublicLink(n.id, 'debit');
    navigator.clipboard.writeText(link);
    toast.success('Public link copied');
  };

  const handleConvert = async (note: any) => {
    if (!selectedCompany) return;
    const { data: lines } = await supabase.from('debit_note_lines').select('*').eq('debit_note_id', note.id);
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
    await supabase.from('debit_notes').update({ status: 'converted' }).eq('id', note.id);
    toast.success('Converted to Bill/Expense');
    fetchData();
  };

  const handleBulkExport = () => {
    const rows = ['Note Number,Date,Contact,Reason,Amount,Status'];
    notes.forEach(n => rows.push([n.note_number, n.note_date, n.contacts?.name || '', n.reason || '', n.total_amount, n.status].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'debit-notes.csv';
    a.click();
    toast.success('All debit notes exported');
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Debit Notes</h1>
            <p className="text-sm text-muted-foreground">Issue debit notes to suppliers, convert to bills</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBulkExport}><Download className="h-4 w-4 mr-2" />Export All</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Debit Note</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Debit Notes', value: notes.length, amount: notes.reduce((s, n) => s + (+n.total_amount || 0), 0) },
          { label: 'Posted', value: notes.filter(n => n.status === 'posted').length, amount: notes.filter(n => n.status === 'posted').reduce((s, n) => s + (+n.total_amount || 0), 0) },
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Note #</TableHead>
                <TableHead>Contact</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead><TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No debit notes</TableCell></TableRow>
              ) : notes.map(n => (
                <TableRow key={n.id}>
                  <TableCell>{n.note_date}</TableCell>
                  <TableCell className="font-mono font-medium">{n.note_number}</TableCell>
                  <TableCell>{n.contacts?.name || '—'}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(n.total_amount))}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{n.reason || '—'}</TableCell>
                  <TableCell><NoteStatusBadge status={n.status || 'draft'} /></TableCell>
                  <TableCell>
                    <NoteActionsMenu
                      note={n}
                      noteKind="debit"
                      onPreview={() => handlePreview(n)}
                      onDownloadPDF={() => { handlePreview(n); setTimeout(() => generatePDFFromPreview(n.note_number), 500); }}
                      onExportCSV={() => handleExportCSV(n)}
                      onEmail={() => handleEmail(n)}
                      onShareLink={() => handleShareLink(n)}
                      onConvert={() => handleConvert(n)}
                      onApplyAsPayment={() => {}}
                      onRefund={() => {}}
                      onChangeStatus={(status) => handleStatusChange(n, status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NoteFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        noteType="purchase"
        contacts={contacts}
        invoices={invoices}
        onSubmit={handleCreate}
        title="New Debit Note"
      />

      {printPreview && (
        <DocumentPrintPreview
          open={!!printPreview}
          onClose={() => setPrintPreview(null)}
          documentType="DEBIT NOTE"
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
    </div>
  );
};

export default DebitNotesPage;
