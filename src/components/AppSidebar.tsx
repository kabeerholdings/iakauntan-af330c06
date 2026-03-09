import { useState } from 'react';
import {
  LayoutDashboard, FileText, Receipt, BookOpen, Users, Globe, Settings, Building2, LogOut,
  ChevronDown, BarChart3, CreditCard, Package, ShoppingCart, Truck, Wallet, FolderKanban, DollarSign,
  UserCheck, Calculator, CalendarDays, ClipboardList, Zap, Landmark, Paperclip, Factory, Layers, Hammer, PieChart,
  Store, ScanBarcode, Brain, Sparkles, Heart, Cloud, Puzzle, Mail, Shield, Palette, TrendingUp, Plus, Pencil,
  ArrowDownLeft, FileCheck, FileX, ArrowLeftRight, BarChart, Link2, RefreshCw, Percent, Target,
  Barcode, Activity, CheckSquare, FileSignature, Calendar, Clock, StickyNote, Tag, ShieldCheck, ChevronRight
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import EditCompanyDialog from '@/components/EditCompanyDialog';
import logoImg from '@/assets/logo.png';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
];

const salesItems = [
  { title: 'Proposals', url: '/dashboard/proposals', icon: FileText },
  { title: 'Quotations', url: '/dashboard/quotations', icon: FileCheck },
  { title: 'Sales', url: '/dashboard/sales', icon: ShoppingCart },
  { title: 'Invoices', url: '/dashboard/invoices', icon: FileText },
  { title: 'Credit Notes', url: '/dashboard/credit-notes', icon: FileX },
  { title: 'Debit Notes', url: '/dashboard/debit-notes', icon: FileText },
  { title: 'Retainers', url: '/dashboard/retainers', icon: Wallet },
  { title: 'Payments', url: '/dashboard/payments', icon: Wallet },
  { title: 'Sales Reports', url: '/dashboard/sales-reports', icon: BarChart3 },
];

const purchaseItems = [
  { title: 'Purchase Order', url: '/dashboard/purchase', icon: Truck },
  { title: 'Purchase Reports', url: '/dashboard/purchase-reports', icon: BarChart3 },
];

const stockItems = [
  { title: 'Stock / Inventory', url: '/dashboard/stock', icon: Package },
  { title: 'Composite Items', url: '/dashboard/composite-items', icon: Layers },
  { title: 'Serial Numbers', url: '/dashboard/serial-numbers', icon: Barcode },
  { title: 'Stock Adjustment', url: '/dashboard/stock-adjustment', icon: ClipboardList },
  { title: 'Stock Transfer', url: '/dashboard/stock-transfer', icon: ArrowLeftRight },
  { title: 'Inventory Reports', url: '/dashboard/inventory-reports', icon: BarChart3 },
  { title: 'Stock Take', url: '/dashboard/stock-take', icon: ScanBarcode },
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

const accountingEntryItems = [
  { title: 'Cash Book Entry', url: '/dashboard/cash-book', icon: ArrowDownLeft },
  { title: 'Journal Entry', url: '/dashboard/journal-entries', icon: Receipt },
  { title: 'Knock Off Entry', url: '/dashboard/knock-off', icon: Link2 },
  { title: 'Bank Reconciliation', url: '/dashboard/bank-reconciliation', icon: Landmark },
  { title: 'Bank Feeds', url: '/dashboard/bank-feeds', icon: Landmark },
  { title: 'Opening Balance', url: '/dashboard/opening-balance', icon: BookOpen },
  { title: 'Recurring', url: '/dashboard/recurring', icon: RefreshCw },
  { title: 'Fast Entry', url: '/dashboard/fast-entry', icon: Zap },
  { title: 'SST', url: '/dashboard/sst', icon: Percent },
  { title: 'Fixed Assets', url: '/dashboard/fixed-assets', icon: Building2 },
  { title: 'Chart of Accounts', url: '/dashboard/chart-of-accounts', icon: BookOpen },
  { title: 'Payment Methods', url: '/dashboard/payment-methods', icon: CreditCard },
];

const accountingReportItems = [
  { title: 'Ledger', url: '/dashboard/financial-reports?tab=ledger', icon: BookOpen },
  { title: 'Journal Listing', url: '/dashboard/financial-reports?tab=journal', icon: Receipt },
  { title: 'Trial Balance', url: '/dashboard/financial-reports?tab=trial-balance', icon: BarChart },
  { title: 'Profit & Loss', url: '/dashboard/financial-reports?tab=pnl', icon: TrendingUp },
  { title: 'Balance Sheet', url: '/dashboard/financial-reports?tab=balance-sheet', icon: BarChart3 },
  { title: 'Debtor Aging', url: '/dashboard/financial-reports?tab=debtor-aging', icon: Users },
  { title: 'Creditor Aging', url: '/dashboard/financial-reports?tab=creditor-aging', icon: Users },
  { title: 'Debtor Statement', url: '/dashboard/financial-reports?tab=debtor-statement', icon: FileText },
  { title: 'Creditor Statement', url: '/dashboard/financial-reports?tab=creditor-statement', icon: FileText },
  { title: 'Scheduled Reports', url: '/dashboard/scheduled-reports', icon: Clock },
  { title: 'Reports', url: '/dashboard/reports', icon: PieChart },
];

const accountingOtherItems = [
  { title: 'Documents', url: '/dashboard/documents', icon: Paperclip },
  { title: 'Document Notes', url: '/dashboard/document-notes', icon: StickyNote },
  { title: 'AI Easy Scan', url: '/dashboard/ai-scanner', icon: Brain },
];

const payrollItems = [
  { title: 'Employees', url: '/dashboard/employees', icon: UserCheck },
  { title: 'Payroll', url: '/dashboard/payroll', icon: Calculator },
  { title: 'Leave', url: '/dashboard/leave', icon: CalendarDays },
  { title: 'Payroll Reports', url: '/dashboard/payroll-reports', icon: ClipboardList },
];

const managementItems = [
  { title: 'CRM', url: '/dashboard/crm', icon: Target },
  { title: 'Contacts', url: '/dashboard/contacts', icon: Users },
  { title: 'Contracts', url: '/dashboard/contracts', icon: FileSignature },
  { title: 'Expenses', url: '/dashboard/expenses', icon: CreditCard },
  { title: 'Projects', url: '/dashboard/projects', icon: FolderKanban },
  { title: 'Appointments', url: '/dashboard/appointments', icon: CalendarDays },
  { title: 'Calendar', url: '/dashboard/calendar', icon: Calendar },
  { title: 'To-Do', url: '/dashboard/todos', icon: CheckSquare },
  { title: 'Currency Rates', url: '/dashboard/currency-rates', icon: DollarSign },
  { title: 'Commission', url: '/dashboard/commission', icon: Calculator },
  { title: 'Advanced Reports', url: '/dashboard/advanced-reports', icon: TrendingUp },
];

const otherItems = [
  { title: 'Automations', url: '/dashboard/automations', icon: Zap },
  { title: 'API Integration', url: '/dashboard/api-integration', icon: Link2 },
  { title: 'AI Cloud Backup', url: '/dashboard/ai-cloud', icon: Cloud },
  { title: 'White Label', url: '/dashboard/white-label', icon: Tag },
  { title: 'Customization', url: '/dashboard/customization', icon: Puzzle },
  { title: 'Doc Templates', url: '/dashboard/document-templates', icon: Palette },
  { title: 'Batch Messages', url: '/dashboard/batch-messages', icon: Mail },
  { title: 'Audit Log', url: '/dashboard/audit-log', icon: Activity },
  { title: 'Two-Factor Auth', url: '/dashboard/two-factor', icon: ShieldCheck },
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
  const [creating, setCreating] = useState(false);

  const handleCreateCompany = async (form: CreateCompanyFormData) => {
    if (!form.name.trim()) { toast.error('Company name is required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCreating(true);
    const { error } = await supabase.from('companies').insert({
      name: form.name.trim(),
      registration_no: form.registration_no.trim() || null,
      tax_id: form.tax_id.trim() || null,
      tax_system: form.tax_system,
      fiscal_year_start_date: form.fiscal_year_start_date || null,
      actual_data_start_date: form.actual_data_start_date || null,
      base_currency: form.base_currency,
      inventory_system: form.inventory_system,
      sample_coa: form.sample_coa,
      owner_id: user.id,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Company created');
    setShowCreateCompany(false);
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
          <SidebarGroupLabel>Sales</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(salesItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Purchase</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(purchaseItems)}</SidebarGroupContent>
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
          <SidebarGroupLabel>Accounting — Entries</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(accountingEntryItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Accounting — Reports</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(accountingReportItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Accounting — Tools</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(accountingOtherItems)}</SidebarGroupContent>
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Company</DialogTitle>
        </DialogHeader>
        <CreateCompanyForm onSubmit={handleCreateCompany} loading={creating} />
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
