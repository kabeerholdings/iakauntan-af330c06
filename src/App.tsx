import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import InvoicesPage from "./pages/dashboard/InvoicesPage";
import ExpensesPage from "./pages/dashboard/ExpensesPage";
import ContactsPage from "./pages/dashboard/ContactsPage";
import ChartOfAccountsPage from "./pages/dashboard/ChartOfAccountsPage";
import JournalEntriesPage from "./pages/dashboard/JournalEntriesPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import EInvoicePage from "./pages/dashboard/EInvoicePage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import AdminPage from "./pages/admin/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="chart-of-accounts" element={<ChartOfAccountsPage />} />
              <Route path="journal-entries" element={<JournalEntriesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="einvoice" element={<EInvoicePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<AdminPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
