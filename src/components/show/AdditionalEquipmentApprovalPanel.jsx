import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, XCircle, MapPin, Clock, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdditionalEquipmentApprovalPanel({ showId, show, subLocations, userRole, assets }) {
  const queryClient = useQueryClient();
  const [approvalInProgress, setApprovalInProgress] = useState({});

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => db.auth.me(),
  });

  // Use the same query key as the Scan page ('additionalEquipmentRequests') so they share cache
  const { data: requests = [] } = useQuery({
    queryKey: ['additionalEquipmentRequests', showId],
    queryFn: () => db.entities.AdditionalEquipmentRequest.filter({ show_id: showId }),
    enabled: !!showId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // poll every 10s as a safety net for cross-device scans
  });

  // Real-time subscription so new scan-created requests appear immediately
  useEffect(() => {
    const unsub = db.entities.AdditionalEquipmentRequest.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', showId] });
      // Also invalidate the Scan page variant
      queryClient.invalidateQueries({ queryKey: ['additional_equip_requests', showId] });
    });
    return () => unsub();
  }, [queryClient, showId]);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const canApprove = ['admin', 'manager', 'coordinator'].includes(userRole);

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      // Prevent duplicate approvals
      if (approvalInProgress[requestId]) return;
      
      const req = requests.find(r => r.id === requestId);
      if (!req || req.status === 'approved') return;

      setApprovalInProgress(prev => ({ ...prev, [requestId]: true }));

      try {
        // 1. Update request status to approved
        await db.entities.AdditionalEquipmentRequest.update(requestId, {
          status: 'approved',
          approved_by: currentUser?.email || currentUser?.full_name || 'Manager',
          approved_at: new Date().toISOString(),
        });

        // 2. Assign the asset to the show
        const asset = assets.find(a => a.id === req.asset_id);
        if (asset) {
          await db.entities.Asset.update(req.asset_id, {
            current_show_id: showId,
            current_sub_location_id: req.sub_location_id,
            current_sub_location_name: req.sub_location_name,
            status: 'checked_out',
            location: req.sub_location_name,
          });
        }
      } finally {
        setApprovalInProgress(prev => {
          const updated = { ...prev };
          delete updated[requestId];
          return updated;
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', showId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Equipment approved and added to show');
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const toApprove = pendingRequests.filter(r => !approvalInProgress[r.id]);
      if (toApprove.length === 0) return;

      setApprovalInProgress(prev => ({
        ...prev,
        ...Object.fromEntries(toApprove.map(r => [r.id, true]))
      }));

      const errors = [];
      for (const req of toApprove) {
        try {
          // Check status again to prevent duplicate approvals
          const latestReq = await db.entities.AdditionalEquipmentRequest.filter({ id: req.id });
          if (latestReq[0]?.status === 'approved') continue;

          // Update request status
          await db.entities.AdditionalEquipmentRequest.update(req.id, {
            status: 'approved',
            approved_by: currentUser?.email || currentUser?.full_name || 'Manager',
            approved_at: new Date().toISOString(),
          });

          // Assign asset to show
          const asset = assets.find(a => a.id === req.asset_id);
          if (asset) {
            await db.entities.Asset.update(req.asset_id, {
              current_show_id: showId,
              current_sub_location_id: req.sub_location_id,
              current_sub_location_name: req.sub_location_name,
              status: 'checked_out',
              location: req.sub_location_name,
            });
          }
        } catch (error) {
          errors.push(`${req.asset_name}: ${error.message}`);
        }
      }

      setApprovalInProgress({});
      if (errors.length > 0) {
        throw new Error(`Failed: ${errors.join(', ')}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', showId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('All equipment approved and added to show');
    },
    onError: (error) => {
      toast.error(`Approval failed: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      await db.entities.AdditionalEquipmentRequest.update(requestId, {
        status: 'rejected',
        rejected_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', showId] });
      toast.info('Request rejected');
    },
  });

  if (pendingRequests.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-sm text-emerald-700">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            No pending equipment requests
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-5 h-5" />
            Additional Equipment Requests ({pendingRequests.length})
          </CardTitle>
          {canApprove && pendingRequests.length > 0 && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => approveAllMutation.mutate()}
              disabled={approveAllMutation.isPending}
            >
              <CheckSquare className="w-4 h-4" />
              {approveAllMutation.isPending ? 'Approving...' : 'Approve All'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingRequests.map(request => (
            <div key={request.id} className="border border-amber-500/20 rounded-lg p-4 bg-amber-500/5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{request.asset_name}</h4>
                  {request.asset_barcode && (
                    <p className="text-xs text-muted-foreground font-mono mt-1">{request.asset_barcode}</p>
                  )}
                </div>
                <Badge variant="outline" className="whitespace-nowrap text-amber-700">
                  Pending
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3 pb-3 border-b border-amber-500/10">
                <div>
                  <p className="text-muted-foreground">Scanned by</p>
                  <p className="font-medium">{request.requested_by}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Scanned</p>
                  <p className="font-medium">{request.scanned_at && !isNaN(new Date(request.scanned_at)) ? format(new Date(request.scanned_at), 'MMM d, h:mm a') : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location
                  </p>
                  <p className="font-medium">{request.sub_location_name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">{request.quantity}</p>
                </div>
              </div>

              {request.notes && (
                <div className="mb-3 p-2 rounded bg-muted text-xs">
                  <p className="text-muted-foreground font-medium mb-1">Notes:</p>
                  <p>{request.notes}</p>
                </div>
              )}

              {!canApprove ? (
                <div className="p-3 rounded bg-muted/50 text-xs text-muted-foreground">
                  Only managers, coordinators, and admins can approve requests.
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 gap-1.5"
                    onClick={() => approveMutation.mutate(request.id)}
                    disabled={approveAllMutation.isPending || approvalInProgress[request.id]}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {approvalInProgress[request.id] ? 'Approving...' : 'Approve & Add to Show'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => rejectMutation.mutate({ requestId: request.id, reason: '' })}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}