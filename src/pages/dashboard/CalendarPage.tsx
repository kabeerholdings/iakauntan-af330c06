import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';

type CalendarEvent = { id: string; title: string; event_type: string; start_date: string; end_date: string | null; all_day: boolean; color: string | null };

const eventColors: Record<string, string> = { general: 'bg-primary', meeting: 'bg-blue-500', deadline: 'bg-red-500', reminder: 'bg-amber-500', holiday: 'bg-green-500' };

const CalendarPage = () => {
  const { selectedCompany } = useCompany();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({ title: '', event_type: 'general', start_date: '', end_date: '', all_day: true });

  useEffect(() => { if (selectedCompany) fetchEvents(); }, [selectedCompany, currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const { data } = await supabase.from('calendar_events').select('*').eq('company_id', selectedCompany!.id).gte('start_date', start).lte('start_date', end + 'T23:59:59');
    setEvents(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.start_date) { toast.error('Title and date required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('calendar_events').insert({
      company_id: selectedCompany!.id,
      title: form.title,
      event_type: form.event_type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      all_day: form.all_day,
      color: eventColors[form.event_type]?.replace('bg-', ''),
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Event created');
    setShowDialog(false);
    setForm({ title: '', event_type: 'general', start_date: '', end_date: '', all_day: true });
    fetchEvents();
  };

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(parseISO(e.start_date), day));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setForm({ ...form, start_date: format(day, "yyyy-MM-dd'T'09:00") });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">Calendar</h1><p className="text-muted-foreground">View and manage events</p></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CalIcon className="h-5 w-5" />{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setCurrentMonth(new Date())}>Today</Button>
              <Button size="icon" variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {paddingDays.map((_, i) => <div key={`pad-${i}`} className="bg-background p-2 min-h-[80px]" />)}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day.toISOString()} onClick={() => handleDayClick(day)} className={`bg-background p-2 min-h-[80px] cursor-pointer hover:bg-muted/50 transition-colors ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground' : ''}`}>
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{format(day, 'd')}</div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className={`text-xs px-1 py-0.5 rounded truncate text-white ${eventColors[e.event_type] || 'bg-primary'}`}>{e.title}</div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upcoming Events</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? <p className="text-muted-foreground">No events this month</p> : (
            <div className="space-y-2">
              {events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center gap-3 p-2 border rounded">
                  <div className={`w-2 h-2 rounded-full ${eventColors[e.event_type] || 'bg-primary'}`} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(e.start_date), 'EEE, dd MMM HH:mm')}</p>
                  </div>
                  <Badge variant="outline">{e.event_type}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
