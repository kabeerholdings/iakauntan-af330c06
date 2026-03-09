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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, StickyNote, Trash2, Eye, EyeOff, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

type DocumentNote = {
  id: string;
  entity_type: string;
  entity_id: string;
  note_type: string;
  position: string;
  content: string;
  is_visible_on_print: boolean;
  sort_order: number;
};

const entityTypes = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
];

const positions = [
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'terms', label: 'Terms & Conditions' },
  { value: 'notes', label: 'Notes' },
];

const DocumentNotesPage = () => {
  const { selectedCompany } = useCompany();
  const [notes, setNotes] = useState<DocumentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editNote, setEditNote] = useState<DocumentNote | null>(null);
  const [form, setForm] = useState({ entity_type: 'invoice', entity_id: '', note_type: 'template', position: 'footer', content: '', is_visible_on_print: true });

  useEffect(() => { if (selectedCompany) fetchNotes(); }, [selectedCompany]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase.from('document_notes').select('*').eq('company_id', selectedCompany!.id).order('entity_type', { ascending: true }).order('sort_order', { ascending: true });
    setNotes(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.content.trim()) { toast.error('Content required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('document_notes').insert({
      company_id: selectedCompany!.id,
      entity_type: form.entity_type,
      entity_id: form.entity_id || 'template',
      note_type: form.note_type,
      position: form.position,
      content: form.content,
      is_visible_on_print: form.is_visible_on_print,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Note created');
    setShowDialog(false);
    resetForm();
    fetchNotes();
  };

  const handleUpdate = async () => {
    if (!editNote || !form.content.trim()) return;
    const { error } = await supabase.from('document_notes').update({
      content: form.content,
      position: form.position,
      is_visible_on_print: form.is_visible_on_print,
    }).eq('id', editNote.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Note updated');
    setEditNote(null);
    resetForm();
    fetchNotes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('document_notes').delete().eq('id', id);
    toast.success('Note deleted');
    fetchNotes();
  };

  const resetForm = () => setForm({ entity_type: 'invoice', entity_id: '', note_type: 'template', position: 'footer', content: '', is_visible_on_print: true });

  const openEdit = (note: DocumentNote) => {
    setEditNote(note);
    setForm({ entity_type: note.entity_type, entity_id: note.entity_id, note_type: note.note_type, position: note.position, content: note.content, is_visible_on_print: note.is_visible_on_print });
  };

  const grouped = entityTypes.map(et => ({
    ...et,
    notes: notes.filter(n => n.entity_type === et.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">Document Notes</h1><p className="text-muted-foreground">Manage dynamic notes for invoices and documents</p></div>
        <Dialog open={showDialog || !!editNote} onOpenChange={(open) => { if (!open) { setEditNote(null); resetForm(); } setShowDialog(open); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Note</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editNote ? 'Edit Note' : 'Create Note Template'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Document Type</Label>
                  <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v })} disabled={!!editNote}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{entityTypes.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Position</Label>
                  <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{positions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Content</Label><Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Enter note content..." /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_visible_on_print} onCheckedChange={(c) => setForm({ ...form, is_visible_on_print: c })} />
                <Label>Visible on printed documents</Label>
              </div>
              <Button onClick={editNote ? handleUpdate : handleCreate}>{editNote ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Notes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{notes.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Invoice Notes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{notes.filter(n => n.entity_type === 'invoice').length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Quotation Notes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{notes.filter(n => n.entity_type === 'quotation').length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Visible on Print</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{notes.filter(n => n.is_visible_on_print).length}</p></CardContent></Card>
      </div>

      {grouped.map(g => g.notes.length > 0 && (
        <Card key={g.value}>
          <CardHeader><CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5" />{g.label} Notes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Position</TableHead><TableHead>Content</TableHead><TableHead>Print</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {g.notes.map(note => (
                  <TableRow key={note.id}>
                    <TableCell><Badge variant="outline">{positions.find(p => p.value === note.position)?.label}</Badge></TableCell>
                    <TableCell className="max-w-md truncate">{note.content}</TableCell>
                    <TableCell>{note.is_visible_on_print ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(note)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(note.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {notes.length === 0 && !loading && (
        <Card><CardContent className="py-12 text-center"><StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No document notes yet. Create templates for invoices, quotations, etc.</p></CardContent></Card>
      )}
    </div>
  );
};

export default DocumentNotesPage;
