/**
 * dashboardData.js
 * One place that defines what each dashboard number means, so the KPI cards,
 * chart, stage breakdown, upcoming list AND the pages they link to
 * (/shows?stage=…&from=…&to=…) all use identical rules.
 *
 * Definitions (all scoped to the active company via org_id; RLS is the backstop):
 *  - Scheduled project  = has a start_date, and its [start_date, end_date||start_date]
 *                         range overlaps the selected window. Undated projects are
 *                         never counted (they are reported separately).
 *  - Upcoming           = scheduled project whose stage is in UPCOMING_STATUS_KEYS
 *                         (planning, confirmed, picking, picked) — from projectStatusEngine.
 *  - Active             = stage in ACTIVE_STATUS_KEYS (projectStatusEngine).
 *  - Ready to pick      = stage "confirmed" (quote confirmed, picking not started).
 *  - Awaiting returns   = stage "needs_return" or "returning" (gear still out).
 * Queue counts (active / ready to pick / awaiting returns) ignore the date window.
 *
 * Dates: project dates are plain DATE columns ("YYYY-MM-DD"). They are compared as
 * local calendar days — the app has no workspace-timezone setting, so "today" is the
 * viewer's local date.
 */
import { addDays, eachDayOfInterval, format, isValid, parseISO } from 'date-fns';
import {
  ACTIVE_STATUS_KEYS,
  LEGACY_KEY_MAP,
  STATUS_KEYS,
  UPCOMING_STATUS_KEYS,
  normalizeStatusKey,
} from '@/lib/projectStatusEngine';

export const WINDOW_OPTIONS = [7, 14, 30, 90];
export const DEFAULT_WINDOW_DAYS = 30;
export const MAX_ROWS = 500;

export const READY_TO_PICK_KEYS = ['confirmed'];
export const AWAITING_RETURN_KEYS = ['needs_return', 'returning'];

/** Canonical keys plus the legacy DB values that normalize to them. */
export function statusKeysWithLegacy(keys) {
  const canonical = new Set(keys);
  const out = new Set(keys);
  for (const [legacy, mapped] of Object.entries(LEGACY_KEY_MAP)) {
    if (canonical.has(mapped)) out.add(legacy);
  }
  return [...out];
}

export const toISODate = (d) => format(d, 'yyyy-MM-dd');

/** Parse a DATE column value as a local calendar day. Returns null if missing/invalid. */
export function parseDay(value) {
  if (!value) return null;
  const d = parseISO(String(value).slice(0, 10));
  return isValid(d) ? d : null;
}

export function normalizeWindowDays(raw) {
  const n = parseInt(raw, 10);
  return WINDOW_OPTIONS.includes(n) ? n : DEFAULT_WINDOW_DAYS;
}

/** Window of `days` calendar days starting today (inclusive). */
export function getWindow(days, today = new Date()) {
  return { from: toISODate(today), to: toISODate(addDays(today, days - 1)) };
}

/** Apply the shared "scheduled inside [from, to]" rule to a PostgREST query. */
export function applyScheduleWindow(query, { from, to }) {
  return query
    .lte('start_date', to) // also drops undated rows
    .or(`end_date.gte.${from},and(end_date.is.null,start_date.gte.${from})`);
}

/** Apply a stage filter (canonical keys) to a PostgREST query. */
export function applyStageFilter(query, keys) {
  return query.in('status', statusKeysWithLegacy(keys));
}

export const UPCOMING_KEYS = UPCOMING_STATUS_KEYS;
export const ACTIVE_KEYS = ACTIVE_STATUS_KEYS;

/** Chart data: one entry per day in the window; multi-day projects count on every day they run. */
export function buildDayBuckets(rows, { from, to }) {
  const start = parseDay(from);
  const end = parseDay(to);
  if (!start || !end) return [];
  const buckets = new Map(
    eachDayOfInterval({ start, end }).map((d) => [
      toISODate(d),
      { date: toISODate(d), label: format(d, 'MMM d'), weekday: format(d, 'EEE'), count: 0 },
    ]),
  );
  for (const row of rows) {
    const s = parseDay(row.start_date);
    if (!s) continue;
    const e = parseDay(row.end_date) || s;
    const lo = s < start ? start : s;
    const hi = e > end ? end : e;
    if (hi < lo) continue;
    for (const d of eachDayOfInterval({ start: lo, end: hi })) {
      const b = buckets.get(toISODate(d));
      if (b) b.count += 1;
    }
  }
  return [...buckets.values()];
}

/** Stage breakdown in canonical order, zero-count stages omitted. */
export function buildStageCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = normalizeStatusKey(row.status);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return STATUS_KEYS.filter((k) => counts.has(k)).map((k) => ({ key: k, count: counts.get(k) }));
}

/** Sort by the next relevant day: a project already underway sorts as "today". */
export function sortBySchedule(rows, { from }) {
  const floor = parseDay(from);
  const keyOf = (r) => {
    const s = parseDay(r.start_date);
    return s && floor && s < floor ? floor : s;
  };
  return [...rows].sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (ka && kb && ka.getTime() !== kb.getTime()) return ka - kb;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

/** "Nov 12" or "Nov 12 – 14" / "Nov 28 – Dec 2". */
export function formatDateRange(startValue, endValue) {
  const s = parseDay(startValue);
  if (!s) return 'No date';
  const e = parseDay(endValue);
  if (!e || toISODate(e) === toISODate(s)) return format(s, 'MMM d');
  return s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
    ? `${format(s, 'MMM d')} – ${format(e, 'd')}`
    : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`;
}

/** Query string for /shows so it opens exactly the set a dashboard card counts. */
export function buildShowsLink({ stages, window: win } = {}) {
  const p = new URLSearchParams();
  if (stages?.length) p.set('stage', stages.join(','));
  if (win) {
    p.set('from', win.from);
    p.set('to', win.to);
  }
  const qs = p.toString();
  return qs ? `/shows?${qs}` : '/shows';
}

/** Parse /shows filters. Returns null when no dashboard-style filter is present. */
export function parseShowsFilters(searchParams) {
  const stageParam = searchParams.get('stage');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const stages = stageParam
    ? stageParam.split(',').map((s) => normalizeStatusKey(s.trim())).filter((s) => STATUS_KEYS.includes(s))
    : [];
  const win = parseDay(from) && parseDay(to) ? { from, to } : null;
  if (!stages.length && !win) return null;
  return { stages: [...new Set(stages)], window: win };
}
