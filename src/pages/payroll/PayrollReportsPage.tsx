import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n: number, currency?: string) => {
  const { formatCurrency } = require('@/lib/utils');
  return formatCurrency(n, currency);
};

const PayrollReportsPage = () => {
  const { selectedCompany } = useCompany();
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [payslips, setPayslips] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedCompany) return;
    supabase.from('payroll_periods').select('*').eq('company_id', selectedCompany.id).eq('status', 'processed')
      .order('period_year', { ascending: false }).order('period_month', { ascending: false })
      .then(({ data }) => setPeriods(data || []));
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedPeriodId) { setPayslips([]); return; }
    supabase.from('payslips').select('*, employees(employee_no, first_name, last_name, department, ic_no, epf_no, socso_no, tax_no, bank_name, bank_account_no)')
      .eq('payroll_period_id', selectedPeriodId).order('created_at')
      .then(({ data }) => setPayslips(data || []));
  }, [selectedPeriodId]);

  const period = periods.find(p => p.id === selectedPeriodId);
  const totals = payslips.reduce((acc, p) => ({
    basic: acc.basic + +p.basic_salary, gross: acc.gross + +p.gross_pay, net: acc.net + +p.net_pay,
    epfEmp: acc.epfEmp + +p.epf_employee, epfEr: acc.epfEr + +p.epf_employer,
    socsoEmp: acc.socsoEmp + +p.socso_employee, socsoEr: acc.socsoEr + +p.socso_employer,
    eisEmp: acc.eisEmp + +p.eis_employee, eisEr: acc.eisEr + +p.eis_employer,
    pcb: acc.pcb + +p.pcb_amount, zakat: acc.zakat + +p.zakat_amount, hrdf: acc.hrdf + +p.hrdf_amount,
    deductions: acc.deductions + +p.total_deductions,
  }), { basic: 0, gross: 0, net: 0, epfEmp: 0, epfEr: 0, socsoEmp: 0, socsoEr: 0, eisEmp: 0, eisEr: 0, pcb: 0, zakat: 0, hrdf: 0, deductions: 0 });

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-4">Payroll Reports</h1>
      <div className="mb-6 max-w-sm">
        <Label>Select Period</Label>
        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger><SelectValue placeholder="Choose a processed period" /></SelectTrigger>
          <SelectContent>{periods.map(p => <SelectItem key={p.id} value={p.id}>{months[p.period_month - 1]} {p.period_year}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!selectedPeriodId ? (
        <Card className="shadow-card"><CardContent className="py-12 text-center text-muted-foreground">Select a payroll period to view reports</CardContent></Card>
      ) : (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Payroll Summary</TabsTrigger>
            <TabsTrigger value="epf">EPF Borang A</TabsTrigger>
            <TabsTrigger value="socso">SOCSO Borang 8A</TabsTrigger>
            <TabsTrigger value="pcb">PCB CP39</TabsTrigger>
            <TabsTrigger value="bank">Bank Report</TabsTrigger>
            <TabsTrigger value="ea">EA Form</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">Payroll Summary — {period && `${months[period.period_month - 1]} ${period.period_year}`}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead><TableHead>Employee</TableHead><TableHead className="text-right">Basic</TableHead>
                      <TableHead className="text-right">Gross</TableHead><TableHead className="text-right">EPF</TableHead>
                      <TableHead className="text-right">SOCSO</TableHead><TableHead className="text-right">EIS</TableHead>
                      <TableHead className="text-right">PCB</TableHead><TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{(p.employees as any)?.employee_no}</TableCell>
                        <TableCell className="font-medium">{(p.employees as any)?.first_name} {(p.employees as any)?.last_name}</TableCell>
                        <TableCell className="text-right">{fmt(p.basic_salary)}</TableCell>
                        <TableCell className="text-right">{fmt(p.gross_pay)}</TableCell>
                        <TableCell className="text-right">{fmt(p.epf_employee)}</TableCell>
                        <TableCell className="text-right">{fmt(p.socso_employee)}</TableCell>
                        <TableCell className="text-right">{fmt(p.eis_employee)}</TableCell>
                        <TableCell className="text-right">{fmt(p.pcb_amount)}</TableCell>
                        <TableCell className="text-right">{fmt(p.total_deductions)}</TableCell>
                        <TableCell className="text-right font-bold">{fmt(p.net_pay)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="text-right">{fmt(totals.basic)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.gross)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.epfEmp)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.socsoEmp)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.eisEmp)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.pcb)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.deductions)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.net)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="epf" className="mt-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">EPF Borang A — {period && `${months[period.period_month - 1]} ${period.period_year}`}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead><TableHead>Employee Name</TableHead><TableHead>IC No.</TableHead>
                      <TableHead>EPF No.</TableHead><TableHead className="text-right">Wages (RM)</TableHead>
                      <TableHead className="text-right">Employee Share</TableHead><TableHead className="text-right">Employer Share</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{(p.employees as any)?.first_name} {(p.employees as any)?.last_name}</TableCell>
                        <TableCell>{(p.employees as any)?.ic_no || '—'}</TableCell>
                        <TableCell>{(p.employees as any)?.epf_no || '—'}</TableCell>
                        <TableCell className="text-right">{fmt(p.basic_salary)}</TableCell>
                        <TableCell className="text-right">{fmt(p.epf_employee)}</TableCell>
                        <TableCell className="text-right">{fmt(p.epf_employer)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(+p.epf_employee + +p.epf_employer)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>TOTAL</TableCell>
                      <TableCell className="text-right">{fmt(totals.basic)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.epfEmp)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.epfEr)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.epfEmp + totals.epfEr)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="socso" className="mt-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">SOCSO Borang 8A — {period && `${months[period.period_month - 1]} ${period.period_year}`}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead><TableHead>Employee Name</TableHead><TableHead>IC No.</TableHead>
                      <TableHead>SOCSO No.</TableHead><TableHead className="text-right">Wages</TableHead>
                      <TableHead className="text-right">SOCSO (Emp)</TableHead><TableHead className="text-right">SOCSO (Er)</TableHead>
                      <TableHead className="text-right">EIS (Emp)</TableHead><TableHead className="text-right">EIS (Er)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{(p.employees as any)?.first_name} {(p.employees as any)?.last_name}</TableCell>
                        <TableCell>{(p.employees as any)?.ic_no || '—'}</TableCell>
                        <TableCell>{(p.employees as any)?.socso_no || '—'}</TableCell>
                        <TableCell className="text-right">{fmt(p.basic_salary)}</TableCell>
                        <TableCell className="text-right">{fmt(p.socso_employee)}</TableCell>
                        <TableCell className="text-right">{fmt(p.socso_employer)}</TableCell>
                        <TableCell className="text-right">{fmt(p.eis_employee)}</TableCell>
                        <TableCell className="text-right">{fmt(p.eis_employer)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>TOTAL</TableCell>
                      <TableCell className="text-right">{fmt(totals.basic)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.socsoEmp)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.socsoEr)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.eisEmp)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.eisEr)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pcb" className="mt-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">Income Tax CP39 — {period && `${months[period.period_month - 1]} ${period.period_year}`}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead><TableHead>Employee Name</TableHead><TableHead>IC No.</TableHead>
                      <TableHead>Tax No.</TableHead><TableHead className="text-right">Remuneration</TableHead>
                      <TableHead className="text-right">PCB (RM)</TableHead><TableHead className="text-right">Zakat (RM)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{(p.employees as any)?.first_name} {(p.employees as any)?.last_name}</TableCell>
                        <TableCell>{(p.employees as any)?.ic_no || '—'}</TableCell>
                        <TableCell>{(p.employees as any)?.tax_no || '—'}</TableCell>
                        <TableCell className="text-right">{fmt(p.gross_pay)}</TableCell>
                        <TableCell className="text-right">{fmt(p.pcb_amount)}</TableCell>
                        <TableCell className="text-right">{fmt(p.zakat_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>TOTAL</TableCell>
                      <TableCell className="text-right">{fmt(totals.gross)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.pcb)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.zakat)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">Credit Bank Report — {period && `${months[period.period_month - 1]} ${period.period_year}`}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead><TableHead>Employee Name</TableHead>
                      <TableHead>Bank</TableHead><TableHead>Account No.</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((p, i) => (
                      <TableRow key={p.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{(p.employees as any)?.first_name} {(p.employees as any)?.last_name}</TableCell>
                        <TableCell>{(p.employees as any)?.bank_name || '—'}</TableCell>
                        <TableCell className="font-mono">{(p.employees as any)?.bank_account_no || '—'}</TableCell>
                        <TableCell className="text-right font-bold">{fmt(p.net_pay)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>TOTAL</TableCell>
                      <TableCell className="text-right">{fmt(totals.net)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ea" className="mt-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">EA Form Summary — Year {period?.period_year}</CardTitle>
                <p className="text-sm text-muted-foreground">Note: Full EA form requires year-to-date calculations. This shows current period data.</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead><TableHead>IC No.</TableHead><TableHead>Tax No.</TableHead>
                      <TableHead className="text-right">Gross Income</TableHead><TableHead className="text-right">EPF (Employee)</TableHead>
                      <TableHead className="text-right">SOCSO</TableHead><TableHead className="text-right">PCB Deducted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{(p.employees as any)?.first_name} {(p.employees as any)?.last_name}</TableCell>
                        <TableCell>{(p.employees as any)?.ic_no || '—'}</TableCell>
                        <TableCell>{(p.employees as any)?.tax_no || '—'}</TableCell>
                        <TableCell className="text-right">{fmt(p.gross_pay)}</TableCell>
                        <TableCell className="text-right">{fmt(p.epf_employee)}</TableCell>
                        <TableCell className="text-right">{fmt(p.socso_employee)}</TableCell>
                        <TableCell className="text-right">{fmt(p.pcb_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PayrollReportsPage;
