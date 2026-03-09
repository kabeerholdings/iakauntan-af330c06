import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Clock, Mail, FileText, Trash2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

type ScheduledReport = {
  id: string;
  report_name: string;
  report_type: string;
  frequency: string;
  recipients: string[];
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
};

const reportTypes = [
  { value: 'profit_loss', label: 'Profit & Loss' },
  { value: 'balance_sheet', label: 'Balance Sheet' },
  { value: 'cash_flow', label: 'Cash Flow' },
  { value: 'aged_receivables', label: 'Aged Receivables' },
  { value: 'aged_payables', label: 'Aged Payables' },
  { value: 'sales_summary', label: 'Sales Summary' },
  { value: 'expense_summary', label: 'Expense Summary' },
  { value: 'inventory_valuation', label: 'Inventory Valuation' },
];

const frequencies = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const ScheduledReportsPage = () => {
  const { selectedCompany } = useCompany();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ report_name: '', report_type: 'profit_loss', frequency: 'monthly', recipients: '' });

  useEffect(() => { if (selectedCompany) fetchReports(); }, [selectedCompany]);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase.from('scheduled_reports').select('*').eq('company_id', selectedCompany!.id).order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  const getNextSendDate = (frequency: string) => {
    const now = new Date();
    switch (frequency) {
      case 'daily': return addDays(now, 1);
      case 'weekly': return addWeeks(now, 1);
      case 'monthly': return addMonths(now, 1);
      case 'quarterly': return addMonths(now, 3);
      default: return addMonths(now, 1);
    }
  };

  const handleCreate = async () => {
    if (!form.report_name.trim() || !form.recipients.trim()) { toast.error('Name and recipients required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const recipientList = form.recipients.split(',').map(r => r.trim()).filter(Boolean);
    const { error } = await supabase.from('scheduled_reports').insert({
      company_id: selectedCompany!.id,
      report_name: form.report_name,
      report_type: form.report_type,
      frequency: form.frequency,
      recipients: recipientList,
      next_send_at: getNextSendDate(form.frequency).toISOString(),
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Scheduled report created');
    setShowDialog(false);
    setForm({ report_name: '', report_type: 'profit_loss', frequency: 'monthly', recipients: '' });
    fetchReports();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('scheduled_reports').update({ is_active: !current }).eq('id', id);
    toast.success(current ? 'Report paused' : 'Report activated');
    fetchReports();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('scheduled_reports').delete().eq('id', id);
    toast.success('Scheduled report deleted');
    fetchReports();
  };

  const handleRunNow = async (report: ScheduledReport) => {
    toast.success(`Report "${report.report_name}" would be generated and sent to ${(report.recipients as string[]).length} recipients`);
    await supabase.from('scheduled_reports').update({ last_sent_at: new Date().toISOString(), next_send_at: getNextSendDate(report.frequency).toISOString() }).eq('id', report.id);
    fetchReports();
  };

  const active = reports.filter(r => r.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">Scheduled Reports</h1><p className="text-muted-foreground">Automate report generation and delivery</p></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Schedule Report</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Report</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Report Name</Label><Input value={form.report_name} onChange={(e) => setForm({ ...form, report_name: e.target.value })} placeholder="e.g., Monthly P&L Report" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Report Type</Label>
                  <Select value={form.report_type} onValueChange={(v) => setForm({ ...form, report_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{reportTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{frequencies.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Recipients (comma-separated emails)</Label><Input value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder="email1@example.com, email2@example.com" /></div>
              <Button onClick={handleCreate}>Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Scheduled</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{reports.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{active.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Daily</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{reports.filter(r => r.frequency === 'daily').length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Monthly</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{reports.filter(r => r.frequency === 'monthly').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Scheduled Reports</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : reports.length === 0 ? (
            <div className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No scheduled reports. Create one to automate report delivery.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Type</TableHead><TableHead>Frequency</TableHead><TableHead>Recipients</TableHead><TableHead>Next Send</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id} className={!r.is_active ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{r.report_name}</TableCell>
                    <TableCell>{reportTypes.find(t => t.value === r.report_type)?.label}</TableCell>
                    <TableCell><Badge variant="outline">{r.frequency}</Badge></TableCell>
                    <TableCell><span className="flex items-center gap-1"><Mail className="h-3 w-3" />{(r.recipients as string[]).length}</span></TableCell>
                    <TableCell>{r.next_send_at ? format(new Date(r.next_send_at), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleRunNow(r)} title="Run now"><Play className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
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

export default ScheduledReportsPage;
