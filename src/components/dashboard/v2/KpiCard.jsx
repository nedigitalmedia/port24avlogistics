import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { Skel } from './PanelState';

/** Counts up once on first value; later refreshes just update the number. */
function useCountUp(target, enabled) {
  const [shown, setShown] = useState(enabled ? 0 : target);
  const played = useRef(false);
  useEffect(() => {
    if (typeof target !== 'number') return undefined;
    if (!enabled || played.current || target === 0) {
      played.current = true;
      setShown(target);
      return undefined;
    }
    played.current = true;
    const start = performance.now();
    const duration = 520;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);
  return shown;
}

/**
 * KPI tile. `to` makes the whole card a link to the filtered view it counts;
 * without `to` it is plain information. Screen readers get the final number only.
 */
export default function KpiCard({ label, value, valueSuffix = '', hint, to, loading, error, onRetry, index = 0 }) {
  const reduced = useReducedMotion();
  const shown = useCountUp(value, !reduced);

  const body = (
    <>
      <div className="dv2-kpi-label">
        <span>{label}</span>
        {to && <ChevronRight className="dv2-chev" aria-hidden="true" />}
      </div>
      {loading ? (
        <Skel style={{ height: 40, width: 80 }} />
      ) : error ? (
        <div role="alert" className="text-sm" style={{ color: 'var(--dv2-danger)' }}>
          Couldn&apos;t load.{' '}
          <button type="button" className="dv2-retry" onClick={(e) => { e.preventDefault(); onRetry?.(); }}>
            Retry
          </button>
        </div>
      ) : (
        <div className="dv2-kpi-value">
          <span aria-hidden="true">{shown}{valueSuffix}</span>
          <span className="sr-only">{value}{valueSuffix}</span>
        </div>
      )}
      <div className="dv2-kpi-hint">{hint}</div>
    </>
  );

  const common = { className: `dv2-card dv2-kpi dv2-enter ${to ? 'dv2-link-card' : ''}`, style: { '--i': index } };
  return to ? (
    <Link to={to} {...common} aria-label={`${label}: ${loading || error ? 'loading' : value + valueSuffix}. Open list.`}>
      {body}
    </Link>
  ) : (
    <div {...common}>{body}</div>
  );
}
