import { useCallback, useRef, useState } from 'react';

/*
 * The one demo job on the landing page. SAMPLE DATA: not a real customer, show or price.
 * 15 units across three rooms; 12 already picked, so scanning Case A12 makes the show total 13 of 15
 * and Breakout A 2 of 4 (the phone shows the room count, the desktop shows the show total; both are labelled).
 */
export const JOB = {
  name: 'Grand Summit',
  dates: 'Apr 22 to Apr 23',
  days: 2,
  stage: 'Picking',
};

const line = (id, name, kind, code, qty, picked, rate) => ({ id, name, kind, code, qty, picked, rate });

export const INITIAL_ROOMS = [
  { id: 'gs', name: 'General Session', lines: [
    line('gs-la', 'Line array speaker', 'item', 'LA-01', 4, 4, 120),
    line('gs-hh', 'Wireless handheld', 'item', 'WH-01', 2, 2, 65),
    line('gs-cm', 'Confidence monitor', 'item', 'CM-01', 2, 2, 45),
    line('gs-rk', 'Amp rack R1', 'rack', 'R1', 1, 1, 95),
  ] },
  { id: 'ba', name: 'Breakout A', lines: [
    line('ba-case', 'Case A12', 'kit', 'A12', 1, 0, 180),
    line('ba-spk', 'Powered speaker', 'item', 'SPK-2', 2, 1, 70),
    line('ba-mic', 'Lectern mic', 'item', 'MIC-07', 1, 0, 35),
  ] },
  { id: 'bb', name: 'Breakout B', lines: [
    line('bb-pj', 'Projector', 'item', 'PJ-01', 1, 1, 210),
    line('bb-sc', 'Screen 120 in', 'item', 'SC-01', 1, 1, 85),
  ] },
];

/** Codes that exist in the warehouse but belong to a different job, so the demo can show a refusal. */
const OTHER_JOB_CODES = { B07: 'Case B07' };

export const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export const roomQty = (room) => sum(room.lines.map((l) => l.qty));
export const roomPicked = (room) => sum(room.lines.map((l) => l.picked));
export const showQty = (rooms) => sum(rooms.map(roomQty));
export const showPicked = (rooms) => sum(rooms.map(roomPicked));
export const roomValue = (room, days = JOB.days) => sum(room.lines.map((l) => l.qty * l.rate)) * days;
export const showValue = (rooms, days = JOB.days) => sum(rooms.map((r) => roomValue(r, days)));
export const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalize = (raw) => String(raw || '').trim().toUpperCase().replace(/^CASE\s+/, '');

/** The "server": validates a scan against the current saved state and returns the next state plus the result. */
export function applyScan(rooms, raw) {
  const code = normalize(raw);
  if (!code) return { rooms, result: { ok: false, code, reason: 'empty', message: 'Enter or scan a code.' } };
  if (OTHER_JOB_CODES[code]) {
    return { rooms, result: { ok: false, code, reason: 'not_planned', name: OTHER_JOB_CODES[code], message: `${OTHER_JOB_CODES[code]} is not planned for ${JOB.name}.` } };
  }
  for (const room of rooms) {
    const l = room.lines.find((x) => x.code === code);
    if (!l) continue;
    if (l.picked >= l.qty) {
      return { rooms, result: { ok: false, code, reason: 'already_picked', name: l.name, roomId: room.id, message: `${l.name} is already picked.` } };
    }
    const next = rooms.map((r) => (r.id !== room.id ? r : { ...r, lines: r.lines.map((x) => (x.id === l.id ? { ...x, picked: x.picked + 1 } : x)) }));
    return { rooms: next, result: { ok: true, code, name: l.name, kind: l.kind, lineId: l.id, roomId: room.id, roomName: room.name } };
  }
  return { rooms, result: { ok: false, code, reason: 'unknown', message: `No item with code ${code}.` } };
}

export const SAVE_MS = 450;

/**
 * Job state for the demo. Every scan goes through a simulated save; the UI only changes when the save
 * returns, so a confirmed row always reflects the saved result. Scans never block each other: the input
 * stays enabled and each in-flight scan is tracked separately.
 */
export function useDemoJob() {
  const saved = useRef(INITIAL_ROOMS);
  const seq = useRef(0);
  // One state object: rooms, in-flight scans, the latest result and confirmations change together,
  // so no frame can show a count that the row beside it has not caught up with.
  const [state, setState] = useState({ rooms: INITIAL_ROOMS, inFlight: [], last: null, confirmed: {} });

  const scan = useCallback((raw) => {
    const key = ++seq.current;
    const code = normalize(raw);
    const target = INITIAL_ROOMS.flatMap((r) => r.lines).find((l) => l.code === code);
    setState((s) => ({ ...s, inFlight: [...s.inFlight, { key, code, lineId: target?.id }] }));
    return new Promise((resolve) => {
      setTimeout(() => {
        const { rooms: next, result } = applyScan(saved.current, raw);
        saved.current = next;
        setState((s) => ({
          rooms: next,
          inFlight: s.inFlight.filter((x) => x.key !== key),
          last: { ...result, key },
          confirmed: result.ok ? { ...s.confirmed, [result.lineId]: key } : s.confirmed,
        }));
        resolve(result);
      }, SAVE_MS);
    });
  }, []);

  const reset = useCallback(() => {
    saved.current = INITIAL_ROOMS;
    setState({ rooms: INITIAL_ROOMS, inFlight: [], last: null, confirmed: {} });
  }, []);

  return { ...state, scan, reset };
}
