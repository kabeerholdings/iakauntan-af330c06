import { useEffect, useState, useCallback, ReactNode } from 'react';
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

/** Render a single custom field */
const RenderField = ({ field, value, onChangeValue }: { field: any; value: string; onChangeValue: (v: string) => void }) => (
  <div className={field.field_type === 'memo' ? 'col-span-2' : ''}>
    <Label>{field.field_label}{field.is_required && <span className="text-destructive ml-1">*</span>}</Label>
    {field.field_type === 'text' && (
      <Input value={value} onChange={e => onChangeValue(e.target.value)} />
    )}
    {field.field_type === 'number' && (
      <Input type="number" value={value} onChange={e => onChangeValue(e.target.value)} />
    )}
    {field.field_type === 'date' && (
      <Input type="date" value={value} onChange={e => onChangeValue(e.target.value)} />
    )}
    {field.field_type === 'memo' && (
      <Textarea value={value} onChange={e => onChangeValue(e.target.value)} />
    )}
    {field.field_type === 'checkbox' && (
      <div className="flex items-center gap-2 mt-1">
        <Checkbox checked={value === 'true'} onCheckedChange={c => onChangeValue(c ? 'true' : 'false')} />
        <span className="text-sm text-muted-foreground">Yes</span>
      </div>
    )}
    {field.field_type === 'dropdown' && (
      <Select value={value} onValueChange={v => onChangeValue(v)}>
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

/** Hook to load custom fields and their values */
export const useCustomFields = (entityType: string, entityId?: string | null) => {
  const { selectedCompany } = useCompany();
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});

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
        const loaded: Record<string, string> = {};
        data.forEach(v => {
          const field = fields.find(f => f.id === v.custom_field_id);
          if (field) loaded[field.field_name] = v.value || '';
        });
        setValues(prev => ({ ...prev, ...loaded }));
      }
    };
    loadValues();
  }, [entityId, fields]);

  const handleChange = useCallback((fieldName: string, value: string) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  /** Get custom fields that should render before a given native field */
  const getFieldsBefore = useCallback((nativeFieldName: string) => {
    return fields.filter(f => f.position_reference === nativeFieldName && f.position_placement === 'before');
  }, [fields]);

  /** Get custom fields that should render after a given native field */
  const getFieldsAfter = useCallback((nativeFieldName: string) => {
    return fields.filter(f => f.position_reference === nativeFieldName && f.position_placement === 'after');
  }, [fields]);

  /** Get custom fields with no position (end of form) or position_reference is null */
  const getUnpositionedFields = useCallback(() => {
    return fields.filter(f => !f.position_reference);
  }, [fields]);

  /** Render custom fields for a specific native field position */
  const renderFieldsFor = useCallback((nativeFieldName: string, placement: 'before' | 'after') => {
    const matching = placement === 'before' ? getFieldsBefore(nativeFieldName) : getFieldsAfter(nativeFieldName);
    if (matching.length === 0) return null;
    return (
      <>
        {matching.map(field => (
          <RenderField
            key={field.id}
            field={field}
            value={values[field.field_name] || ''}
            onChangeValue={(v) => handleChange(field.field_name, v)}
          />
        ))}
      </>
    );
  }, [fields, values, handleChange, getFieldsBefore, getFieldsAfter]);

  /** Render unpositioned fields (fallback section at end) */
  const renderUnpositionedFields = useCallback(() => {
    const unpositioned = getUnpositionedFields();
    if (unpositioned.length === 0) return null;
    return (
      <div className="border-t border-border pt-4">
        <h3 className="font-medium text-foreground mb-3">Custom Fields</h3>
        <div className="grid grid-cols-2 gap-4">
          {unpositioned.map(field => (
            <RenderField
              key={field.id}
              field={field}
              value={values[field.field_name] || ''}
              onChangeValue={(v) => handleChange(field.field_name, v)}
            />
          ))}
        </div>
      </div>
    );
  }, [fields, values, handleChange, getUnpositionedFields]);

  return { fields, values, setValues, handleChange, renderFieldsFor, renderUnpositionedFields };
};

/**
 * Legacy component — renders ALL custom fields in a "Custom Fields" section.
 * Still works but does NOT respect positioning. Use useCustomFields hook for inline positioning.
 */
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
        {fields.map(field => (
          <RenderField
            key={field.id}
            field={field}
            value={values[field.field_name] || ''}
            onChangeValue={(v) => handleChange(field.field_name, v)}
          />
        ))}
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
