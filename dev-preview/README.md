# Dashboard dev preview (fake data)

`npm run preview:dashboard` → http://localhost:5199/dashboard

Runs the real `AppLayout` + `Dashboard` against an in-memory fake Supabase (`mockSupabase.js`) and fake auth
(`mockAuth.jsx`). **Nothing is sent to a real backend and no sign-in is needed.** Dev-only; not part of the build.

Fixtures cover two companies, an undated project, multi-day projects, a legacy `planned` status and a finished project.
Query-string switches: `?role=crew|manager|admin`, `?org=A|B`, `?empty=1`, `?slow=3000` (ms), `?fail=window|count|all`.
`/frame.html?w=390&src=/dashboard` shows any route inside a phone/tablet-width iframe.
