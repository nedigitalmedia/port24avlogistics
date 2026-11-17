/**
 * dashboardQueries.js — Supabase queries behind the workspace dashboard and the
 * filtered /shows view. Every query is filtered by org_id explicitly (so a platform
 * admin, who RLS lets see every company, still only sees the active workspace),
 * and RLS remains the server-side backstop. Totals use head-only count queries;
 * nothing downloads every project to count it in the browser.
 */
import { supabase } from '@/api/supabaseClient';
import {
  MAX_ROWS,
  applyScheduleWindow,
  applyStageFilter,
} from '@/lib/dashboardData';

const PROJECT_COLUMNS = 'id,name,status,start_date,end_date,venue_name,client_name';

function requireOrg(orgId) {
  if (!orgId) throw new Error('No active workspace');
}

/** Head-only count of projects in the given stages (ignores dates). */
export async function countProjectsByStage(orgId, stageKeys) {
  requireOrg(orgId);
  let q = supabase.from('shows').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
  q = applyStageFilter(q, stageKeys);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Projects of the given stages scheduled inside the window (newest data, bounded). */
export async function fetchScheduledProjects(orgId, { stageKeys, window: win, limit = MAX_ROWS, columns = PROJECT_COLUMNS }) {
  requireOrg(orgId);
  let q = supabase.from('shows').select(columns).eq('org_id', orgId);
  if (stageKeys?.length) q = applyStageFilter(q, stageKeys);
  if (win) q = applyScheduleWindow(q, win);
  q = q.order('start_date', { ascending: true }).order('name', { ascending: true }).limit(limit + 1);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  return { rows: rows.slice(0, limit), truncated: rows.length > limit };
}

/** Count of projects in the given stages that have no start date at all. */
export async function countUndatedProjects(orgId, stageKeys) {
  requireOrg(orgId);
  let q = supabase
    .from('shows')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .is('start_date', null);
  q = applyStageFilter(q, stageKeys);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}
