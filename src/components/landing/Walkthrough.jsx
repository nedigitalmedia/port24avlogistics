import React, { useRef, useState } from 'react';
import { INITIAL_ROOMS, JOB, money, roomQty, roomValue, showQty, showValue } from './demoJob';
import { RackIcon, RoadCaseIcon, ScanIcon } from '@/components/icons/Port24Icons';

const STEPS = [
  { id: 'quote', label: 'Quote', copy: 'Price the job room by room. A new line defaults to every calendar day of the show, and a confirmed quote is never edited afterwards.' },
  { id: 'plan', label: 'Room plan', copy: 'Assign gear to each room. Add Equipment sits on the room header, and you set the quantity as you add.' },
  { id: 'pick', label: 'Pick', copy: 'Scan on a phone. A case counts once and what is sealed inside it counts with it. Room count and show total come from the same saved scans.' },
  { id: 'return', label: 'Return', copy: 'Scan gear back in. The job shows what is still out and only finishes when everything is back.' },
];

const rate = (n) => money(n);

function QuoteView() {
  return (
    <div className="lp-doc">
      <header className="lp-doc-head">
        <div><h4>{JOB.name}</h4><p className="lp-label">Quote · {JOB.dates} · {JOB.days} days</p></div>
        <span className="lp-pill lp-pill--ok">Confirmed</span>
      </header>
      <table className="lp-table">
        <thead><tr><th scope="col">Description</th><th scope="col" className="r">Qty</th><th scope="col" className="r">Days</th><th scope="col" className="r">Rate / day</th><th scope="col" className="r">Total</th></tr></thead>
        {INITIAL_ROOMS.map((room) => (
          <tbody key={room.id}>
            <tr className="lp-table-room"><th scope="rowgroup" colSpan={4}>{room.name}</th><td className="r lp-num">{money(roomValue(room))}</td></tr>
            {room.lines.map((l) => (
              <tr key={l.id}><td>{l.name}</td><td className="r lp-num">{l.qty}</td><td className="r lp-num">{JOB.days}</td><td className="r lp-num">{rate(l.rate)}</td><td className="r lp-num">{money(l.qty * l.rate * JOB.days)}</td></tr>
            ))}
          </tbody>
        ))}
        <tfoot><tr><th scope="row" colSpan={4}>Show total</th><td className="r lp-num">{money(showValue(INITIAL_ROOMS))}</td></tr></tfoot>
      </table>
    </div>
  );
}

function PlanView() {
  return (
    <div className="lp-plan">
      <div className="lp-plan-top"><p className="lp-label">Show total</p><p className="lp-num lp-plan-total">{showQty(INITIAL_ROOMS)} units in {INITIAL_ROOMS.length} rooms</p></div>
      <div className="lp-plan-rooms">
        {INITIAL_ROOMS.map((room) => (
          <section key={room.id} className="lp-plan-room" aria-label={room.name}>
            <header><h4>{room.name}</h4><span className="lp-num lp-plan-count">{roomQty(room)} units</span><span className="lp-addbtn" aria-hidden="true">+ Add Equipment</span></header>
            <ul>
              {room.lines.map((l) => (
                <li key={l.id}>
                  <span className="lp-row-icon" aria-hidden="true">{l.kind === 'kit' ? <RoadCaseIcon size={20} /> : l.kind === 'rack' ? <RackIcon size={20} /> : <span className="lp-bullet" />}</span>
                  <span>{l.name}</span><span className="lp-num lp-plan-qty">× {l.qty}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="lp-plan-add"><span className="lp-label">Add Equipment · Breakout A</span><span className="lp-fakefield" aria-hidden="true">Lectern mic</span><span className="lp-fakefield lp-fakefield--qty" aria-hidden="true">Quantity 1</span></p>
    </div>
  );
}

function PickView() {
  const log = [
    { icon: <RoadCaseIcon size={20} />, name: 'Case A12', note: 'Picked to Breakout A. Items sealed inside it count with the case.', tone: 'ok' },
    { icon: <ScanIcon size={20} />, name: 'Case A12', note: 'Second scan refused. A case is picked once.', tone: 'bad' },
    { icon: <ScanIcon size={20} />, name: 'Case B07', note: `Not planned for ${JOB.name}. Nothing saved.`, tone: 'bad' },
    { icon: <ScanIcon size={20} />, name: 'Powered speaker SPK-2', note: 'Picked to Breakout A.', tone: 'ok' },
  ];
  return (
    <div className="lp-pick">
      <div className="lp-pick-sum">
        <div><p className="lp-label">Show total</p><p className="lp-bignum lp-num">13 / 15 <span>picked</span></p></div>
        <dl>
          <div><dt>General Session</dt><dd className="lp-num">9 / 9</dd></div>
          <div><dt>Breakout A</dt><dd className="lp-num">2 / 4</dd></div>
          <div><dt>Breakout B</dt><dd className="lp-num">2 / 2</dd></div>
        </dl>
      </div>
      <ul className="lp-log">
        {log.map((e, i) => (
          <li key={i} data-tone={e.tone}><span className="lp-row-icon" aria-hidden="true">{e.icon}</span><span className="lp-log-main"><span className="lp-row-name">{e.name}</span><span className="lp-row-meta">{e.note}</span></span><span className="lp-log-tag">{e.tone === 'ok' ? 'Picked' : 'Refused'}</span></li>
        ))}
      </ul>
    </div>
  );
}

function ReturnView() {
  const steps = [
    { big: '15 of 15', sub: 'still out', note: 'After dispatch and on location.' },
    { big: '10 of 15', sub: 'still out', note: 'Five cables scanned back. The room counts drop with them.' },
    { big: 'All 15', sub: 'back', note: `${JOB.name} finishes. Stock and locks release.`, done: true },
  ];
  return (
    <ol className="lp-return">
      {steps.map((s, i) => (
        <li key={i} data-done={s.done ? 'true' : undefined}>
          <p className="lp-bignum lp-num">{s.big} <span>{s.sub}</span></p>
          <p className="lp-row-meta">{s.note}</p>
          {s.done ? <span className="lp-pill lp-pill--ok">Finished</span> : null}
        </li>
      ))}
    </ol>
  );
}

const VIEWS = { quote: QuoteView, plan: PlanView, pick: PickView, return: ReturnView };

export default function Walkthrough() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  const onKey = (e) => {
    const n = STEPS.length;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (active + 1) % n;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (active - 1 + n) % n;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = n - 1;
    if (next === null) return;
    e.preventDefault(); setActive(next); refs.current[next]?.focus();
  };
  const step = STEPS[active];
  const View = VIEWS[step.id];

  return (
    <div className="lp-wt">
      <div className="lp-wt-tabs" role="tablist" aria-label="Walkthrough steps" onKeyDown={onKey}>
        {STEPS.map((s, i) => (
          <button key={s.id} ref={(el) => { refs.current[i] = el; }} role="tab" id={`wt-tab-${s.id}`} aria-selected={i === active} aria-controls="wt-panel" tabIndex={i === active ? 0 : -1} className="lp-wt-tab" onClick={() => setActive(i)}>{s.label}</button>
        ))}
      </div>
      <p className="lp-wt-copy" id="wt-copy">{step.copy}</p>
      <div className="lp-wt-frame" role="tabpanel" id="wt-panel" aria-labelledby={`wt-tab-${step.id}`} tabIndex={0}>
        <div className="lp-wt-stage"><View /></div>
      </div>
      <p className="lp-demo-note"><strong>Sample data.</strong> {JOB.name} is the same demo job as above: 15 units in 3 rooms, {JOB.days} days, {money(showValue(INITIAL_ROOMS))} show total.</p>
    </div>
  );
}
