/*
 * Port 24 icon family: Scan, Road Case, Rack.
 * Drawn on a 24px grid with square joins so the corners echo the Port 24 mark (four square L brackets).
 * One recognizable detail each: Scan = taller centre bar, Road Case = recessed latch, Rack = faceplate LED.
 * Plain data so React and the static icon sheet share one source of truth.
 */
export const PORT24_ICONS = {
  scan: {
    label: 'Scan',
    strokes: [
      'M4 9V4h5', 'M15 4h5v5', 'M4 15v5h5', 'M20 15v5h-5', // the mark's corner brackets
      'M9 10v4', 'M12 8.5v7', 'M15 10v4',                  // bars: the centre one is taller
    ],
    fills: [],
  },
  roadCase: {
    label: 'Road Case',
    strokes: [
      'M3.5 6.5h17v12h-17z',            // body
      'M3.5 11h6.75', 'M13.75 11h6.75', // lid seam, broken around the latch
      'M10.25 9.25h3.5v3.5h-3.5z',      // recessed latch
    ],
    fills: [
      { d: 'M10.25 9.25h3.5v3.5h-3.5z', opacity: 0.3 },
      // corner caps: the mark's square corners, as the hardware on a real case
      { d: 'M3.5 6.5h2.5v2.5h-2.5z', opacity: 1 }, { d: 'M18 6.5h2.5v2.5H18z', opacity: 1 },
      { d: 'M3.5 16h2.5v2.5h-2.5z', opacity: 1 }, { d: 'M18 16h2.5v2.5H18z', opacity: 1 },
    ],
  },
  rack: {
    label: 'Rack',
    strokes: [
      'M4.5 3.5h15v17h-15z',            // frame
      'M4.5 9.17h15', 'M4.5 14.83h15',  // three rack units
      'M7.5 6.33h5', 'M7.5 12h5', 'M7.5 17.67h5', // faceplate handles
    ],
    fills: [{ circle: [16.5, 12, 1.1], opacity: 1 }], // the lit LED
  },
};
