import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Store, ShoppingBag, Package, DollarSign, TrendingUp, RefreshCw, Search, Truck, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const MARKETPLACES = ['shopee', 'lazada', 'tiktok', 'shopify', 'woocommerce'];
const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled', 'returned'];
const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const XStoreDashboard = () => {
  const { selectedCompany } = useCompany();
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [storeOpen, setStoreOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [storeForm, setStoreForm] = useState({ store_name: '', marketplace: 'shopee', store_url: '', store_id: '', region: 'MY' });
  const [productForm, setProductForm] = useState({ store_id: '', product_name: '', sku: '', price: '', stock_qty: '' });

  const fetchAll = async () => {
    if (!selectedCompany) return;
    const [s, p, o] = await Promise.all([
      supabase.from('marketplace_stores').select('*').eq('company_id', selectedCompany.id).order('store_name'),
      supabase.from('marketplace_products').select('*, marketplace_stores(store_name, marketplace)').eq('company_id', selectedCompany.id).order('product_name'),
      supabase.from('marketplace_orders').select('*, marketplace_stores(store_name, marketplace)').eq('company_id', selectedCompany.id).order('order_date', { ascending: false }),
    ]);
    setStores(s.data || []);
    setProducts(p.data || []);
    setOrders(o.data || []);
  };

  useEffect(() => { fetchAll(); }, [selectedCompany]);

  const addStore = async () => {
    if (!selectedCompany || !storeForm.store_name) return;
    const { error } = await supabase.from('marketplace_stores').insert({ ...storeForm, company_id: selectedCompany.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Store connected');
    setStoreOpen(false);
    setStoreForm({ store_name: '', marketplace: 'shopee', store_url: '', store_id: '', region: 'MY' });
    fetchAll();
  };

  const addProduct = async () => {
    if (!selectedCompany || !productForm.product_name) return;
    const { error } = await supabase.from('marketplace_products').insert({
      ...productForm, company_id: selectedCompany.id,
      price: parseFloat(productForm.price) || 0,
      stock_qty: parseFloat(productForm.stock_qty) || 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Product added');
    setProductOpen(false);
    setProductForm({ store_id: '', product_name: '', sku: '', price: '', stock_qty: '' });
    fetchAll();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('marketplace_orders').update({ status }).eq('id', orderId);
    if (error) { toast.error(error.message); return; }
    toast.success('Order updated');
    fetchAll();
  };

  const totalSales = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalPayout = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.seller_payout || 0), 0);

  const storeBreakdown = stores.map(s => ({
    name: s.store_name,
    orders: orders.filter(o => o.store_id === s.id).length,
    sales: orders.filter(o => o.store_id === s.id && o.status === 'completed').reduce((sum, o) => sum + (o.total_amount || 0), 0),
  }));

  const statusBreakdown = ORDER_STATUSES.map(st => ({
    name: st.charAt(0).toUpperCase() + st.slice(1),
    value: orders.filter(o => o.status === st).length,
  })).filter(s => s.value > 0);

  const filteredOrders = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">X-Store E-Commerce</h1>
          <p className="text-muted-foreground">Manage all marketplaces in one place</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={storeOpen} onOpenChange={setStoreOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Connect Store</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Connect Marketplace Store</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Store Name</Label><Input value={storeForm.store_name} onChange={e => setStoreForm({ ...storeForm, store_name: e.target.value })} /></div>
                <div><Label>Marketplace</Label>
                  <Select value={storeForm.marketplace} onValueChange={v => setStoreForm({ ...storeForm, marketplace: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MARKETPLACES.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Store URL</Label><Input value={storeForm.store_url} onChange={e => setStoreForm({ ...storeForm, store_url: e.target.value })} /></div>
                <div><Label>Store ID</Label><Input value={storeForm.store_id} onChange={e => setStoreForm({ ...storeForm, store_id: e.target.value })} /></div>
                <Button onClick={addStore} className="w-full">Connect Store</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Store className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Connected Stores</p><p className="text-2xl font-bold">{stores.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ShoppingBag className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{totalOrders}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Total Sales</p><p className="text-2xl font-bold">RM {totalSales.toFixed(2)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Seller Payout</p><p className="text-2xl font-bold">RM {totalPayout.toFixed(2)}</p></div></div></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Sales by Store</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={storeBreakdown}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Order Status</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart><Pie data={statusBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
              {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="products">Products</TabsTrigger><TabsTrigger value="stores">Stores</TabsTrigger><TabsTrigger value="payments">Fees & Payments</TabsTrigger></TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <Card><Table>
            <TableHeader><TableRow><TableHead>Order #</TableHead><TableHead>Store</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.order_number}</TableCell>
                  <TableCell><Badge variant="outline">{(o.marketplace_stores as any)?.marketplace}</Badge> {(o.marketplace_stores as any)?.store_name}</TableCell>
                  <TableCell>{o.customer_name || '-'}</TableCell>
                  <TableCell>{o.order_date ? new Date(o.order_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>RM {(o.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={o.status === 'completed' ? 'default' : o.status === 'cancelled' ? 'destructive' : 'secondary'}>{o.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedOrder(o); setOrderDetailOpen(true); }}><Eye className="h-3 w-3" /></Button>
                      <Select onValueChange={v => updateOrderStatus(o.id, v)}>
                        <SelectTrigger className="h-8 w-28"><SelectValue placeholder="Update" /></SelectTrigger>
                        <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No orders yet</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={productOpen} onOpenChange={setProductOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Product</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Marketplace Product</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Store</Label>
                    <Select value={productForm.store_id} onValueChange={v => setProductForm({ ...productForm, store_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                      <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.store_name} ({s.marketplace})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Product Name</Label><Input value={productForm.product_name} onChange={e => setProductForm({ ...productForm, product_name: e.target.value })} /></div>
                  <div><Label>SKU</Label><Input value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Price</Label><Input type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} /></div>
                    <div><Label>Stock Qty</Label><Input type="number" value={productForm.stock_qty} onChange={e => setProductForm({ ...productForm, stock_qty: e.target.value })} /></div>
                  </div>
                  <Button onClick={addProduct} className="w-full">Add Product</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Store</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {products.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.product_name}</TableCell>
                  <TableCell>{p.sku || '-'}</TableCell>
                  <TableCell>{(p.marketplace_stores as any)?.store_name || '-'}</TableCell>
                  <TableCell>RM {(p.price || 0).toFixed(2)}</TableCell>
                  <TableCell>{p.stock_qty}</TableCell>
                  <TableCell><Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
              {products.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No products yet</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="stores" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stores.map(s => (
              <Card key={s.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Store className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">{s.store_name}</p>
                      <Badge variant="outline">{s.marketplace}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Region: {s.region}</p>
                    <p>Status: <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge></p>
                    {s.last_sync_at && <p>Last sync: {new Date(s.last_sync_at).toLocaleString()}</p>}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 w-full"><RefreshCw className="mr-2 h-3 w-3" />Sync Now</Button>
                </CardContent>
              </Card>
            ))}
            {stores.length === 0 && <Card className="col-span-3"><CardContent className="py-8 text-center text-muted-foreground">No stores connected. Click "Connect Store" to get started.</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card><CardHeader><CardTitle>Fee & Payment Breakdown</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Order #</TableHead><TableHead>Store</TableHead><TableHead>Total</TableHead><TableHead>Platform Fee</TableHead><TableHead>Commission</TableHead><TableHead>Payment Fee</TableHead><TableHead>Shipping</TableHead><TableHead>Voucher</TableHead><TableHead>Payout</TableHead></TableRow></TableHeader>
              <TableBody>
                {orders.slice(0, 50).map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.order_number}</TableCell>
                    <TableCell>{(o.marketplace_stores as any)?.store_name}</TableCell>
                    <TableCell>RM {(o.total_amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">-RM {(o.platform_fee || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">-RM {(o.commission_fee || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">-RM {(o.payment_fee || 0).toFixed(2)}</TableCell>
                    <TableCell>RM {(o.shipping_fee || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">-RM {(o.voucher_discount || 0).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">RM {(o.seller_payout || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No orders to display</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Store:</span> {(selectedOrder.marketplace_stores as any)?.store_name}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{selectedOrder.status}</Badge></div>
                <div><span className="text-muted-foreground">Customer:</span> {selectedOrder.customer_name || '-'}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedOrder.customer_phone || '-'}</div>
                <div><span className="text-muted-foreground">Date:</span> {selectedOrder.order_date ? new Date(selectedOrder.order_date).toLocaleString() : '-'}</div>
                <div><span className="text-muted-foreground">Tracking:</span> {selectedOrder.tracking_number || '-'}</div>
              </div>
              <div className="border-t pt-2">
                <p className="text-muted-foreground mb-1">Shipping Address:</p>
                <p>{selectedOrder.shipping_address || 'N/A'}</p>
              </div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>RM {(selectedOrder.subtotal || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>RM {(selectedOrder.shipping_fee || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-destructive"><span>Fees</span><span>-RM {((selectedOrder.platform_fee || 0) + (selectedOrder.commission_fee || 0) + (selectedOrder.payment_fee || 0)).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Payout</span><span>RM {(selectedOrder.seller_payout || 0).toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default XStoreDashboard;
