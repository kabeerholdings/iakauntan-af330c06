import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomFields, saveCustomFieldValues } from '@/components/CustomFieldsSection';

const StockItemsPage = () => {
  const { selectedCompany } = useCompany();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [openCat, setOpenCat] = useState(false);
  const [openWh, setOpenWh] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', description: '', category_id: '', base_uom: 'unit',
    purchase_price: '', selling_price: '', reorder_level: '', reorder_qty: '',
    costing_method: 'weighted_avg', barcode: '', tax_rate: '0',
  });
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [whForm, setWhForm] = useState({ code: '', name: '', address: '' });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [si, cat, wh, bal] = await Promise.all([
      supabase.from('stock_items').select('*, stock_categories(name)').eq('company_id', selectedCompany.id).order('code'),
      supabase.from('stock_categories').select('*').eq('company_id', selectedCompany.id).order('name'),
      supabase.from('warehouses').select('*').eq('company_id', selectedCompany.id).order('code'),
      supabase.from('stock_balances').select('*, stock_items!inner(company_id), warehouses(name)').eq('stock_items.company_id', selectedCompany.id),
    ]);
    setItems(si.data || []);
    setCategories(cat.data || []);
    setWarehouses(wh.data || []);
    setBalances(bal.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreateItem = async () => {
    if (!selectedCompany || !form.code || !form.name) { toast.error('Code and Name required'); return; }
    const { data, error } = await supabase.from('stock_items').insert({
      company_id: selectedCompany.id, code: form.code, name: form.name,
      description: form.description || null, category_id: form.category_id || null,
      base_uom: form.base_uom, purchase_price: +form.purchase_price || 0,
      selling_price: +form.selling_price || 0, reorder_level: +form.reorder_level || 0,
      reorder_qty: +form.reorder_qty || 0, costing_method: form.costing_method,
      barcode: form.barcode || null, tax_rate: +form.tax_rate || 0,
    }).select('id').single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      await saveCustomFieldValues(selectedCompany.id, 'stock_item', data.id, customValues);
    }
    toast.success('Stock item created');
    setOpen(false);
    setForm({ code: '', name: '', description: '', category_id: '', base_uom: 'unit', purchase_price: '', selling_price: '', reorder_level: '', reorder_qty: '', costing_method: 'weighted_avg', barcode: '', tax_rate: '0' });
    setCustomValues({});
    fetchData();
  };

  const handleCreateCat = async () => {
    if (!selectedCompany || !catForm.name) { toast.error('Name required'); return; }
    const { error } = await supabase.from('stock_categories').insert({ company_id: selectedCompany.id, name: catForm.name, description: catForm.description || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Category created');
    setOpenCat(false);
    setCatForm({ name: '', description: '' });
    fetchData();
  };

  const handleCreateWh = async () => {
    if (!selectedCompany || !whForm.code || !whForm.name) { toast.error('Code and Name required'); return; }
    const { error } = await supabase.from('warehouses').insert({ company_id: selectedCompany.id, code: whForm.code, name: whForm.name, address: whForm.address || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Warehouse created');
    setOpenWh(false);
    setWhForm({ code: '', name: '', address: '' });
    fetchData();
  };

  const filtered = items.filter(i => !search || i.code.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()));

  const getBalance = (itemId: string) => balances.filter(b => b.stock_item_id === itemId).reduce((s, b) => s + (+b.quantity || 0), 0);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Stock / Inventory</h1>
        <div className="flex gap-2">
          <Dialog open={openCat} onOpenChange={setOpenCat}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Category</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Description</Label><Input value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} /></div>
                <Button onClick={handleCreateCat} className="w-full">Add Category</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={openWh} onOpenChange={setOpenWh}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Warehouse</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Warehouse</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Code</Label><Input value={whForm.code} onChange={e => setWhForm(f => ({ ...f, code: e.target.value }))} placeholder="WH-01" /></div>
                  <div><Label>Name</Label><Input value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} placeholder="Main Warehouse" /></div>
                </div>
                <div><Label>Address</Label><Input value={whForm.address} onChange={e => setWhForm(f => ({ ...f, address: e.target.value }))} /></div>
                <Button onClick={handleCreateWh} className="w-full">Add Warehouse</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Item</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Add Stock Item</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ITM-001" /></div>
                  <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Base UOM</Label><Input value={form.base_uom} onChange={e => setForm(f => ({ ...f, base_uom: e.target.value }))} /></div>
                  <div><Label>Purchase Price</Label><Input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} /></div>
                  <div><Label>Selling Price</Label><Input type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} /></div>
                  <div><Label>Reorder Qty</Label><Input type="number" value={form.reorder_qty} onChange={e => setForm(f => ({ ...f, reorder_qty: e.target.value }))} /></div>
                  <div>
                    <Label>Costing Method</Label>
                    <Select value={form.costing_method} onValueChange={v => setForm(f => ({ ...f, costing_method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weighted_avg">Weighted Average</SelectItem>
                        <SelectItem value="fifo">FIFO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Barcode</Label><Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} /></div>
                  <div><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} /></div>
                </div>
                <CustomFieldsSection entityType="stock_item" values={customValues} onChange={setCustomValues} />
                <Button onClick={handleCreateItem} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses ({warehouses.length})</TabsTrigger>
          <TabsTrigger value="reorder">Reorder Advice</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Purchase</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No stock items</TableCell></TableRow>
                  ) : filtered.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono font-medium">{i.code}</TableCell>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell>{i.stock_categories?.name || '—'}</TableCell>
                      <TableCell>{i.base_uom}</TableCell>
                      <TableCell className="text-right">RM {Number(i.purchase_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right">RM {Number(i.selling_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{getBalance(i.id)}</TableCell>
                      <TableCell>{i.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Items</TableHead></TableRow></TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No categories</TableCell></TableRow>
                  ) : categories.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.description || '—'}</TableCell>
                      <TableCell>{items.filter(i => i.category_id === c.id).length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Address</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {warehouses.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No warehouses</TableCell></TableRow>
                  ) : warehouses.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono font-medium">{w.code}</TableCell>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="text-muted-foreground">{w.address || '—'}</TableCell>
                      <TableCell>{w.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Reorder Level</TableHead><TableHead className="text-right">Reorder Qty</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.filter(i => i.reorder_level > 0).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items with reorder levels set</TableCell></TableRow>
                  ) : items.filter(i => i.reorder_level > 0).map(i => {
                    const bal = getBalance(i.id);
                    const needsReorder = bal <= i.reorder_level;
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono font-medium">{i.code}</TableCell>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell className="text-right">{bal}</TableCell>
                        <TableCell className="text-right">{Number(i.reorder_level)}</TableCell>
                        <TableCell className="text-right">{Number(i.reorder_qty)}</TableCell>
                        <TableCell>{needsReorder ? <Badge variant="destructive">Reorder Now</Badge> : <Badge variant="secondary">OK</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockItemsPage;
