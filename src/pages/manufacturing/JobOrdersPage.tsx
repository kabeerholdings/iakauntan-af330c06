import { useEffect, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Play, CheckCircle, Eye } from 'lucide-react';

type JobOrder = {
  id: string; job_number: string; bom_id: string; product_id: string;
  planned_quantity: number; completed_quantity: number;
  planned_start_date: string; planned_end_date: string | null;
  actual_start_date: string | null; actual_end_date: string | null;
  priority: string; status: string; labour_cost: number; machine_cost: number; overhead_cost: number; notes: string | null;
  bill_of_materials?: { bom_code: string; bom_name: string } | null;
  stock_items?: { code: string; name: string } | null;
};

type BOM = { id: string; bom_code: string; bom_name: string; product_id: string };
type JOLine = { id: string; stock_item_id: string; required_quantity: number; issued_quantity: number; returned_quantity: number; wastage_quantity: number; uom: string; unit_cost: number; stock_items?: { code: string; name: string } | null };

const JobOrdersPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [viewOrder, setViewOrder] = useState<JobOrder | null>(null);
  const [joLines, setJoLines] = useState<JOLine[]>([]);
  const [form, setForm] = useState({ job_number: '', bom_id: '', planned_quantity: '1', planned_start_date: new Date().toISOString().split('T')[0], planned_end_date: '', priority: 'normal', notes: '' });

  const fetchOrders = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('job_orders')
      .select('*, bill_of_materials(bom_code, bom_name), stock_items!job_orders_product_id_fkey(code, name)')
      .eq('company_id', selectedCompany.id).order('created_at', { ascending: false });
    setOrders((data || []) as any);
  };

  const fetchBoms = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('bill_of_materials').select('id, bom_code, bom_name, product_id')
      .eq('company_id', selectedCompany.id).eq('is_active', true).order('bom_code');
    setBoms((data || []) as BOM[]);
  };

  useEffect(() => { fetchOrders(); fetchBoms(); }, [selectedCompany]);

  const fetchJOLines = async (joId: string) => {
    const { data } = await supabase.from('job_order_lines').select('*, stock_items(code, name)').eq('job_order_id', joId);
    setJoLines((data || []) as any);
  };

  const createOrder = async () => {
    if (!selectedCompany || !user || !form.bom_id || !form.job_number) { toast.error('Fill required fields'); return; }
    const bom = boms.find(b => b.id === form.bom_id);
    if (!bom) return;

    try {
      const { data: jo, error } = await supabase.from('job_orders').insert({
        company_id: selectedCompany.id, job_number: form.job_number, bom_id: form.bom_id,
        product_id: bom.product_id, planned_quantity: parseFloat(form.planned_quantity) || 1,
        planned_start_date: form.planned_start_date, planned_end_date: form.planned_end_date || null,
        priority: form.priority, notes: form.notes || null, created_by: user.id,
      }).select('id').single();
      if (error) throw error;

      // Auto-generate material lines from BOM
      const { data: bomLines } = await supabase.from('bom_lines').select('stock_item_id, effective_quantity, uom, unit_cost').eq('bom_id', form.bom_id);
      if (bomLines && bomLines.length > 0) {
        const qty = parseFloat(form.planned_quantity) || 1;
        await supabase.from('job_order_lines').insert(bomLines.map(l => ({
          job_order_id: jo.id, stock_item_id: l.stock_item_id,
          required_quantity: Number(l.effective_quantity) * qty, uom: l.uom, unit_cost: Number(l.unit_cost),
        })));
      }

      toast.success('Job Order created with material requirements');
      setShowForm(false);
      setForm({ job_number: '', bom_id: '', planned_quantity: '1', planned_start_date: new Date().toISOString().split('T')[0], planned_end_date: '', priority: 'normal', notes: '' });
      fetchOrders();
    } catch (err: any) { toast.error(err.message); }
  };

  const updateStatus = async (jo: JobOrder, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'in_progress') updates.actual_start_date = new Date().toISOString().split('T')[0];
    if (newStatus === 'completed') { updates.actual_end_date = new Date().toISOString().split('T')[0]; updates.completed_quantity = jo.planned_quantity; }
    await supabase.from('job_orders').update(updates).eq('id', jo.id);
    toast.success(`Status updated to ${newStatus}`);
    fetchOrders();
  };

  const statusColor = (s: string) => {
    switch (s) { case 'planned': return 'secondary'; case 'in_progress': return 'default'; case 'completed': return 'default'; case 'cancelled': return 'destructive'; default: return 'outline'; }
  };

  const priorityColor = (p: string) => {
    switch (p) { case 'high': return 'text-red-600'; case 'urgent': return 'text-red-700 font-bold'; default: return 'text-muted-foreground'; }
  };

  const fmt = (n: number) => `RM ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Job Orders</h1>
          <p className="text-sm text-muted-foreground">Plan and track production jobs with material requirements</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> New Job Order</Button>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        {['planned', 'in_progress', 'completed', 'cancelled'].map(status => (
          <Card key={status} className="shadow-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground capitalize">{status.replace('_', ' ')}</p>
              <p className="text-2xl font-bold font-display">{orders.filter(o => o.status === status).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job No</TableHead><TableHead>BOM</TableHead><TableHead>Product</TableHead>
                <TableHead className="text-right">Plan Qty</TableHead><TableHead className="text-right">Done</TableHead>
                <TableHead>Priority</TableHead><TableHead>Start</TableHead><TableHead>Status</TableHead><TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No job orders</TableCell></TableRow>
              ) : orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono font-medium">{o.job_number}</TableCell>
                  <TableCell>{(o.bill_of_materials as any)?.bom_code}</TableCell>
                  <TableCell>{(o.stock_items as any)?.code} - {(o.stock_items as any)?.name}</TableCell>
                  <TableCell className="text-right">{o.planned_quantity}</TableCell>
                  <TableCell className="text-right">{o.completed_quantity}</TableCell>
                  <TableCell className={priorityColor(o.priority)}>{o.priority}</TableCell>
                  <TableCell>{o.planned_start_date}</TableCell>
                  <TableCell><Badge variant={statusColor(o.status) as any} className={o.status === 'completed' ? 'bg-emerald-600' : ''}>{o.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewOrder(o); fetchJOLines(o.id); }}><Eye className="h-3.5 w-3.5" /></Button>
                      {o.status === 'planned' && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus(o, 'in_progress')}><Play className="h-3.5 w-3.5 text-primary" /></Button>}
                      {o.status === 'in_progress' && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus(o, 'completed')}><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* JO Detail */}
      {viewOrder && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display">Job Order: {viewOrder.job_number} — Material Requirements</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setViewOrder(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead><TableHead className="text-right">Required</TableHead>
                  <TableHead className="text-right">Issued</TableHead><TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Wastage</TableHead><TableHead className="text-right">Net Used</TableHead>
                  <TableHead>Shortage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {joLines.map(l => {
                  const netUsed = Number(l.issued_quantity) - Number(l.returned_quantity);
                  const shortage = Number(l.required_quantity) - Number(l.issued_quantity);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>{(l.stock_items as any)?.code} - {(l.stock_items as any)?.name}</TableCell>
                      <TableCell className="text-right">{l.required_quantity} {l.uom}</TableCell>
                      <TableCell className="text-right">{l.issued_quantity}</TableCell>
                      <TableCell className="text-right">{l.returned_quantity}</TableCell>
                      <TableCell className="text-right">{l.wastage_quantity}</TableCell>
                      <TableCell className="text-right font-medium">{netUsed.toFixed(2)}</TableCell>
                      <TableCell>{shortage > 0 ? <Badge variant="destructive">{shortage.toFixed(2)} short</Badge> : <Badge variant="default" className="bg-emerald-600">OK</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create JO Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">New Job Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Job Number *</Label><Input value={form.job_number} onChange={e => setForm(f => ({ ...f, job_number: e.target.value }))} placeholder="JO-001" /></div>
            <div><Label>BOM / Recipe *</Label>
              <Select value={form.bom_id} onValueChange={v => setForm(f => ({ ...f, bom_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select BOM" /></SelectTrigger>
                <SelectContent>{boms.map(b => <SelectItem key={b.id} value={b.id}>{b.bom_code} - {b.bom_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Planned Quantity</Label><Input type="number" value={form.planned_quantity} onChange={e => setForm(f => ({ ...f, planned_quantity: e.target.value }))} /></div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.planned_start_date} onChange={e => setForm(f => ({ ...f, planned_start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.planned_end_date} onChange={e => setForm(f => ({ ...f, planned_end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={createOrder} className="w-full">Create Job Order</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobOrdersPage;
