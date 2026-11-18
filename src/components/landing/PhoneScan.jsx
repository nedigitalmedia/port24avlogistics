import React, { useRef, useState } from 'react';
import { JOB, roomPicked, roomQty, showPicked, showQty } from './demoJob';
import { ScanIcon } from '@/components/icons/Port24Icons';

const TRY = [
  { code: 'A12', label: 'Case A12' },
  { code: 'SPK-2', label: 'Speaker SPK-2' },
  { code: 'B07', label: 'Case B07' },
];

/** Phone scan view. Never disabled while a save is running, so the next scan can start immediately. */
export default function PhoneScan({ rooms, inFlight, last, onScan }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const roomId = last?.roomId || 'ba';
  const room = rooms.find((r) => r.id === roomId) || rooms[1];
  const saving = inFlight[inFlight.length - 1];

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onScan(value);
    setValue('');
    inputRef.current?.focus();
  };

  const state = saving ? 'saving' : !last ? 'idle' : last.ok ? 'ok' : 'error';

  return (
    <section className="lp-phone" aria-label={`Phone scan view for ${JOB.name} (sample data)`}>
      <div className="lp-phone-screen">
        <header className="lp-phone-head">
          <span className="lp-phone-title"><ScanIcon size={20} /> Scan / Pick</span>
          <span className="lp-label">{JOB.name} · sample data</span>
        </header>

        <div className="lp-finder" aria-hidden="true">
          <i className="lp-c lp-c--tl" /><i className="lp-c lp-c--tr" /><i className="lp-c lp-c--bl" /><i className="lp-c lp-c--br" />
          <span className="lp-finder-bars"><b /><b /><b /><b /><b /></span>
        </div>

        <form className="lp-entry" onSubmit={submit}>
          <label className="lp-sr" htmlFor="lp-code">Asset or case code</label>
          <input id="lp-code" ref={inputRef} className="lp-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type or scan" autoComplete="off" autoCapitalize="characters" spellCheck="false" enterKeyHint="go" />
          <button type="submit" className="lp-scanbtn">Scan</button>
        </form>

        <div className="lp-try" role="group" aria-label="Try a scan">
          {TRY.map((t) => <button key={t.code} type="button" className="lp-chip" onClick={() => onScan(t.code)}>{t.label}</button>)}
        </div>

        <div className="lp-result" data-state={state} role="status" aria-live="polite">
          {state === 'idle' && (<><p className="lp-result-title">Ready to scan</p><p className="lp-result-sub">{showQty(rooms) - showPicked(rooms)} of {showQty(rooms)} still to pick on this job.</p></>)}
          {state === 'saving' && (<><p className="lp-result-title">Saving {saving.code}</p><p className="lp-result-sub">Keep scanning, each one saves on its own.</p></>)}
          {state === 'ok' && (<><p className="lp-result-title">{last.name} picked</p><p className="lp-result-sub">{last.kind === 'kit' ? 'Everything sealed inside counts with the case.' : `Saved to ${last.roomName}.`}</p></>)}
          {state === 'error' && (<><p className="lp-result-title">Not picked</p><p className="lp-result-sub">{last.message}</p></>)}
        </div>

        <dl className="lp-counts">
          <div><dt className="lp-label">Room count</dt><dd><span className="lp-count-room">{room.name}</span> <span className="lp-num">{roomPicked(room)} / {roomQty(room)}</span></dd></div>
          <div><dt className="lp-label">Show total</dt><dd><span className="lp-count-room">All rooms</span> <span className="lp-num">{showPicked(rooms)} / {showQty(rooms)}</span></dd></div>
        </dl>
      </div>
    </section>
  );
}
