import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { UPCOMING_KEYS, buildShowsLink, formatDateRange, sortBySchedule } from '@/lib/dashboardData';
import { useStatusFlow } from '@/lib/useStatusFlow';
import { PanelEmpty, PanelError, Skel } from './PanelState';

const SHOW_LIMIT = 8;

export default function UpcomingPanel({ query, undated, window: win, canOpen, index = 3 }) {
  const { label, color } = useStatusFlow();
  const rows = query.data?.rows;
  const sorted = rows ? sortBySchedule(rows, win) : [];
  const shown = sorted.slice(0, SHOW_LIMIT);
  const hidden = sorted.length - shown.length;
  const undatedCount = undated.data ?? 0;

  return (
    <section className="dv2-card dv2-enter" style={{ '--i': index }} aria-labelledby="dv2-up-title">
      <div className="dv2-head">
        <div>
          <h2 id="dv2-up-title" className="dv2-card-title">Upcoming projects</h2>
          <p className="dv2-card-sub">
            {rows ? `${rows.length} ${rows.length === 1 ? 'project' : 'projects'}` : 'Projects'} scheduled in the selected window, soonest first.
          </p>
        </div>
        {canOpen && rows?.length > 0 && (
          <Link className="dv2-viewall" to={buildShowsLink({ stages: UPCOMING_KEYS, window: win })}>
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      {query.isLoading ? (
        <div className="dv2-list" role="status" aria-label="Loading projects">
          {[0, 1, 2, 3].map((i) => <Skel key={i} style={{ height: 56 }} />)}
        </div>
      ) : query.isError ? (
        <PanelError onRetry={() => query.refetch()} height={200} />
      ) : rows.length === 0 ? (
        <PanelEmpty height={200}>Nothing scheduled in this window.</PanelEmpty>
      ) : (
        <ul className="dv2-list">
          {shown.map((p) => {
            const meta = [formatDateRange(p.start_date, p.end_date), p.venue_name].filter(Boolean).join(' · ');
            const content = (
              <>
                <div style={{ minWidth: 0 }}>
                  <div className="dv2-row-name">{p.name || 'Untitled project'}</div>
                  <div className="dv2-row-meta">{meta}</div>
                </div>
                <span className="dv2-pill" style={{ background: `${color(p.status)}1f`, borderColor: `${color(p.status)}66` }}>
                  <span className="dv2-dot" style={{ background: color(p.status) }} aria-hidden="true" />
                  {label(p.status)}
                </span>
              </>
            );
            return (
              <li key={p.id}>
                {canOpen ? <Link to={`/shows/${p.id}`} className="dv2-row-link">{content}</Link> : <div className="dv2-row-link">{content}</div>}
              </li>
            );
          })}
        </ul>
      )}

      {(hidden > 0 || query.data?.truncated || undatedCount > 0) && (
        <p className="dv2-card-sub" style={{ marginTop: 10 }}>
          {hidden > 0 && <>+{hidden} more in this window. </>}
          {query.data?.truncated && <>Showing the first 500. </>}
          {undatedCount > 0 && <>{undatedCount} upcoming {undatedCount === 1 ? 'project has' : 'projects have'} no start date and {undatedCount === 1 ? 'isn’t' : 'aren’t'} shown here.</>}
        </p>
      )}
    </section>
  );
}
