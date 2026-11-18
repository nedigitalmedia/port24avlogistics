import React, { useState } from 'react';
import ProjectView from './ProjectView';
import PhoneScan from './PhoneScan';
import { JOB, useDemoJob } from './demoJob';

/** Desktop project view beside the phone scan view, sharing one job. */
export default function HeroDemo() {
  const job = useDemoJob();
  const [selectedId, setSelectedId] = useState(null);
  const touched = job.last || selectedId;

  return (
    <div className="lp-demo">
      <div className="lp-demo-stage">
        <ProjectView rooms={job.rooms} selectedId={selectedId} onSelect={setSelectedId} inFlight={job.inFlight} confirmed={job.confirmed} />
        <PhoneScan rooms={job.rooms} inFlight={job.inFlight} last={job.last} onScan={job.scan} />
      </div>
      <p className="lp-demo-note">
        <strong>Sample data.</strong> {JOB.name} is a demo job. The desktop shows the show total for all rooms, the phone shows one room's count.
        Try it: select Breakout A, then scan Case A12.
        {' '}<button type="button" className="lp-link" data-hidden={touched ? 'false' : 'true'} tabIndex={touched ? 0 : -1} aria-hidden={touched ? undefined : true} onClick={() => { job.reset(); setSelectedId(null); }}>Reset demo</button>
      </p>
    </div>
  );
}
