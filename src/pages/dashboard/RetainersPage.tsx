import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, FileText, Wallet, ArrowRight, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary', sent: 'outline', active: 'default', fully_applied: 'default',
  expired: 'destructive', void: 'destructive',
};

const RetainersPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const [retainers, setRetainers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRetainer, setDetailRetainer] = useState<any | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<any | null>(null);
  const [applyDialog, setApplyDialog] = useState<any | null>(null);

  const [form, setForm] = useState({
    retainer_number: '', retainer_date: new Date().toISOString().split('T')[0],
    expiry_date: '', contact_id: '', description: '', notes: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }],
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [r, c, inv] = await Promise.all([
      supabase.from('retainers').select('*, contacts(name, email), retainer_payments(*), retainer_applications(*, invoices(invoice_number))').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, name, type, email').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('invoices').select('id, invoice_number, contact_id, total_amount, amount_paid').eq('company_id', selectedCompany.id),
    ]);
    setRetainers(r.data || []);
    setContacts(c.data || []);
    setInvoices(inv.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  // Line calculations
  const calcLine = (l: any) => {
    const gross = (+l.quantity || 0) * (+l.unit_price || 0);
    const disc = gross * (+l.discount_rate || 0) / 100;
    const sub = gross - disc;
    const tax = sub * (+l.tax_rate || 0) / 100;
    return { sub, tax, total: sub + tax };
  };
  const subtotal = form.lines.reduce((s, l) => s + calcLine(l).sub, 0);
  const taxTotal = form.lines.reduce((s, l) => s + calcLine(l).tax, 0);
  const grandTotal = subtotal + taxTotal;

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }] }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  // Create retainer
  const handleCreate = async () => {
    if (!selectedCompany || !form.retainer_number) { toast.error('Retainer number required'); return; }
    const validLines = form.lines.filter(l => l.description);

    const { data, error } = await supabase.from('retainers').insert({
      company_id: selectedCompany.id, retainer_number: form.retainer_number,
      retainer_date: form.retainer_date, expiry_date: form.expiry_date || null,
      contact_id: form.contact_id || null, description: form.description || null,
      notes: form.notes || null, subtotal, tax_amount: taxTotal, total_amount: grandTotal,
      created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    if (data && validLines.length > 0) {
      await supabase.from('retainer_lines').insert(
        validLines.map(l => ({
          retainer_id: data.id, description: l.description,
          quantity: +l.quantity || 1, unit_price: +l.unit_price || 0,
          tax_rate: +l.tax_rate || 0, tax_amount: calcLine(l).tax,
          discount_rate: +l.discount_rate || 0, line_total: calcLine(l).total,
        }))
      );
    }
    toast.success('Retainer created');
    setCreateOpen(false);
    setForm({ retainer_number: '', retainer_date: new Date().toISOString().split('T')[0], expiry_date: '', contact_id: '', description: '', notes: '', lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }] });
    fetchData();
  };

  // Record advance payment
  const handleRecordPayment = async () => {
    if (!paymentDialog) return;
    const { retainer, amount, method, reference } = paymentDialog;
    if (!amount || +amount <= 0) { toast.error('Enter a valid amount'); return; }

    const { error } = await supabase.from('retainer_payments').insert({
      retainer_id: retainer.id, amount: +amount, payment_method: method,
      reference: reference || null, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }

    // Update collected amount
    const newCollected = (+retainer.amount_collected || 0) + +amount;
    await supabase.from('retainers').update({
      amount_collected: newCollected,
      status: newCollected >= +retainer.total_amount ? 'active' : retainer.status === 'draft' ? 'active' : retainer.status,
    }).eq('id', retainer.id);

    toast.success('Payment recorded');
    setPaymentDialog(null);
    fetchData();
  };

  // Apply retainer to invoice
  const handleApplyToInvoice = async () => {
    if (!applyDialog) return;
    const { retainer, invoiceId, amount } = applyDialog;
    if (!invoiceId || !amount || +amount <= 0) { toast.error('Select invoice and enter amount'); return; }
    const balance = (+retainer.amount_collected || 0) - (+retainer.amount_applied || 0);
    if (+amount > balance) { toast.error('Amount exceeds available balance'); return; }

    const { error } = await supabase.from('retainer_applications').insert({
      retainer_id: retainer.id, invoice_id: invoiceId,
      amount: +amount, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }

    const newApplied = (+retainer.amount_applied || 0) + +amount;
    const newStatus = newApplied >= +retainer.amount_collected ? 'fully_applied' : retainer.status;
    await supabase.from('retainers').update({ amount_applied: newApplied, status: newStatus }).eq('id', retainer.id);

    toast.success('Retainer applied to invoice');
    setApplyDialog(null);
    fetchData();
  };

  // View detail
  const openDetail = async (r: any) => {
    const { data: lines } = await supabase.from('retainer_lines').select('*').eq('retainer_id', r.id);
    setDetailRetainer({ ...r, lines: lines || [] });
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const totalCollected = retainers.reduce((s, r) => s + (+r.amount_collected || 0), 0);
  const totalApplied = retainers.reduce((s, r) => s + (+r.amount_applied || 0), 0);
  const totalBalance = totalCollected - totalApplied;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Retainers</h1>
            <p className="text-sm text-muted-foreground">Collect advance payments and apply them to invoices</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Retainer</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Retainers', value: fmt(retainers.reduce((s, r) => s + (+r.total_amount || 0), 0)), sub: `${retainers.length} contracts` },
          { label: 'Collected', value: fmt(totalCollected), sub: 'Advance payments received' },
          { label: 'Applied', value: fmt(totalApplied), sub: 'Applied to invoices' },
          { label: 'Available Balance', value: fmt(totalBalance), sub: 'Ready to apply' },
        ].map((c, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold font-display">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Retainers Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Contract</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retainers.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No retainers yet. Create one to start collecting advance payments.</TableCell></TableRow>
              ) : retainers.map(r => {
                const balance = (+r.amount_collected || 0) - (+r.amount_applied || 0);
                const utilPct = +r.amount_collected > 0 ? Math.round((+r.amount_applied / +r.amount_collected) * 100) : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.retainer_date}</TableCell>
                    <TableCell className="font-mono font-medium">{r.retainer_number}</TableCell>
                    <TableCell>{r.contacts?.name || '—'}</TableCell>
                    <TableCell className="text-right">{fmt(+r.total_amount)}</TableCell>
                    <TableCell className="text-right">{fmt(+r.amount_collected)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={utilPct} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{utilPct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[r.status] || 'secondary'}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(r)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="sm" onClick={() => setPaymentDialog({ retainer: r, amount: '', method: 'bank_transfer', reference: '' })}>
                          <Plus className="h-3 w-3 mr-1" />Pay
                        </Button>
                        {balance > 0 && (
                          <Button variant="outline" size="sm" onClick={() => setApplyDialog({ retainer: r, invoiceId: '', amount: '' })}>
                            <ArrowRight className="h-3 w-3 mr-1" />Apply
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Retainer Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">New Retainer Contract</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Retainer No.</Label><Input value={form.retainer_number} onChange={e => setForm(f => ({ ...f, retainer_number: e.target.value }))} placeholder="RET-001" /></div>
              <div><Label>Date</Label><Input type="date" value={form.retainer_date} onChange={e => setForm(f => ({ ...f, retainer_date: e.target.value }))} /></div>
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
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Retainer for consulting services" /></div>
            </div>

            <div>
              <Label className="mb-2 block">Service / Product Details</Label>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 mb-1 text-xs font-medium text-muted-foreground px-1">
                <span>Description</span><span>Qty</span><span>Price</span><span>Disc %</span><span>Tax %</span><span></span>
              </div>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input placeholder="Service description" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  <Input type="number" value={l.quantity || ''} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                  <Input type="number" value={l.unit_price || ''} onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                  <Input type="number" value={l.discount_rate || ''} onChange={e => updateLine(i, 'discount_rate', e.target.value)} />
                  <Input type="number" value={l.tax_rate || ''} onChange={e => updateLine(i, 'tax_rate', e.target.value)} />
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeLine(i)} disabled={form.lines.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>

            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Terms, conditions, etc." /></div>

            <div className="flex justify-between items-end pt-2 border-t border-border">
              <div className="text-sm space-y-0.5">
                <span>Subtotal: <strong>{fmt(subtotal)}</strong></span>
                <span className="ml-4">Tax: <strong>{fmt(taxTotal)}</strong></span>
                <span className="ml-4 text-lg font-bold">Total: {fmt(grandTotal)}</span>
              </div>
              <Button onClick={handleCreate}>Create Retainer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Advance Payment</DialogTitle>
            <DialogDescription>
              {paymentDialog?.retainer?.retainer_number} — Contract: {fmt(+(paymentDialog?.retainer?.total_amount || 0))} | Collected: {fmt(+(paymentDialog?.retainer?.amount_collected || 0))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Amount</Label><Input type="number" value={paymentDialog?.amount || ''} onChange={e => setPaymentDialog((p: any) => p ? { ...p, amount: e.target.value } : null)} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentDialog?.method || 'bank_transfer'} onValueChange={v => setPaymentDialog((p: any) => p ? { ...p, method: v } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={paymentDialog?.reference || ''} onChange={e => setPaymentDialog((p: any) => p ? { ...p, reference: e.target.value } : null)} placeholder="Receipt no., transaction ID" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply to Invoice Dialog */}
      <Dialog open={!!applyDialog} onOpenChange={() => setApplyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Retainer to Invoice</DialogTitle>
            <DialogDescription>
              Available balance: {fmt((+(applyDialog?.retainer?.amount_collected || 0)) - (+(applyDialog?.retainer?.amount_applied || 0)))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Invoice</Label>
              <Select value={applyDialog?.invoiceId || ''} onValueChange={v => setApplyDialog((p: any) => p ? { ...p, invoiceId: v } : null)}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices
                    .filter(inv => applyDialog?.retainer?.contact_id ? inv.contact_id === applyDialog.retainer.contact_id : true)
                    .map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number} — {fmt(+inv.total_amount)}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount to Apply</Label><Input type="number" value={applyDialog?.amount || ''} onChange={e => setApplyDialog((p: any) => p ? { ...p, amount: e.target.value } : null)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialog(null)}>Cancel</Button>
            <Button onClick={handleApplyToInvoice}>Apply to Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailRetainer} onOpenChange={() => setDetailRetainer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Retainer {detailRetainer?.retainer_number}</DialogTitle></DialogHeader>
          {detailRetainer && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <strong>{detailRetainer.contacts?.name || '—'}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> <strong>{detailRetainer.retainer_date}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColors[detailRetainer.status] || 'secondary'}>{detailRetainer.status}</Badge></div>
              </div>

              {detailRetainer.description && <p className="text-sm text-muted-foreground">{detailRetainer.description}</p>}

              {/* Contract Lines */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Contract Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailRetainer.lines || []).map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.description}</TableCell>
                        <TableCell className="text-right">{l.quantity}</TableCell>
                        <TableCell className="text-right">{fmt(+l.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(+l.line_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div><span className="text-muted-foreground">Contract:</span><br /><strong>{fmt(+detailRetainer.total_amount)}</strong></div>
                <div><span className="text-muted-foreground">Collected:</span><br /><strong className="text-green-600">{fmt(+detailRetainer.amount_collected)}</strong></div>
                <div><span className="text-muted-foreground">Applied:</span><br /><strong>{fmt(+detailRetainer.amount_applied)}</strong></div>
                <div><span className="text-muted-foreground">Balance:</span><br /><strong className="text-primary">{fmt(+detailRetainer.balance)}</strong></div>
              </div>

              {/* Utilization Progress */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Utilization</span>
                  <span>{+detailRetainer.amount_collected > 0 ? Math.round((+detailRetainer.amount_applied / +detailRetainer.amount_collected) * 100) : 0}%</span>
                </div>
                <Progress value={+detailRetainer.amount_collected > 0 ? (+detailRetainer.amount_applied / +detailRetainer.amount_collected) * 100 : 0} className="h-3" />
              </div>

              {/* Payment History */}
              <Tabs defaultValue="payments">
                <TabsList>
                  <TabsTrigger value="payments">Payments ({detailRetainer.retainer_payments?.length || 0})</TabsTrigger>
                  <TabsTrigger value="applications">Applications ({detailRetainer.retainer_applications?.length || 0})</TabsTrigger>
                </TabsList>
                <TabsContent value="payments">
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(detailRetainer.retainer_payments || []).length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No payments recorded</TableCell></TableRow>
                      ) : (detailRetainer.retainer_payments || []).map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.payment_date}</TableCell>
                          <TableCell><Badge variant="outline">{p.payment_method}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{p.reference || '—'}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{fmt(+p.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="applications">
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(detailRetainer.retainer_applications || []).length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No applications yet</TableCell></TableRow>
                      ) : (detailRetainer.retainer_applications || []).map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.applied_date}</TableCell>
                          <TableCell className="font-mono">{a.invoices?.invoice_number || a.invoice_id}</TableCell>
                          <TableCell className="text-muted-foreground">{a.notes || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(+a.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" onClick={() => { setDetailRetainer(null); setPaymentDialog({ retainer: detailRetainer, amount: '', method: 'bank_transfer', reference: '' }); }}>
                  <Plus className="h-3 w-3 mr-1" />Record Payment
                </Button>
                {+detailRetainer.balance > 0 && (
                  <Button size="sm" variant="outline" onClick={() => { setDetailRetainer(null); setApplyDialog({ retainer: detailRetainer, invoiceId: '', amount: '' }); }}>
                    <ArrowRight className="h-3 w-3 mr-1" />Apply to Invoice
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetainersPage;
