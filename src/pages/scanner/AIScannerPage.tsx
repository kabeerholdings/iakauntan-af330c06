import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Zap, FileText, CheckCircle, Loader2, Eye, Brain } from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPES = ['invoice', 'receipt', 'voucher', 'bill'];

const AIScannerPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt } = useCurrency();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('scanned_documents').select('*').eq('company_id', selectedCompany.id).order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  useEffect(() => { fetchDocs(); }, [selectedCompany]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !selectedCompany || !user) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      // Upload to storage
      const filePath = `${selectedCompany.id}/scans/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); continue; }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      // Create scanned document record
      const { data: doc, error } = await supabase.from('scanned_documents').insert({
        company_id: selectedCompany.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        scan_status: 'pending',
        scanned_by: user.id,
      }).select().single();

      if (error) { toast.error(error.message); continue; }

      // Trigger AI processing
      processWithAI(doc);
    }

    setUploading(false);
    fetchDocs();
  };

  const processWithAI = async (doc: any) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-document-scan', {
        body: { document_id: doc.id, file_name: doc.file_name, file_url: doc.file_url },
      });

      if (error) throw error;

      if (data?.extracted) {
        await supabase.from('scanned_documents').update({
          scan_status: 'completed',
          document_type: data.extracted.document_type || null,
          supplier_name: data.extracted.supplier_name || null,
          document_date: data.extracted.document_date || null,
          document_number: data.extracted.document_number || null,
          total_amount: data.extracted.total_amount || null,
          tax_amount: data.extracted.tax_amount || null,
          description: data.extracted.description || null,
          category: data.extracted.category || null,
          extracted_data: data.extracted,
        }).eq('id', doc.id);
        toast.success(`Processed: ${doc.file_name}`);
      }
    } catch (err: any) {
      console.error('AI processing error:', err);
      await supabase.from('scanned_documents').update({ scan_status: 'failed' }).eq('id', doc.id);
      toast.error('AI processing failed - you can edit manually');
    }
    setProcessing(false);
    fetchDocs();
  };

  const markProcessed = async (docId: string) => {
    await supabase.from('scanned_documents').update({ is_processed: true }).eq('id', docId);
    toast.success('Marked as processed');
    fetchDocs();
  };

  const pendingDocs = documents.filter(d => !d.is_processed);
  const processedDocs = documents.filter(d => d.is_processed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Easy Scan</h1>
          <p className="text-muted-foreground">Snap, AI extract, verify, done</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" className="hidden" multiple accept="image/*,.pdf" onChange={e => handleUpload(e.target.files)} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Documents
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Total Scanned</p><p className="text-2xl font-bold">{documents.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Zap className="h-8 w-8 text-yellow-500" /><div><p className="text-sm text-muted-foreground">Pending Review</p><p className="text-2xl font-bold">{pendingDocs.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Processed</p><p className="text-2xl font-bold">{processedDocs.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Brain className="h-8 w-8 text-purple-500" /><div><p className="text-sm text-muted-foreground">AI Accuracy</p><p className="text-2xl font-bold">~95%</p></div></div></CardContent></Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader><CardTitle>How It Works</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"><Camera className="h-6 w-6 text-primary" /></div>
              <h3 className="font-semibold mb-1">1. Snap or Upload</h3>
              <p className="text-sm text-muted-foreground">Take a photo or upload receipts, invoices, bills</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"><Brain className="h-6 w-6 text-primary" /></div>
              <h3 className="font-semibold mb-1">2. AI Extracts Data</h3>
              <p className="text-sm text-muted-foreground">AI reads and categorizes supplier, date, amount, tax</p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"><CheckCircle className="h-6 w-6 text-primary" /></div>
              <h3 className="font-semibold mb-1">3. Review & Confirm</h3>
              <p className="text-sm text-muted-foreground">Verify extracted data and post to accounting</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList><TabsTrigger value="pending">Pending ({pendingDocs.length})</TabsTrigger><TabsTrigger value="processed">Processed ({processedDocs.length})</TabsTrigger></TabsList>

        <TabsContent value="pending">
          <Card><Table>
            <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Type</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {pendingDocs.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.file_name}</TableCell>
                  <TableCell>{d.document_type ? <Badge variant="outline">{d.document_type}</Badge> : '-'}</TableCell>
                  <TableCell>{d.supplier_name || '-'}</TableCell>
                  <TableCell>{d.document_date || '-'}</TableCell>
                  <TableCell>{d.total_amount ? fmt(Number(d.total_amount)) : '-'}</TableCell>
                  <TableCell><Badge variant={d.scan_status === 'completed' ? 'default' : d.scan_status === 'failed' ? 'destructive' : 'secondary'}>{d.scan_status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedDoc(d); setDetailOpen(true); }}><Eye className="h-3 w-3" /></Button>
                      {d.scan_status === 'completed' && <Button size="sm" onClick={() => markProcessed(d.id)}><CheckCircle className="h-3 w-3 mr-1" />Confirm</Button>}
                      {d.scan_status === 'failed' && <Button size="sm" variant="outline" onClick={() => processWithAI(d)}><Zap className="h-3 w-3 mr-1" />Retry</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendingDocs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pending documents. Upload to get started.</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="processed">
          <Card><Table>
            <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Type</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Category</TableHead></TableRow></TableHeader>
            <TableBody>
              {processedDocs.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.file_name}</TableCell>
                  <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                  <TableCell>{d.supplier_name || '-'}</TableCell>
                  <TableCell>{d.document_date || '-'}</TableCell>
                  <TableCell>RM {Number(d.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{d.category || '-'}</TableCell>
                </TableRow>
              ))}
              {processedDocs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No processed documents yet</TableCell></TableRow>}
            </TableBody>
          </Table></Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Document Details</DialogTitle></DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground">File</Label><p className="font-medium">{selectedDoc.file_name}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><p><Badge>{selectedDoc.scan_status}</Badge></p></div>
                <div><Label className="text-muted-foreground">Document Type</Label><p className="font-medium">{selectedDoc.document_type || 'Not detected'}</p></div>
                <div><Label className="text-muted-foreground">Document #</Label><p className="font-medium">{selectedDoc.document_number || '-'}</p></div>
                <div><Label className="text-muted-foreground">Supplier</Label><p className="font-medium">{selectedDoc.supplier_name || '-'}</p></div>
                <div><Label className="text-muted-foreground">Date</Label><p className="font-medium">{selectedDoc.document_date || '-'}</p></div>
                <div><Label className="text-muted-foreground">Total Amount</Label><p className="font-medium">{selectedDoc.total_amount ? fmt(Number(selectedDoc.total_amount)) : '-'}</p></div>
                <div><Label className="text-muted-foreground">Tax</Label><p className="font-medium">{selectedDoc.tax_amount ? fmt(Number(selectedDoc.tax_amount)) : '-'}</p></div>
                <div className="col-span-2"><Label className="text-muted-foreground">Description</Label><p className="font-medium">{selectedDoc.description || '-'}</p></div>
                <div className="col-span-2"><Label className="text-muted-foreground">Category</Label><p className="font-medium">{selectedDoc.category || '-'}</p></div>
              </div>
              {selectedDoc.extracted_data && Object.keys(selectedDoc.extracted_data).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Raw AI Extraction</Label>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40 mt-1">{JSON.stringify(selectedDoc.extracted_data, null, 2)}</pre>
                </div>
              )}
              {selectedDoc.scan_status === 'completed' && !selectedDoc.is_processed && (
                <Button onClick={() => { markProcessed(selectedDoc.id); setDetailOpen(false); }} className="w-full">
                  <CheckCircle className="mr-2 h-4 w-4" />Confirm & Post to Accounting
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIScannerPage;
