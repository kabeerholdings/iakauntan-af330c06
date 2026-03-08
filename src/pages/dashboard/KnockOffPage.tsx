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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const KnockOffPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [cashBookEntries, setCashBookEntries] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');
  const [knockOffDate, setKnockOffDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSources, setSelectedSources] = useState<Record<string, number>>({});
  const [selectedTargets, setSelectedTargets] = useState<Record<string, number>>({});

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [e, c, inv, cb] = await Promise.all([
      supabase.from('knock_off_entries').select('*, contacts(name), knock_off_lines(*)').eq('company_id', selectedCompany.id).order('knock_off_date', { ascending: false }),
      supabase.from('contacts').select('id, name, type').eq('company_id', selectedCompany.id).eq('is_active', true),
      supabase.from('invoices').select('*').eq('company_id', selectedCompany.id).in('status', ['draft', 'sent']),
      supabase.from('cash_book_entries').select('*').eq('company_id', selectedCompany.id).eq('status', 'active'),
    ]);
    setEntries(e.data || []);
    setContacts(c.data || []);
    setInvoices(inv.data || []);
    setCashBookEntries(cb.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const contactInvoices = invoices.filter(i => i.contact_id === selectedContact);
  const contactPayments = cashBookEntries.filter(cb => cb.contact_id === selectedContact && cb.voucher_type === 'receipt');

  const totalSourced = Object.values(selectedSources).reduce((s, v) => s + (v || 0), 0);
  const totalApplied = Object.values(selectedTargets).reduce((s, v) => s + (v || 0), 0);

  const handleCreate = async () => {
    if (!selectedCompany || !selectedContact) { toast.error('Select a contact'); return; }
    if (totalSourced <= 0 || totalApplied <= 0) { toast.error('Select amounts to apply'); return; }
    const { data, error } = await supabase.from('knock_off_entries').insert({
      company_id: selectedCompany.id, contact_id: selectedContact,
      knock_off_date: knockOffDate, total_applied: Math.min(totalSourced, totalApplied),
      created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      const lines: any[] = [];
      Object.entries(selectedTargets).forEach(([invoiceId, amount]) => {
        if (amount > 0) {
          const sourceId = Object.keys(selectedSources).find(k => selectedSources[k] > 0) || '';
          lines.push({
            knock_off_id: data.id, source_type: 'cash_book', source_id: sourceId,
            target_type: 'invoice', target_id: invoiceId, applied_amount: amount,
          });
        }
      });
      if (lines.length) await supabase.from('knock_off_lines').insert(lines);
    }
    toast.success('Knock Off applied');
    setOpen(false);
    setSelectedSources({});
    setSelectedTargets({});
    setSelectedContact('');
    fetchData();
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Knock Off Entry</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Knock Off</Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Applied Amount</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No knock off entries yet</TableCell></TableRow>
              ) : entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.knock_off_date}</TableCell>
                  <TableCell>{e.contacts?.name || '—'}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(+e.total_applied)}</TableCell>
                  <TableCell>{e.knock_off_lines?.length || 0}</TableCell>
                  <TableCell><Badge variant={e.status === 'active' ? 'default' : 'secondary'}>{e.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">New Knock Off Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Debtor / Creditor</Label>
                <Select value={selectedContact} onValueChange={v => { setSelectedContact(v); setSelectedSources({}); setSelectedTargets({}); }}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={knockOffDate} onChange={e => setKnockOffDate(e.target.value)} /></div>
            </div>

            {selectedContact && (
              <>
                <div>
                  <Label className="mb-2 block">Payment Sources (Receipts / Credit Notes)</Label>
                  {contactPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No unapplied payments for this contact</p>
                  ) : contactPayments.map(cb => (
                    <div key={cb.id} className="flex items-center gap-3 py-2 border-b border-border">
                      <Checkbox checked={!!selectedSources[cb.id]} onCheckedChange={checked => setSelectedSources(s => ({ ...s, [cb.id]: checked ? +cb.total_amount : 0 }))} />
                      <span className="text-sm flex-1">{cb.voucher_no || 'Receipt'} — {cb.voucher_date}</span>
                      <Input type="number" className="w-32" value={selectedSources[cb.id] || ''} onChange={e => setSelectedSources(s => ({ ...s, [cb.id]: +e.target.value }))} max={+cb.total_amount} />
                      <span className="text-sm text-muted-foreground">/ {fmt(+cb.total_amount)}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="mb-2 block">Apply Against Invoices</Label>
                  {contactInvoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No outstanding invoices for this contact</p>
                  ) : contactInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-border">
                      <Checkbox checked={!!selectedTargets[inv.id]} onCheckedChange={checked => setSelectedTargets(s => ({ ...s, [inv.id]: checked ? +inv.total_amount : 0 }))} />
                      <span className="text-sm flex-1">{inv.invoice_number} — {inv.invoice_date}</span>
                      <Input type="number" className="w-32" value={selectedTargets[inv.id] || ''} onChange={e => setSelectedTargets(s => ({ ...s, [inv.id]: +e.target.value }))} max={+inv.total_amount} />
                      <span className="text-sm text-muted-foreground">/ RM {(+inv.total_amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div className="text-sm space-x-4">
                <span>Source: <strong>RM {totalSourced.toFixed(2)}</strong></span>
                <span>Applied: <strong>RM {totalApplied.toFixed(2)}</strong></span>
              </div>
              <Button onClick={handleCreate} disabled={totalApplied <= 0}>Apply Knock Off</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnockOffPage;
