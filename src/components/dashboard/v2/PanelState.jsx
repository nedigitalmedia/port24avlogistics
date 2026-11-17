import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function Skel({ className = '', style }) {
  return <div className={`dv2-skel ${className}`} style={style} aria-hidden="true" />;
}

/** Placeholder with a reserved height so loading never shifts the layout. */
export function PanelSkeleton({ height = 160 }) {
  return (
    <div role="status" aria-label="Loading" style={{ height }} className="flex flex-col gap-3 pt-3">
      <Skel style={{ height: 14, width: '40%' }} />
      <Skel style={{ flex: 1 }} />
    </div>
  );
}

export function PanelError({ onRetry, message = "Couldn't load this panel.", height = 160 }) {
  return (
    <div role="alert" className="dv2-state err" style={{ minHeight: height }}>
      <AlertTriangle size={22} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="dv2-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function PanelEmpty({ children, height = 160 }) {
  return (
    <div className="dv2-state" style={{ minHeight: height }}>
      {children}
    </div>
  );
}
