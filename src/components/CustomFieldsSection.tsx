import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomFieldsSectionProps {
  entityType: string;
  entityId?: string | null;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

const CustomFieldsSection = ({ entityType, entityId, values, onChange }: CustomFieldsSectionProps) => {
  const { selectedCompany } = useCompany();
  const [fields, setFields] = useState<any[]>([]);

  useEffect(() => {
    const fetchFields = async () => {
      if (!selectedCompany) return;
      const { data } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('entity_type', entityType)
        .eq('is_active', true)
        .order('sort_order');
      setFields(data || []);
    };
    fetchFields();
  }, [selectedCompany, entityType]);

  // Load saved values when editing an existing entity
  useEffect(() => {
    if (!entityId || fields.length === 0) return;
    const loadValues = async () => {
      const fieldIds = fields.map(f => f.id);
      const { data } = await supabase
        .from('custom_field_values')
        .select('custom_field_id, value')
        .eq('entity_id', entityId)
        .in('custom_field_id', fieldIds);
      if (data && data.length > 0) {
        const loaded: Record<string, string> = { ...values };
        data.forEach(v => {
          const field = fields.find(f => f.id === v.custom_field_id);
          if (field) loaded[field.field_name] = v.value || '';
        });
        onChange(loaded);
      }
    };
    loadValues();
  }, [entityId, fields]);

  if (fields.length === 0) return null;

  const handleChange = (fieldName: string, value: string) => {
    onChange({ ...values, [fieldName]: value });
  };

  return (
    <div className="border-t border-border pt-4">
      <h3 className="font-medium text-foreground mb-3">Custom Fields</h3>
      <div className="grid grid-cols-2 gap-4">
        {fields.map(field => {
          const val = values[field.field_name] || '';
          return (
            <div key={field.id} className={field.field_type === 'memo' ? 'col-span-2' : ''}>
              <Label>{field.field_label}{field.is_required && <span className="text-destructive ml-1">*</span>}</Label>
              {field.field_type === 'text' && (
                <Input value={val} onChange={e => handleChange(field.field_name, e.target.value)} />
              )}
              {field.field_type === 'number' && (
                <Input type="number" value={val} onChange={e => handleChange(field.field_name, e.target.value)} />
              )}
              {field.field_type === 'date' && (
                <Input type="date" value={val} onChange={e => handleChange(field.field_name, e.target.value)} />
              )}
              {field.field_type === 'memo' && (
                <Textarea value={val} onChange={e => handleChange(field.field_name, e.target.value)} />
              )}
              {field.field_type === 'checkbox' && (
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox checked={val === 'true'} onCheckedChange={c => handleChange(field.field_name, c ? 'true' : 'false')} />
                  <span className="text-sm text-muted-foreground">Yes</span>
                </div>
              )}
              {field.field_type === 'dropdown' && (
                <Select value={val} onValueChange={v => handleChange(field.field_name, v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(field.field_options) ? field.field_options : []).map((opt: string) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Save custom field values for an entity after create/update */
export const saveCustomFieldValues = async (
  companyId: string,
  entityType: string,
  entityId: string,
  values: Record<string, string>
) => {
  // Get field definitions to map field_name -> field id
  const { data: fields } = await supabase
    .from('custom_fields')
    .select('id, field_name')
    .eq('company_id', companyId)
    .eq('entity_type', entityType)
    .eq('is_active', true);

  if (!fields || fields.length === 0) return;

  for (const field of fields) {
    const value = values[field.field_name];
    if (value === undefined) continue;

    // Upsert: check if value exists
    const { data: existing } = await supabase
      .from('custom_field_values')
      .select('id')
      .eq('custom_field_id', field.id)
      .eq('entity_id', entityId)
      .maybeSingle();

    if (existing) {
      await supabase.from('custom_field_values').update({ value }).eq('id', existing.id);
    } else {
      await supabase.from('custom_field_values').insert({
        custom_field_id: field.id,
        entity_id: entityId,
        value,
      });
    }
  }
};

export default CustomFieldsSection;
