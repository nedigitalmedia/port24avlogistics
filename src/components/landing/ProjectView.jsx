import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { JOB, roomPicked, roomQty, showPicked, showQty } from './demoJob';
import { RackIcon, RoadCaseIcon } from '@/components/icons/Port24Icons';

const SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

function Status({ state, flashKey }) {
  if (state === 'saving') return <span className="lp-status lp-status--saving" role="img" aria-label="Saving" />;
  if (state === 'done') {
    return (
      <span className="lp-status lp-status--done" role="img" aria-label="Picked">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path key={flashKey} className="lp-check" d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" /></svg>
      </span>
    );
  }
  return <span className="lp-status lp-status--todo" role="img" aria-label="Not picked" />;
}

function GearRow({ line, saving, flashKey }) {
  const done = line.picked >= line.qty;
  // A row that is already fully picked stays confirmed while a duplicate scan is still saving.
  const state = done ? 'done' : saving ? 'saving' : 'todo';
  const Icon = line.kind === 'kit' ? RoadCaseIcon : line.kind === 'rack' ? RackIcon : null;
  return (
    <li className="lp-row" data-state={state}>
      {flashKey ? <span key={flashKey} className="lp-flash" aria-hidden="true" /> : null}
      <span className="lp-row-icon" aria-hidden="true">{Icon ? <Icon size={20} /> : <span className="lp-bullet" />}</span>
      <span className="lp-row-main">
        <span className="lp-row-name">{line.name}</span>
        <span className="lp-row-meta">{line.kind === 'kit' ? 'Physical Kit' : line.kind === 'rack' ? 'Rack' : line.code}<span aria-hidden="true"> · </span><span className="lp-num">{line.picked} of {line.qty}</span></span>
      </span>
      <Status state={state} flashKey={flashKey} />
    </li>
  );
}

/** Desktop project view: rooms on the left, the selected room's detail panel on the right. Both columns are always reserved, so opening the panel never moves anything. */
export default function ProjectView({ rooms, selectedId, onSelect, inFlight, confirmed }) {
  const reduce = useReducedMotion();
  const selected = rooms.find((r) => r.id === selectedId) || null;
  const savingLines = new Set(inFlight.map((f) => f.lineId).filter(Boolean));

  return (
    <section className="lp-window" aria-label={`Project view for ${JOB.name} (sample data)`}>
      <header className="lp-window-head">
        <div className="lp-window-title">
          <h3>{JOB.name}</h3>
          <span className="lp-pill">{JOB.stage}</span>
        </div>
        <div className="lp-total" aria-live="polite">
          <span className="lp-label">Show total</span>
          <span className="lp-num lp-total-n">{showPicked(rooms)} / {showQty(rooms)} <span className="lp-total-unit">picked</span></span>
        </div>
      </header>

      <div className="lp-window-body">
        <div className="lp-rooms" role="list" aria-label="Rooms">
          <p className="lp-label lp-rooms-label">Rooms</p>
          {rooms.map((room) => {
            const p = roomPicked(room); const q = roomQty(room);
            const active = room.id === selectedId;
            return (
              <button key={room.id} type="button" className="lp-room" aria-pressed={active} onClick={() => onSelect(active ? null : room.id)}>
                <span className="lp-room-name">{room.name}</span>
                <span className="lp-room-count lp-num">{p} / {q}</span>
                <span className="lp-bar" aria-hidden="true"><span style={{ width: `${(p / q) * 100}%` }} /></span>
              </button>
            );
          })}
        </div>

        <div className="lp-panel-slot">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                key={selected.id} className="lp-panel" role="region" aria-label={`${selected.name} detail`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0, transition: { duration: 0.08 } } : { opacity: 0, x: 12, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
                transition={reduce ? { duration: 0.12 } : SPRING}
              >
                <div className="lp-panel-head">
                  <div>
                    <h4>{selected.name}</h4>
                    <p className="lp-label">Room count <span className="lp-num lp-panel-n">{roomPicked(selected)} / {roomQty(selected)}</span></p>
                  </div>
                  <button type="button" className="lp-iconbtn" aria-label={`Close ${selected.name}`} onClick={() => onSelect(null)}><X size={16} aria-hidden="true" /></button>
                </div>
                <ul className="lp-rows">
                  {selected.lines.map((l) => <GearRow key={l.id} line={l} saving={savingLines.has(l.id)} flashKey={confirmed[l.id]} />)}
                </ul>
              </motion.div>
            ) : (
              <motion.div key="empty" className="lp-panel lp-panel--empty" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
                <p>Select a room to see its gear and what is still to pick.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
