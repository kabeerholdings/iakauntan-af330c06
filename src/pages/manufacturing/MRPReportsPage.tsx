import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(215, 90%, 42%)', 'hsl(168, 72%, 40%)', 'hsl(32, 90%, 55%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)'];

const MRPReportsPage = () => {
  const { selectedCompany } = useCompany();
  const [boms, setBoms] = useState<any[]>([]);
  const [bomLines, setBomLines] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [joLines, setJoLines] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [stockBalances, setStockBalances] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedCompany) return;
    Promise.all([
      supabase.from('bill_of_materials').select('*, stock_items!bill_of_materials_product_id_fkey(code, name)').eq('company_id', selectedCompany.id),
      supabase.from('bom_lines').select('*, stock_items(code, name), bill_of_materials!inner(company_id)').eq('bill_of_materials.company_id', selectedCompany.id),
      supabase.from('job_orders').select('*, stock_items!job_orders_product_id_fkey(code, name), bill_of_materials(bom_code)').eq('company_id', selectedCompany.id),
      supabase.from('job_order_lines').select('*, stock_items(code, name), job_orders!inner(company_id, status)').eq('job_orders.company_id', selectedCompany.id),
      supabase.from('assemblies').select('*, stock_items!assemblies_product_id_fkey(code, name)').eq('company_id', selectedCompany.id),
      supabase.from('stock_balances').select('*, stock_items!inner(code, name, company_id)').eq('stock_items.company_id', selectedCompany.id),
    ]).then(([bRes, blRes, joRes, jolRes, aRes, sbRes]) => {
      setBoms(bRes.data || []);
      setBomLines(blRes.data || []);
      setJobOrders(joRes.data || []);
      setJoLines(jolRes.data || []);
      setAssemblies(aRes.data || []);
      setStockBalances(sbRes.data || []);
    });
  }, [selectedCompany]);

  const fmt = (n: number) => `RM ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  // Material shortage for open JOs
  const materialShortage = useMemo(() => {
    const openJOLines = joLines.filter(l => ['planned', 'in_progress'].includes(l.job_orders?.status));
    const materialMap = new Map<string, { name: string; required: number; onHand: number }>();
    openJOLines.forEach(l => {
      const key = l.stock_item_id;
      const existing = materialMap.get(key) || { name: `${l.stock_items?.code} - ${l.stock_items?.name}`, required: 0, onHand: 0 };
      existing.required += Number(l.required_quantity) - Number(l.issued_quantity);
      materialMap.set(key, existing);
    });
    stockBalances.forEach(sb => {
      if (materialMap.has(sb.stock_item_id)) {
        materialMap.get(sb.stock_item_id)!.onHand += Number(sb.quantity);
      }
    });
    return Array.from(materialMap.entries()).map(([id, data]) => ({
      id, ...data, shortage: Math.max(0, data.required - data.onHand),
    })).filter(m => m.required > 0).sort((a, b) => b.shortage - a.shortage);
  }, [joLines, stockBalances]);

  // WIP value
  const wipValue = useMemo(() => {
    return jobOrders.filter(j => j.status === 'in_progress').reduce((s, j) => {
      const jLines = joLines.filter(l => l.job_order_id === j.id);
      const materialCost = jLines.reduce((ss, l) => ss + (Number(l.issued_quantity) * Number(l.unit_cost)), 0);
      return s + materialCost + Number(j.labour_cost) + Number(j.machine_cost) + Number(j.overhead_cost);
    }, 0);
  }, [jobOrders, joLines]);

  // JO vs Assembly variance
  const variance = useMemo(() => {
    return jobOrders.filter(j => j.status === 'completed').map(j => {
      const jLines = joLines.filter(l => l.job_order_id === j.id);
      const plannedMaterial = jLines.reduce((s, l) => s + (Number(l.required_quantity) * Number(l.unit_cost)), 0);
      const actualMaterial = jLines.reduce((s, l) => s + ((Number(l.issued_quantity) - Number(l.returned_quantity)) * Number(l.unit_cost)), 0);
      const wastage = jLines.reduce((s, l) => s + (Number(l.wastage_quantity) * Number(l.unit_cost)), 0);
      return {
        job_number: j.job_number,
        product: `${j.stock_items?.code} - ${j.stock_items?.name}`,
        planned: plannedMaterial,
        actual: actualMaterial,
        wastage,
        variance: actualMaterial - plannedMaterial,
      };
    });
  }, [jobOrders, joLines]);

  // BOM cost chart
  const bomCostData = boms.map(b => ({
    name: b.bom_code,
    material: Number(b.total_material_cost),
    labour: Number(b.labour_cost),
    overhead: Number(b.machine_cost) + Number(b.overhead_cost),
  }));

  // JO status distribution
  const joStatusData = useMemo(() => {
    const counts = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 };
    jobOrders.forEach(j => { if (j.status in counts) (counts as any)[j.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [jobOrders]);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground">MRP Reports</h1>

      {/* Summary */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="shadow-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Active BOMs</p><p className="text-2xl font-bold font-display">{boms.filter(b => b.is_active).length}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Open Job Orders</p><p className="text-2xl font-bold font-display">{jobOrders.filter(j => ['planned', 'in_progress'].includes(j.status)).length}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Work in Progress Value</p><p className="text-2xl font-bold font-display text-primary">{fmt(wipValue)}</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Materials with Shortage</p><p className="text-2xl font-bold font-display text-destructive">{materialShortage.filter(m => m.shortage > 0).length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="shortage">
        <TabsList>
          <TabsTrigger value="shortage">Material Shortage</TabsTrigger>
          <TabsTrigger value="wip">Work in Progress</TabsTrigger>
          <TabsTrigger value="variance">JO vs Assembly Variance</TabsTrigger>
          <TabsTrigger value="costing">BOM Costing</TabsTrigger>
        </TabsList>

        <TabsContent value="shortage" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Outstanding Material Requirements & Shortage</CardTitle><CardDescription>Materials needed for open job orders vs on-hand stock</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Required</TableHead><TableHead className="text-right">On Hand</TableHead><TableHead className="text-right">Shortage</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {materialShortage.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No outstanding material requirements</TableCell></TableRow>
                  ) : materialShortage.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-right">{m.required.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{m.onHand.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{m.shortage > 0 ? m.shortage.toFixed(2) : '—'}</TableCell>
                      <TableCell>{m.shortage > 0 ? <Badge variant="destructive">Shortage</Badge> : <Badge variant="default" className="bg-emerald-600">Sufficient</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wip" className="mt-4 space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">Job Order Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart><Pie data={joStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {joStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">In-Progress Jobs</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Job No</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Started</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {jobOrders.filter(j => j.status === 'in_progress').map(j => (
                      <TableRow key={j.id}>
                        <TableCell className="font-mono">{j.job_number}</TableCell>
                        <TableCell>{j.stock_items?.code} - {j.stock_items?.name}</TableCell>
                        <TableCell className="text-right">{j.planned_quantity}</TableCell>
                        <TableCell>{j.actual_start_date || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="variance" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Job Order vs Actual Variance</CardTitle><CardDescription>Planned vs actual material consumption for completed jobs</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Job No</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Planned Cost</TableHead><TableHead className="text-right">Actual Cost</TableHead><TableHead className="text-right">Wastage</TableHead><TableHead className="text-right">Variance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {variance.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No completed job orders</TableCell></TableRow>
                  ) : variance.map(v => (
                    <TableRow key={v.job_number}>
                      <TableCell className="font-mono">{v.job_number}</TableCell>
                      <TableCell>{v.product}</TableCell>
                      <TableCell className="text-right">{fmt(v.planned)}</TableCell>
                      <TableCell className="text-right">{fmt(v.actual)}</TableCell>
                      <TableCell className="text-right text-destructive">{fmt(v.wastage)}</TableCell>
                      <TableCell className={`text-right font-medium ${v.variance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{fmt(v.variance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costing" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">BOM Cost Breakdown</CardTitle></CardHeader>
            <CardContent>
              {bomCostData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No BOMs created yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bomCostData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="material" name="Material" fill="hsl(215, 90%, 42%)" stackId="a" />
                    <Bar dataKey="labour" name="Labour" fill="hsl(168, 72%, 40%)" stackId="a" />
                    <Bar dataKey="overhead" name="Overhead" fill="hsl(32, 90%, 55%)" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MRPReportsPage;
