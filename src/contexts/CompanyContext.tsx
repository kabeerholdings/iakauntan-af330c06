import React, { createContext, useContext, useEffect, useState } from 'react';
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
}

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  selectedCompany: null,
  setSelectedCompany: () => {},
  loading: true,
  refetchCompanies: async () => {},
});

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setSelectedCompany(null);
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
    if (companyList.length > 0) {
      // Update selectedCompany with fresh data, or pick first if none selected
      const currentId = selectedCompany?.id;
      const updated = currentId ? companyList.find(c => c.id === currentId) : companyList[0];
      setSelectedCompany(updated || companyList[0]);
    } else {
      setSelectedCompany(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, [user]);

  return (
    <CompanyContext.Provider value={{
      companies,
      selectedCompany,
      setSelectedCompany,
      loading,
      refetchCompanies: fetchCompanies,
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
