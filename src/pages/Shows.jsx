import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, CalendarDays, MapPin, User, Trash2, Pencil, FileText, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { usePermissions } from '@/lib/usePermissions';
import ShowFormDialog from '@/components/shows/ShowFormDialog';
import { useAuth } from '@/lib/AuthContext';
import { useStatusFlow } from '@/lib/useStatusFlow';
import { fetchScheduledProjects } from '@/lib/dashboardQueries';
import { formatDateRange, parseShowsFilters } from '@/lib/dashboardData';

export default function Shows() {
  const { canEditShows, canAccessFinance, isAdmin, isManagerOrAbove } = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [editingShow, setEditingShow] = useState(null);
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const { label: stageLabel } = useStatusFlow();

  // Dashboard cards link here with ?stage=…&from=…&to=… — same rules the dashboard counts with.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseShowsFilters(searchParams);
  const filterKey = filters ? JSON.stringify(filters) : null;

  const { data: shows = [], isLoading, isError, refetch } = useQuery({
    queryKey: filters ? ['shows', 'filtered', orgId, filterKey] : ['shows'],
    queryFn: async () => {
      if (!filters) return db.entities.Show.list('-start_date', 100);
      const { rows } = await fetchScheduledProjects(orgId, { stageKeys: filters.stages, window: filters.window, columns: '*' });
      return rows;
    },
    enabled: !filters || !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Show.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shows'] }),
  });

  return (
    <div>
      <PageHeader
        title="Shows & Events"
        description="Manage your upcoming and past shows"
        actions={
          <div className="flex gap-2 flex-wrap">
            {canAccessFinance && (
              <Link to="/quotes">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" /> Quotes
                </Button>
              </Link>
            )}
            {canEditShows && (
              <Link to="/smart-builder">
                <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                  <Sparkles className="w-4 h-4 mr-2" /> Smart Builder
                </Button>
              </Link>
            )}
            {canEditShows && (
              <Button onClick={() => { setEditingShow(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> New Show
              </Button>
            )}
          </div>
        }
      />

      {filters && (
        <div className="flex flex-wrap items-center gap-2 mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="status">
          <span className="font-medium">Filtered:</span>
          {filters.stages.length > 0 && <span>{filters.stages.map((k) => stageLabel(k)).join(', ')}</span>}
          {filters.window && <span className="text-muted-foreground">· {formatDateRange(filters.window.from, filters.window.to)}</span>}
          {!isLoading && !isError && <span className="text-muted-foreground">· {shows.length} {shows.length === 1 ? 'project' : 'projects'}</span>}
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline" onClick={() => setSearchParams({}, { replace: true })}>
            <X className="w-3.5 h-3.5" /> Clear filter
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-center py-20">Loading shows...</p>
      ) : isError ? (
        <Card className="p-12 text-center">
          <p className="text-destructive mb-3">Couldn&apos;t load shows.</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </Card>
      ) : shows.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{filters ? 'No projects match this filter.' : 'No shows yet. Create your first show to get started.'}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shows.map(show => (
            <Card key={show.id} className="p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <Link to={`/shows/${show.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{show.name}</h3>
                  {show.client && <p className="text-sm text-muted-foreground mt-0.5">{show.client}</p>}
                </Link>
                <StatusBadge status={show.status} />
              </div>
              <div className="space-y-1.5 mb-4">
                {show.venue && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{show.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {!isNaN(new Date(show.start_date)) ? format(new Date(show.start_date), 'MMM d, yyyy') : show.start_date}
                    {show.end_date && !isNaN(new Date(show.end_date)) ? ` — ${format(new Date(show.end_date), 'MMM d')}` : ''}
                  </span>
                </div>
                {show.contact_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>{show.contact_name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-3 border-t">
                {canEditShows && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingShow(show); setFormOpen(true); }}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                )}
                <Link to={`/shows/${show.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">View Details</Button>
                </Link>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Show</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure? This will not affect assigned assets.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(show.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ShowFormDialog open={formOpen} onOpenChange={setFormOpen} show={editingShow} />
    </div>
  );
}