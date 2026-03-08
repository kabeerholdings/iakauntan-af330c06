import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, MessageSquare, Send, FileText, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BatchMessagesPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageType, setMessageType] = useState('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [entityType, setEntityType] = useState('invoice');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [c, i, m] = await Promise.all([
      supabase.from('contacts').select('id, name, email, phone, type').eq('company_id', selectedCompany.id).order('name'),
      supabase.from('invoices').select('id, invoice_number, contact_id, total_amount, status, contacts(name, email)')
        .eq('company_id', selectedCompany.id).in('status', ['draft', 'sent', 'overdue']).order('invoice_date', { ascending: false }).limit(100),
      supabase.from('batch_messages').select('*').eq('company_id', selectedCompany.id).order('created_at', { ascending: false }).limit(50),
    ]);
    setContacts(c.data || []);
    setInvoices(i.data || []);
    setMessages(m.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleInvoice = (id: string) => {
    setSelectedInvoices(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllContacts = () => {
    const filtered = contacts.filter(c => messageType === 'email' ? c.email : c.phone);
    setSelectedContacts(filtered.map(c => c.id));
  };

  const handleSend = async () => {
    if (!selectedCompany) return;
    const recipients = selectedContacts.map(id => {
      const c = contacts.find(ct => ct.id === id);
      return { id, name: c?.name, email: c?.email, phone: c?.phone };
    });

    if (recipients.length === 0) { toast.error('Select at least one recipient'); return; }
    if (messageType === 'email' && !subject) { toast.error('Email subject is required'); return; }

    setSending(true);
    const { error } = await supabase.from('batch_messages').insert({
      company_id: selectedCompany.id,
      message_type: messageType,
      subject,
      body,
      recipients: JSON.parse(JSON.stringify(recipients)),
      entity_type: entityType,
      entity_ids: JSON.parse(JSON.stringify(selectedInvoices)),
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: user?.id,
      total_sent: recipients.length,
      total_failed: 0,
    });

    if (error) toast.error(error.message);
    else {
      toast.success(`${messageType === 'email' ? 'Emails' : 'WhatsApp messages'} queued for ${recipients.length} recipients`);
      setSelectedContacts([]);
      setSelectedInvoices([]);
      setSubject('');
      setBody('');
      fetchData();
    }
    setSending(false);
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const fmt = (n: number) => `RM ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Batch Email & WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Send invoices and statements in bulk via email or WhatsApp</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold font-display">{messages.reduce((s, m) => s + (m.total_sent || 0), 0)}</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold font-display">{messages.filter(m => m.message_type === 'email').length}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp Sent</p>
                <p className="text-2xl font-bold font-display">{messages.filter(m => m.message_type === 'whatsapp').length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose & Send</TabsTrigger>
          <TabsTrigger value="history">Send History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Compose Panel */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Compose Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Send via</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</div></SelectItem>
                      <SelectItem value="whatsapp"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />WhatsApp</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Attach Document Type</Label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="statement">Statement</SelectItem>
                      <SelectItem value="quotation">Quotation</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {messageType === 'email' && (
                  <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Invoice from {{company_name}}" /></div>
                )}
                <div><Label>Message Body</Label><Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Dear {{contact_name}},&#10;&#10;Please find attached your {{document_type}}...&#10;&#10;Variables: {{company_name}}, {{contact_name}}, {{invoice_number}}, {{total_amount}}" /></div>
                <Button onClick={handleSend} disabled={sending || selectedContacts.length === 0} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : `Send to ${selectedContacts.length} recipient(s)`}
                </Button>
              </CardContent>
            </Card>

            {/* Recipients Panel */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display">Select Recipients</CardTitle>
                  <Button variant="outline" size="sm" onClick={selectAllContacts}>Select All</Button>
                </div>
                <Input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Search contacts..." className="mt-2" />
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto space-y-1">
                {filteredContacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleContact(c.id)}>
                    <Checkbox checked={selectedContacts.includes(c.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {messageType === 'email' ? (c.email || 'No email') : (c.phone || 'No phone')}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{c.type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No messages sent yet</TableCell></TableRow>
                  ) : messages.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{m.sent_at ? new Date(m.sent_at).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {m.message_type === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                          {m.message_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m.subject || '—'}</TableCell>
                      <TableCell>{m.total_sent} sent{m.total_failed > 0 && <span className="text-destructive ml-1">({m.total_failed} failed)</span>}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'sent' ? 'default' : 'secondary'}>
                          {m.status === 'sent' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {m.status}
                        </Badge>
                      </TableCell>
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

export default BatchMessagesPage;
