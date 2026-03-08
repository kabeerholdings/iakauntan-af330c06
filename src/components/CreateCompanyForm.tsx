import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateCompanyFormData {
  name: string;
  registration_no: string;
  tax_system: string;
  tax_id: string;
  fiscal_year_start_date: string;
  actual_data_start_date: string;
  base_currency: string;
  inventory_system: string;
  sample_coa: string;
}

const initialForm: CreateCompanyFormData = {
  name: '',
  registration_no: '',
  tax_system: 'no_tax',
  tax_id: '',
  fiscal_year_start_date: '',
  actual_data_start_date: '',
  base_currency: 'MYR',
  inventory_system: 'perpetual',
  sample_coa: 'blank',
};

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

interface CreateCompanyFormProps {
  onSubmit: (data: CreateCompanyFormData) => void;
  loading?: boolean;
}

const CreateCompanyForm = ({ onSubmit, loading }: CreateCompanyFormProps) => {
  const [form, setForm] = useState<CreateCompanyFormData>(initialForm);

  const set = (field: keyof CreateCompanyFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const setSelect = (field: keyof CreateCompanyFormData) => (value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-4">
      <div>
        <Label>Company Name *</Label>
        <Input value={form.name} onChange={set('name')} placeholder="My Business Sdn Bhd" />
      </div>
      <div>
        <Label>SSM Registration No.</Label>
        <Input value={form.registration_no} onChange={set('registration_no')} placeholder="202301012345" />
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
          <Label>Tax Identification No. (TIN)</Label>
          <Input value={form.tax_id} onChange={set('tax_id')} placeholder="C12345678" />
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
      <Button onClick={() => onSubmit(form)} disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Company'}
      </Button>
    </div>
  );
};

export default CreateCompanyForm;
export type { CreateCompanyFormData };
