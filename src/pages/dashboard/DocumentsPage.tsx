import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Image, Download, Trash2, Paperclip, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';

type Attachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string | null;
  created_at: string;
};

const ENTITY_TYPES = [
  { value: 'all', label: 'All Documents' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'expense', label: 'Expenses' },
  { value: 'sales_document', label: 'Sales Documents' },
  { value: 'purchase_document', label: 'Purchase Documents' },
  { value: 'payment', label: 'Payments' },
  { value: 'journal_entry', label: 'Journal Entries' },
];

const DocumentsPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadEntityType, setUploadEntityType] = useState('invoice');
  const [uploadEntityId, setUploadEntityId] = useState('');
  const [entities, setEntities] = useState<{ id: string; label: string }[]>([]);

  const fetchAttachments = async () => {
    if (!selectedCompany) return;
    let query = supabase.from('document_attachments').select('*')
      .eq('company_id', selectedCompany.id)
      .order('created_at', { ascending: false });
    if (filterType !== 'all') query = query.eq('entity_type', filterType);
    const { data } = await query;
    setAttachments((data || []) as Attachment[]);
  };

  useEffect(() => { fetchAttachments(); }, [selectedCompany, filterType]);

  // Fetch available entities for selected type
  useEffect(() => {
    if (!selectedCompany || !showUpload) return;
    const fetchEntities = async () => {
      let items: { id: string; label: string }[] = [];
      if (uploadEntityType === 'invoice') {
        const { data } = await supabase.from('invoices').select('id, invoice_number').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(d => ({ id: d.id, label: d.invoice_number }));
      } else if (uploadEntityType === 'expense') {
        const { data } = await supabase.from('expenses').select('id, description').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(d => ({ id: d.id, label: d.description }));
      } else if (uploadEntityType === 'sales_document') {
        const { data } = await supabase.from('sales_documents').select('id, doc_number, doc_type').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(d => ({ id: d.id, label: `${d.doc_type}: ${d.doc_number}` }));
      } else if (uploadEntityType === 'purchase_document') {
        const { data } = await supabase.from('purchase_documents').select('id, doc_number, doc_type').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(d => ({ id: d.id, label: `${d.doc_type}: ${d.doc_number}` }));
      } else if (uploadEntityType === 'payment') {
        const { data } = await supabase.from('payments').select('id, reference, payment_type').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(d => ({ id: d.id, label: `${d.payment_type}: ${d.reference || d.id.slice(0, 8)}` }));
      } else if (uploadEntityType === 'journal_entry') {
        const { data } = await supabase.from('journal_entries').select('id, reference, description').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(d => ({ id: d.id, label: d.reference || d.description || d.id.slice(0, 8) }));
      }
      setEntities(items);
      if (items.length > 0) setUploadEntityId(items[0].id);
    };
    fetchEntities();
  }, [selectedCompany, uploadEntityType, showUpload]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedCompany || !user || !uploadEntityId) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const filePath = `${selectedCompany.id}/${uploadEntityType}/${uploadEntityId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

        await supabase.from('document_attachments').insert({
          company_id: selectedCompany.id,
          entity_type: uploadEntityType,
          entity_id: uploadEntityId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
        });
      }
      toast.success(`Uploaded ${files.length} file(s)`);
      setShowUpload(false);
      fetchAttachments();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (att: Attachment) => {
    // Extract path from URL
    const pathParts = att.file_url.split('/documents/');
    if (pathParts[1]) {
      await supabase.storage.from('documents').remove([decodeURIComponent(pathParts[1])]);
    }
    await supabase.from('document_attachments').delete().eq('id', att.id);
    toast.success('Document deleted');
    fetchAttachments();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string | null) => {
    if (type?.startsWith('image/')) return <Image className="h-5 w-5 text-primary" />;
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  const filtered = attachments.filter(a =>
    !search || a.file_name.toLowerCase().includes(search.toLowerCase()) || a.entity_type.includes(search.toLowerCase())
  );

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Document Management</h1>
          <p className="text-sm text-muted-foreground">Upload, organize, and access invoices, receipts, and documents from anywhere</p>
        </div>
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogTrigger asChild>
            <Button><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Attach to</Label>
                <Select value={uploadEntityType} onValueChange={v => { setUploadEntityType(v); setUploadEntityId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.filter(t => t.value !== 'all').map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Select Record</Label>
                <Select value={uploadEntityId} onValueChange={setUploadEntityId}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Files (PDF, Images, Excel, CSV)</Label>
                <Input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.xls,.xlsx,.csv" onChange={handleUpload} disabled={uploading || !uploadEntityId} />
              </div>
              {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Attached To</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No documents uploaded yet. Click "Upload Document" to get started.
                </TableCell></TableRow>
              ) : filtered.map(att => (
                <TableRow key={att.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(att.file_type)}
                      <span className="font-medium">{att.file_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{att.entity_type.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatSize(att.file_size)}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(att.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAttachment(att)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsPage;
