import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Barcode, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

type SerialNumber = {
  id: string;
  serial_number: string;
  status: string;
  purchase_date: string | null;
  warranty_expiry: string | null;
  stock_items?: { code: string; name: string } | null;
  contacts?: { name: string } | null;
};

const SerialNumbersPage = () => {
  const { selectedCompany } = useCompany();
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [stockItems, setStockItems] = useState<{ id: string; item_code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ stock_item_id: '', serial_number: '', status: 'available', purchase_date: '', warranty_expiry: '' });

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [selectedCompany]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: sn }, { data: si }] = await Promise.all([
      supabase.from('serial_numbers').select('*, stock_items(code, name), contacts:customer_contact_id(name)').eq('company_id', selectedCompany!.id).order('created_at', { ascending: false }),
      supabase.from('stock_items').select('id, code, name').eq('company_id', selectedCompany!.id),
    ]);
    setSerials((sn as SerialNumber[]) || []);
    setStockItems((si as { id: string; code: string; name: string }[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.stock_item_id || !form.serial_number.trim()) { toast.error('Product and serial number required'); return; }
    const { error } = await supabase.from('serial_numbers').insert({
      company_id: selectedCompany!.id,
      stock_item_id: form.stock_item_id,
      serial_number: form.serial_number.trim(),
      status: form.status,
      purchase_date: form.purchase_date || null,
      warranty_expiry: form.warranty_expiry || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Serial number added');
    setShowDialog(false);
    setForm({ stock_item_id: '', serial_number: '', status: 'available', purchase_date: '', warranty_expiry: '' });
    fetchData();
  };

  const filtered = serials.filter(s => s.serial_number.toLowerCase().includes(search.toLowerCase()) || s.stock_items?.name?.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'sold': return 'secondary';
      case 'reserved': return 'outline';
      case 'defective': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Serial Numbers</h1>
          <p className="text-muted-foreground">Track individual product serial numbers</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Serial</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Serial Number</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Product</Label>
                <Select value={form.stock_item_id} onValueChange={(v) => setForm({ ...form, stock_item_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{stockItems.map((s) => <SelectItem key={s.id} value={s.id}>{s.item_code} - {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="defective">Defective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
                <div><Label>Warranty Expiry</Label><Input type="date" value={form.warranty_expiry} onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{serials.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{serials.filter(s => s.status === 'available').length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Sold</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{serials.filter(s => s.status === 'sold').length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Defective</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{serials.filter(s => s.status === 'defective').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Barcode className="h-5 w-5" />Serial Numbers</CardTitle>
            <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-muted-foreground">No serial numbers found</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Serial</TableHead><TableHead>Product</TableHead><TableHead>Status</TableHead><TableHead>Purchase Date</TableHead><TableHead>Warranty</TableHead><TableHead>Customer</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">{s.serial_number}</TableCell>
                    <TableCell>{s.stock_items?.item_code} - {s.stock_items?.name}</TableCell>
                    <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                    <TableCell>{s.purchase_date ? format(new Date(s.purchase_date), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell>{s.warranty_expiry ? format(new Date(s.warranty_expiry), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell>{s.contacts?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SerialNumbersPage;
