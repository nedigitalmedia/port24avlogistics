import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/usePermissions';
import {
  ACTIVE_KEYS,
  AWAITING_RETURN_KEYS,
  READY_TO_PICK_KEYS,
  UPCOMING_KEYS,
  WINDOW_OPTIONS,
  buildShowsLink,
  getWindow,
  normalizeWindowDays,
} from '@/lib/dashboardData';
import { countProjectsByStage, countUndatedProjects, fetchScheduledProjects } from '@/lib/dashboardQueries';
import KpiCard from './KpiCard';
import SchedulePanel from './SchedulePanel';
import StagePanel from './StagePanel';
import UpcomingPanel from './UpcomingPanel';
import './dashboardV2.css';

const STALE = 30_000;

export default function DashboardV2({ onClassic }) {
  const { orgId, organization } = useAuth();
  const { canAccessRoute } = usePermissions();
  const [params, setParams] = useSearchParams();
  const days = normalizeWindowDays(params.get('window'));
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const win = useMemo(() => getWindow(days), [days, todayKey]);
  const canOpen = canAccessRoute('/shows');

  // Every query is keyed by org so switching workspace can never show the previous company's numbers.
  const windowQuery = useQuery({
    queryKey: ['dashv2', orgId, 'window', win.from, win.to],
    queryFn: () => fetchScheduledProjects(orgId, { stageKeys: UPCOMING_KEYS, window: win }),
    enabled: !!orgId,
    staleTime: STALE,
  });
  const undatedQuery = useQuery({
    queryKey: ['dashv2', orgId, 'undated'],
    queryFn: () => countUndatedProjects(orgId, UPCOMING_KEYS),
    enabled: !!orgId,
    staleTime: STALE,
  });
  const activeQuery = useQuery({
    queryKey: ['dashv2', orgId, 'active'],
    queryFn: () => countProjectsByStage(orgId, ACTIVE_KEYS),
    enabled: !!orgId,
    staleTime: STALE,
  });
  const pickQuery = useQuery({
    queryKey: ['dashv2', orgId, 'ready-to-pick'],
    queryFn: () => countProjectsByStage(orgId, READY_TO_PICK_KEYS),
    enabled: !!orgId,
    staleTime: STALE,
  });
  const returnsQuery = useQuery({
    queryKey: ['dashv2', orgId, 'awaiting-returns'],
    queryFn: async () => {
      const [needs, returning] = await Promise.all([
        countProjectsByStage(orgId, ['needs_return']),
        countProjectsByStage(orgId, ['returning']),
      ]);
      return { needs, returning, total: needs + returning };
    },
    enabled: !!orgId,
    staleTime: STALE,
  });

  const upcomingCount = windowQuery.data ? windowQuery.data.rows.length : undefined;
  const link = (stages, withWindow) => (canOpen ? buildShowsLink({ stages, window: withWindow ? win : undefined }) : undefined);

  const setDays = (n) => {
    const next = new URLSearchParams(params);
    if (n === 30) next.delete('window'); else next.set('window', String(n));
    setParams(next, { replace: true });
  };
  const onRadioKey = (e) => {
    const i = WINDOW_OPTIONS.indexOf(days);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setDays(WINDOW_OPTIONS[(i + 1) % WINDOW_OPTIONS.length]); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setDays(WINDOW_OPTIONS[(i + WINDOW_OPTIONS.length - 1) % WINDOW_OPTIONS.length]); }
  };

  return (
    <div className="dv2-page">
      <header className="dv2-header dv2-enter" style={{ '--i': 0 }}>
        <div>
          <h1 className="dv2-title">Dashboard</h1>
          <p className="dv2-subtitle">
            {organization?.name ? `${organization.name} · ` : ''}{format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="dv2-seg" role="radiogroup" aria-label="Schedule window" onKeyDown={onRadioKey}>
            {WINDOW_OPTIONS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={n === days} tabIndex={n === days ? 0 : -1} onClick={() => setDays(n)}>
                {n} days
              </button>
            ))}
          </div>
          {onClassic && (
            <button type="button" className="dv2-classic" onClick={onClassic}>Classic view</button>
          )}
        </div>
      </header>

      <div className="dv2-kpis">
        <KpiCard
          index={1}
          label="Upcoming shows"
          value={upcomingCount}
          valueSuffix={windowQuery.data?.truncated ? '+' : ''}
          loading={windowQuery.isLoading}
          error={windowQuery.isError}
          onRetry={() => windowQuery.refetch()}
          to={link(UPCOMING_KEYS, true)}
          hint={`Planned through picked, next ${days} days`}
        />
        <KpiCard
          index={2}
          label="Active shows"
          value={activeQuery.data}
          loading={activeQuery.isLoading}
          error={activeQuery.isError}
          onRetry={() => activeQuery.refetch()}
          to={link(ACTIVE_KEYS, false)}
          hint="Confirmed through returning · live, any date"
        />
        <KpiCard
          index={3}
          label="Ready to pick"
          value={pickQuery.data}
          loading={pickQuery.isLoading}
          error={pickQuery.isError}
          onRetry={() => pickQuery.refetch()}
          to={link(READY_TO_PICK_KEYS, false)}
          hint="Confirmed, picking not started · live, any date"
        />
        <KpiCard
          index={4}
          label="Awaiting returns"
          value={returnsQuery.data?.total}
          loading={returnsQuery.isLoading}
          error={returnsQuery.isError}
          onRetry={() => returnsQuery.refetch()}
          to={link(AWAITING_RETURN_KEYS, false)}
          hint={returnsQuery.data ? `${returnsQuery.data.needs} need return · ${returnsQuery.data.returning} returning · live` : 'Gear still out · live, any date'}
        />
      </div>

      <div className="dv2-row">
        <SchedulePanel index={5} query={windowQuery} window={win} />
        <StagePanel index={6} query={windowQuery} />
      </div>

      <UpcomingPanel index={7} query={windowQuery} undated={undatedQuery} window={win} canOpen={canOpen} />
    </div>
  );
}
