# iOS-inspired refresh: landing page, three icons, one interaction

Branch `design/ios-refresh-preview` (cut from `qa/release-remediation`). Scope: landing page, Road Case / Rack / Scan icons, one room-to-scan interaction. App workflows, routes, permissions and the sign-in/trial/invite flows are unchanged.

## What changed
* `src/pages/LandingPage.jsx` rebuilt. Headline, supporting copy and CTAs as briefed. "See Port 24 in action" scrolls to the walkthrough; Sign in stays in the nav and hero; **Start free trial** stays in the nav and the closing section so the trial flow (`port24_flow`) is still reachable. The invite redirect (`?token=`) is kept.
* Removed: problem block, five feature blocks, personas, comparison table and the stats strip, replaced by one walkthrough of one job (Quote, Room plan, Pick, Return).
* `src/components/landing/*`: `HeroDemo` (desktop project view beside a phone scan view), `Walkthrough`, `demoJob.js` (the single demo job and the simulated save), `landing.css`.
* `src/components/icons/*`: `ScanIcon`, `RoadCaseIcon`, `RackIcon`. Shared path data in `port24IconPaths.js`; sheet generator `scripts/design/icon_sheet.mjs`.
* `index.html`: added Plus Jakarta Sans (display); Inter stays for UI and tables.

## The demo job (sample data, labelled on the page)
Grand Summit, 15 units in 3 rooms, 2 days, $2,890.00 show total. 12 picked at start. Scanning Case A12 makes the **show total 13 / 15 on the desktop** and **Breakout A 2 / 4 on the phone**; both are labelled "Show total" and "Room count".

## Interaction behavior
* Selecting a room slides its detail panel in (spring, transform only). Both columns are reserved, so nothing moves.
* A scan goes through a simulated save (450 ms). The row, both counts and the phone result change **only when the save returns**, in one state update. While saving, the row shows a dashed ring and counts are unchanged.
* The input is never disabled; several scans can be in flight. A duplicate or an item from another job is refused with a clear message and changes nothing.
* Reduced motion: no slide, spin, flash or smooth scroll; scanning and counts still work.
* Verified: layout rects of window, phone, hero copy and page height sampled every 40 ms through 8 steps: no change. Phone width 375 and 390: no horizontal overflow.

## Not done / decisions for you
* The scan result is a **simulated save inside the landing page**, not a call to the real warehouse RPCs. Wiring the same interaction into the in-app Scan page is a separate step.
* Walkthrough panels are **renditions built from the same sample data with the product's own wording**, not screenshots of the live app.
* The app sidebar, MobileNav, PageTransition and appShell.css were read for tokens but not changed.
* The clip is a recorded Chrome run with an injected cursor overlay (recording only, not in the app). WebM only; this machine's ffmpeg build has no GIF encoder.
