// Fake Supabase for the dashboard harness. Implements only what the dashboard + Shows page call.
const q = new URLSearchParams(window.location.search);
const FAIL = (q.get('fail') || '').split(',').filter(Boolean);
const SLOW = parseInt(q.get('slow') || '0', 10);
const EMPTY = q.get('empty') === '1';
const D = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const mk = (org, id, name, status, s, e, venue) => ({ id: `${org}-${id}`, org_id: `org-${org}`, name, status, start_date: s === null ? null : D(s), end_date: e == null ? null : D(e), venue_name: venue || null, client_name: 'Client', contact_name: 'Pat' });
const SHOWS = EMPTY ? [] : [
  mk('A', 1, 'Cisco Keynote', 'planning', 2, 4, 'Moscone West'),
  mk('A', 2, 'NFL Draft Experience', 'confirmed', 5, 9, 'Navy Pier'),
  mk('A', 3, 'AWS re:Invent Pre-Show', 'picking', 9, 9, 'Venetian'),
  mk('A', 4, 'Gala Dinner', 'picked', 11, 11, 'Grand Ballroom'),
  mk('A', 5, 'Tech Summit', 'planned', 14, 15, 'Convention Center'), // legacy key → planning
  mk('A', 6, 'Product Launch', 'planning', 20, null, 'Studio 9'),
  mk('A', 7, 'Far Future Expo', 'confirmed', 60, 62, 'Expo Hall'),
  mk('A', 8, 'Beyond Window', 'planning', 200, 201, 'Arena'),
  mk('A', 9, 'Festival Load-in', 'on_truck', 0, 3, 'Fairgrounds'),
  mk('A', 10, 'Concert Tour', 'on_location', -1, 2, 'Amphitheater'),
  mk('A', 11, 'Corporate Retreat', 'needs_return', -6, -3, 'Resort'),
  mk('A', 12, 'Trade Show', 'returning', -4, -2, 'McCormick'),
  mk('A', 13, 'Old Wedding', 'finished', -30, -29, 'Barn'),
  mk('A', 14, 'Undated Idea', 'planning', null, null),
  mk('A', 15, 'Another Undated', 'confirmed', null, null),
  mk('A', 16, 'Quarterly Meeting', 'confirmed', 3, 3, 'HQ'),
  mk('B', 1, 'OTHER CO SECRET SHOW', 'confirmed', 3, 4, 'Their Venue'),
  mk('B', 2, 'Other Co Gala', 'planning', 6, 6, 'Their Hall'),
  mk('B', 3, 'Other Co Return Job', 'returning', -2, -1, 'Their Site'),
];
const LEGACY = { planned: 'planning', load_out: 'on_truck', on_site: 'on_location', strike: 'needs_return', returned: 'returning', completed: 'finished' };
const GENERIC_ROW = (i, tbl = 't') => ({ id: `${tbl}-${i}`, org_id: 'org-A', name: ['Wireless Mic Kit', 'LED Wall Panel', 'Console'][i], title: 'Sample', status: ['available', 'checked_out', 'active'][i], category: 'Audio', manufacturer: 'Acme', model: 'X' + i, quantity: 4 + i, total: 1200 * (i + 1), amount: 500, price: 250, rate: 85, email: 'pat@example.com', phone: '555-0100', city: 'Chicago', client_name: 'Client Co', description: 'Sample description text', created_at: new Date().toISOString(), created_date: new Date().toISOString(), start_date: D(3), end_date: D(5), serial_numbers: [], barcode: 'NE0000' + i, asset_number: 'NE0000' + i });
const ROWS_ON = q.get('rows') === '1' || sessionStorage.getItem('__rows') === '1';
const GENERIC = new Proxy({}, { get: (_t, tbl) => (!ROWS_ON || ['organizations', 'users', 'company_memberships', 'brand_settings'].includes(tbl) ? [] : [0, 1, 2].map((i) => GENERIC_ROW(i, tbl))) });
const DELETED = new Set();
const FAILDEL = (q.get('faildel') || '').split(',').filter(Boolean);
// ?trial=expired | active | soon (ends in 20s) | none (default: paid 'pro' company)
const TRIAL = q.get('trial') || 'none';
const TRIAL_END = new Date(Date.now() + ({ expired: -3600e3, active: 50 * 3600e3, soon: 20e3 }[TRIAL] ?? 0)).toISOString(); // fixed at load
const orgRow = (id) => (TRIAL === 'none'
  ? { id, plan: 'pro', status: 'active', trial_ends_at: null }
  : { id, plan: 'trial', status: 'active', trial_ends_at: TRIAL_END });
class B {
  constructor(table) { this.t = table; this.f = []; this.head = false; this.lim = null; this.ord = []; this.one = false; }
  delete() { this.isDelete = true; return this; }
  select(_c, o) { if (o?.head) this.head = true; this.count = !!o?.count; return this; }
  eq(k, v) { this.f.push((r) => r[k] === v); return this; }
  in(k, v) { this.f.push((r) => v.includes(r[k])); return this; }
  is(k, v) { this.f.push((r) => (v === null ? r[k] == null : r[k] === v)); return this; }
  lte(k, v) { this.f.push((r) => r[k] != null && r[k] <= v); return this; }
  gte(k, v) { this.f.push((r) => r[k] != null && r[k] >= v); return this; }
  or(str) {
    // exactly: end_date.gte.X,and(end_date.is.null,start_date.gte.X)
    const m = str.match(/^end_date\.gte\.(\d{4}-\d{2}-\d{2}),and\(end_date\.is\.null,start_date\.gte\.(\d{4}-\d{2}-\d{2})\)$/);
    if (!m) { this.bad = 'unsupported or(): ' + str; return this; }
    this.f.push((r) => (r.end_date != null && r.end_date >= m[1]) || (r.end_date == null && r.start_date != null && r.start_date >= m[2]));
    return this;
  }
  order(k, o) { this.ord.push([k, o?.ascending !== false]); return this; }
  limit(n) { this.lim = n; return this; }
  single() { this.one = true; return this; }
  then(res, rej) { return this.run().then(res, rej); }
  async run() {
    if (SLOW) await new Promise((r) => setTimeout(r, SLOW));
    if (this.bad) return { data: null, error: new Error(this.bad) };
    if (this.t === 'shows' && FAIL.length) {
      const hint = this.head ? 'count' : 'window';
      if (FAIL.includes(hint) || FAIL.includes('all')) return { data: null, count: null, error: new Error('simulated failure') };
    }
    let rows = this.t === 'organizations' ? [orgRow('org-A'), orgRow('org-B')] : this.t === 'shows' ? SHOWS.map((r) => ({ ...r, status: r.status })) : (GENERIC[this.t] || []);
    // normalize legacy only for the DB-side `in` (the real DB stores legacy keys as-is)
    rows = rows.filter((r) => !DELETED.has(r.id));
    for (const fn of this.f) rows = rows.filter(fn);
    if (this.isDelete) {
      for (const r of rows) { if (FAILDEL.includes(r.id)) return { data: null, error: new Error('update or delete violates foreign key constraint') }; DELETED.add(r.id); }
      return { data: null, error: null };
    }
    for (const [k, asc] of [...this.ord].reverse()) rows.sort((a, b) => (String(a[k]) < String(b[k]) ? -1 : String(a[k]) > String(b[k]) ? 1 : 0) * (asc ? 1 : -1));
    const total = rows.length;
    if (this.lim != null) rows = rows.slice(0, this.lim);
    if (this.head) return { data: null, count: total, error: null };
    if (this.one) return { data: rows[0] || null, error: null };
    return { data: rows, count: this.count ? total : null, error: null };
  }
}
export const supabase = {
  from: (t) => new B(t),
  auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }), getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  removeChannel: async () => {},
  removeAllChannels: async () => {},
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
  functions: { invoke: async () => ({ data: null, error: null }) },
};
export const __LEGACY = LEGACY;
