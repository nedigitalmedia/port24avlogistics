import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, AlertTriangle, Info, Zap, History, Pencil, StickyNote, Truck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import VenueFormDialog from '@/components/crm/VenueFormDialog';
import BackButton from '@/components/shared/BackButton';
import ClientNotesPanel from '@/components/crm/ClientNotesPanel';
import { googleMapsLink, geocodeAddress, getDriveDistance } from '@/lib/geocode';
import { useAuth } from '@/lib/AuthContext';

export default function VenueDetail() {
  const { id } = useParams();
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: venue, isLoading } = useQuery({
    queryKey: ['venue', id],
    queryFn: () => db.entities.Venue.filter({ id }).then(r => r[0]),
  });

  const { data: shows = [] } = useQuery({
    queryKey: ['shows-for-venue', id],
    queryFn: () => db.entities.Show.filter({ venue_id: id }),
    enabled: !!id,
  });

  const { data: brandList = [] } = useQuery({
    queryKey: ['brand', orgId],
    queryFn: () => db.entities.BrandSettings.filter({ org_id: orgId }),
    enabled: !!orgId,
  });
  const companyAddress = brandList[0]?.company_address;
  const hasDistanceApi = !!import.meta.env.VITE_ORS_API_KEY;

  const distanceMutation = useMutation({
    mutationFn: async () => {
      if (!venue.latitude || !venue.longitude) throw new Error('This venue has no verified location — re-select its address from the autocomplete in Edit.');
      if (!companyAddress) throw new Error('Set your company address in Branding Settings first.');
      const origin = await geocodeAddress(companyAddress);
      if (!origin) throw new Error('Could not locate your company address.');
      const result = await getDriveDistance(origin, { lat: venue.latitude, lon: venue.longitude });
      if (!result) throw new Error('Distance lookup is not configured.');
      await db.entities.Venue.update(venue.id, {
        distance_from_warehouse_miles: Math.round(result.miles * 10) / 10,
        drive_time_minutes: Math.round(result.minutes),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue', id] });
      toast.success('Transport distance updated');
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 rounded-full animate-spin border-border border-t-primary" /></div>;
  if (!venue) return <div className="text-center py-24 text-muted-foreground">Venue not found</div>;

  const alerts = [];
  if (venue.union_required) alerts.push({ label: 'Union Required', color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20' });
  if (venue.house_engineer_required) alerts.push({ label: 'House Engineer Required', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20' });
  if (venue.exclusive_vendors) alerts.push({ label: 'Exclusive Vendors', color: 'text-purple-600', bg: 'bg-purple-500/10 border-purple-500/20' });
  if (venue.load_in_rules) alerts.push({ label: 'Load-in Restrictions', color: 'text-orange-600', bg: 'bg-orange-500/10 border-orange-500/20' });

  return (
    <div>
      <BackButton to="/venues" label="Back to Venues" />

      <div className="flex items-start justify-between gap-4 mt-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{venue.name}</h1>
            {(venue.address || venue.city || venue.state) && (
              <a
                href={googleMapsLink({ lat: venue.latitude, lon: venue.longitude, address: [venue.address, venue.city, venue.state, venue.zip].filter(Boolean).join(', ') })}
                target="_blank" rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
              >
                {[venue.address, venue.city, venue.state, venue.zip].filter(Boolean).join(', ')}
              </a>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {alerts.map(a => (
            <div key={a.label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${a.bg} ${a.color} font-medium`}>
              <AlertTriangle className="w-3 h-3" /> {a.label}
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="details">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="details"><Info className="w-3.5 h-3.5 mr-1" /> Details</TabsTrigger>
          <TabsTrigger value="logistics"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Load-in & Logistics</TabsTrigger>
          <TabsTrigger value="technical"><Zap className="w-3.5 h-3.5 mr-1" /> Technical</TabsTrigger>
          <TabsTrigger value="history"><History className="w-3.5 h-3.5 mr-1" /> Show History</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="w-3.5 h-3.5 mr-1" /> Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Venue Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Type" value={venue.venue_type?.replace(/_/g,' ')} />
                <Row label="Capacity" value={venue.capacity ? `${venue.capacity.toLocaleString()} people` : null} />
                <Row label="Contact" value={venue.contact_name} />
                <Row label="Phone" value={venue.contact_phone} />
                <Row label="Email" value={venue.contact_email} />
                <Row label="Website" value={venue.website ? <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{venue.website}</a> : null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Access</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Load-in Hours" value={venue.load_in_hours} />
                <Row label="Dock Address" value={venue.load_in_dock_address} />
                <Row label="Freight Elevator" value={venue.freight_elevator ? 'Yes' : 'No'} />
                <Row label="Dock Height" value={venue.dock_height} />
                <Row label="Parking" value={venue.parking_notes} />
                <Row label="WiFi" value={venue.wifi_available ? (venue.wifi_notes || 'Available') : 'No'} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Gear Transport Distance</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {venue.distance_from_warehouse_miles != null ? (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-lg font-semibold">{venue.distance_from_warehouse_miles} miles</p>
                    <p className="text-muted-foreground">~{Math.round(venue.drive_time_minutes)} min drive from your warehouse</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => distanceMutation.mutate()} disabled={distanceMutation.isPending}>
                    {distanceMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Recalculate'}
                  </Button>
                </div>
              ) : !hasDistanceApi ? (
                <p className="text-muted-foreground">Distance calculation isn't set up yet — add an OpenRouteService API key to enable this.</p>
              ) : !venue.latitude ? (
                <p className="text-muted-foreground">This venue's address hasn't been verified yet — edit it and re-select the address from the autocomplete suggestions.</p>
              ) : (
                <Button size="sm" onClick={() => distanceMutation.mutate()} disabled={distanceMutation.isPending} className="gap-2">
                  {distanceMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                  Calculate Distance
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Load-in Rules & Restrictions</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {venue.load_in_rules ? <p className="whitespace-pre-wrap">{venue.load_in_rules}</p> : <p className="text-muted-foreground">No load-in rules recorded.</p>}
              {venue.exclusive_vendors && (
                <div className="border rounded-lg p-3 bg-purple-500/5 border-purple-500/20">
                  <p className="font-medium text-xs text-purple-600 mb-1">Exclusive Vendors</p>
                  <p className="whitespace-pre-wrap">{venue.exclusive_vendors}</p>
                </div>
              )}
              {(venue.union_required || venue.union_notes) && (
                <div className="border rounded-lg p-3 bg-amber-500/5 border-amber-500/20">
                  <p className="font-medium text-xs text-amber-600 mb-1">Union Requirements</p>
                  <p>{venue.union_required ? 'Union required' : ''}{venue.union_notes ? `: ${venue.union_notes}` : ''}</p>
                </div>
              )}
              {venue.preferred_setup_notes && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">Preferred Setup Notes</p>
                  <p className="whitespace-pre-wrap">{venue.preferred_setup_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical">
          <Card>
            <CardHeader><CardTitle className="text-base">Technical Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Power Available" value={venue.power_available} />
              <Row label="Rigging Points" value={venue.rigging_points ? 'Yes' : 'No'} />
              {venue.rigging_notes && <Row label="Rigging Notes" value={venue.rigging_notes} />}
              <Row label="House Equipment" value={venue.house_equipment_available} />
              <Row label="House Engineer Required" value={venue.house_engineer_required ? 'Yes' : 'No'} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-3">
            {shows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No shows at this venue yet</p>
              </div>
            ) : (
              shows.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).map(show => (
                <Link key={show.id} to={`/shows/${show.id}`}>
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{show.name}</p>
                        <p className="text-xs text-muted-foreground">{show.start_date}{show.client ? ` · ${show.client}` : ''}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{show.status}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <p className="text-sm text-muted-foreground mb-4">Venue-specific notes from past and upcoming shows.</p>
          {shows.map(show => show.internal_notes || show.client_visible_notes ? (
            <Card key={show.id} className="mb-3">
              <CardContent className="p-4">
                <p className="font-medium text-sm mb-1">{show.name} — {show.start_date}</p>
                {show.client_visible_notes && <p className="text-sm">{show.client_visible_notes}</p>}
                {show.internal_notes && <p className="text-xs text-amber-600 mt-1 border-l-2 border-amber-500 pl-2">{show.internal_notes}</p>}
              </CardContent>
            </Card>
          ) : null)}
        </TabsContent>
      </Tabs>

      <VenueFormDialog open={editOpen} onOpenChange={setEditOpen} venue={venue} onSaved={() => queryClient.invalidateQueries({ queryKey: ['venue', id] })} />
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}