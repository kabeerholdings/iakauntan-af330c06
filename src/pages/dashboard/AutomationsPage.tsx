import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Zap, Play, Pause, Settings, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Automation = {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_entity: string;
  conditions: any[];
  actions: any[];
  is_active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
};

const triggerEvents = [
  { value: 'created', label: 'When Created' },
  { value: 'updated', label: 'When Updated' },
  { value: 'status_changed', label: 'When Status Changed' },
  { value: 'due_date_approaching', label: 'Due Date Approaching' },
  { value: 'amount_exceeds', label: 'Amount Exceeds Threshold' },
];

const entities = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'payment', label: 'Payment' },
  { value: 'contact', label: 'Contact' },
  { value: 'stock_item', label: 'Stock Item' },
  { value: 'expense', label: 'Expense' },
];

const actionTypes = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'update_status', label: 'Update Status' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'assign_user', label: 'Assign User' },
];

const AutomationsPage = () => {
  const { selectedCompany } = useCompany();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', trigger_event: 'created', trigger_entity: 'invoice', action_type: 'send_notification' });

  useEffect(() => { if (selectedCompany) fetchAutomations(); }, [selectedCompany]);

  const fetchAutomations = async () => {
    setLoading(true);
    const { data } = await supabase.from('automations').select('*').eq('company_id', selectedCompany!.id).order('created_at', { ascending: false });
    setAutomations(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('automations').insert({
      company_id: selectedCompany!.id,
      name: form.name,
      description: form.description || null,
      trigger_event: form.trigger_event,
      trigger_entity: form.trigger_entity,
      actions: [{ type: form.action_type }],
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Automation created');
    setShowDialog(false);
    setForm({ name: '', description: '', trigger_event: 'created', trigger_entity: 'invoice', action_type: 'send_notification' });
    fetchAutomations();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('automations').update({ is_active: !current }).eq('id', id);
    toast.success(current ? 'Automation paused' : 'Automation activated');
    fetchAutomations();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('automations').delete().eq('id', id);
    toast.success('Automation deleted');
    fetchAutomations();
  };

  const active = automations.filter(a => a.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">Automations</h1><p className="text-muted-foreground">Create workflow rules and triggers</p></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Automation</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Automation</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Send reminder when invoice overdue" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>When</Label>
                  <Select value={form.trigger_event} onValueChange={(v) => setForm({ ...form, trigger_event: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{triggerEvents.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Entity</Label>
                  <Select value={form.trigger_entity} onValueChange={(v) => setForm({ ...form, trigger_entity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{entities.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Then</Label>
                <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{actionTypes.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate}>Create Automation</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{automations.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{active.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Paused</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-muted-foreground">{automations.length - active.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Triggers</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{automations.reduce((sum, a) => sum + a.trigger_count, 0)}</p></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {loading ? <p className="text-muted-foreground">Loading...</p> : automations.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No automations yet. Create one to automate repetitive tasks.</p></CardContent></Card>
        ) : automations.map(auto => (
          <Card key={auto.id} className={!auto.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">{auto.is_active ? <Play className="h-4 w-4 text-green-600" /> : <Pause className="h-4 w-4 text-muted-foreground" />}{auto.name}</CardTitle>
                  <CardDescription>{auto.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={auto.is_active} onCheckedChange={() => toggleActive(auto.id, auto.is_active)} />
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(auto.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">When {entities.find(e => e.value === auto.trigger_entity)?.label} {triggerEvents.find(e => e.value === auto.trigger_event)?.label}</Badge>
                <span className="text-muted-foreground">→</span>
                {(auto.actions as any[]).map((a, i) => <Badge key={i}>{actionTypes.find(at => at.value === a.type)?.label || a.type}</Badge>)}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>Triggered {auto.trigger_count} times</span>
                {auto.last_triggered_at && <span>Last: {format(new Date(auto.last_triggered_at), 'dd MMM yyyy HH:mm')}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AutomationsPage;
