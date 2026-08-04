import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const EMPTY = {
  company_name: '', logo_url: '', contact_name: '', email: '', phone: '',
  address: '', pickup_address: '', delivery_notes: '', billing_notes: '',
  preferred_categories: '', notes: '', is_active: true,
};

export default function PartnerFormDialog({ partner, onClose, onSaved }) {
  const [form, setForm] = useState(partner ? { ...partner } : { ...EMPTY });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => partner
      ? db.entities.RoundtablePartner.update(partner.id, form)
      : db.entities.RoundtablePartner.create(form),
    onSuccess: () => { toast.success(partner ? 'Partner updated' : 'Partner added'); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{partner ? 'Edit Partner' : 'Add Roundtable Partner'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="md:col-span-2">
            <Label>Company Name *</Label>
            <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} />
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://…" />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Pickup / Warehouse Address</Label>
            <Input value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)} />
          </div>
          <div>
            <Label>Preferred Categories</Label>
            <Input value={form.preferred_categories} onChange={e => set('preferred_categories', e.target.value)} placeholder="Audio, Video, Lighting" />
          </div>
          <div>
            <Label>Billing Notes</Label>
            <Input value={form.billing_notes} onChange={e => set('billing_notes', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Delivery Notes</Label>
            <Textarea value={form.delivery_notes} onChange={e => set('delivery_notes', e.target.value)} rows={2} />
          </div>
          <div className="md:col-span-2">
            <Label>Internal Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.company_name}>
            {mutation.isPending ? 'Saving…' : 'Save Partner'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}