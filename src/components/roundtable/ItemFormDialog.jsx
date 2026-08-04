import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const EMPTY = {
  partner_id: '', partner_name: '', name: '', category: '',
  qty_available: 1, daily_rate: '', serial_numbers: '',
  item_type: 'physical', condition: 'good', notes: '', is_available: true,
};

const CATEGORIES = ['Audio', 'Video', 'Lighting', 'Staging', 'Power', 'Rigging', 'Comms', 'Backline', 'Other'];

export default function ItemFormDialog({ item, partners, onClose, onSaved }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const qc = useQueryClient();

  const handlePartnerChange = (partnerId) => {
    const partner = partners.find(p => p.id === partnerId);
    set('partner_id', partnerId);
    set('partner_name', partner?.company_name || '');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (item) {
        // Update existing item
        return db.entities.RoundtableItem.update(item.id, form);
      } else {
        // Create new item
        return db.entities.RoundtableItem.create(form);
      }
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['roundtable_items'] });
      qc.invalidateQueries({ queryKey: ['roundtable_partners'] });
      toast.success(item ? 'Item updated' : 'Item added');
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Roundtable Item'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="md:col-span-2">
            <Label>Partner *</Label>
            <Select value={form.partner_id} onValueChange={handlePartnerChange}>
              <SelectTrigger><SelectValue placeholder="Select partner…" /></SelectTrigger>
              <SelectContent>
                {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Item Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Item Type</Label>
            <Select value={form.item_type} onValueChange={v => set('item_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Physical Item</SelectItem>
                <SelectItem value="kit">Kit / Bundle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Qty Available</Label>
            <Input type="number" min="1" value={form.qty_available} onChange={e => set('qty_available', Number(e.target.value))} />
          </div>
          <div>
            <Label>Daily Rate ($)</Label>
            <Input type="number" min="0" value={form.daily_rate} onChange={e => set('daily_rate', Number(e.target.value))} />
          </div>
          <div>
            <Label>Condition</Label>
            <Select value={form.condition} onValueChange={v => set('condition', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serial / Asset Numbers</Label>
            <Input value={form.serial_numbers} onChange={e => set('serial_numbers', e.target.value)} placeholder="Comma-separated" />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.partner_id || !form.name}>
            {mutation.isPending ? 'Saving…' : 'Save Item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}