import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSerialNumbersString } from '@/lib/serialNumbers';

export default function AdditionalEquipmentDialog({ open, onOpenChange, asset, show, subLocations, onSuccess }) {
  const [selectedSubLocationId, setSelectedSubLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => db.auth.me(),
  });

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      const subLoc = subLocations.find(sl => sl.id === selectedSubLocationId);

      await db.entities.AdditionalEquipmentRequest.create({
        show_id: show.id,
        show_name: show.name,
        asset_id: asset.id,
        asset_name: asset.name,
        asset_barcode: asset.barcode || '',
        serial_number: asset.serial_number || getSerialNumbersString(asset),
        requested_quantity: 1,
        sub_location_id: selectedSubLocationId || null,
        sub_location_name: subLoc?.name || '',
        status: 'pending',
        // Use real user email instead of the literal string 'current_user'
        requested_by: currentUser?.email || currentUser?.full_name || 'Unknown',
        scanned_at: new Date().toISOString(),
        notes,
      });
    },
    onSuccess: () => {
      // Invalidate BOTH query key variants so Scan page and ShowDetail panel both refresh
      queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', show.id] });
      queryClient.invalidateQueries({ queryKey: ['additional_equip_requests', show.id] });
      onOpenChange(false);
      setSelectedSubLocationId('');
      setNotes('');
      onSuccess?.();
    },
  });

  const handleSubmit = () => {
    createRequestMutation.mutate();
  };

  if (!asset || !show) return null;

  const hasSubLocations = subLocations && subLocations.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div>Additional Equipment Request</div>
              <p className="text-sm font-normal text-muted-foreground mt-1">This item is not assigned to {show.name}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">{asset.name}</p>
            {asset.barcode && <p className="text-xs text-muted-foreground font-mono mt-1 break-all">{asset.barcode}</p>}
            {(asset.serial_number || getSerialNumbersString(asset)) && (
              <p className="text-xs text-muted-foreground font-mono mt-1 break-all">{asset.serial_number || getSerialNumbersString(asset)}</p>
            )}
          </div>

          {hasSubLocations && (
            <div>
              <Label className="mb-2 block text-sm font-medium">
                <MapPin className="w-4 h-4 inline mr-2" />
                Assign to Room / Truck / Area (optional)
              </Label>
              <Select value={selectedSubLocationId} onValueChange={setSelectedSubLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {subLocations.map(sl => (
                    <SelectItem key={sl.id} value={sl.id}>
                      {sl.name} ({sl.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="mb-2 block text-sm font-medium">Notes (optional)</Label>
            <Textarea
              placeholder="Any additional context..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              This request will be sent to managers/coordinators/admins for approval. Once approved, the item will be added to the show.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending}
            className="gap-2"
          >
            {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}