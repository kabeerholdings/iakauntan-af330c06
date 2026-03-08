import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Company {
  id: string;
  name: string;
  registration_no: string | null;
  tax_id: string | null;
  einvoice_enabled: boolean | null;
  [key: string]: any;
}

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  loading: boolean;
  refetchCompanies: () => Promise<void>;
  companyChosen: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  selectedCompany: null,
  setSelectedCompany: () => {},
  loading: true,
  refetchCompanies: async () => {},
  companyChosen: false,
});

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyChosen, setCompanyChosen] = useState(false);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setSelectedCompanyState(null);
      setCompanyChosen(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .order('name');
    const companyList = (data || []) as Company[];
    setCompanies(companyList);

    // If a company was already chosen, refresh its data
    if (companyChosen && selectedCompany) {
      const updated = companyList.find(c => c.id === selectedCompany.id);
      if (updated) {
        setSelectedCompanyState(updated);
      }
    }

    setLoading(false);
  }, [user, companyChosen, selectedCompany?.id]);

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    setCompanyChosen(!!company);
    if (company) {
      localStorage.setItem('selectedCompanyId', company.id);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [user]);

  // Auto-restore last selected company from localStorage after companies load
  useEffect(() => {
    if (!companyChosen && companies.length > 0 && !loading) {
      const savedId = localStorage.getItem('selectedCompanyId');
      if (savedId) {
        const found = companies.find(c => c.id === savedId);
        if (found) {
          setSelectedCompanyState(found);
          setCompanyChosen(true);
        }
      }
    }
  }, [companies, loading, companyChosen]);

  return (
    <CompanyContext.Provider value={{
      companies,
      selectedCompany,
      setSelectedCompany,
      loading,
      refetchCompanies: fetchCompanies,
      companyChosen,
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
