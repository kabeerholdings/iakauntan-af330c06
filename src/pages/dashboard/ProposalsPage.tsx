import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, FileText, Send, Eye, MoreHorizontal, ArrowRightLeft, Link2, Mail, CheckCircle, XCircle, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  sent: { variant: 'outline', label: 'Sent' },
  viewed: { variant: 'outline', label: 'Viewed' },
  accepted: { variant: 'default', label: 'Accepted' },
  declined: { variant: 'destructive', label: 'Declined' },
  converted: { variant: 'default', label: 'Converted' },
  expired: { variant: 'destructive', label: 'Expired' },
};

const ProposalsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const [proposals, setProposals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailProposal, setDetailProposal] = useState<any | null>(null);

  const [form, setForm] = useState({
    proposal_number: '', title: '', proposal_date: new Date().toISOString().split('T')[0],
    expiry_date: '', contact_id: '', description: '', cover_letter: '',
    terms_and_conditions: '', notes: '',
    discount_type: 'percentage', discount_value: 0,
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [p, c] = await Promise.all([
      supabase.from('proposals').select('*, contacts(name, email), proposal_lines(*)').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, name, type, email').eq('company_id', selectedCompany.id).eq('is_active', true),
    ]);
    setProposals(p.data || []);
    setContacts(c.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const calcLine = (l: any) => {
    const gross = (+l.quantity || 0) * (+l.unit_price || 0);
    const disc = gross * (+l.discount_rate || 0) / 100;
    const sub = gross - disc;
    const tax = sub * (+l.tax_rate || 0) / 100;
    return { sub, tax, total: sub + tax };
  };

  const linesSubtotal = form.lines.reduce((s, l) => s + calcLine(l).sub, 0);
  const linesTax = form.lines.reduce((s, l) => s + calcLine(l).tax, 0);
  const discountAmount = form.discount_type === 'percentage'
    ? linesSubtotal * (+form.discount_value || 0) / 100
    : +form.discount_value || 0;
  const grandTotal = linesSubtotal - discountAmount + linesTax;

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }] }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const handleCreate = async () => {
    if (!selectedCompany || !form.proposal_number) { toast.error('Proposal number required'); return; }
    const validLines = form.lines.filter(l => l.description);

    const { data, error } = await supabase.from('proposals').insert({
      company_id: selectedCompany.id, proposal_number: form.proposal_number,
      title: form.title || null, proposal_date: form.proposal_date,
      expiry_date: form.expiry_date || null, contact_id: form.contact_id || null,
      description: form.description || null, cover_letter: form.cover_letter || null,
      terms_and_conditions: form.terms_and_conditions || null, notes: form.notes || null,
      subtotal: linesSubtotal, discount_type: form.discount_type,
      discount_value: +form.discount_value || 0, discount_amount: discountAmount,
      tax_amount: linesTax, total_amount: grandTotal, created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    if (data && validLines.length > 0) {
      await supabase.from('proposal_lines').insert(
        validLines.map((l, i) => ({
          proposal_id: data.id, description: l.description,
          quantity: +l.quantity || 1, unit_price: +l.unit_price || 0,
          tax_rate: +l.tax_rate || 0, tax_amount: calcLine(l).tax,
          discount_rate: +l.discount_rate || 0, line_total: calcLine(l).total,
          sort_order: i,
        }))
      );
    }
    toast.success('Proposal created');
    setCreateOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => setForm({
    proposal_number: '', title: '', proposal_date: new Date().toISOString().split('T')[0],
    expiry_date: '', contact_id: '', description: '', cover_letter: '',
    terms_and_conditions: '', notes: '', discount_type: 'percentage', discount_value: 0,
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }],
  });

  const handleStatusChange = async (p: any, status: string) => {
    const updates: any = { status };
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    if (status === 'accepted') updates.accepted_at = new Date().toISOString();
    if (status === 'declined') updates.declined_at = new Date().toISOString();
    const { error } = await supabase.from('proposals').update(updates).eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Proposal marked as ${status}`);
    fetchData();
  };

  const handleEmail = (p: any) => {
    const email = p.contacts?.email;
    if (!email) { toast.error('No email for this contact'); return; }
    const subject = encodeURIComponent(`Proposal ${p.proposal_number}: ${p.title || ''}`);
    const link = `${window.location.origin}/public/proposal/${p.public_token}`;
    const body = encodeURIComponent(
      `Dear ${p.contacts?.name},\n\n${p.cover_letter || `Please review our proposal ${p.proposal_number}.`}\n\nView proposal: ${link}\n\nTotal: ${fmt(+p.total_amount)}\n\nRegards,\n${selectedCompany?.name}`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    handleStatusChange(p, 'sent');
  };

  const handleShareLink = (p: any) => {
    const link = `${window.location.origin}/public/proposal/${p.public_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Public proposal link copied');
  };

  const handleConvertToInvoice = async (p: any) => {
    if (!selectedCompany) return;
    const { data: lines } = await supabase.from('proposal_lines').select('*').eq('proposal_id', p.id);

    const { data: inv, error } = await supabase.from('invoices').insert([{
      company_id: selectedCompany.id, invoice_type: 'invoice',
      invoice_number: `INV-${p.proposal_number}`,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      contact_id: p.contact_id, subtotal: p.subtotal,
      tax_amount: p.tax_amount, total_amount: p.total_amount,
      notes: `Converted from Proposal ${p.proposal_number}`,
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
    await supabase.from('proposals').update({ status: 'converted', converted_to_invoice_id: inv?.id }).eq('id', p.id);
    toast.success(`Converted to Invoice ${inv?.invoice_number}`);
    fetchData();
  };

  const handleDuplicate = async (p: any) => {
    const { data: lines } = await supabase.from('proposal_lines').select('*').eq('proposal_id', p.id);
    const { data: dup, error } = await supabase.from('proposals').insert({
      company_id: selectedCompany!.id, proposal_number: `${p.proposal_number}-COPY`,
      title: p.title, proposal_date: new Date().toISOString().split('T')[0],
      expiry_date: null, contact_id: p.contact_id,
      description: p.description, cover_letter: p.cover_letter,
      terms_and_conditions: p.terms_and_conditions, notes: p.notes,
      subtotal: p.subtotal, discount_type: p.discount_type,
      discount_value: p.discount_value, discount_amount: p.discount_amount,
      tax_amount: p.tax_amount, total_amount: p.total_amount,
      created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    if (dup && lines) {
      await supabase.from('proposal_lines').insert(
        lines.map((l: any) => ({ proposal_id: dup.id, description: l.description, quantity: l.quantity, unit_price: l.unit_price, tax_rate: l.tax_rate, tax_amount: l.tax_amount, discount_rate: l.discount_rate, line_total: l.line_total, sort_order: l.sort_order }))
      );
    }
    toast.success('Proposal duplicated');
    fetchData();
  };

  const openDetail = async (p: any) => {
    const { data: lines } = await supabase.from('proposal_lines').select('*').eq('proposal_id', p.id).order('sort_order');
    setDetailProposal({ ...p, lines: lines || [] });
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const byStatus = (s: string) => proposals.filter(p => p.status === s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Proposals</h1>
            <p className="text-sm text-muted-foreground">Create, send, and track sales proposals. Convert accepted proposals to invoices.</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Proposal</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total', count: proposals.length, amount: proposals.reduce((s, p) => s + (+p.total_amount || 0), 0) },
          { label: 'Draft', count: byStatus('draft').length, amount: byStatus('draft').reduce((s, p) => s + (+p.total_amount || 0), 0) },
          { label: 'Sent', count: byStatus('sent').length + byStatus('viewed').length, amount: [...byStatus('sent'), ...byStatus('viewed')].reduce((s, p) => s + (+p.total_amount || 0), 0) },
          { label: 'Accepted', count: byStatus('accepted').length, amount: byStatus('accepted').reduce((s, p) => s + (+p.total_amount || 0), 0) },
          { label: 'Converted', count: byStatus('converted').length, amount: byStatus('converted').reduce((s, p) => s + (+p.total_amount || 0), 0) },
        ].map((c, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold font-display">{fmt(c.amount)}</p>
              <p className="text-xs text-muted-foreground">{c.count} proposals</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Tabs defaultValue="all">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="all">All ({proposals.length})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({byStatus('draft').length})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({byStatus('sent').length + byStatus('viewed').length})</TabsTrigger>
                <TabsTrigger value="accepted">Accepted ({byStatus('accepted').length})</TabsTrigger>
              </TabsList>
            </div>
            {['all', 'draft', 'sent', 'accepted'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>No.</TableHead><TableHead>Title</TableHead>
                      <TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead>
                      <TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filtered = tab === 'all' ? proposals
                        : tab === 'sent' ? proposals.filter(p => ['sent', 'viewed'].includes(p.status))
                        : proposals.filter(p => p.status === tab);
                      return filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No proposals</TableCell></TableRow>
                      ) : filtered.map(p => {
                        const cfg = statusConfig[p.status] || statusConfig.draft;
                        return (
                          <TableRow key={p.id}>
                            <TableCell>{p.proposal_date}</TableCell>
                            <TableCell className="font-mono font-medium">{p.proposal_number}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{p.title || '—'}</TableCell>
                            <TableCell>{p.contacts?.name || '—'}</TableCell>
                            <TableCell className="text-right font-medium">{fmt(+p.total_amount)}</TableCell>
                            <TableCell className="text-muted-foreground">{p.expiry_date || '—'}</TableCell>
                            <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem onClick={() => openDetail(p)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEmail(p)}><Mail className="h-4 w-4 mr-2" />Send to Customer</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleShareLink(p)}><Link2 className="h-4 w-4 mr-2" />Copy Public Link</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicate(p)}><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {p.status === 'draft' && <DropdownMenuItem onClick={() => handleStatusChange(p, 'sent')}><Send className="h-4 w-4 mr-2" />Mark as Sent</DropdownMenuItem>}
                                  {['sent', 'viewed'].includes(p.status) && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleStatusChange(p, 'accepted')}><CheckCircle className="h-4 w-4 mr-2" />Mark Accepted</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(p, 'declined')} className="text-destructive"><XCircle className="h-4 w-4 mr-2" />Mark Declined</DropdownMenuItem>
                                    </>
                                  )}
                                  {p.status === 'accepted' && !p.converted_to_invoice_id && (
                                    <DropdownMenuItem onClick={() => handleConvertToInvoice(p)}><ArrowRightLeft className="h-4 w-4 mr-2" />Convert to Invoice</DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">New Proposal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Proposal No.</Label><Input value={form.proposal_number} onChange={e => setForm(f => ({ ...f, proposal_number: e.target.value }))} placeholder="PROP-001" /></div>
              <div><Label>Date</Label><Input type="date" value={form.proposal_date} onChange={e => setForm(f => ({ ...f, proposal_date: e.target.value }))} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer</Label>
                <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{contacts.filter(c => c.type === 'customer').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Website Redesign Proposal" /></div>
            </div>

            <div><Label>Cover Letter</Label><Textarea value={form.cover_letter} onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))} placeholder="Dear Customer, we are pleased to present..." rows={3} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Scope of work, deliverables, timeline..." rows={3} /></div>

            <div>
              <Label className="mb-2 block">Line Items</Label>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 mb-1 text-xs font-medium text-muted-foreground px-1">
                <span>Description</span><span>Qty</span><span>Price</span><span>Disc %</span><span>Tax %</span><span></span>
              </div>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input placeholder="Item / service" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  <Input type="number" value={l.quantity || ''} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                  <Input type="number" value={l.unit_price || ''} onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                  <Input type="number" value={l.discount_rate || ''} onChange={e => updateLine(i, 'discount_rate', e.target.value)} />
                  <Input type="number" value={l.tax_rate || ''} onChange={e => updateLine(i, 'tax_rate', e.target.value)} />
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeLine(i)} disabled={form.lines.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Overall Discount</Label>
                <div className="flex gap-2">
                  <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" value={form.discount_value || ''} onChange={e => setForm(f => ({ ...f, discount_value: +e.target.value }))} />
                </div>
              </div>
              <div><Label>Terms & Conditions</Label><Textarea value={form.terms_and_conditions} onChange={e => setForm(f => ({ ...f, terms_and_conditions: e.target.value }))} rows={2} placeholder="Payment terms, validity period..." /></div>
            </div>

            <div className="flex justify-between items-end pt-2 border-t border-border">
              <div className="text-sm space-y-0.5">
                <div>Subtotal: <strong>{fmt(linesSubtotal)}</strong></div>
                {discountAmount > 0 && <div className="text-destructive">Discount: <strong>-{fmt(discountAmount)}</strong></div>}
                <div>Tax: <strong>{fmt(linesTax)}</strong></div>
                <div className="text-lg font-bold">Total: {fmt(grandTotal)}</div>
              </div>
              <Button onClick={handleCreate}>Create Proposal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailProposal} onOpenChange={() => setDetailProposal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Proposal {detailProposal?.proposal_number}</DialogTitle></DialogHeader>
          {detailProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span><br /><strong>{detailProposal.contacts?.name || '—'}</strong></div>
                <div><span className="text-muted-foreground">Date:</span><br /><strong>{detailProposal.proposal_date}</strong></div>
                <div><span className="text-muted-foreground">Status:</span><br /><Badge variant={statusConfig[detailProposal.status]?.variant || 'secondary'}>{statusConfig[detailProposal.status]?.label || detailProposal.status}</Badge></div>
              </div>

              {detailProposal.title && <h3 className="text-lg font-semibold">{detailProposal.title}</h3>}
              {detailProposal.cover_letter && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailProposal.cover_letter}</p>}
              {detailProposal.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailProposal.description}</p>}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailProposal.lines || []).map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.description}</TableCell>
                      <TableCell className="text-right">{l.quantity}</TableCell>
                      <TableCell className="text-right">{fmt(+l.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(+l.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="space-y-1 text-sm text-right">
                <div>Subtotal: <strong>{fmt(+detailProposal.subtotal)}</strong></div>
                {+detailProposal.discount_amount > 0 && <div className="text-destructive">Discount: <strong>-{fmt(+detailProposal.discount_amount)}</strong></div>}
                <div>Tax: <strong>{fmt(+detailProposal.tax_amount)}</strong></div>
                <div className="text-lg font-bold border-t border-border pt-1">Total: {fmt(+detailProposal.total_amount)}</div>
              </div>

              {detailProposal.terms_and_conditions && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  <p className="font-semibold text-foreground mb-1">Terms & Conditions</p>
                  <p className="whitespace-pre-wrap">{detailProposal.terms_and_conditions}</p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                {detailProposal.sent_at && <div>Sent: {new Date(detailProposal.sent_at).toLocaleDateString()}</div>}
                {detailProposal.viewed_at && <div>Viewed: {new Date(detailProposal.viewed_at).toLocaleDateString()}</div>}
                {detailProposal.accepted_at && <div>Accepted: {new Date(detailProposal.accepted_at).toLocaleDateString()}</div>}
                {detailProposal.declined_at && <div>Declined: {new Date(detailProposal.declined_at).toLocaleDateString()}</div>}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => { setDetailProposal(null); handleEmail(detailProposal); }}><Mail className="h-3 w-3 mr-1" />Email</Button>
                <Button size="sm" variant="outline" onClick={() => handleShareLink(detailProposal)}><Link2 className="h-3 w-3 mr-1" />Share Link</Button>
                {detailProposal.status === 'accepted' && !detailProposal.converted_to_invoice_id && (
                  <Button size="sm" onClick={() => { setDetailProposal(null); handleConvertToInvoice(detailProposal); }}><ArrowRightLeft className="h-3 w-3 mr-1" />Convert to Invoice</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProposalsPage;
