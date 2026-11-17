import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { buildDayBuckets, formatDateRange } from '@/lib/dashboardData';
import { PanelEmpty, PanelError, PanelSkeleton } from './PanelState';

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="dv2-tip">
      <strong>{d.weekday}, {d.label}</strong>
      <div>{d.count} {d.count === 1 ? 'project' : 'projects'} running</div>
    </div>
  );
}

export default function SchedulePanel({ query, window: win, index = 1 }) {
  const reduced = useReducedMotion();
  const rows = query.data?.rows;
  const data = useMemo(() => (rows ? buildDayBuckets(rows, win) : []), [rows, win]);
  const peak = data.reduce((m, d) => (d.count > m.count ? d : m), { count: 0 });
  const summary = rows
    ? `Projects running each day, ${formatDateRange(win.from, win.to)}. ${rows.length} distinct ${rows.length === 1 ? 'project' : 'projects'}.${peak.count ? ` Busiest day ${peak.label} with ${peak.count}.` : ''}`
    : '';

  return (
    <section className="dv2-card dv2-enter" style={{ '--i': index }} aria-labelledby="dv2-sched-title">
      <h2 id="dv2-sched-title" className="dv2-card-title">Show schedule</h2>
      <p className="dv2-card-sub">
        Each bar counts projects running that day. A multi-day show counts on every day it runs, so bars can add up to more than the {rows ? rows.length : ''} distinct projects.
      </p>
      {query.isLoading ? (
        <PanelSkeleton height={232} />
      ) : query.isError ? (
        <PanelError onRetry={() => query.refetch()} height={232} />
      ) : rows.length === 0 ? (
        <PanelEmpty height={232}>No projects scheduled in this window.</PanelEmpty>
      ) : (
        <>
          <div className="dv2-chart" role="img" aria-label={summary}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(15,157,138,0.08)' }} />
                <Bar dataKey="count" fill="#0f9d8a" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={!reduced} animationDuration={600} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="sr-only">
          <table>
            <caption>{summary}</caption>
            <thead><tr><th>Day</th><th>Projects running</th></tr></thead>
            <tbody>{data.filter((d) => d.count > 0).map((d) => (<tr key={d.date}><td>{d.weekday} {d.label}</td><td>{d.count}</td></tr>))}</tbody>
          </table>
          </div>
        </>
      )}
    </section>
  );
}
