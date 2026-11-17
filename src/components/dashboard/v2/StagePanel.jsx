import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { buildStageCounts } from '@/lib/dashboardData';
import { useStatusFlow } from '@/lib/useStatusFlow';
import { PanelEmpty, PanelError, PanelSkeleton } from './PanelState';

export default function StagePanel({ query, index = 2 }) {
  const reduced = useReducedMotion();
  const { label, color } = useStatusFlow();
  const rows = query.data?.rows;
  const stages = useMemo(() => (rows ? buildStageCounts(rows) : []), [rows]);
  const total = rows?.length ?? 0;

  return (
    <section className="dv2-card dv2-enter" style={{ '--i': index }} aria-labelledby="dv2-stage-title">
      <h2 id="dv2-stage-title" className="dv2-card-title">Project stages</h2>
      <p className="dv2-card-sub">Stage of each distinct project in the selected window.</p>
      {query.isLoading ? (
        <PanelSkeleton height={170} />
      ) : query.isError ? (
        <PanelError onRetry={() => query.refetch()} height={170} />
      ) : total === 0 ? (
        <PanelEmpty height={170}>No projects in this window.</PanelEmpty>
      ) : (
        <div className="dv2-donut">
          <div className="dv2-donut-wrap" role="img" aria-label={`${total} projects: ${stages.map((s) => `${s.count} ${label(s.key)}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stages} dataKey="count" nameKey="key" innerRadius={48} outerRadius={70} paddingAngle={stages.length > 1 ? 2 : 0} stroke="none" isAnimationActive={!reduced} animationDuration={600}>
                  {stages.map((s) => <Cell key={s.key} fill={color(s.key)} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="dv2-donut-total" aria-hidden="true"><strong>{total}</strong><span>{total === 1 ? 'project' : 'projects'}</span></div>
          </div>
          <ul className="dv2-legend">
            {stages.map((s) => (
              <li key={s.key}>
                <span className="dv2-dot" style={{ background: color(s.key) }} aria-hidden="true" />
                <span>{label(s.key)}</span>
                <span className="n">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
