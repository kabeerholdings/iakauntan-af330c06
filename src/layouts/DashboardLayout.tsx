import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyProvider, useCompany } from '@/contexts/CompanyContext';
import { Skeleton } from '@/components/ui/skeleton';
import SelectCompanyPage from '@/pages/SelectCompanyPage';

const DashboardContent = () => {
  const { companies, selectedCompany, setSelectedCompany, loading, refetchCompanies, companyChosen } = useCompany();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!companyChosen) {
    return (
      <SelectCompanyPage
        companies={companies}
        onSelect={setSelectedCompany}
        onCompanyCreated={refetchCompanies}
      />
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-card px-3 sm:px-4 sticky top-0 z-20">
            <SidebarTrigger className="mr-3 h-9 w-9 sm:h-7 sm:w-7" />
            <h2 className="font-display font-semibold text-foreground text-sm sm:text-base truncate">iAkauntan</h2>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background overflow-y-auto overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const DashboardLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <CompanyProvider>
      <DashboardContent />
    </CompanyProvider>
  );
};

export default DashboardLayout;
