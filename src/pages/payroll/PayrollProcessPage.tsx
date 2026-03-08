import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Calculator, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { calculateEPF, calculateSOCSO, calculateEIS, calculatePCB, calculateHRDF } from '@/lib/payroll-calculations';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PayrollProcessPage = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [openNew, setOpenNew] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    period_year: new Date().getFullYear().toString(),
    period_month: (new Date().getMonth() + 1).toString(),
  });
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [pp, emp] = await Promise.all([
      supabase.from('payroll_periods').select('*').eq('company_id', selectedCompany.id).order('period_year', { ascending: false }).order('period_month', { ascending: false }),
      supabase.from('employees').select('*').eq('company_id', selectedCompany.id).eq('is_active', true).order('employee_no'),
    ]);
    setPeriods(pp.data || []);
    setEmployees(emp.data || []);
  };

  const fetchPayslips = async (periodId: string) => {
    const { data } = await supabase.from('payslips').select('*, employees(employee_no, first_name, last_name, department)').eq('payroll_period_id', periodId).order('created_at');
    setPayslips(data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);
  useEffect(() => { if (selectedPeriod) fetchPayslips(selectedPeriod.id); }, [selectedPeriod]);

  const handleCreatePeriod = async () => {
    if (!selectedCompany) return;
    const year = +newPeriod.period_year;
    const month = +newPeriod.period_month;
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase.from('payroll_periods').insert({
      company_id: selectedCompany.id, period_year: year, period_month: month,
      start_date: startDate, end_date: endDate, created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Payroll period created');
    setOpenNew(false);
    fetchData();
    if (data) setSelectedPeriod(data);
  };

  const processPayroll = async () => {
    if (!selectedPeriod || !selectedCompany) return;
    setProcessing(true);
    
    const employeeCount = employees.length;
    
    for (const emp of employees) {
      // Check if payslip already exists
      const existing = payslips.find(p => p.employee_id === emp.id);
      if (existing) continue;

      const salary = Number(emp.basic_salary);
      const epf = calculateEPF(salary, Number(emp.epf_employee_rate), Number(emp.epf_employer_rate));
      const socso = calculateSOCSO(salary, emp.socso_category || '1');
      const eis = emp.eis_contribute ? calculateEIS(salary) : { employee: 0, employer: 0 };
      const pcb = calculatePCB(salary * 12, emp.tax_status || 'single', epf.employee);
      const zakat = Math.round(salary * (Number(emp.zakat_percentage) || 0) / 100 * 100) / 100;
      const hrdf = emp.hrdf_contribute ? calculateHRDF(salary, employeeCount) : 0;

      const totalDeductions = epf.employee + socso.employee + eis.employee + pcb + zakat;
      const grossPay = salary;
      const netPay = grossPay - totalDeductions;

      await supabase.from('payslips').insert({
        payroll_period_id: selectedPeriod.id, employee_id: emp.id,
        basic_salary: salary, gross_pay: grossPay, net_pay: netPay,
        total_earnings: grossPay, total_deductions: totalDeductions,
        epf_employee: epf.employee, epf_employer: epf.employer,
        socso_employee: socso.employee, socso_employer: socso.employer,
        eis_employee: eis.employee, eis_employer: eis.employer,
        pcb_amount: pcb, zakat_amount: zakat, hrdf_amount: hrdf,
        status: 'processed',
      });
    }

    // Update period status
    await supabase.from('payroll_periods').update({ status: 'processed', process_date: new Date().toISOString().split('T')[0] }).eq('id', selectedPeriod.id);
    
    toast.success(`Payroll processed for ${employees.length} employees`);
    setProcessing(false);
    fetchData();
    fetchPayslips(selectedPeriod.id);
  };

  const { fmt } = useCurrency();

  const totals = payslips.reduce((acc, p) => ({
    basic: acc.basic + +p.basic_salary, gross: acc.gross + +p.gross_pay, net: acc.net + +p.net_pay,
    epfEmp: acc.epfEmp + +p.epf_employee, epfEr: acc.epfEr + +p.epf_employer,
    socsoEmp: acc.socsoEmp + +p.socso_employee, socsoEr: acc.socsoEr + +p.socso_employer,
    eisEmp: acc.eisEmp + +p.eis_employee, eisEr: acc.eisEr + +p.eis_employer,
    pcb: acc.pcb + +p.pcb_amount, zakat: acc.zakat + +p.zakat_amount, hrdf: acc.hrdf + +p.hrdf_amount,
  }), { basic: 0, gross: 0, net: 0, epfEmp: 0, epfEr: 0, socsoEmp: 0, socsoEr: 0, eisEmp: 0, eisEr: 0, pcb: 0, zakat: 0, hrdf: 0 });

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Payroll Processing</h1>
        <div className="flex gap-2">
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-2" />New Period</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create Payroll Period</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Year</Label><Input type="number" value={newPeriod.period_year} onChange={e => setNewPeriod(f => ({ ...f, period_year: e.target.value }))} /></div>
                  <div>
                    <Label>Month</Label>
                    <Select value={newPeriod.period_month} onValueChange={v => setNewPeriod(f => ({ ...f, period_month: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{months.map((m, i) => <SelectItem key={i} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreatePeriod} className="w-full">Create Period</Button>
              </div>
            </DialogContent>
          </Dialog>
          {selectedPeriod && selectedPeriod.status === 'open' && (
            <Button onClick={processPayroll} disabled={processing}>
              <Calculator className="h-4 w-4 mr-2" />{processing ? 'Processing...' : 'Process Payroll'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-1">
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Payroll Periods</CardTitle></CardHeader>
            <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
              {periods.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No periods yet</p>
              ) : periods.map(p => (
                <button key={p.id} onClick={() => setSelectedPeriod(p)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedPeriod?.id === p.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  <div className="font-medium">{months[p.period_month - 1]} {p.period_year}</div>
                  <Badge variant={p.status === 'processed' ? 'default' : 'secondary'} className="mt-1">{p.status}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          {!selectedPeriod ? (
            <Card className="shadow-card"><CardContent className="py-12 text-center text-muted-foreground">Select or create a payroll period</CardContent></Card>
          ) : (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">{months[selectedPeriod.period_month - 1]} {selectedPeriod.period_year} Payroll</CardTitle>
                <CardDescription>{payslips.length} employee(s) • Status: {selectedPeriod.status}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No.</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Dept</TableHead>
                        <TableHead className="text-right">Basic</TableHead>
                        <TableHead className="text-right">EPF (Emp)</TableHead>
                        <TableHead className="text-right">SOCSO</TableHead>
                        <TableHead className="text-right">EIS</TableHead>
                        <TableHead className="text-right">PCB</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payslips.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{selectedPeriod.status === 'open' ? 'Click "Process Payroll" to generate payslips' : 'No payslips'}</TableCell></TableRow>
                      ) : payslips.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono">{(p.employees as any)?.employee_no}</TableCell>
                          <TableCell className="font-medium">{(p.employees as any)?.first_name} {(p.employees as any)?.last_name}</TableCell>
                          <TableCell>{(p.employees as any)?.department || '—'}</TableCell>
                          <TableCell className="text-right">{fmt(p.basic_salary)}</TableCell>
                          <TableCell className="text-right">{fmt(p.epf_employee)}</TableCell>
                          <TableCell className="text-right">{fmt(p.socso_employee)}</TableCell>
                          <TableCell className="text-right">{fmt(p.eis_employee)}</TableCell>
                          <TableCell className="text-right">{fmt(p.pcb_amount)}</TableCell>
                          <TableCell className="text-right font-bold">{fmt(p.net_pay)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    {payslips.length > 0 && (
                      <TableFooter>
                        <TableRow className="font-bold">
                          <TableCell colSpan={3}>TOTAL</TableCell>
                          <TableCell className="text-right">{fmt(totals.basic)}</TableCell>
                          <TableCell className="text-right">{fmt(totals.epfEmp)}</TableCell>
                          <TableCell className="text-right">{fmt(totals.socsoEmp)}</TableCell>
                          <TableCell className="text-right">{fmt(totals.eisEmp)}</TableCell>
                          <TableCell className="text-right">{fmt(totals.pcb)}</TableCell>
                          <TableCell className="text-right">{fmt(totals.net)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedPeriod && payslips.length > 0 && (
            <Card className="shadow-card mt-4">
              <CardHeader><CardTitle className="font-display text-base">Employer Contributions Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">EPF (Employer)</p>
                    <p className="font-bold text-foreground">{fmt(totals.epfEr)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">SOCSO (Employer)</p>
                    <p className="font-bold text-foreground">{fmt(totals.socsoEr)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">EIS (Employer)</p>
                    <p className="font-bold text-foreground">{fmt(totals.eisEr)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">HRDF</p>
                    <p className="font-bold text-foreground">{fmt(totals.hrdf)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground">Total Employer Cost</p>
                    <p className="font-bold text-primary">{fmt(totals.basic + totals.epfEr + totals.socsoEr + totals.eisEr + totals.hrdf)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollProcessPage;
