import { useState } from 'react';
import {
  LayoutDashboard, FileText, Receipt, BookOpen, Users, Globe, Settings, Building2, LogOut,
  ChevronDown, BarChart3, CreditCard, Package, ShoppingCart, Truck, Wallet, FolderKanban, DollarSign,
  UserCheck, Calculator, CalendarDays, ClipboardList, Zap, Landmark, Paperclip, Factory, Layers, Hammer, PieChart,
  Store, ScanBarcode, Brain, Sparkles, Heart, Cloud, Puzzle, Mail, Shield, Palette, TrendingUp, Plus, Pencil
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import CreateCompanyForm, { type CreateCompanyFormData } from '@/components/CreateCompanyForm';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import EditCompanyDialog from '@/components/EditCompanyDialog';
import logoImg from '@/assets/logo.png';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
];

const salesItems = [
  { title: 'Sales', url: '/dashboard/sales', icon: ShoppingCart },
  { title: 'Invoices', url: '/dashboard/invoices', icon: FileText },
  { title: 'Purchase', url: '/dashboard/purchase', icon: Truck },
  { title: 'Payments', url: '/dashboard/payments', icon: Wallet },
];

const stockItems = [
  { title: 'Stock / Inventory', url: '/dashboard/stock', icon: Package },
  { title: 'Inventory Reports', url: '/dashboard/inventory-reports', icon: BarChart3 },
  { title: 'Stock Take', url: '/dashboard/stock-take', icon: ClipboardList },
];

const ecommerceItems = [
  { title: 'X-Store', url: '/dashboard/xstore', icon: Store },
  { title: 'POS', url: '/dashboard/pos', icon: ScanBarcode },
  { title: 'Wellness POS', url: '/dashboard/wellness-pos', icon: Heart },
];

const manufacturingItems = [
  { title: 'Bill of Materials', url: '/dashboard/bom', icon: Layers },
  { title: 'Job Orders', url: '/dashboard/job-orders', icon: Hammer },
  { title: 'Assembly', url: '/dashboard/assembly', icon: Factory },
  { title: 'MRP Reports', url: '/dashboard/mrp-reports', icon: PieChart },
];

const accountingItems = [
  { title: 'Fast Entry', url: '/dashboard/fast-entry', icon: Zap },
  { title: 'Chart of Accounts', url: '/dashboard/chart-of-accounts', icon: BookOpen },
  { title: 'Journal Entries', url: '/dashboard/journal-entries', icon: Receipt },
  { title: 'Bank Reconciliation', url: '/dashboard/bank-reconciliation', icon: Landmark },
  { title: 'Reports', url: '/dashboard/reports', icon: BarChart3 },
  { title: 'Documents', url: '/dashboard/documents', icon: Paperclip },
  { title: 'AI Easy Scan', url: '/dashboard/ai-scanner', icon: Brain },
];

const payrollItems = [
  { title: 'Employees', url: '/dashboard/employees', icon: UserCheck },
  { title: 'Payroll', url: '/dashboard/payroll', icon: Calculator },
  { title: 'Leave', url: '/dashboard/leave', icon: CalendarDays },
  { title: 'Payroll Reports', url: '/dashboard/payroll-reports', icon: ClipboardList },
];

const managementItems = [
  { title: 'Contacts', url: '/dashboard/contacts', icon: Users },
  { title: 'Expenses', url: '/dashboard/expenses', icon: CreditCard },
  { title: 'Projects', url: '/dashboard/projects', icon: FolderKanban },
  { title: 'Currency Rates', url: '/dashboard/currency-rates', icon: DollarSign },
  { title: 'Commission', url: '/dashboard/commission', icon: Calculator },
  { title: 'Advanced Reports', url: '/dashboard/advanced-reports', icon: TrendingUp },
];

const otherItems = [
  { title: 'AI Cloud Backup', url: '/dashboard/ai-cloud', icon: Cloud },
  { title: 'Customization', url: '/dashboard/customization', icon: Puzzle },
  { title: 'Doc Templates', url: '/dashboard/document-templates', icon: Palette },
  { title: 'Batch Messages', url: '/dashboard/batch-messages', icon: Mail },
  { title: 'Security Lock', url: '/dashboard/security-lock', icon: Shield },
  { title: 'e-Invoice', url: '/dashboard/einvoice', icon: Globe },
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const { companies, selectedCompany, setSelectedCompany, refetchCompanies } = useCompany();
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', registration_no: '', tax_id: '' });
  const [creating, setCreating] = useState(false);

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) { toast.error('Company name is required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCreating(true);
    const { error } = await supabase.from('companies').insert({
      name: newCompany.name.trim(),
      registration_no: newCompany.registration_no.trim() || null,
      tax_id: newCompany.tax_id.trim() || null,
      owner_id: user.id,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Company created');
    setShowCreateCompany(false);
    setNewCompany({ name: '', registration_no: '', tax_id: '' });
    await refetchCompanies();
  };

  const renderItems = (items: { title: string; url: string; icon: any }[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink to={item.url} end={item.url === '/dashboard'} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
              <item.icon className="mr-2 h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <>
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center gap-2">
        <img src={logoImg} alt="iAkauntan" className="h-8 w-8" />
        {!collapsed && <span className="font-display text-lg font-bold text-sidebar-foreground">iAkauntan</span>}
      </div>

      {!collapsed && companies.length > 0 && (
        <div className="px-3 mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm hover:bg-sidebar-accent/80 transition-colors">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1 text-left">{selectedCompany?.name || 'Select Company'}</span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {companies.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => setSelectedCompany(c)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {selectedCompany && (
                <DropdownMenuItem onClick={() => setShowEditCompany(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Company
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowCreateCompany(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Sales & Purchase</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(salesItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Stock</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(stockItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>E-Commerce & POS</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(ecommerceItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Manufacturing</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(manufacturingItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Accounting</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(accountingItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Payroll & HR</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(payrollItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(managementItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(otherItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    <Dialog open={showCreateCompany} onOpenChange={setShowCreateCompany}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add New Company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Company Name *</Label>
            <Input value={newCompany.name} onChange={e => setNewCompany(f => ({ ...f, name: e.target.value }))} placeholder="My Business Sdn Bhd" />
          </div>
          <div>
            <Label>SSM Registration No.</Label>
            <Input value={newCompany.registration_no} onChange={e => setNewCompany(f => ({ ...f, registration_no: e.target.value }))} placeholder="202301012345" />
          </div>
          <div>
            <Label>Tax Identification No. (TIN)</Label>
            <Input value={newCompany.tax_id} onChange={e => setNewCompany(f => ({ ...f, tax_id: e.target.value }))} placeholder="C12345678" />
          </div>
          <Button onClick={handleCreateCompany} disabled={creating} className="w-full">
            {creating ? 'Creating...' : 'Create Company'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <EditCompanyDialog
      company={selectedCompany}
      open={showEditCompany}
      onOpenChange={setShowEditCompany}
      onSaved={refetchCompanies}
    />
    </>
  );
}
