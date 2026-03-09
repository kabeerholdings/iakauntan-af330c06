import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Activity, FileText, Users, Package, Receipt, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  created_at: string;
};

const AuditLogPage = () => {
  const { selectedCompany } = useCompany();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => { if (selectedCompany) fetchLogs(); }, [selectedCompany]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('audit_logs').select('*').eq('company_id', selectedCompany!.id).order('created_at', { ascending: false }).limit(500);
    setLogs((data as AuditLog[]) || []);
    setLoading(false);
  };

  const entityTypes = [...new Set(logs.map(l => l.entity_type))];
  const actions = [...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(l => {
    const matchSearch = search === '' || l.entity_name?.toLowerCase().includes(search.toLowerCase()) || l.entity_type.toLowerCase().includes(search.toLowerCase());
    const matchEntity = filterEntity === 'all' || l.entity_type === filterEntity;
    const matchAction = filterAction === 'all' || l.action === filterAction;
    return matchSearch && matchEntity && matchAction;
  });

  const actionColor = (action: string) => {
    if (action.includes('create') || action.includes('insert')) return 'default';
    if (action.includes('update') || action.includes('edit')) return 'secondary';
    if (action.includes('delete') || action.includes('remove')) return 'destructive';
    return 'outline';
  };

  const entityIcon = (entity: string) => {
    if (entity.includes('invoice')) return <Receipt className="h-4 w-4" />;
    if (entity.includes('contact')) return <Users className="h-4 w-4" />;
    if (entity.includes('stock') || entity.includes('item')) return <Package className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground">Track all system activities and changes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{logs.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Creates</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{logs.filter(l => l.action.includes('create')).length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Updates</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{logs.filter(l => l.action.includes('update')).length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deletes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{logs.filter(l => l.action.includes('delete')).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Activity Log</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 w-48" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Entities</SelectItem>{entityTypes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Actions</SelectItem>{actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-muted-foreground">No audit logs found</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Name</TableHead><TableHead>IP Address</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}</TableCell>
                    <TableCell><Badge variant={actionColor(log.action)}>{log.action}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-2">{entityIcon(log.entity_type)}<span>{log.entity_type}</span></div></TableCell>
                    <TableCell className="font-medium">{log.entity_name || log.entity_id?.slice(0, 8) || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.ip_address || '-'}</TableCell>
                    <TableCell><button onClick={() => setSelectedLog(log)} className="text-primary hover:underline flex items-center gap-1"><Eye className="h-3 w-3" />View</button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Audit Details</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Action:</span> <Badge variant={actionColor(selectedLog.action)}>{selectedLog.action}</Badge></div>
                <div><span className="text-muted-foreground">Entity:</span> {selectedLog.entity_type}</div>
                <div><span className="text-muted-foreground">Name:</span> {selectedLog.entity_name || '-'}</div>
                <div><span className="text-muted-foreground">Time:</span> {format(new Date(selectedLog.created_at), 'PPpp')}</div>
              </div>
              {selectedLog.old_values && (
                <div><p className="text-sm font-medium mb-2">Old Values:</p><pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">{JSON.stringify(selectedLog.old_values, null, 2)}</pre></div>
              )}
              {selectedLog.new_values && (
                <div><p className="text-sm font-medium mb-2">New Values:</p><pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">{JSON.stringify(selectedLog.new_values, null, 2)}</pre></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogPage;
