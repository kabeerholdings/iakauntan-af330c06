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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const LeavePage = () => {
  const { selectedCompany } = useCompany();
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [openType, setOpenType] = useState(false);
  const [form, setForm] = useState({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', days: '1', reason: '' });
  const [typeForm, setTypeForm] = useState({ code: '', name: '', default_days: '14', is_paid: true, is_carry_forward: false, max_carry_forward: '0' });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [lt, emp, la, le] = await Promise.all([
      supabase.from('leave_types').select('*').eq('company_id', selectedCompany.id).order('code'),
      supabase.from('employees').select('id, employee_no, first_name, last_name').eq('company_id', selectedCompany.id).eq('is_active', true).order('employee_no'),
      supabase.from('leave_applications').select('*, employees(employee_no, first_name, last_name), leave_types(name, code)').eq('employees.company_id', selectedCompany.id).order('start_date', { ascending: false }),
      supabase.from('leave_entitlements').select('*, employees(employee_no, first_name, last_name), leave_types(name, code)').eq('employees.company_id', selectedCompany.id).eq('year', new Date().getFullYear()),
    ]);
    setLeaveTypes(lt.data || []);
    setEmployees(emp.data || []);
    setApplications((la.data || []).filter((a: any) => a.employees));
    setEntitlements((le.data || []).filter((e: any) => e.employees));
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleApply = async () => {
    if (!form.employee_id || !form.leave_type_id || !form.start_date || !form.end_date) {
      toast.error('Fill all required fields'); return;
    }
    const { error } = await supabase.from('leave_applications').insert({
      employee_id: form.employee_id, leave_type_id: form.leave_type_id,
      start_date: form.start_date, end_date: form.end_date,
      days: +form.days || 1, reason: form.reason || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Leave application submitted');
    setOpen(false);
    setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', days: '1', reason: '' });
    fetchData();
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('leave_applications').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Leave approved');
    fetchData();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from('leave_applications').update({ status: 'rejected' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Leave rejected');
    fetchData();
  };

  const handleCreateType = async () => {
    if (!selectedCompany || !typeForm.code || !typeForm.name) { toast.error('Code and Name required'); return; }
    const { error } = await supabase.from('leave_types').insert({
      company_id: selectedCompany.id, code: typeForm.code, name: typeForm.name,
      default_days: +typeForm.default_days || 0, is_paid: typeForm.is_paid,
      is_carry_forward: typeForm.is_carry_forward, max_carry_forward: +typeForm.max_carry_forward || 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Leave type created');
    setOpenType(false);
    setTypeForm({ code: '', name: '', default_days: '14', is_paid: true, is_carry_forward: false, max_carry_forward: '0' });
    fetchData();
  };

  const statusColor = (s: string) => ({ pending: 'secondary', approved: 'default', rejected: 'destructive', cancelled: 'outline' }[s] || 'secondary') as any;

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Leave Management</h1>
        <div className="flex gap-2">
          <Dialog open={openType} onOpenChange={setOpenType}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Leave Type</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Leave Type</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Code</Label><Input value={typeForm.code} onChange={e => setTypeForm(f => ({ ...f, code: e.target.value }))} placeholder="AL" /></div>
                  <div><Label>Name</Label><Input value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="Annual Leave" /></div>
                </div>
                <div><Label>Default Days</Label><Input type="number" value={typeForm.default_days} onChange={e => setTypeForm(f => ({ ...f, default_days: e.target.value }))} /></div>
                <Button onClick={handleCreateType} className="w-full">Add Leave Type</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Apply Leave</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Apply Leave</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_no} - {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Leave Type</Label>
                  <Select value={form.leave_type_id} onValueChange={v => setForm(f => ({ ...f, leave_type_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{leaveTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                  <div><Label>Days</Label><Input type="number" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} /></div>
                </div>
                <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
                <Button onClick={handleApply} className="w-full">Submit Application</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="balance">Leave Balance</TabsTrigger>
          <TabsTrigger value="types">Leave Types ({leaveTypes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No leave applications</TableCell></TableRow>
                  ) : applications.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{(a.employees as any)?.first_name} {(a.employees as any)?.last_name}</TableCell>
                      <TableCell>{(a.leave_types as any)?.name}</TableCell>
                      <TableCell>{a.start_date}</TableCell>
                      <TableCell>{a.end_date}</TableCell>
                      <TableCell>{a.days}</TableCell>
                      <TableCell className="text-muted-foreground">{a.reason || '—'}</TableCell>
                      <TableCell><Badge variant={statusColor(a.status)}>{a.status}</Badge></TableCell>
                      <TableCell>
                        {a.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleApprove(a.id)}>Approve</Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleReject(a.id)}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Employee</TableHead><TableHead>Leave Type</TableHead><TableHead className="text-right">Entitled</TableHead><TableHead className="text-right">Carry Forward</TableHead><TableHead className="text-right">Used</TableHead><TableHead className="text-right">Balance</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {entitlements.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No entitlements set. Generate entitlements for the current year.</TableCell></TableRow>
                  ) : entitlements.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{(e.employees as any)?.first_name} {(e.employees as any)?.last_name}</TableCell>
                      <TableCell>{(e.leave_types as any)?.name}</TableCell>
                      <TableCell className="text-right">{e.entitled_days}</TableCell>
                      <TableCell className="text-right">{e.carried_forward}</TableCell>
                      <TableCell className="text-right">{e.used_days}</TableCell>
                      <TableCell className="text-right font-bold">{e.balance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Default Days</TableHead><TableHead>Paid</TableHead><TableHead>Carry Forward</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono font-medium">{t.code}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-right">{t.default_days}</TableCell>
                      <TableCell>{t.is_paid ? <Badge>Paid</Badge> : <Badge variant="secondary">Unpaid</Badge>}</TableCell>
                      <TableCell>{t.is_carry_forward ? `Yes (max ${t.max_carry_forward}d)` : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeavePage;
