import React from 'react';
import { PORT24_ICONS } from './port24IconPaths';

/** Heavier stroke at small sizes keeps the drawing crisp at 16px. */
const strokeFor = (size) => (size <= 16 ? 2 : 1.75);

function Icon({ name, size = 24, strokeWidth, className, title, ...rest }) {
  const def = PORT24_ICONS[name];
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
        ? <circle key={`f${i}`} cx={f.circle[0]} cy={f.circle[1]} r={f.circle[2]} fill="currentColor" stroke="none" />
        : <path key={`f${i}`} d={f.d} fill="currentColor" fillOpacity={f.opacity} stroke="none" />))}
      {def.strokes.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export const ScanIcon = (props) => <Icon name="scan" {...props} />;
export const RoadCaseIcon = (props) => <Icon name="roadCase" {...props} />;
export const RackIcon = (props) => <Icon name="rack" {...props} />;
