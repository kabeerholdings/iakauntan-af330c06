import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  [key: string]: any;
}

interface EditCompanyDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const taxSystems = [
  { value: 'sst', label: 'SST (Sales & Service Tax)' },
  { value: 'gst', label: 'GST (Goods & Services Tax)' },
  { value: 'no_tax', label: 'No Tax' },
];

const currencies = [
  'MYR', 'USD', 'SGD', 'EUR', 'GBP', 'AUD', 'JPY', 'CNY', 'HKD', 'THB', 'IDR', 'PHP', 'INR',
];

const inventorySystems = [
  { value: 'periodic', label: 'Periodic Inventory System' },
  { value: 'perpetual', label: 'Perpetual Inventory System' },
];

const sampleCOAs = [
  { value: 'blank', label: 'Blank Account Book' },
  { value: 'trading', label: 'Trading Company' },
  { value: 'manufacturing', label: 'Manufacturing Company' },
  { value: 'partnership', label: 'Partnership Company' },
  { value: 'training', label: 'Training Center Company' },
  { value: 'travel', label: 'Travel Agency Company' },
  { value: 'construction', label: 'Construction Company' },
  { value: 'fnb', label: 'F&B Company' },
  { value: 'legal', label: 'Legal Firm' },
];

const EditCompanyDialog = ({ company, open, onOpenChange, onSaved }: EditCompanyDialogProps) => {
  const [form, setForm] = useState({
    name: '',
    registration_no: '',
    tax_system: 'no_tax',
    tax_id: '',
    fiscal_year_start_date: '',
    actual_data_start_date: '',
    base_currency: 'MYR',
    inventory_system: 'perpetual',
    sample_coa: 'blank',
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
        tax_system: company.tax_system || 'no_tax',
        tax_id: company.tax_id || '',
        fiscal_year_start_date: company.fiscal_year_start_date || '',
        actual_data_start_date: company.actual_data_start_date || '',
        base_currency: company.base_currency || 'MYR',
        inventory_system: company.inventory_system || 'perpetual',
        sample_coa: company.sample_coa || 'blank',
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
      tax_system: form.tax_system,
      tax_id: form.tax_id.trim() || null,
      fiscal_year_start_date: form.fiscal_year_start_date || null,
      actual_data_start_date: form.actual_data_start_date || null,
      base_currency: form.base_currency,
      inventory_system: form.inventory_system,
      sample_coa: form.sample_coa,
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

  const setSelect = (field: string) => (value: string) =>
    setForm(f => ({ ...f, [field]: value }));

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
          <div>
            <Label>SSM Registration No.</Label>
            <Input value={form.registration_no} onChange={set('registration_no')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax System</Label>
              <Select value={form.tax_system} onValueChange={setSelect('tax_system')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {taxSystems.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax ID (TIN)</Label>
              <Input value={form.tax_id} onChange={set('tax_id')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fiscal Year Start Date</Label>
              <Input type="date" value={form.fiscal_year_start_date} onChange={set('fiscal_year_start_date')} />
            </div>
            <div>
              <Label>Actual Data Start Date</Label>
              <Input type="date" value={form.actual_data_start_date} onChange={set('actual_data_start_date')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>System Currency</Label>
              <Select value={form.base_currency} onValueChange={setSelect('base_currency')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Inventory System</Label>
              <Select value={form.inventory_system} onValueChange={setSelect('inventory_system')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {inventorySystems.map(i => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Sample Chart Of Accounts</Label>
            <Select value={form.sample_coa} onValueChange={setSelect('sample_coa')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sampleCOAs.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
