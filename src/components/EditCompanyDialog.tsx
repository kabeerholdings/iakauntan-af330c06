import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  registration_no: string | null;
  tax_id: string | null;
  einvoice_tin: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  website: string | null;
  msic_code: string | null;
  [key: string]: any;
}

interface EditCompanyDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EditCompanyDialog = ({ company, open, onOpenChange, onSaved }: EditCompanyDialogProps) => {
  const [form, setForm] = useState({
    name: '',
    registration_no: '',
    tax_id: '',
    einvoice_tin: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
    website: '',
    msic_code: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        registration_no: company.registration_no || '',
        tax_id: company.tax_id || '',
        einvoice_tin: company.einvoice_tin || '',
        email: company.email || '',
        phone: company.phone || '',
        address_line1: company.address_line1 || '',
        address_line2: company.address_line2 || '',
        city: company.city || '',
        state: company.state || '',
        postcode: company.postcode || '',
        country: company.country || '',
        website: company.website || '',
        msic_code: company.msic_code || '',
      });
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;
    if (!form.name.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('companies').update({
      name: form.name.trim(),
      registration_no: form.registration_no.trim() || null,
      tax_id: form.tax_id.trim() || null,
      einvoice_tin: form.einvoice_tin.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address_line1: form.address_line1.trim() || null,
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postcode: form.postcode.trim() || null,
      country: form.country.trim() || null,
      website: form.website.trim() || null,
      msic_code: form.msic_code.trim() || null,
    }).eq('id', company.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Company updated');
    onOpenChange(false);
    onSaved();
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Company Name *</Label>
            <Input value={form.name} onChange={set('name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SSM Registration No.</Label>
              <Input value={form.registration_no} onChange={set('registration_no')} />
            </div>
            <div>
              <Label>Tax ID (TIN)</Label>
              <Input value={form.tax_id} onChange={set('tax_id')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>e-Invoice TIN</Label>
              <Input value={form.einvoice_tin} onChange={set('einvoice_tin')} />
            </div>
            <div>
              <Label>MSIC Code</Label>
              <Input value={form.msic_code} onChange={set('msic_code')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={set('email')} type="email" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div>
            <Label>Address Line 1</Label>
            <Input value={form.address_line1} onChange={set('address_line1')} />
          </div>
          <div>
            <Label>Address Line 2</Label>
            <Input value={form.address_line2} onChange={set('address_line2')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={set('city')} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={set('state')} />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input value={form.postcode} onChange={set('postcode')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={set('country')} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={set('website')} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCompanyDialog;
