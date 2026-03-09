import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, Clock, MapPin, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

type Appointment = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  status: string;
  contact_id: string | null;
  contacts?: { name: string } | null;
};

const AppointmentsPage = () => {
  const { selectedCompany } = useCompany();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', start_at: '', end_at: '', contact_id: '' });

  useEffect(() => { if (selectedCompany) fetchData(); }, [selectedCompany]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from('appointments').select('*, contacts(name)').eq('company_id', selectedCompany!.id).order('start_at', { ascending: true }),
      supabase.from('contacts').select('id, name').eq('company_id', selectedCompany!.id),
    ]);
    setAppointments(a || []);
    setContacts(c || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.start_at || !form.end_at) { toast.error('Title and times required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('appointments').insert({
      company_id: selectedCompany!.id,
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      start_at: form.start_at,
      end_at: form.end_at,
      contact_id: form.contact_id || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Appointment created');
    setShowDialog(false);
    setForm({ title: '', description: '', location: '', start_at: '', end_at: '', contact_id: '' });
    fetchData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    toast.success('Status updated');
    fetchData();
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, dd MMM');
  };

  const upcoming = appointments.filter(a => !isPast(parseISO(a.end_at)) && a.status !== 'cancelled');
  const past = appointments.filter(a => isPast(parseISO(a.end_at)) || a.status === 'completed');

  const statusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">Appointments</h1><p className="text-muted-foreground">Schedule and manage meetings</p></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Appointment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
                <div><Label>End</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
              </div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Optional" /></div>
              <div><Label>Contact</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{appointments.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{upcoming.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{appointments.filter(a => isToday(parseISO(a.start_at))).length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{appointments.filter(a => a.status === 'completed').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Upcoming Appointments</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : upcoming.length === 0 ? <p className="text-muted-foreground">No upcoming appointments</p> : (
            <div className="space-y-3">
              {upcoming.map(apt => (
                <div key={apt.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{apt.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getDateLabel(apt.start_at)} {format(parseISO(apt.start_at), 'HH:mm')} - {format(parseISO(apt.end_at), 'HH:mm')}</span>
                      {apt.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{apt.location}</span>}
                      {apt.contacts && <span className="flex items-center gap-1"><User className="h-3 w-3" />{apt.contacts.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor(apt.status)}>{apt.status}</Badge>
                    <Select value={apt.status} onValueChange={(v) => handleStatusChange(apt.id, v)}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-muted-foreground">Past Appointments</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Date</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {past.slice(0, 20).map(apt => (
                  <TableRow key={apt.id}><TableCell>{apt.title}</TableCell><TableCell>{format(parseISO(apt.start_at), 'dd MMM yyyy HH:mm')}</TableCell><TableCell>{apt.contacts?.name || '-'}</TableCell><TableCell><Badge variant={statusColor(apt.status)}>{apt.status}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AppointmentsPage;
