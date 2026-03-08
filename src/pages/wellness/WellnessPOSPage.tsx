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
import { Plus, Calendar, Users, Gift, Award, Clock, DollarSign, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const APPT_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

const WellnessPOSPage = () => {
  const { selectedCompany } = useCompany();
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Form states
  const [serviceOpen, setServiceOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);

  const [serviceForm, setServiceForm] = useState({ name: '', category: '', duration_minutes: '60', price: '', commission_rate: '', description: '' });
  const [packageForm, setPackageForm] = useState({ name: '', description: '', total_sessions: '1', price: '', validity_days: '365' });
  const [memberForm, setMemberForm] = useState({ member_name: '', member_phone: '', member_email: '', membership_type: 'standard' });
  const [apptForm, setApptForm] = useState({ membership_id: '', service_id: '', therapist_id: '', appointment_date: '', start_time: '', room_slot: '', notes: '' });

  const fetchAll = async () => {
    if (!selectedCompany) return;
    const [sv, pk, mb, ap, cm, emp] = await Promise.all([
      supabase.from('wellness_services').select('*').eq('company_id', selectedCompany.id).order('name'),
      supabase.from('wellness_packages').select('*').eq('company_id', selectedCompany.id).order('name'),
      supabase.from('wellness_memberships').select('*').eq('company_id', selectedCompany.id).order('member_name'),
      supabase.from('wellness_appointments').select('*, wellness_services(name), wellness_memberships(member_name), employees(first_name, last_name)').eq('company_id', selectedCompany.id).order('appointment_date', { ascending: false }),
      supabase.from('wellness_commissions').select('*, employees(first_name, last_name)').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }),
      supabase.from('employees').select('id, first_name, last_name, position').eq('company_id', selectedCompany.id).eq('is_active', true),
    ]);
    setServices(sv.data || []);
    setPackages(pk.data || []);
    setMemberships(mb.data || []);
    setAppointments(ap.data || []);
    setCommissions(cm.data || []);
    setEmployees(emp.data || []);
  };

  useEffect(() => { fetchAll(); }, [selectedCompany]);

  const addService = async () => {
    if (!selectedCompany || !serviceForm.name) return;
    const { error } = await supabase.from('wellness_services').insert({
      company_id: selectedCompany.id, name: serviceForm.name, category: serviceForm.category || null,
      duration_minutes: parseInt(serviceForm.duration_minutes) || 60,
      price: parseFloat(serviceForm.price) || 0,
      commission_rate: parseFloat(serviceForm.commission_rate) || 0,
      description: serviceForm.description || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Service added');
    setServiceOpen(false);
    setServiceForm({ name: '', category: '', duration_minutes: '60', price: '', commission_rate: '', description: '' });
    fetchAll();
  };

  const addPackage = async () => {
    if (!selectedCompany || !packageForm.name) return;
    const { error } = await supabase.from('wellness_packages').insert({
      company_id: selectedCompany.id, name: packageForm.name, description: packageForm.description || null,
      total_sessions: parseInt(packageForm.total_sessions) || 1,
      price: parseFloat(packageForm.price) || 0,
      validity_days: parseInt(packageForm.validity_days) || 365,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Package added');
    setPackageOpen(false);
    setPackageForm({ name: '', description: '', total_sessions: '1', price: '', validity_days: '365' });
    fetchAll();
  };

  const addMember = async () => {
    if (!selectedCompany || !memberForm.member_name) return;
    const { error } = await supabase.from('wellness_memberships').insert({
      company_id: selectedCompany.id, ...memberForm,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Member added');
    setMemberOpen(false);
    setMemberForm({ member_name: '', member_phone: '', member_email: '', membership_type: 'standard' });
    fetchAll();
  };

  const addAppointment = async () => {
    if (!selectedCompany || !apptForm.appointment_date || !apptForm.start_time) return;
    const service = services.find(s => s.id === apptForm.service_id);
    const price = service?.price || 0;
    const commRate = service?.commission_rate || 0;
    const commAmount = price * commRate / 100;

    const { data: appt, error } = await supabase.from('wellness_appointments').insert({
      company_id: selectedCompany.id,
      membership_id: apptForm.membership_id || null,
      service_id: apptForm.service_id || null,
      therapist_id: apptForm.therapist_id || null,
      appointment_date: apptForm.appointment_date,
      start_time: apptForm.start_time,
      room_slot: apptForm.room_slot || null,
      price, commission_amount: commAmount,
      notes: apptForm.notes || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }

    // Auto-create commission record
    if (apptForm.therapist_id && commAmount > 0) {
      await supabase.from('wellness_commissions').insert({
        company_id: selectedCompany.id, employee_id: apptForm.therapist_id,
        appointment_id: appt.id, service_name: service?.name,
        commission_rate: commRate, commission_amount: commAmount,
        period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(),
      });
    }

    toast.success('Appointment booked');
    setApptOpen(false);
    setApptForm({ membership_id: '', service_id: '', therapist_id: '', appointment_date: '', start_time: '', room_slot: '', notes: '' });
    fetchAll();
  };

  const updateApptStatus = async (id: string, status: string) => {
    await supabase.from('wellness_appointments').update({ status }).eq('id', id);
    toast.success('Status updated');
    fetchAll();
  };

  const todayAppts = appointments.filter(a => a.appointment_date === new Date().toISOString().split('T')[0]);
  const totalCommissions = commissions.reduce((s, c) => s + (c.commission_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wellness POS</h1>
          <p className="text-muted-foreground">Appointments, packages, memberships & commissions</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Calendar className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Today's Appts</p><p className="text-2xl font-bold">{todayAppts.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Members</p><p className="text-2xl font-bold">{memberships.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Gift className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Packages</p><p className="text-2xl font-bold">{packages.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Award className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Services</p><p className="text-2xl font-bold">{services.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Commissions</p><p className="text-2xl font-bold">RM {totalCommissions.toFixed(2)}</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        {/* Appointments */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={apptOpen} onOpenChange={setApptOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Book Appointment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Member (optional)</Label>
                    <Select value={apptForm.membership_id} onValueChange={v => setApptForm({ ...apptForm, membership_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Walk-in" /></SelectTrigger>
                      <SelectContent><SelectItem value="">Walk-in</SelectItem>{memberships.map(m => <SelectItem key={m.id} value={m.id}>{m.member_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Service</Label>
                    <Select value={apptForm.service_id} onValueChange={v => setApptForm({ ...apptForm, service_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (RM {s.price})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Therapist / Staff</Label>
                    <Select value={apptForm.therapist_id} onValueChange={v => setApptForm({ ...apptForm, therapist_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Date</Label><Input type="date" value={apptForm.appointment_date} onChange={e => setApptForm({ ...apptForm, appointment_date: e.target.value })} /></div>
                    <div><Label>Time</Label><Input type="time" value={apptForm.start_time} onChange={e => setApptForm({ ...apptForm, start_time: e.target.value })} /></div>
                  </div>
                  <div><Label>Room / Slot</Label><Input value={apptForm.room_slot} onChange={e => setApptForm({ ...apptForm, room_slot: e.target.value })} placeholder="Room 1" /></div>
                  <div><Label>Notes</Label><Input value={apptForm.notes} onChange={e => setApptForm({ ...apptForm, notes: e.target.value })} /></div>
                  <Button onClick={addAppointment} className="w-full">Book</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Member</TableHead><TableHead>Service</TableHead><TableHead>Therapist</TableHead><TableHead>Room</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {appointments.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.appointment_date}</TableCell>
                  <TableCell>{a.start_time?.slice(0, 5)}</TableCell>
                  <TableCell>{(a.wellness_memberships as any)?.member_name || 'Walk-in'}</TableCell>
                  <TableCell>{(a.wellness_services as any)?.name || '-'}</TableCell>
                  <TableCell>{(a.employees as any) ? `${(a.employees as any).first_name} ${(a.employees as any).last_name}` : '-'}</TableCell>
                  <TableCell>{a.room_slot || '-'}</TableCell>
                  <TableCell>RM {(a.price || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={a.status === 'completed' ? 'default' : a.status === 'cancelled' ? 'destructive' : 'secondary'}>{a.status}</Badge></TableCell>
                  <TableCell>
                    <Select onValueChange={v => updateApptStatus(a.id, v)}>
                      <SelectTrigger className="h-8 w-28"><SelectValue placeholder="Update" /></SelectTrigger>
                      <SelectContent>{APPT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {appointments.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No appointments</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Service</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Service Name</Label><Input value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} /></div>
                  <div><Label>Category</Label><Input value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })} placeholder="Facial, Massage, etc." /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Duration (min)</Label><Input type="number" value={serviceForm.duration_minutes} onChange={e => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })} /></div>
                    <div><Label>Price (RM)</Label><Input type="number" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} /></div>
                    <div><Label>Commission %</Label><Input type="number" value={serviceForm.commission_rate} onChange={e => setServiceForm({ ...serviceForm, commission_rate: e.target.value })} /></div>
                  </div>
                  <Button onClick={addService} className="w-full">Add Service</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table>
            <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Category</TableHead><TableHead>Duration</TableHead><TableHead>Price</TableHead><TableHead>Commission</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {services.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.category || '-'}</TableCell>
                  <TableCell>{s.duration_minutes} min</TableCell>
                  <TableCell>RM {(s.price || 0).toFixed(2)}</TableCell>
                  <TableCell>{s.commission_rate}%</TableCell>
                  <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></Card>
        </TabsContent>

        {/* Packages */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={packageOpen} onOpenChange={setPackageOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Package</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Package</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Package Name</Label><Input value={packageForm.name} onChange={e => setPackageForm({ ...packageForm, name: e.target.value })} /></div>
                  <div><Label>Description</Label><Input value={packageForm.description} onChange={e => setPackageForm({ ...packageForm, description: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Sessions</Label><Input type="number" value={packageForm.total_sessions} onChange={e => setPackageForm({ ...packageForm, total_sessions: e.target.value })} /></div>
                    <div><Label>Price (RM)</Label><Input type="number" value={packageForm.price} onChange={e => setPackageForm({ ...packageForm, price: e.target.value })} /></div>
                    <div><Label>Validity (days)</Label><Input type="number" value={packageForm.validity_days} onChange={e => setPackageForm({ ...packageForm, validity_days: e.target.value })} /></div>
                  </div>
                  <Button onClick={addPackage} className="w-full">Add Package</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map(p => (
              <Card key={p.id}>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{p.description || ''}</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Sessions:</span> {p.total_sessions}</p>
                    <p><span className="text-muted-foreground">Validity:</span> {p.validity_days} days</p>
                    <p className="text-xl font-bold text-primary mt-2">RM {(p.price || 0).toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {packages.length === 0 && <Card className="col-span-3"><CardContent className="py-8 text-center text-muted-foreground">No packages yet</CardContent></Card>}
          </div>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Member</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Name</Label><Input value={memberForm.member_name} onChange={e => setMemberForm({ ...memberForm, member_name: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={memberForm.member_phone} onChange={e => setMemberForm({ ...memberForm, member_phone: e.target.value })} /></div>
                  <div><Label>Email</Label><Input value={memberForm.member_email} onChange={e => setMemberForm({ ...memberForm, member_email: e.target.value })} /></div>
                  <div><Label>Type</Label>
                    <Select value={memberForm.membership_type} onValueChange={v => setMemberForm({ ...memberForm, membership_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="gold">Gold</SelectItem><SelectItem value="platinum">Platinum</SelectItem><SelectItem value="vip">VIP</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addMember} className="w-full">Add Member</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Type</TableHead><TableHead>Points</TableHead><TableHead>Credit</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {memberships.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.member_name}</TableCell>
                  <TableCell>{m.member_phone || '-'}</TableCell>
                  <TableCell>{m.member_email || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{m.membership_type}</Badge></TableCell>
                  <TableCell>{m.points_balance}</TableCell>
                  <TableCell>RM {(m.credit_balance || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge></TableCell>
                </TableRow>
              ))}
              {memberships.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No members yet</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>

        {/* Commissions */}
        <TabsContent value="commissions" className="space-y-4">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Service</TableHead><TableHead>Rate</TableHead><TableHead>Amount</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {commissions.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{(c.employees as any) ? `${(c.employees as any).first_name} ${(c.employees as any).last_name}` : '-'}</TableCell>
                  <TableCell>{c.service_name || '-'}</TableCell>
                  <TableCell>{c.commission_rate}%</TableCell>
                  <TableCell>RM {(c.commission_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{c.period_month}/{c.period_year}</TableCell>
                  <TableCell><Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {commissions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No commissions yet</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WellnessPOSPage;
