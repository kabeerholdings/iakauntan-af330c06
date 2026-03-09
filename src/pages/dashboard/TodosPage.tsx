import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckSquare, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { format, isPast, isToday, parseISO } from 'date-fns';

type Todo = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

const TodosPage = () => {
  const { selectedCompany } = useCompany();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [filter, setFilter] = useState('all');

  useEffect(() => { if (selectedCompany) fetchTodos(); }, [selectedCompany]);

  const fetchTodos = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTodos(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('todos').insert({
      company_id: selectedCompany!.id,
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      due_date: form.due_date || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Task added');
    setShowDialog(false);
    setForm({ title: '', description: '', priority: 'medium', due_date: '' });
    fetchTodos();
  };

  const toggleComplete = async (todo: Todo) => {
    const newStatus = todo.status === 'done' ? 'todo' : 'done';
    await supabase.from('todos').update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }).eq('id', todo.id);
    fetchTodos();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id);
    toast.success('Task deleted');
    fetchTodos();
  };

  const filtered = todos.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'active') return t.status !== 'done';
    if (filter === 'done') return t.status === 'done';
    if (filter === 'overdue') return t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'done';
    return true;
  });

  const priorityColor = (p: string) => {
    switch (p) { case 'high': return 'destructive'; case 'medium': return 'secondary'; default: return 'outline'; }
  };

  const overdue = todos.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'done');
  const dueToday = todos.filter(t => t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'done');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">To-Do List</h1><p className="text-muted-foreground">Track and manage your tasks</p></div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Task</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{todos.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{todos.filter(t => t.status !== 'done').length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Due Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{dueToday.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{overdue.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5" />Tasks</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-muted-foreground">No tasks found</p> : (
            <div className="space-y-2">
              {filtered.map(todo => (
                <div key={todo.id} className={`flex items-start gap-3 p-3 border rounded-lg ${todo.status === 'done' ? 'opacity-60' : ''}`}>
                  <Checkbox checked={todo.status === 'done'} onCheckedChange={() => toggleComplete(todo)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${todo.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{todo.title}</p>
                    {todo.description && <p className="text-sm text-muted-foreground truncate">{todo.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={priorityColor(todo.priority)}>{todo.priority}</Badge>
                      {todo.due_date && (
                        <span className={`text-xs flex items-center gap-1 ${isPast(parseISO(todo.due_date)) && todo.status !== 'done' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {isPast(parseISO(todo.due_date)) && todo.status !== 'done' ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {format(parseISO(todo.due_date), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(todo.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TodosPage;
