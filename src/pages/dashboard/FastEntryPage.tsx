import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Upload, ClipboardPaste } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect } from 'react';

type FastEntryRow = {
  id: string;
  date: string;
  doc_number: string;
  contact: string;
  description: string;
  amount: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
};

const emptyRow = (): FastEntryRow => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().split('T')[0],
  doc_number: '',
  contact: '',
  description: '',
  amount: '',
  tax_rate: '0',
  tax_amount: '0.00',
  total: '0.00',
});

const FastEntryPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [entryType, setEntryType] = useState<'sales_invoice' | 'purchase_invoice' | 'payment' | 'receipt'>('sales_invoice');
  const [rows, setRows] = useState<FastEntryRow[]>(() => Array.from({ length: 5 }, emptyRow));
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedCompany) return;
    supabase.from('contacts').select('id, name').eq('company_id', selectedCompany.id).eq('is_active', true).order('name')
      .then(({ data }) => setContacts(data || []));
  }, [selectedCompany]);

  const recalcRow = (row: FastEntryRow): FastEntryRow => {
    const amt = parseFloat(row.amount) || 0;
    const rate = parseFloat(row.tax_rate) || 0;
    const tax = amt * rate / 100;
    return { ...row, tax_amount: tax.toFixed(2), total: (amt + tax).toFixed(2) };
  };

  const updateRow = (id: string, field: keyof FastEntryRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (['amount', 'tax_rate'].includes(field)) return recalcRow(updated);
      return updated;
    }));
  };

  const addRows = (count: number = 5) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, emptyRow)]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.length <= 1 ? prev : prev.filter(r => r.id !== id));
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();

    const pastedRows = text.trim().split('\n').map(line => {
      const cols = line.split('\t');
      const row = emptyRow();
      // Map columns: Date | Doc No | Contact | Description | Amount | Tax Rate
      if (cols[0]) row.date = cols[0].trim();
      if (cols[1]) row.doc_number = cols[1].trim();
      if (cols[2]) row.contact = cols[2].trim();
      if (cols[3]) row.description = cols[3].trim();
      if (cols[4]) row.amount = cols[4].trim().replace(/[^0-9.]/g, '');
      if (cols[5]) row.tax_rate = cols[5].trim().replace(/[^0-9.]/g, '');
      return recalcRow(row);
    });

    setRows(prev => {
      const nonEmpty = prev.filter(r => r.doc_number || r.description || r.amount);
      return [...nonEmpty, ...pastedRows];
    });
    toast.success(`Pasted ${pastedRows.length} rows from clipboard`);
  }, []);

  const saveAll = async () => {
    if (!selectedCompany || !user) return;
    const validRows = rows.filter(r => r.amount && parseFloat(r.amount) > 0);
    if (validRows.length === 0) { toast.error('No valid rows to save'); return; }

    setSaving(true);
    try {
      if (entryType === 'sales_invoice') {
        for (const row of validRows) {
          const contactMatch = contacts.find(c => c.name.toLowerCase() === row.contact.toLowerCase());
          const { data: inv, error } = await supabase.from('invoices').insert({
            company_id: selectedCompany.id,
            invoice_number: row.doc_number || `INV-${Date.now()}`,
            invoice_type: 'standard',
            invoice_date: row.date,
            contact_id: contactMatch?.id || null,
            subtotal: parseFloat(row.amount) || 0,
            tax_amount: parseFloat(row.tax_amount) || 0,
            total_amount: parseFloat(row.total) || 0,
            notes: row.description,
            status: 'draft',
          }).select('id').single();

          if (error) throw error;
          if (inv) {
            await supabase.from('invoice_lines').insert({
              invoice_id: inv.id,
              description: row.description || 'Fast Entry Item',
              quantity: 1,
              unit_price: parseFloat(row.amount) || 0,
              tax_rate: parseFloat(row.tax_rate) || 0,
              tax_amount: parseFloat(row.tax_amount) || 0,
              line_total: parseFloat(row.total) || 0,
            });
          }
        }
      } else if (entryType === 'purchase_invoice') {
        for (const row of validRows) {
          const contactMatch = contacts.find(c => c.name.toLowerCase() === row.contact.toLowerCase());
          await supabase.from('purchase_documents').insert({
            company_id: selectedCompany.id,
            doc_number: row.doc_number || `PI-${Date.now()}`,
            doc_type: 'invoice',
            doc_date: row.date,
            contact_id: contactMatch?.id || null,
            subtotal: parseFloat(row.amount) || 0,
            tax_amount: parseFloat(row.tax_amount) || 0,
            total_amount: parseFloat(row.total) || 0,
            notes: row.description,
            status: 'draft',
            created_by: user.id,
          });
        }
      } else if (entryType === 'payment' || entryType === 'receipt') {
        for (const row of validRows) {
          const contactMatch = contacts.find(c => c.name.toLowerCase() === row.contact.toLowerCase());
          await supabase.from('payments').insert({
            company_id: selectedCompany.id,
            payment_type: entryType,
            payment_date: row.date,
            reference: row.doc_number,
            contact_id: contactMatch?.id || null,
            amount: parseFloat(row.total) || 0,
            notes: row.description,
            status: 'draft',
            created_by: user.id,
          });
        }
      }

      toast.success(`${validRows.length} entries saved successfully`);
      setRows(Array.from({ length: 5 }, emptyRow));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save entries');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Fast Entry</h1>
          <p className="text-sm text-muted-foreground">Bulk entry grid — paste from Excel or enter manually</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={entryType} onValueChange={(v: any) => setEntryType(v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sales_invoice">Sales Invoice</SelectItem>
              <SelectItem value="purchase_invoice">Purchase Invoice</SelectItem>
              <SelectItem value="receipt">Customer Receipt</SelectItem>
              <SelectItem value="payment">Supplier Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Entry Grid</CardTitle>
              <CardDescription>Copy rows from Excel (columns: Date, Doc No, Contact, Description, Amount, Tax%) and paste below</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addRows(5)}>
                <Plus className="h-4 w-4 mr-1" /> Add 5 Rows
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={gridRef} onPaste={handlePaste} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-2 text-left font-medium text-muted-foreground w-[120px]">Date</th>
                  <th className="p-2 text-left font-medium text-muted-foreground w-[120px]">Doc No</th>
                  <th className="p-2 text-left font-medium text-muted-foreground w-[160px]">Contact</th>
                  <th className="p-2 text-left font-medium text-muted-foreground">Description</th>
                  <th className="p-2 text-right font-medium text-muted-foreground w-[110px]">Amount</th>
                  <th className="p-2 text-right font-medium text-muted-foreground w-[80px]">Tax %</th>
                  <th className="p-2 text-right font-medium text-muted-foreground w-[100px]">Tax Amt</th>
                  <th className="p-2 text-right font-medium text-muted-foreground w-[110px]">Total</th>
                  <th className="p-2 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-1"><Input type="date" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} className="h-8 text-xs" /></td>
                    <td className="p-1"><Input value={row.doc_number} onChange={e => updateRow(row.id, 'doc_number', e.target.value)} placeholder="INV-001" className="h-8 text-xs" /></td>
                    <td className="p-1"><Input value={row.contact} onChange={e => updateRow(row.id, 'contact', e.target.value)} placeholder="Contact name" className="h-8 text-xs" list={`contacts-${row.id}`} />
                      <datalist id={`contacts-${row.id}`}>{contacts.map(c => <option key={c.id} value={c.name} />)}</datalist>
                    </td>
                    <td className="p-1"><Input value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} placeholder="Description" className="h-8 text-xs" /></td>
                    <td className="p-1"><Input type="number" value={row.amount} onChange={e => updateRow(row.id, 'amount', e.target.value)} className="h-8 text-xs text-right" placeholder="0.00" /></td>
                    <td className="p-1"><Input type="number" value={row.tax_rate} onChange={e => updateRow(row.id, 'tax_rate', e.target.value)} className="h-8 text-xs text-right" /></td>
                    <td className="p-1 text-right text-xs text-muted-foreground pt-3">{row.tax_amount}</td>
                    <td className="p-1 text-right text-xs font-medium pt-3">{row.total}</td>
                    <td className="p-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(row.id)}><Trash2 className="h-3 w-3 text-muted-foreground" /></Button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold">
                  <td colSpan={7} className="p-2 text-right">Grand Total:</td>
                  <td className="p-2 text-right">RM {grandTotal.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRows(Array.from({ length: 5 }, emptyRow))}>Clear All</Button>
        <Button onClick={saveAll} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : `Save ${rows.filter(r => r.amount && parseFloat(r.amount) > 0).length} Entries`}
        </Button>
      </div>
    </div>
  );
};

export default FastEntryPage;
