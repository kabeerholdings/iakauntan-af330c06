import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import CustomFieldsSection, { saveCustomFieldValues } from '@/components/CustomFieldsSection';

const EmployeesPage = () => {
  const { selectedCompany } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [formTab, setFormTab] = useState('personal');
  const [form, setForm] = useState({
    employee_no: '', first_name: '', last_name: '', ic_no: '', passport_no: '',
    date_of_birth: '', gender: 'male', marital_status: 'single', nationality: 'Malaysian',
    race: '', religion: '', address: '', city: '', state: '', postcode: '', phone: '', email: '',
    join_date: new Date().toISOString().split('T')[0], department: '', position: '',
    employment_type: 'permanent', employee_category: 'local',
    basic_salary: '', hourly_rate: '',
    epf_no: '', epf_employee_rate: '11', epf_employer_rate: '13',
    socso_no: '', socso_category: '1', eis_contribute: true,
    tax_no: '', tax_status: 'single', tax_resident: true, pcb_group: 'KA0',
    zakat_percentage: '0', hrdf_contribute: true,
    bank_name: '', bank_account_no: '', payment_method: 'bank_transfer',
  });

  const fetchData = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('employees').select('*').eq('company_id', selectedCompany.id).order('employee_no');
    setEmployees(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const handleCreate = async () => {
    if (!selectedCompany || !form.employee_no || !form.first_name) { toast.error('Employee No and First Name required'); return; }
    const { error } = await supabase.from('employees').insert({
      company_id: selectedCompany.id, employee_no: form.employee_no,
      first_name: form.first_name, last_name: form.last_name || '',
      ic_no: form.ic_no || null, passport_no: form.passport_no || null,
      date_of_birth: form.date_of_birth || null, gender: form.gender,
      marital_status: form.marital_status, nationality: form.nationality,
      race: form.race || null, religion: form.religion || null,
      address: form.address || null, city: form.city || null, state: form.state || null,
      postcode: form.postcode || null, phone: form.phone || null, email: form.email || null,
      join_date: form.join_date, department: form.department || null, position: form.position || null,
      employment_type: form.employment_type, employee_category: form.employee_category,
      basic_salary: +form.basic_salary || 0, hourly_rate: +form.hourly_rate || 0,
      epf_no: form.epf_no || null, epf_employee_rate: +form.epf_employee_rate || 11,
      epf_employer_rate: +form.epf_employer_rate || 13,
      socso_no: form.socso_no || null, socso_category: form.socso_category,
      eis_contribute: form.eis_contribute, tax_no: form.tax_no || null,
      tax_status: form.tax_status, tax_resident: form.tax_resident, pcb_group: form.pcb_group,
      zakat_percentage: +form.zakat_percentage || 0, hrdf_contribute: form.hrdf_contribute,
      bank_name: form.bank_name || null, bank_account_no: form.bank_account_no || null,
      payment_method: form.payment_method,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Employee added');
    setOpen(false);
    fetchData();
  };

  const filtered = employees.filter(e => !search ||
    e.employee_no.toLowerCase().includes(search.toLowerCase()) ||
    e.first_name.toLowerCase().includes(search.toLowerCase()) ||
    e.last_name.toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Employees</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-2" />Add Employee</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Add Employee</DialogTitle></DialogHeader>
            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="statutory">Statutory</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Employee No.</Label><Input value={form.employee_no} onChange={e => setForm(f => ({ ...f, employee_no: e.target.value }))} placeholder="EMP-001" /></div>
                  <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
                  <div><Label>Last Name</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>IC No.</Label><Input value={form.ic_no} onChange={e => setForm(f => ({ ...f, ic_no: e.target.value }))} placeholder="000000-00-0000" /></div>
                  <div><Label>Passport No.</Label><Input value={form.passport_no} onChange={e => setForm(f => ({ ...f, passport_no: e.target.value }))} /></div>
                  <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Marital Status</Label>
                    <Select value={form.marital_status} onValueChange={v => setForm(f => ({ ...f, marital_status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Nationality</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div><Label>State</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
                  <div><Label>Postcode</Label><Input value={form.postcode} onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Join Date</Label><Input type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} /></div>
                  <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
                  <div><Label>Position</Label><Input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employment Type</Label>
                    <Select value={form.employment_type} onValueChange={v => setForm(f => ({ ...f, employment_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="permanent">Permanent</SelectItem><SelectItem value="contract">Contract</SelectItem><SelectItem value="probation">Probation</SelectItem><SelectItem value="part_time">Part Time</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.employee_category} onValueChange={v => setForm(f => ({ ...f, employee_category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="local">Local</SelectItem><SelectItem value="foreign">Foreign Worker</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Basic Salary (RM)</Label><Input type="number" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))} /></div>
                  <div><Label>Hourly Rate (RM)</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} /></div>
                </div>
              </TabsContent>

              <TabsContent value="statutory" className="space-y-4">
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-foreground">EPF / KWSP</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>EPF No.</Label><Input value={form.epf_no} onChange={e => setForm(f => ({ ...f, epf_no: e.target.value }))} /></div>
                    <div><Label>Employee Rate (%)</Label><Input type="number" value={form.epf_employee_rate} onChange={e => setForm(f => ({ ...f, epf_employee_rate: e.target.value }))} /></div>
                    <div><Label>Employer Rate (%)</Label><Input type="number" value={form.epf_employer_rate} onChange={e => setForm(f => ({ ...f, epf_employer_rate: e.target.value }))} /></div>
                  </div>
                </div>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-foreground">SOCSO / PERKESO</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>SOCSO No.</Label><Input value={form.socso_no} onChange={e => setForm(f => ({ ...f, socso_no: e.target.value }))} /></div>
                    <div>
                      <Label>SOCSO Category</Label>
                      <Select value={form.socso_category} onValueChange={v => setForm(f => ({ ...f, socso_category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Category 1 (Employment Injury + Invalidity)</SelectItem>
                          <SelectItem value="2">Category 2 (Employment Injury Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-foreground">Income Tax / PCB</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Tax No.</Label><Input value={form.tax_no} onChange={e => setForm(f => ({ ...f, tax_no: e.target.value }))} /></div>
                    <div>
                      <Label>Tax Status</Label>
                      <Select value={form.tax_status} onValueChange={v => setForm(f => ({ ...f, tax_status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single (KA0)</SelectItem>
                          <SelectItem value="married_0">Married, spouse not working (KA1)</SelectItem>
                          <SelectItem value="married_1">Married, spouse working (KA2)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Zakat (%)</Label><Input type="number" value={form.zakat_percentage} onChange={e => setForm(f => ({ ...f, zakat_percentage: e.target.value }))} /></div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Maybank, CIMB, etc." /></div>
                  <div><Label>Account No.</Label><Input value={form.bank_account_no} onChange={e => setForm(f => ({ ...f, bank_account_no: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer / Giro</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleCreate} className="w-full mt-4">Add Employee</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>IC No.</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Basic Salary</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No employees</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono font-medium">{e.employee_no}</TableCell>
                  <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                  <TableCell>{e.ic_no || '—'}</TableCell>
                  <TableCell>{e.department || '—'}</TableCell>
                  <TableCell>{e.position || '—'}</TableCell>
                  <TableCell className="text-right">RM {Number(e.basic_salary).toFixed(2)}</TableCell>
                  <TableCell>{e.join_date}</TableCell>
                  <TableCell>{e.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Resigned</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesPage;
