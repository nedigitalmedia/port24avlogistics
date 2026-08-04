import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Step6ExtraDetails({ formData, set, customFields, updateCustomField }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Weight — Full Case (kg)</Label>
          <Input
            type="number" step="0.1" min="0"
            value={formData.weight_kg || ''}
            onChange={e => set('weight_kg', e.target.value)}
            placeholder="0.0"
          />
        </div>
        <div>
          <Label>Country of Origin</Label>
          <Input
            value={formData.country_of_origin || ''}
            onChange={e => set('country_of_origin', e.target.value)}
            placeholder="e.g. USA, Germany"
          />
        </div>
        <div>
          <Label>Vendor / Supplier</Label>
          <Input
            value={formData.vendor || ''}
            onChange={e => set('vendor', e.target.value)}
            placeholder="Who did you buy it from?"
          />
        </div>
        <div>
          <Label>Warranty Expiry</Label>
          <Input
            type="date"
            value={formData.warranty_expiry || ''}
            onChange={e => set('warranty_expiry', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Internal Notes</Label>
        <Textarea
          value={formData.notes || ''}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Any notes about this item for internal use…"
        />
      </div>

      {customFields.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Custom Fields</p>
          <div className="grid grid-cols-2 gap-3">
            {customFields.map(cf => (
              <div key={cf.id}>
                <Label>{cf.field_name}</Label>
                {cf.field_type === 'select' ? (
                  <Select value={formData.custom_fields?.[cf.field_key] || ''} onValueChange={v => updateCustomField(cf.field_key, v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(cf.options) ? cf.options.join(',') : cf.options || '').split(',').filter(Boolean).map(o => <SelectItem key={o.trim()} value={o.trim()}>{o.trim()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={cf.field_type === 'number' ? 'number' : cf.field_type === 'date' ? 'date' : 'text'}
                    value={formData.custom_fields?.[cf.field_key] || ''}
                    onChange={e => updateCustomField(cf.field_key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}