import React from 'react';
import * as Lucide from 'lucide-react';
import { resolveIcon, UTILITY_ICONS } from './port24IconPaths';

/** Heavier stroke at small sizes keeps the drawing crisp at 16px. */
const strokeFor = (size) => (size <= 16 ? 2 : 1.75);

function Custom({ def, size, strokeWidth, className, title, ...rest }) {
  const sw = strokeWidth ?? strokeFor(size);
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="10"
      className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {def.fills.map((f, i) => (f.circle
        ? <circle key={`f${i}`} cx={f.circle[0]} cy={f.circle[1]} r={f.circle[2]} fill="currentColor" fillOpacity={f.opacity} stroke="none" />
        : <path key={`f${i}`} d={f.d} fill="currentColor" fillOpacity={f.opacity} stroke="none" />))}
      {def.strokes.map((s, i) => {
        if (typeof s === 'string') return <path key={i} d={s} />;
        if (s.circle) return <circle key={i} cx={s.circle[0]} cy={s.circle[1]} r={s.circle[2]} />;
        return <path key={i} d={s.d} strokeDasharray={s.dash ? '2.4 2.4' : undefined} />;
      })}
    </svg>
  );
}

/**
 * <Port24Icon name="roadCase" size={20} />. Custom family icons by name (see PORT24_ICONS), plus the standard
 * utility controls (search, close, settings, ...) drawn from lucide at the same stroke.
 */
export function Port24Icon({ name, size = 24, strokeWidth, className, title, ...rest }) {
  const util = UTILITY_ICONS[name];
  if (util) {
    const L = Lucide[util.lucide];
    return <L size={size} strokeWidth={strokeWidth ?? strokeFor(size)} className={className} aria-hidden={title ? undefined : true} aria-label={title} {...rest} />;
  }
  const def = resolveIcon(name);
  if (!def) return null;
  return <Custom def={def} size={size} strokeWidth={strokeWidth} className={className} title={title} {...rest} />;
}

export const ScanIcon = (props) => <Port24Icon name="scan" {...props} />;
export const RoadCaseIcon = (props) => <Port24Icon name="roadCase" {...props} />;
export const RackIcon = (props) => <Port24Icon name="rack" {...props} />;
