import {
  LayoutDashboard, FileText, Receipt, BookOpen, Users, Globe, Settings, Building2, LogOut,
  ChevronDown, BarChart3, CreditCard
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logoImg from '@/assets/logo.png';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Invoices', url: '/dashboard/invoices', icon: FileText },
  { title: 'Expenses', url: '/dashboard/expenses', icon: CreditCard },
  { title: 'Contacts', url: '/dashboard/contacts', icon: Users },
];

const accountingItems = [
  { title: 'Chart of Accounts', url: '/dashboard/chart-of-accounts', icon: BookOpen },
  { title: 'Journal Entries', url: '/dashboard/journal-entries', icon: Receipt },
  { title: 'Reports', url: '/dashboard/reports', icon: BarChart3 },
];

const otherItems = [
  { title: 'e-Invoice', url: '/dashboard/einvoice', icon: Globe },
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const { companies, selectedCompany, setSelectedCompany } = useCompany();

  const renderItems = (items: typeof mainItems) => (
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
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center gap-2">
        <img src={logoImg} alt="iAkauntan" className="h-8 w-8" />
        {!collapsed && <span className="font-display text-lg font-bold text-sidebar-foreground">iAkauntan</span>}
      </div>

      {/* Company Selector */}
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
          <SidebarGroupLabel>Accounting</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(accountingItems)}</SidebarGroupContent>
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
  );
}
