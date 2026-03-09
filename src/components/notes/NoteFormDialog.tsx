import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

export interface NoteLine {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
}

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteType: 'sales' | 'purchase';
  contacts: any[];
  invoices: any[];
  onSubmit: (form: {
    note_number: string;
    note_date: string;
    contact_id: string;
    invoice_id: string;
    reason: string;
    lines: NoteLine[];
  }) => void;
  title: string;
}

const NoteFormDialog = ({ open, onOpenChange, noteType, contacts, invoices, onSubmit, title }: NoteFormDialogProps) => {
  const { fmt } = useCurrency();
  const [form, setForm] = useState({
    note_number: '',
    note_date: new Date().toISOString().split('T')[0],
    contact_id: '',
    invoice_id: '',
    reason: '',
    lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }] as NoteLine[],
  });

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, value: any) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  const calcLine = (l: NoteLine) => {
    const gross = (+l.quantity || 0) * (+l.unit_price || 0);
    const discount = gross * (+l.discount_rate || 0) / 100;
    const sub = gross - discount;
    const tax = sub * (+l.tax_rate || 0) / 100;
    return { gross, discount, sub, tax, total: sub + tax };
  };

  const subtotal = form.lines.reduce((s, l) => s + calcLine(l).sub, 0);
  const discountTotal = form.lines.reduce((s, l) => s + calcLine(l).discount, 0);
  const taxTotal = form.lines.reduce((s, l) => s + calcLine(l).tax, 0);
  const grandTotal = subtotal + taxTotal;

  const filteredContacts = contacts.filter(c => noteType === 'sales' ? c.type === 'customer' : c.type === 'supplier');

  const handleSubmit = () => {
    onSubmit(form);
    setForm({
      note_number: '', note_date: new Date().toISOString().split('T')[0],
      contact_id: '', invoice_id: '', reason: '',
      lines: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Note No.</Label><Input value={form.note_number} onChange={e => setForm(f => ({ ...f, note_number: e.target.value }))} placeholder={noteType === 'sales' ? 'CN-001' : 'DN-001'} /></div>
            <div><Label>Date</Label><Input type="date" value={form.note_date} onChange={e => setForm(f => ({ ...f, note_date: e.target.value }))} /></div>
            <div>
              <Label>Contact</Label>
              <Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Against Invoice</Label>
              <Select value={form.invoice_id} onValueChange={v => setForm(f => ({ ...f, invoice_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{invoices.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Damaged goods, price adjustment, etc." /></div>
          </div>

          <div>
            <Label className="mb-2 block">Line Items</Label>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 mb-1 text-xs font-medium text-muted-foreground px-1">
              <span>Description</span><span>Qty</span><span>Price</span><span>Disc %</span><span>Tax %</span><span></span>
            </div>
            {form.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                <Input placeholder="Description" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                <Input type="number" placeholder="Qty" value={l.quantity || ''} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                <Input type="number" placeholder="Price" value={l.unit_price || ''} onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                <Input type="number" placeholder="Disc %" value={l.discount_rate || ''} onChange={e => updateLine(i, 'discount_rate', e.target.value)} />
                <Input type="number" placeholder="Tax %" value={l.tax_rate || ''} onChange={e => updateLine(i, 'tax_rate', e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeLine(i)} disabled={form.lines.length === 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
          </div>

          <div className="flex justify-between items-end pt-2 border-t border-border">
            <div className="text-sm space-y-0.5">
              <div className="flex gap-4">
                <span>Subtotal: <strong>{fmt(subtotal + discountTotal)}</strong></span>
                {discountTotal > 0 && <span className="text-destructive">Discount: <strong>-{fmt(discountTotal)}</strong></span>}
              </div>
              <div className="flex gap-4">
                <span>Tax: <strong>{fmt(taxTotal)}</strong></span>
                <span className="text-lg font-bold">Total: {fmt(grandTotal)}</span>
              </div>
            </div>
            <Button onClick={handleSubmit}>Create Note</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoteFormDialog;
