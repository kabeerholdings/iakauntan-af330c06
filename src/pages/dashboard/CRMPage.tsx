import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Target, TrendingUp, DollarSign, Users, Phone, Calendar, FileText, Mail,
  CheckSquare, MoreHorizontal, Trophy, XCircle, Clock, Activity, BarChart3, Pencil, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';

export default function CRMPage() {
  const { selectedCompany } = useCompany();
  const { formatAmount } = useCurrency();
  const companyId = selectedCompany?.id;

  const [deals, setDeals] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showDeal, setShowDeal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [editDeal, setEditDeal] = useState<any>(null);

  // Deal form
  const [dealForm, setDealForm] = useState({ name: '', amount: '', contact_id: '', stage_id: '', expected_close_date: '', notes: '' });
  // Activity form
  const [actForm, setActForm] = useState({ deal_id: '', contact_id: '', activity_type: 'note', subject: '', description: '', activity_date: new Date().toISOString().slice(0, 16), duration_minutes: '' });

  const [tab, setTab] = useState('pipeline');

  useEffect(() => { if (companyId) fetchAll(); }, [companyId]);

  async function fetchAll() {
    setLoading(true);
    const [dRes, sRes, aRes, cRes] = await Promise.all([
      supabase.from('crm_deals').select('*').eq('company_id', companyId!).order('created_at', { ascending: false }),
      supabase.from('crm_deal_stages').select('*').eq('company_id', companyId!).order('sort_order'),
      supabase.from('crm_activities').select('*').eq('company_id', companyId!).order('activity_date', { ascending: false }).limit(100),
      supabase.from('contacts').select('id, name, type').eq('company_id', companyId!).eq('is_active', true),
    ]);
    setDeals(dRes.data || []);
    setStages(sRes.data || []);
    setActivities(aRes.data || []);
    setContacts(cRes.data || []);
    setLoading(false);
  }

  // ---- DEAL CRUD ----
  async function handleSaveDeal() {
    if (!dealForm.name.trim()) { toast.error('Deal name required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      company_id: companyId!,
      name: dealForm.name.trim(),
      amount: +dealForm.amount || 0,
      contact_id: dealForm.contact_id || null,
      stage_id: dealForm.stage_id || (stages.find(s => s.is_default)?.id ?? stages[0]?.id ?? null),
      expected_close_date: dealForm.expected_close_date || null,
      notes: dealForm.notes || null,
      created_by: user?.id,
    };
    let error;
    if (editDeal) {
      ({ error } = await supabase.from('crm_deals').update(payload).eq('id', editDeal.id));
    } else {
      ({ error } = await supabase.from('crm_deals').insert(payload));
    }
    if (error) { toast.error(error.message); return; }
    toast.success(editDeal ? 'Deal updated' : 'Deal created');
    setShowDeal(false); setEditDeal(null);
    setDealForm({ name: '', amount: '', contact_id: '', stage_id: '', expected_close_date: '', notes: '' });
    fetchAll();
  }

  async function handleDealStatus(deal: any, status: 'won' | 'lost' | 'open') {
    const { error } = await supabase.from('crm_deals').update({
      status,
      closed_at: status === 'open' ? null : new Date().toISOString(),
    }).eq('id', deal.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Deal marked as ${status}`);
    fetchAll();
  }

  async function handleMoveDeal(deal: any, stageId: string) {
    const { error } = await supabase.from('crm_deals').update({ stage_id: stageId }).eq('id', deal.id);
    if (error) { toast.error(error.message); return; }
    // Auto-log activity
    await supabase.from('crm_activities').insert({
      company_id: companyId!, deal_id: deal.id, contact_id: deal.contact_id,
      activity_type: 'note', subject: `Moved to ${stages.find(s => s.id === stageId)?.name || 'stage'}`,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    fetchAll();
  }

  async function handleDeleteDeal(id: string) {
    const { error } = await supabase.from('crm_deals').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deal deleted');
    fetchAll();
  }

  // ---- ACTIVITY CRUD ----
  async function handleSaveActivity() {
    if (!actForm.subject.trim()) { toast.error('Subject required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('crm_activities').insert({
      company_id: companyId!,
      deal_id: actForm.deal_id || null,
      contact_id: actForm.contact_id || null,
      activity_type: actForm.activity_type,
      subject: actForm.subject.trim(),
      description: actForm.description || null,
      activity_date: actForm.activity_date || new Date().toISOString(),
      duration_minutes: +actForm.duration_minutes || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Activity logged');
    setShowActivity(false);
    setActForm({ deal_id: '', contact_id: '', activity_type: 'note', subject: '', description: '', activity_date: new Date().toISOString().slice(0, 16), duration_minutes: '' });
    fetchAll();
  }

  // ---- STATS ----
  const openDeals = deals.filter(d => d.status === 'open');
  const wonDeals = deals.filter(d => d.status === 'won');
  const lostDeals = deals.filter(d => d.status === 'lost');
  const totalPipeline = openDeals.reduce((s, d) => s + (+d.amount || 0), 0);
  const totalWon = wonDeals.reduce((s, d) => s + (+d.amount || 0), 0);
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length || 1)) * 100) : 0;

  const getContact = (id: string) => contacts.find(c => c.id === id);
  const getStage = (id: string) => stages.find(s => s.id === id);

  const activityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'task': return <CheckSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (!companyId) return <div className="p-8 text-center text-muted-foreground">Please select a company first.</div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-muted-foreground text-sm">Track deals, manage pipeline, and log customer activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowActivity(true); }}>
            <Activity className="h-4 w-4 mr-2" /> Log Activity
          </Button>
          <Button onClick={() => { setEditDeal(null); setDealForm({ name: '', amount: '', contact_id: '', stage_id: '', expected_close_date: '', notes: '' }); setShowDeal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Deal
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Target className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Open Deals</p><p className="text-xl font-bold">{openDeals.length}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">Pipeline Value</p><p className="text-xl font-bold">{formatAmount(totalPipeline)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Trophy className="h-5 w-5 text-yellow-600" /></div>
            <div><p className="text-xs text-muted-foreground">Won</p><p className="text-xl font-bold">{formatAmount(totalWon)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10"><TrendingUp className="h-5 w-5 text-accent-foreground" /></div>
            <div><p className="text-xs text-muted-foreground">Win Rate</p><p className="text-xl font-bold">{winRate}%</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="deals">All Deals</TabsTrigger>
          <TabsTrigger value="activities">Activity Log</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* PIPELINE VIEW */}
        <TabsContent value="pipeline">
          {loading ? <p className="text-muted-foreground text-sm p-4">Loading...</p> : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map(stage => {
                const stageDeals = openDeals.filter(d => d.stage_id === stage.id);
                const stageTotal = stageDeals.reduce((s, d) => s + (+d.amount || 0), 0);
                return (
                  <div key={stage.id} className="min-w-[280px] flex-shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="font-semibold text-sm">{stage.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{stageDeals.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{formatAmount(stageTotal)}</p>
                    <div className="space-y-2">
                      {stageDeals.map(deal => (
                        <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{deal.name}</p>
                                <p className="text-xs text-muted-foreground">{getContact(deal.contact_id)?.name || 'No contact'}</p>
                                <p className="text-sm font-semibold mt-1">{formatAmount(+deal.amount || 0)}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditDeal(deal); setDealForm({ name: deal.name, amount: String(deal.amount || ''), contact_id: deal.contact_id || '', stage_id: deal.stage_id || '', expected_close_date: deal.expected_close_date || '', notes: deal.notes || '' }); setShowDeal(true); }}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  {stages.filter(s => s.id !== stage.id).map(s => (
                                    <DropdownMenuItem key={s.id} onClick={() => handleMoveDeal(deal, s.id)}>
                                      Move to {s.name}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuItem onClick={() => handleDealStatus(deal, 'won')} className="text-green-600">
                                    <Trophy className="h-4 w-4 mr-2" /> Mark Won
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDealStatus(deal, 'lost')} className="text-destructive">
                                    <XCircle className="h-4 w-4 mr-2" /> Mark Lost
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteDeal(deal.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {deal.expected_close_date && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {format(new Date(deal.expected_close_date), 'dd MMM yyyy')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {stageDeals.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No deals</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ALL DEALS TABLE */}
        <TabsContent value="deals">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected Close</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map(d => {
                    const stage = getStage(d.stage_id);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{getContact(d.contact_id)?.name || '-'}</TableCell>
                        <TableCell>
                          {stage && <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>{stage.name}</Badge>}
                        </TableCell>
                        <TableCell>{formatAmount(+d.amount || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'won' ? 'default' : d.status === 'lost' ? 'destructive' : 'secondary'}>
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{d.expected_close_date ? format(new Date(d.expected_close_date), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditDeal(d); setDealForm({ name: d.name, amount: String(d.amount || ''), contact_id: d.contact_id || '', stage_id: d.stage_id || '', expected_close_date: d.expected_close_date || '', notes: d.notes || '' }); setShowDeal(true); }}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {d.status === 'open' && <DropdownMenuItem onClick={() => handleDealStatus(d, 'won')}><Trophy className="h-4 w-4 mr-2" /> Won</DropdownMenuItem>}
                              {d.status === 'open' && <DropdownMenuItem onClick={() => handleDealStatus(d, 'lost')}><XCircle className="h-4 w-4 mr-2" /> Lost</DropdownMenuItem>}
                              {d.status !== 'open' && <DropdownMenuItem onClick={() => handleDealStatus(d, 'open')}>Reopen</DropdownMenuItem>}
                              <DropdownMenuItem onClick={() => handleDeleteDeal(d.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {deals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No deals yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIVITY LOG */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Log</CardTitle>
              <CardDescription>Track calls, meetings, emails, notes, and tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="p-2 rounded-full bg-muted">{activityIcon(a.activity_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{a.activity_type}</Badge>
                        <span className="font-medium text-sm">{a.subject}</span>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{format(new Date(a.activity_date), 'dd MMM yyyy HH:mm')}</span>
                        {a.duration_minutes && <span>{a.duration_minutes} min</span>}
                        {a.deal_id && <span>Deal: {deals.find(d => d.id === a.deal_id)?.name}</span>}
                        {a.contact_id && <span>Contact: {getContact(a.contact_id)?.name}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && <p className="text-center text-muted-foreground py-8">No activities logged yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Pipeline by Stage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stages.map(stage => {
                  const stageDeals = openDeals.filter(d => d.stage_id === stage.id);
                  const stageTotal = stageDeals.reduce((s, d) => s + (+d.amount || 0), 0);
                  const pct = totalPipeline > 0 ? (stageTotal / totalPipeline) * 100 : 0;
                  return (
                    <div key={stage.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stage.name} ({stageDeals.length})
                        </span>
                        <span className="font-medium">{formatAmount(stageTotal)}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5" /> Deal Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Deals</span>
                    <span className="font-bold text-lg">{deals.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Open</span>
                    <Badge variant="secondary">{openDeals.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">Won</span>
                    <span className="font-bold text-green-600">{wonDeals.length} — {formatAmount(totalWon)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-destructive">Lost</span>
                    <span className="font-bold text-destructive">{lostDeals.length}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Win Rate</span>
                    <span className="font-bold text-lg">{winRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Activities Logged</span>
                    <span className="font-bold">{activities.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* NEW / EDIT DEAL DIALOG */}
      <Dialog open={showDeal} onOpenChange={v => { if (!v) { setShowDeal(false); setEditDeal(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editDeal ? 'Edit Deal' : 'New Deal'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Deal Name *</Label><Input value={dealForm.name} onChange={e => setDealForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Website Redesign" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount</Label><Input type="number" value={dealForm.amount} onChange={e => setDealForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
              <div><Label>Expected Close</Label><Input type="date" value={dealForm.expected_close_date} onChange={e => setDealForm(f => ({ ...f, expected_close_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact</Label>
                <Select value={dealForm.contact_id} onValueChange={v => setDealForm(f => ({ ...f, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={dealForm.stage_id} onValueChange={v => setDealForm(f => ({ ...f, stage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={dealForm.notes} onChange={e => setDealForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeal(false); setEditDeal(null); }}>Cancel</Button>
            <Button onClick={handleSaveDeal}>{editDeal ? 'Update' : 'Create'} Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOG ACTIVITY DIALOG */}
      <Dialog open={showActivity} onOpenChange={setShowActivity}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={actForm.activity_type} onValueChange={v => setActForm(f => ({ ...f, activity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Call</SelectItem>
                    <SelectItem value="meeting">📅 Meeting</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="note">📝 Note</SelectItem>
                    <SelectItem value="task">✅ Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Duration (min)</Label><Input type="number" value={actForm.duration_minutes} onChange={e => setActForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="30" /></div>
            </div>
            <div><Label>Subject *</Label><Input value={actForm.subject} onChange={e => setActForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Follow-up call" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Deal</Label>
                <Select value={actForm.deal_id} onValueChange={v => setActForm(f => ({ ...f, deal_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contact</Label>
                <Select value={actForm.contact_id} onValueChange={v => setActForm(f => ({ ...f, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Date & Time</Label><Input type="datetime-local" value={actForm.activity_date} onChange={e => setActForm(f => ({ ...f, activity_date: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={actForm.description} onChange={e => setActForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivity(false)}>Cancel</Button>
            <Button onClick={handleSaveActivity}>Log Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
