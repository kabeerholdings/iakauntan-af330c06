import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import logoImg from '@/assets/logo.png';

interface Company {
  id: string;
  name: string;
  registration_no: string | null;
  [key: string]: any;
}

interface SelectCompanyPageProps {
  companies: Company[];
  onSelect: (company: Company) => void;
  onCompanyCreated: () => Promise<void>;
}

const SelectCompanyPage = ({ companies, onSelect, onCompanyCreated }: SelectCompanyPageProps) => {
  const { user, signOut } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', registration_no: '', tax_id: '' });

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Company name is required'); return; }
    if (!user) return;
    setCreating(true);
    const { error } = await supabase.from('companies').insert({
      name: form.name.trim(),
      registration_no: form.registration_no.trim() || null,
      tax_id: form.tax_id.trim() || null,
      owner_id: user.id,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Company created');
    setShowCreate(false);
    setForm({ name: '', registration_no: '', tax_id: '' });
    await onCompanyCreated();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <img src={logoImg} alt="iAkauntan" className="h-10 mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">Select Company</h1>
          <p className="text-muted-foreground text-sm mt-1">Choose a company to continue</p>
        </div>

        <div className="space-y-3">
          {companies.map(c => (
            <Card
              key={c.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => onSelect(c)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.name}</p>
                  {c.registration_no && (
                    <p className="text-xs text-muted-foreground">SSM: {c.registration_no}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card
            className="cursor-pointer transition-all hover:shadow-md border-dashed border-2 hover:border-primary/50"
            onClick={() => setShowCreate(true)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Plus className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Add New Company</p>
                <p className="text-xs text-muted-foreground">Register a new business entity</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />Sign Out
          </Button>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add New Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Company Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Business Sdn Bhd" />
              </div>
              <div>
                <Label>SSM Registration No.</Label>
                <Input value={form.registration_no} onChange={e => setForm(f => ({ ...f, registration_no: e.target.value }))} placeholder="202301012345" />
              </div>
              <div>
                <Label>Tax Identification No. (TIN)</Label>
                <Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} placeholder="C12345678" />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Company'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SelectCompanyPage;
