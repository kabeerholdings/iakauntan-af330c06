import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Pause, ShoppingCart, Receipt, X } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  stock_item_id: string;
  name: string;
  code: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
}

const POSPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt, symbol } = useCurrency();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [heldOpen, setHeldOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentAmounts, setPaymentAmounts] = useState({ cash: '', card: '', ewallet: '' });
  const [txCounter, setTxCounter] = useState(1);

  useEffect(() => {
    if (!selectedCompany) return;
    supabase.from('stock_items').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).order('name')
      .then(({ data }) => setItems(data || []));
    // Load held bills
    supabase.from('pos_transactions').select('*').eq('company_id', selectedCompany.id).eq('status', 'held').order('held_at', { ascending: false })
      .then(({ data }) => setHeldBills(data || []));
  }, [selectedCompany]);

  const filteredItems = items.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.code?.toLowerCase().includes(search.toLowerCase()) ||
    i.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.stock_item_id === item.id);
      if (existing) {
        return prev.map(c => c.stock_item_id === item.id
          ? { ...c, quantity: c.quantity + 1, line_total: (c.quantity + 1) * c.unit_price * (1 - c.discount_percent / 100) }
          : c
        );
      }
      return [...prev, {
        stock_item_id: item.id, name: item.name, code: item.code,
        quantity: 1, unit_price: item.selling_price || 0, discount_percent: 0,
        tax_rate: item.tax_rate || 0,
        line_total: item.selling_price || 0,
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.stock_item_id !== id) return c;
      const newQty = Math.max(1, c.quantity + delta);
      return { ...c, quantity: newQty, line_total: newQty * c.unit_price * (1 - c.discount_percent / 100) };
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.stock_item_id !== id));

  const subtotal = cart.reduce((s, c) => s + c.line_total, 0);
  const taxTotal = cart.reduce((s, c) => s + (c.line_total * c.tax_rate / 100), 0);
  const grandTotal = subtotal + taxTotal;

  const totalPaid = (parseFloat(paymentAmounts.cash) || 0) + (parseFloat(paymentAmounts.card) || 0) + (parseFloat(paymentAmounts.ewallet) || 0);
  const changeAmount = Math.max(0, totalPaid - grandTotal);

  const completeSale = async () => {
    if (!selectedCompany || cart.length === 0) return;
    if (totalPaid < grandTotal) { toast.error('Insufficient payment'); return; }

    const txNum = `POS-${String(txCounter).padStart(6, '0')}`;
    const { data: tx, error } = await supabase.from('pos_transactions').insert({
      company_id: selectedCompany.id,
      transaction_number: txNum,
      transaction_type: 'sale',
      customer_name: customerName || null,
      subtotal, tax_amount: taxTotal, total_amount: grandTotal,
      amount_paid: totalPaid, change_amount: changeAmount,
      status: 'completed',
      created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }

    // Insert lines
    const lines = cart.map(c => ({
      transaction_id: tx.id, stock_item_id: c.stock_item_id,
      description: c.name, quantity: c.quantity, unit_price: c.unit_price,
      discount_percent: c.discount_percent, tax_rate: c.tax_rate,
      tax_amount: c.line_total * c.tax_rate / 100, line_total: c.line_total,
    }));
    await supabase.from('pos_transaction_lines').insert(lines);

    // Insert payments
    const payments: any[] = [];
    if (parseFloat(paymentAmounts.cash) > 0) payments.push({ transaction_id: tx.id, payment_method: 'cash', amount: parseFloat(paymentAmounts.cash) });
    if (parseFloat(paymentAmounts.card) > 0) payments.push({ transaction_id: tx.id, payment_method: 'card', amount: parseFloat(paymentAmounts.card) });
    if (parseFloat(paymentAmounts.ewallet) > 0) payments.push({ transaction_id: tx.id, payment_method: 'ewallet', amount: parseFloat(paymentAmounts.ewallet) });
    if (payments.length > 0) await supabase.from('pos_payments').insert(payments);

    toast.success(`Sale completed! ${txNum}`);
    setCart([]);
    setCustomerName('');
    setPaymentAmounts({ cash: '', card: '', ewallet: '' });
    setPaymentOpen(false);
    setTxCounter(prev => prev + 1);
  };

  const holdBill = async () => {
    if (!selectedCompany || cart.length === 0) return;
    const txNum = `HOLD-${String(txCounter).padStart(6, '0')}`;
    const { data: tx, error } = await supabase.from('pos_transactions').insert({
      company_id: selectedCompany.id, transaction_number: txNum, transaction_type: 'sale',
      customer_name: customerName || null, subtotal, tax_amount: taxTotal, total_amount: grandTotal,
      status: 'held', held_at: new Date().toISOString(), created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }

    const lines = cart.map(c => ({
      transaction_id: tx.id, stock_item_id: c.stock_item_id,
      description: c.name, quantity: c.quantity, unit_price: c.unit_price,
      discount_percent: c.discount_percent, tax_rate: c.tax_rate, line_total: c.line_total,
    }));
    await supabase.from('pos_transaction_lines').insert(lines);

    toast.success('Bill held');
    setCart([]);
    setCustomerName('');
    setTxCounter(prev => prev + 1);
    // Refresh held
    const { data } = await supabase.from('pos_transactions').select('*').eq('company_id', selectedCompany.id).eq('status', 'held');
    setHeldBills(data || []);
  };

  const recallBill = async (bill: any) => {
    const { data: lines } = await supabase.from('pos_transaction_lines').select('*').eq('transaction_id', bill.id);
    if (lines) {
      setCart(lines.map((l: any) => ({
        stock_item_id: l.stock_item_id, name: l.description, code: '',
        quantity: l.quantity, unit_price: l.unit_price, discount_percent: l.discount_percent || 0,
        tax_rate: l.tax_rate || 0, line_total: l.line_total,
      })));
      setCustomerName(bill.customer_name || '');
    }
    await supabase.from('pos_transaction_lines').delete().eq('transaction_id', bill.id);
    await supabase.from('pos_transactions').delete().eq('id', bill.id);
    setHeldBills(prev => prev.filter(h => h.id !== bill.id));
    setHeldOpen(false);
    toast.success('Bill recalled');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search or scan barcode..." value={search} onChange={e => setSearch(e.target.value)} autoFocus /></div>
        </div>
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredItems.map(item => (
              <Card key={item.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => addToCart(item)}>
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.code}</p>
                  <p className="text-primary font-bold mt-1">{fmt(item.selling_price || 0)}</p>
                  {item.barcode && <p className="text-xs text-muted-foreground truncate">{item.barcode}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Panel */}
      <Card className="w-96 flex flex-col shrink-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Cart ({cart.length})</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setHeldOpen(true)} disabled={heldBills.length === 0}>
                <Pause className="h-3 w-3 mr-1" />{heldBills.length}
              </Button>
            </div>
          </div>
          <Input placeholder="Customer name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-2" />
        </CardHeader>
        <ScrollArea className="flex-1 px-4">
          {cart.map(c => (
            <div key={c.stock_item_id} className="flex items-center gap-2 py-2 border-b">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{fmt(c.unit_price)} × {c.quantity}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(c.stock_item_id, -1)}><Minus className="h-3 w-3" /></Button>
                <span className="text-sm w-6 text-center">{c.quantity}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(c.stock_item_id, 1)}><Plus className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(c.stock_item_id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
              <p className="text-sm font-semibold w-20 text-right">{fmt(c.line_total)}</p>
            </div>
          ))}
          {cart.length === 0 && <p className="text-center text-muted-foreground py-8">Cart is empty</p>}
        </ScrollArea>
        <div className="p-4 border-t space-y-2">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Tax</span><span>{fmt(taxTotal)}</span></div>
          <Separator />
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{fmt(grandTotal)}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={holdBill} disabled={cart.length === 0}><Pause className="mr-1 h-4 w-4" />Hold</Button>
            <Button onClick={() => setPaymentOpen(true)} disabled={cart.length === 0}><CreditCard className="mr-1 h-4 w-4" />Pay</Button>
          </div>
        </div>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment - RM {grandTotal.toFixed(2)}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3"><Banknote className="h-5 w-5 text-muted-foreground" /><div className="flex-1"><Label>Cash</Label><Input type="number" value={paymentAmounts.cash} onChange={e => setPaymentAmounts({ ...paymentAmounts, cash: e.target.value })} placeholder="0.00" /></div></div>
            <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-muted-foreground" /><div className="flex-1"><Label>Card</Label><Input type="number" value={paymentAmounts.card} onChange={e => setPaymentAmounts({ ...paymentAmounts, card: e.target.value })} placeholder="0.00" /></div></div>
            <div className="flex items-center gap-3"><Smartphone className="h-5 w-5 text-muted-foreground" /><div className="flex-1"><Label>E-Wallet</Label><Input type="number" value={paymentAmounts.ewallet} onChange={e => setPaymentAmounts({ ...paymentAmounts, ewallet: e.target.value })} placeholder="0.00" /></div></div>
            <Separator />
            <div className="flex justify-between"><span>Paid</span><span className="font-bold">RM {totalPaid.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Change</span><span className="font-bold text-primary">RM {changeAmount.toFixed(2)}</span></div>
            <div className="grid grid-cols-4 gap-2">
              {[grandTotal, 10, 20, 50, 100, 200].map(amt => (
                <Button key={amt} variant="outline" size="sm" onClick={() => setPaymentAmounts({ ...paymentAmounts, cash: String(amt) })}>
                  {amt === grandTotal ? 'Exact' : `RM ${amt}`}
                </Button>
              ))}
            </div>
            <Button onClick={completeSale} className="w-full" size="lg" disabled={totalPaid < grandTotal}>
              <Receipt className="mr-2 h-4 w-4" />Complete Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Held Bills Dialog */}
      <Dialog open={heldOpen} onOpenChange={setHeldOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Held Bills ({heldBills.length})</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {heldBills.map(b => (
              <Card key={b.id} className="cursor-pointer hover:border-primary" onClick={() => recallBill(b)}>
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{b.transaction_number}</p>
                    <p className="text-sm text-muted-foreground">{b.customer_name || 'Walk-in'} • {b.held_at ? new Date(b.held_at).toLocaleTimeString() : ''}</p>
                  </div>
                  <p className="font-bold">RM {(b.total_amount || 0).toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
            {heldBills.length === 0 && <p className="text-center text-muted-foreground py-4">No held bills</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSPage;
