import { useEffect, useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, TrendingDown, Trash2, Calculator } from 'lucide-react';
import { toast } from 'sonner';

const FixedAssetsPage = () => {
  const { selectedCompany } = useCompany();
  const { fmt, symbol } = useCurrency();
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [depEntries, setDepEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [openAsset, setOpenAsset] = useState(false);
  const [openType, setOpenType] = useState(false);
  const [openDispose, setOpenDispose] = useState<string | null>(null);
  const [openDepreciate, setOpenDepreciate] = useState(false);

  const [assetForm, setAssetForm] = useState({
    asset_code: '', asset_name: '', description: '', asset_type_id: '',
    purchase_date: new Date().toISOString().split('T')[0], purchase_cost: '',
    residual_value: '0', useful_life_years: '5', depreciation_method: 'straight_line',
    location: '', serial_number: '', supplier_id: '',
  });
  const [typeForm, setTypeForm] = useState({
    name: '', depreciation_method: 'straight_line', useful_life_years: '5',
    depreciation_rate: '20', asset_account_id: '', depreciation_account_id: '', accumulated_dep_account_id: '',
  });
  const [disposeForm, setDisposeForm] = useState({ disposal_date: new Date().toISOString().split('T')[0], disposal_amount: '' });
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    if (!selectedCompany) return;
    const [a, t, d, acc, con] = await Promise.all([
      supabase.from('fixed_assets').select('*, fixed_asset_types(name), contacts(name)').eq('company_id', selectedCompany.id).order('asset_code'),
      supabase.from('fixed_asset_types').select('*').eq('company_id', selectedCompany.id).order('name'),
      supabase.from('depreciation_entries').select('*, fixed_assets(asset_code, asset_name)').eq('company_id', selectedCompany.id).order('depreciation_date', { ascending: false }),
      supabase.from('chart_of_accounts').select('id, code, name, account_type').eq('company_id', selectedCompany.id).eq('is_active', true).order('code'),
      supabase.from('contacts').select('id, name').eq('company_id', selectedCompany.id).eq('type', 'supplier'),
    ]);
    setAssets(a.data || []);
    setAssetTypes(t.data || []);
    setDepEntries(d.data || []);
    setAccounts(acc.data || []);
    setContacts(con.data || []);
  };

  useEffect(() => { fetchData(); }, [selectedCompany]);

  const fmt = (n: number) => formatCurrency(n, selectedCompany?.base_currency);

  const handleCreateType = async () => {
    if (!selectedCompany || !typeForm.name) { toast.error('Name required'); return; }
    const { error } = await supabase.from('fixed_asset_types').insert({
      company_id: selectedCompany.id, name: typeForm.name,
      depreciation_method: typeForm.depreciation_method,
      useful_life_years: +typeForm.useful_life_years || 5,
      depreciation_rate: +typeForm.depreciation_rate || 20,
      asset_account_id: typeForm.asset_account_id || null,
      depreciation_account_id: typeForm.depreciation_account_id || null,
      accumulated_dep_account_id: typeForm.accumulated_dep_account_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Asset type created');
    setOpenType(false);
    setTypeForm({ name: '', depreciation_method: 'straight_line', useful_life_years: '5', depreciation_rate: '20', asset_account_id: '', depreciation_account_id: '', accumulated_dep_account_id: '' });
    fetchData();
  };

  const handleCreateAsset = async () => {
    if (!selectedCompany || !assetForm.asset_code || !assetForm.asset_name) { toast.error('Code and Name required'); return; }
    const cost = +assetForm.purchase_cost || 0;
    const { error } = await supabase.from('fixed_assets').insert({
      company_id: selectedCompany.id, asset_code: assetForm.asset_code, asset_name: assetForm.asset_name,
      description: assetForm.description || null, asset_type_id: assetForm.asset_type_id || null,
      purchase_date: assetForm.purchase_date, purchase_cost: cost,
      residual_value: +assetForm.residual_value || 0, useful_life_years: +assetForm.useful_life_years || 5,
      depreciation_method: assetForm.depreciation_method, net_book_value: cost,
      location: assetForm.location || null, serial_number: assetForm.serial_number || null,
      supplier_id: assetForm.supplier_id || null, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Fixed asset registered');
    setOpenAsset(false);
    setAssetForm({ asset_code: '', asset_name: '', description: '', asset_type_id: '', purchase_date: new Date().toISOString().split('T')[0], purchase_cost: '', residual_value: '0', useful_life_years: '5', depreciation_method: 'straight_line', location: '', serial_number: '', supplier_id: '' });
    fetchData();
  };

  const handleRunDepreciation = async () => {
    if (!selectedCompany) return;
    const activeAssets = assets.filter(a => a.status === 'active' && Number(a.net_book_value) > Number(a.residual_value || 0));
    if (activeAssets.length === 0) { toast.error('No assets to depreciate'); return; }

    let count = 0;
    for (const asset of activeAssets) {
      const cost = Number(asset.purchase_cost) || 0;
      const residual = Number(asset.residual_value) || 0;
      const life = Number(asset.useful_life_years) || 5;
      const depreciableAmount = cost - residual;
      const monthlyDep = depreciableAmount / (life * 12);
      const currentAccDep = Number(asset.accumulated_depreciation) || 0;
      const remaining = depreciableAmount - currentAccDep;
      const depAmount = Math.min(monthlyDep, remaining);

      if (depAmount <= 0) continue;

      const newAccDep = currentAccDep + depAmount;
      const newNBV = cost - newAccDep;

      await supabase.from('depreciation_entries').insert({
        company_id: selectedCompany.id, asset_id: asset.id,
        depreciation_date: depDate, amount: Math.round(depAmount * 100) / 100,
        accumulated_total: Math.round(newAccDep * 100) / 100,
        net_book_value: Math.round(newNBV * 100) / 100,
        period_label: depDate.substring(0, 7),
      });

      await supabase.from('fixed_assets').update({
        accumulated_depreciation: Math.round(newAccDep * 100) / 100,
        net_book_value: Math.round(newNBV * 100) / 100,
      }).eq('id', asset.id);

      count++;
    }
    toast.success(`Depreciation run for ${count} assets`);
    setOpenDepreciate(false);
    fetchData();
  };

  const handleDispose = async () => {
    if (!openDispose) return;
    const asset = assets.find(a => a.id === openDispose);
    if (!asset) return;
    const disposalAmt = +disposeForm.disposal_amount || 0;
    const nbv = Number(asset.net_book_value) || 0;
    const gainLoss = disposalAmt - nbv;

    const { error } = await supabase.from('fixed_assets').update({
      status: 'disposed', disposal_date: disposeForm.disposal_date,
      disposal_amount: disposalAmt, disposal_gain_loss: Math.round(gainLoss * 100) / 100,
    }).eq('id', openDispose);
    if (error) { toast.error(error.message); return; }
    toast.success(`Asset disposed. ${gainLoss >= 0 ? 'Gain' : 'Loss'}: ${fmt(Math.abs(gainLoss))}`);
    setOpenDispose(null);
    fetchData();
  };

  const summary = useMemo(() => {
    const active = assets.filter(a => a.status === 'active');
    return {
      totalCost: active.reduce((s, a) => s + (Number(a.purchase_cost) || 0), 0),
      totalAccDep: active.reduce((s, a) => s + (Number(a.accumulated_depreciation) || 0), 0),
      totalNBV: active.reduce((s, a) => s + (Number(a.net_book_value) || 0), 0),
      activeCount: active.length,
      disposedCount: assets.filter(a => a.status === 'disposed').length,
    };
  }, [assets]);

  if (!selectedCompany) return <p className="text-muted-foreground">Select a company first.</p>;

  const assetAccounts = accounts.filter(a => a.account_type === 'asset');
  const expenseAccounts = accounts.filter(a => a.account_type === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Fixed Assets</h1>
            <p className="text-sm text-muted-foreground">Register, depreciate, and dispose of fixed assets</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenType(true)}><Plus className="h-4 w-4 mr-1" />Asset Type</Button>
          <Button variant="outline" onClick={() => setOpenDepreciate(true)}><Calculator className="h-4 w-4 mr-1" />Run Depreciation</Button>
          <Button onClick={() => setOpenAsset(true)}><Plus className="h-4 w-4 mr-2" />Register Asset</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-4">
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Active Assets</p>
          <p className="text-2xl font-bold font-display text-primary">{summary.activeCount}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold font-display">{fmt(summary.totalCost)}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Accum. Depreciation</p>
          <p className="text-2xl font-bold font-display text-destructive">{fmt(summary.totalAccDep)}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Net Book Value</p>
          <p className="text-2xl font-bold font-display text-primary">{fmt(summary.totalNBV)}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Disposed</p>
          <p className="text-2xl font-bold font-display">{summary.disposedCount}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Asset Register</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation Schedule</TabsTrigger>
          <TabsTrigger value="types">Asset Types</TabsTrigger>
          <TabsTrigger value="disposed">Disposed Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Asset Name</TableHead><TableHead>Type</TableHead>
                    <TableHead>Purchase Date</TableHead><TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Accum Dep</TableHead><TableHead className="text-right">NBV</TableHead>
                    <TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.filter(a => a.status === 'active').length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No active assets registered</TableCell></TableRow>
                  ) : assets.filter(a => a.status === 'active').map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono font-medium">{a.asset_code}</TableCell>
                      <TableCell className="font-medium">{a.asset_name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.fixed_asset_types?.name || '—'}</TableCell>
                      <TableCell>{a.purchase_date}</TableCell>
                      <TableCell className="text-right">{fmt(Number(a.purchase_cost))}</TableCell>
                      <TableCell className="text-right text-destructive">{fmt(Number(a.accumulated_depreciation))}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(a.net_book_value))}</TableCell>
                      <TableCell><Badge>Active</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setOpenDispose(a.id); setDisposeForm({ disposal_date: new Date().toISOString().split('T')[0], disposal_amount: '' }); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {assets.filter(a => a.status === 'active').length > 0 && (
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right">{fmt(summary.totalCost)}</TableCell>
                      <TableCell className="text-right">{fmt(summary.totalAccDep)}</TableCell>
                      <TableCell className="text-right">{fmt(summary.totalNBV)}</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">Depreciation Entries</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Asset Code</TableHead><TableHead>Asset Name</TableHead>
                    <TableHead>Period</TableHead><TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Accum Total</TableHead><TableHead className="text-right">NBV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No depreciation entries yet. Run depreciation to start.</TableCell></TableRow>
                  ) : depEntries.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.depreciation_date}</TableCell>
                      <TableCell className="font-mono">{d.fixed_assets?.asset_code}</TableCell>
                      <TableCell className="font-medium">{d.fixed_assets?.asset_name}</TableCell>
                      <TableCell>{d.period_label}</TableCell>
                      <TableCell className="text-right text-destructive">{fmt(Number(d.amount))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(d.accumulated_total))}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(d.net_book_value))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type Name</TableHead><TableHead>Method</TableHead><TableHead>Useful Life</TableHead>
                    <TableHead>Rate %</TableHead><TableHead>Assets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetTypes.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No asset types. Create one first.</TableCell></TableRow>
                  ) : assetTypes.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge variant="secondary">{t.depreciation_method === 'straight_line' ? 'Straight Line' : 'Reducing Balance'}</Badge></TableCell>
                      <TableCell>{t.useful_life_years} years</TableCell>
                      <TableCell>{Number(t.depreciation_rate)}%</TableCell>
                      <TableCell>{assets.filter(a => a.asset_type_id === t.id).length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disposed" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Asset Name</TableHead><TableHead>Disposal Date</TableHead>
                    <TableHead className="text-right">Cost</TableHead><TableHead className="text-right">NBV at Disposal</TableHead>
                    <TableHead className="text-right">Disposal Amount</TableHead><TableHead className="text-right">Gain/Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.filter(a => a.status === 'disposed').length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No disposed assets</TableCell></TableRow>
                  ) : assets.filter(a => a.status === 'disposed').map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono">{a.asset_code}</TableCell>
                      <TableCell className="font-medium">{a.asset_name}</TableCell>
                      <TableCell>{a.disposal_date}</TableCell>
                      <TableCell className="text-right">{fmt(Number(a.purchase_cost))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(a.net_book_value))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(a.disposal_amount))}</TableCell>
                      <TableCell className={`text-right font-medium ${Number(a.disposal_gain_loss) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {fmt(Number(a.disposal_gain_loss))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Register Asset Dialog */}
      <Dialog open={openAsset} onOpenChange={setOpenAsset}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Register Fixed Asset</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Asset Code</Label><Input value={assetForm.asset_code} onChange={e => setAssetForm(f => ({ ...f, asset_code: e.target.value }))} placeholder="FA-001" /></div>
              <div><Label>Asset Name</Label><Input value={assetForm.asset_name} onChange={e => setAssetForm(f => ({ ...f, asset_name: e.target.value }))} placeholder="Office Computer" /></div>
              <div><Label>Asset Type</Label>
                <Select value={assetForm.asset_type_id} onValueChange={v => setAssetForm(f => ({ ...f, asset_type_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{assetTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Input value={assetForm.description} onChange={e => setAssetForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Purchase Date</Label><Input type="date" value={assetForm.purchase_date} onChange={e => setAssetForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
              <div><Label>Purchase Cost ({symbol})</Label><Input type="number" value={assetForm.purchase_cost} onChange={e => setAssetForm(f => ({ ...f, purchase_cost: e.target.value }))} /></div>
              <div><Label>Residual Value</Label><Input type="number" value={assetForm.residual_value} onChange={e => setAssetForm(f => ({ ...f, residual_value: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Useful Life (Years)</Label><Input type="number" value={assetForm.useful_life_years} onChange={e => setAssetForm(f => ({ ...f, useful_life_years: e.target.value }))} /></div>
              <div><Label>Depreciation Method</Label>
                <Select value={assetForm.depreciation_method} onValueChange={v => setAssetForm(f => ({ ...f, depreciation_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">Straight Line</SelectItem>
                    <SelectItem value="reducing_balance">Reducing Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Supplier</Label>
                <Select value={assetForm.supplier_id} onValueChange={v => setAssetForm(f => ({ ...f, supplier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Location</Label><Input value={assetForm.location} onChange={e => setAssetForm(f => ({ ...f, location: e.target.value }))} placeholder="Office Floor 2" /></div>
              <div><Label>Serial Number</Label><Input value={assetForm.serial_number} onChange={e => setAssetForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
            </div>
            <Button onClick={handleCreateAsset} className="w-full">Register Asset</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset Type Dialog */}
      <Dialog open={openType} onOpenChange={setOpenType}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Create Asset Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Type Name</Label><Input value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="Computer Equipment" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Method</Label>
                <Select value={typeForm.depreciation_method} onValueChange={v => setTypeForm(f => ({ ...f, depreciation_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">Straight Line</SelectItem>
                    <SelectItem value="reducing_balance">Reducing Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Useful Life (Yrs)</Label><Input type="number" value={typeForm.useful_life_years} onChange={e => setTypeForm(f => ({ ...f, useful_life_years: e.target.value }))} /></div>
              <div><Label>Rate %</Label><Input type="number" value={typeForm.depreciation_rate} onChange={e => setTypeForm(f => ({ ...f, depreciation_rate: e.target.value }))} /></div>
            </div>
            <div><Label>Asset Account</Label>
              <Select value={typeForm.asset_account_id} onValueChange={v => setTypeForm(f => ({ ...f, asset_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{assetAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Depreciation Expense Account</Label>
              <Select value={typeForm.depreciation_account_id} onValueChange={v => setTypeForm(f => ({ ...f, depreciation_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{expenseAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Accumulated Depreciation Account</Label>
              <Select value={typeForm.accumulated_dep_account_id} onValueChange={v => setTypeForm(f => ({ ...f, accumulated_dep_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{assetAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateType} className="w-full">Create Type</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Run Depreciation Dialog */}
      <Dialog open={openDepreciate} onOpenChange={setOpenDepreciate}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Run Monthly Depreciation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This will calculate and post monthly depreciation for all active assets based on their straight-line schedule.</p>
            <div><Label>Depreciation Date</Label><Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} /></div>
            <p className="text-sm">Assets eligible: <strong>{assets.filter(a => a.status === 'active' && Number(a.net_book_value) > Number(a.residual_value || 0)).length}</strong></p>
            <Button onClick={handleRunDepreciation} className="w-full">Run Depreciation</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispose Dialog */}
      <Dialog open={!!openDispose} onOpenChange={() => setOpenDispose(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Dispose Asset</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Record the disposal of this asset. Any difference between disposal amount and net book value will be recorded as gain/loss.</p>
            <div><Label>Disposal Date</Label><Input type="date" value={disposeForm.disposal_date} onChange={e => setDisposeForm(f => ({ ...f, disposal_date: e.target.value }))} /></div>
            <div><Label>Disposal Amount (RM)</Label><Input type="number" value={disposeForm.disposal_amount} onChange={e => setDisposeForm(f => ({ ...f, disposal_amount: e.target.value }))} placeholder="0.00" /></div>
            <Button onClick={handleDispose} variant="destructive" className="w-full">Confirm Disposal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FixedAssetsPage;
