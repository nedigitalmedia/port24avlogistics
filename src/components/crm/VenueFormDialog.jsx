import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import AddressAutocomplete from '@/components/shared/AddressAutocomplete';

const EMPTY = {
  name: '', address: '', city: '', state: '', zip: '', country: 'USA', latitude: null, longitude: null,
  venue_type: 'other', capacity: '', contact_name: '', contact_phone: '', contact_email: '', website: '',
  load_in_rules: '', load_in_dock_address: '', load_in_hours: '', freight_elevator: false,
  dock_height: '', parking_notes: '',
  power_available: '', rigging_points: false, rigging_notes: '',
  house_equipment_available: '', house_engineer_required: false,
  exclusive_vendors: '', union_required: false, union_notes: '',
  wifi_available: false, wifi_notes: '',
  preferred_setup_notes: '', internal_notes: '', is_active: true,
};

export default function VenueFormDialog({ open, onOpenChange, venue, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const isEdit = !!venue;

  useEffect(() => {
    setForm(venue ? { ...EMPTY, ...venue } : EMPTY);
  }, [venue, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? db.entities.Venue.update(venue.id, data)
      : db.entities.Venue.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Venue updated' : 'Venue created');
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Venue' : 'Add Venue'}</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); if (!form.name.trim()) { toast.error('Name required'); return; } mutation.mutate(form); }}>
          <Tabs defaultValue="info" className="mt-2">
            <TabsList className="mb-4 w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="access">Load-in</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Venue Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.venue_type} onValueChange={v => set('venue_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['hotel','convention_center','theater','outdoor','corporate_office','arena','stadium','restaurant','club','other'].map(t => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} /></div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <AddressAutocomplete
                    value={form.address}
                    onChange={v => setForm(f => ({ ...f, address: v, latitude: null, longitude: null }))}
                    onSelect={(r) => setForm(f => ({
                      ...f,
                      address: r.address || f.address,
                      city: r.city || f.city,
                      state: r.state || f.state,
                      zip: r.zip || f.zip,
                      country: r.country || f.country,
                      latitude: r.lat,
                      longitude: r.lon,
                    }))}
                  />
                  {form.latitude != null && (
                    <p className="text-xs text-emerald-600 mt-1">✓ Location verified — will be used for transport distance</p>
                  )}
                </div>
                <div><Label>City</Label><Input value={form.city} onChange={e => set('city', e.target.value)} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={e => set('state', e.target.value)} /></div>
                <div><Label>Zip</Label><Input value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
                <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} /></div>
                <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} /></div>
                <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => set('contact_email', e.target.value)} /></div>
                <div><Label>Website</Label><Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" /></div>
              </div>
            </TabsContent>

            <TabsContent value="access" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Load-in Rules & Restrictions</Label><Textarea value={form.load_in_rules} onChange={e => set('load_in_rules', e.target.value)} rows={3} placeholder="Time restrictions, dock rules, elevator, etc." /></div>
                <div><Label>Dock Address</Label><Input value={form.load_in_dock_address} onChange={e => set('load_in_dock_address', e.target.value)} /></div>
                <div><Label>Load-in Hours</Label><Input value={form.load_in_hours} onChange={e => set('load_in_hours', e.target.value)} placeholder="e.g. 6am–10pm" /></div>
                <div><Label>Dock Height</Label><Input value={form.dock_height} onChange={e => set('dock_height', e.target.value)} /></div>
                <div><Label>Parking Notes</Label><Input value={form.parking_notes} onChange={e => set('parking_notes', e.target.value)} /></div>
              </div>
              <div className="border rounded-lg divide-y">
                {[
                  { key: 'freight_elevator', label: 'Freight Elevator Available' },
                  { key: 'union_required', label: 'Union Required' },
                  { key: 'wifi_available', label: 'WiFi Available' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-medium">{label}</p>
                    <Switch checked={!!form[key]} onCheckedChange={v => set(key, v)} />
                  </div>
                ))}
              </div>
              {form.union_required && <div><Label>Union Notes</Label><Textarea value={form.union_notes} onChange={e => set('union_notes', e.target.value)} rows={2} /></div>}
              {form.wifi_available && <div><Label>WiFi Notes</Label><Input value={form.wifi_notes} onChange={e => set('wifi_notes', e.target.value)} /></div>}
              <div><Label>Exclusive Vendors</Label><Textarea value={form.exclusive_vendors} onChange={e => set('exclusive_vendors', e.target.value)} rows={2} placeholder="List any required or exclusive vendors" /></div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Power Available</Label><Input value={form.power_available} onChange={e => set('power_available', e.target.value)} placeholder="e.g. 200A 3-phase, 20x20A circuits" /></div>
                <div className="col-span-2"><Label>House Equipment Available</Label><Textarea value={form.house_equipment_available} onChange={e => set('house_equipment_available', e.target.value)} rows={2} /></div>
              </div>
              <div className="border rounded-lg divide-y">
                {[
                  { key: 'rigging_points', label: 'Rigging Points Available' },
                  { key: 'house_engineer_required', label: 'House Engineer Required' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-medium">{label}</p>
                    <Switch checked={!!form[key]} onCheckedChange={v => set(key, v)} />
                  </div>
                ))}
              </div>
              {form.rigging_points && <div><Label>Rigging Notes</Label><Textarea value={form.rigging_notes} onChange={e => set('rigging_notes', e.target.value)} rows={2} /></div>}
              <div><Label>Preferred Setup Notes</Label><Textarea value={form.preferred_setup_notes} onChange={e => set('preferred_setup_notes', e.target.value)} rows={2} /></div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-3">
                <div>
                  <Label className="text-amber-600">⚠ Internal Notes (staff only)</Label>
                  <Textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} rows={4} className="border-amber-500/30" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Venue'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}