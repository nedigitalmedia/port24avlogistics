import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ScanBarcode, CalendarDays, Users, FileText,
  BarChart3, ArrowRight, CheckCircle, ChevronRight,
  Package, Zap, Shield, Clock, TrendingUp, Menu, X
} from 'lucide-react';

const T = '#1FB8A0';
const T_DIM = '#17907C';
const BG = '#080C12';
const SURFACE = '#0D1219';
const CARD = '#111820';
const BORDER = 'rgba(31,184,160,0.15)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#6B7A92';
const TEXT_DIM = '#6B7A92';

function Port24Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
      <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
      <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
      <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
    </svg>
  );
}

/* ── Animated bracket grid background ── */
function GridBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.03 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1FB8A0" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

/* ── Inline UI mockup illustration (mirrors the in-app dashboard) ── */
const PANEL = '#EEF5FB';
const PANEL_2 = '#E3EDF6';
const INK = '#0B1F2E';
const INK_MUTED = '#4B6378';

function HeroMockup() {
  const kpis = [
    { label: 'Upcoming shows', value: '7' },
    { label: 'Active shows', value: '10' },
    { label: 'Ready to pick', value: '4' },
    { label: 'Awaiting returns', value: '2' },
  ];
  const bars = [1, 2, 1, 1, 1, 1, 2, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
  const rows = [
    { name: 'Cisco Keynote 2025', meta: 'Jun 12–14 · Moscone West', stage: 'Planning', color: '#6B7280' },
    { name: 'NFL Draft Experience', meta: 'Jun 18–22 · Navy Pier', stage: 'Picking', color: '#D97706' },
    { name: 'AWS re:Invent Pre-Show', meta: 'Jun 28 · Venetian Expo', stage: 'Confirmed', color: '#059669' },
  ];
  const card = { background: PANEL, color: INK, borderRadius: 12, boxShadow: '0 1px 2px rgba(5,25,40,0.18), 0 12px 28px -16px rgba(0,10,25,0.6)' };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 540 }}>
      {/* Glow */}
      <div style={{ position: 'absolute', inset: -40, background: 'radial-gradient(ellipse at 50% 50%, rgba(45,212,191,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* App window: same teal-to-navy frame and pale panels as the product */}
      <div style={{ background: 'radial-gradient(420px 220px at 80% -10%, rgba(45,212,191,0.26), transparent 62%), linear-gradient(135deg, #06222d 0%, #0a4458 46%, #0c2d5a 100%)', border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        {/* Top bar */}
        <div style={{ background: 'rgba(4,26,36,0.6)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', opacity: 0.7 }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', opacity: 0.7 }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', opacity: 0.7 }} />
          <div style={{ flex: 1, height: 1 }} />
          <div style={{ background: '#2DD4BF', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#04222A' }}>Dashboard</div>
        </div>

        <div style={{ padding: '16px 16px 38px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* KPI tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8 }}>
            {kpis.map(({ label, value }) => (
              <div key={label} style={{ ...card, padding: '10px 12px' }}>
                <p style={{ color: INK_MUTED, fontSize: 10, fontWeight: 600, margin: 0 }}>{label}</p>
                <p style={{ color: INK, fontSize: 24, fontWeight: 700, margin: '4px 0 0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Schedule chart */}
          <div style={{ ...card, padding: '12px 14px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Show schedule</p>
            <p style={{ color: INK_MUTED, fontSize: 10, margin: '2px 0 8px' }}>Projects running each day, next 30 days</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56, borderBottom: '1px solid #CFDCE8' }}>
              {bars.map((v, i) => (
                <div key={i} style={{ flex: 1, height: v === 0 ? 0 : 14 + v * 18, background: '#0F9D8A', borderRadius: '4px 4px 0 0' }} />
              ))}
            </div>
          </div>

          {/* Project list */}
          <div style={{ ...card, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>Upcoming projects</p>
            {rows.map((r) => (
              <div key={r.name} style={{ background: PANEL_2, borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</p>
                  <p style={{ color: INK_MUTED, fontSize: 10, margin: '1px 0 0' }}>{r.meta}</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: INK, background: `${r.color}1f`, border: `1px solid ${r.color}66`, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />{r.stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating scan card */}
      <div className="lp-float-l" style={{ position: 'absolute', bottom: -20, left: -24, background: PANEL, color: INK, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 32px rgba(0,10,25,0.5)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(15,157,138,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScanBarcode size={16} color="#0B7F70" />
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Shure AD4D Wireless</p>
          <p style={{ color: '#0B7F70', fontSize: 11, fontWeight: 600, margin: '1px 0 0' }}>✓ Checked out → Cisco Keynote</p>
        </div>
      </div>

      {/* Floating quote card */}
      <div className="lp-float-r" style={{ position: 'absolute', bottom: -20, right: -24, background: PANEL, color: INK, borderRadius: 12, padding: '10px 14px', boxShadow: '0 12px 32px rgba(0,10,25,0.5)' }}>
        <p style={{ color: INK_MUTED, fontSize: 10, margin: '0 0 4px' }}>Quote signed</p>
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>$48,200</p>
        <p style={{ color: '#0B7F70', fontSize: 10, fontWeight: 600, margin: '2px 0 0' }}>NFL Draft Experience</p>
      </div>
    </div>
  );
}

/* ── Feature illustration stubs ── */
function FeatureIllo({ type }) {
  const items = {
    scan: (
      <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER_DIM}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
          <ScanBarcode size={18} color={T} />
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 0 }}>ETC Ion Xe 20</p>
            <p style={{ color: TEXT_MUTED, fontSize: 11, margin: 0 }}>SN: ETC-8823 · Console · Good</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: T, background: `${T}18`, borderRadius: 20, padding: '3px 8px' }}>In Warehouse</span>
        </div>
        {[
          { name: 'Shure AD4D Wireless Rack', sn: 'SHR-1142', status: 'On Show', color: '#818CF8' },
          { name: 'Barco E2 Screen Mgr', sn: 'BAR-0095', status: 'In Transit', color: '#F59E0B' },
          { name: 'Sennheiser G4 IEM', sn: 'SEN-3309 ×4', status: 'In Warehouse', color: T },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER_DIM}` }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, margin: 0 }}>{a.name}</p>
              <p style={{ color: TEXT_MUTED, fontSize: 11, margin: 0 }}>{a.sn}</p>
            </div>
            <span style={{ fontSize: 10, color: a.color }}>{a.status}</span>
          </div>
        ))}
      </div>
    ),
    crew: (
      <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER_DIM}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NFL Draft — Crew Call Sheet</p>
        {[
          { name: 'Marcus Webb', role: 'A1 — Audio Lead', avail: 'Confirmed', color: T },
          { name: 'Priya Sánchez', role: 'Video Director', avail: 'Confirmed', color: T },
          { name: 'Tyler Knox', role: 'LED Tech', avail: 'Pending', color: '#F59E0B' },
          { name: 'Dana Osei', role: 'Broadcast Eng.', avail: 'Confirmed', color: T },
        ].map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER_DIM}` }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: c.color, flexShrink: 0 }}>
              {c.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, margin: 0 }}>{c.name}</p>
              <p style={{ color: TEXT_MUTED, fontSize: 11, margin: 0 }}>{c.role}</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: c.color, background: `${c.color}18`, borderRadius: 20, padding: '3px 8px' }}>{c.avail}</span>
          </div>
        ))}
      </div>
    ),
    quote: (
      <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER_DIM}`, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quote #2041</p>
            <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>AWS re:Invent Pre-Show</p>
            <p style={{ color: TEXT_MUTED, fontSize: 12, margin: '2px 0 0' }}>Venetian Expo · Jun 28, 2025</p>
          </div>
          <span style={{ color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, fontSize: 11, fontWeight: 600, padding: '4px 10px' }}>Signed</span>
        </div>
        <div style={{ borderTop: `1px solid ${BORDER_DIM}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { item: 'LED Wall — 20×12ft', qty: 1, total: '$12,400' },
            { item: 'Broadcast Audio Package', qty: 1, total: '$8,200' },
            { item: 'Video Switching — Barco', qty: 1, total: '$6,800' },
            { item: 'Crew (8 persons, 2 days)', qty: 16, total: '$11,200' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: TEXT_MUTED }}>{r.item}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{r.total}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${BORDER_DIM}`, marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: TEXT_MUTED, fontSize: 13 }}>Total</span>
          <span style={{ color: T, fontSize: 18, fontWeight: 700 }}>$38,600</span>
        </div>
      </div>
    ),
    finance: (
      <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER_DIM}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: TEXT_MUTED, fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Show P&L — Q2 2025</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Revenue', value: '$312,400', color: T },
            { label: 'Direct Costs', value: '$187,200', color: '#818CF8' },
            { label: 'Gross Margin', value: '40.1%', color: '#10B981' },
            { label: 'Open Invoices', value: '$48,200', color: '#F59E0B' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: SURFACE, borderRadius: 8, padding: '10px 12px', border: `1px solid ${BORDER_DIM}` }}>
              <p style={{ color: TEXT_MUTED, fontSize: 10, margin: '0 0 4px' }}>{label}</p>
              <p style={{ color, fontSize: 16, fontWeight: 700, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
        {/* Bar chart stub */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60, marginTop: 4 }}>
          {[30, 55, 45, 70, 82, 60, 90].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 6 ? T : `${T}30`, borderRadius: '4px 4px 0 0' }} />
          ))}
        </div>
        <p style={{ color: TEXT_DIM, fontSize: 10, margin: 0, textAlign: 'center' }}>Revenue by week · Jun 2025</p>
      </div>
    ),
  };
  return items[type] || null;
}

const PAIN_POINTS = [
  {
    icon: Package,
    title: 'The Gear Black Hole',
    body: 'You scan it out of the warehouse and cross your fingers. No one knows where it is until someone calls asking for it — and it\'s already on another show.',
  },
  {
    icon: FileText,
    title: 'Quote & Lose',
    body: 'By the time you\'ve pieced together a proposal in Excel and sent a PDF, the client has already booked someone who moved faster.',
  },
  {
    icon: Users,
    title: 'The Crew Text Chain',
    body: 'Confirming call times, positions, and transportation through 12 text threads. Someone doesn\'t show. You find out at load-in.',
  },
  {
    icon: BarChart3,
    title: 'Show P&L? Maybe Next Month.',
    body: 'You run the show, wrap the show, and three weeks later you find out if you actually made money — after manually sorting through receipts.',
  },
];

const FEATURES = [
  {
    tag: 'Inventory & Scanning',
    headline: 'Know exactly where every piece of gear is. Right now.',
    body: 'Scan equipment in and out with any phone or barcode scanner. Track status across warehouse, transit, show floor, and return — asset by asset, kit by kit. Conflict alerts fire before you double-book gear.',
    bullets: ['QR & barcode scanning from any mobile device', 'Real-time status: warehouse → truck → on location → returned', 'Kit management with sub-components', 'Conflict detection before it becomes a phone call'],
    illo: 'scan',
    flip: false,
  },
  {
    tag: 'Crew Management',
    headline: 'Confirm your crew in minutes, not a week of back-and-forth.',
    body: 'See availability across your full roster before you even start calling. Send digital call sheets, collect confirmations, attach transportation and hotel details — all in one thread. No more group texts.',
    bullets: ['Availability calendar across all crew members', 'Digital call sheets with one-click confirmation', 'Role-based booking with labor rate management', 'Crew email engine with per-show templates'],
    illo: 'crew',
    flip: true,
  },
  {
    tag: 'Quotes & Invoices',
    headline: 'Send a professional quote before they finish talking to the next vendor.',
    body: 'Build itemized quotes from your inventory. Apply your branding, set margins by category, and send a link for digital sign-off. Convert to invoice in one click. No spreadsheets.',
    bullets: ['Quote builder with live inventory & crew rates', 'Branded proposals with digital sign-off', 'One-click quote → invoice conversion', 'Payment tracking and invoice aging'],
    illo: 'quote',
    flip: false,
  },
  {
    tag: 'Show Financials',
    headline: 'Know your margin before the truck leaves the dock.',
    body: 'Every cost — gear, crew, subrental, travel — rolls up in real time against your quoted revenue. See which shows are profitable, which aren\'t, and why. Post-event comparison built in.',
    bullets: ['Real-time P&L per show', 'Labor, gear, subrental, and travel cost rollup', 'Post-event vs. quoted comparison', 'Quarterly financial reporting across all shows'],
    illo: 'finance',
    flip: true,
  },
];

const PERSONAS = [
  {
    label: 'AV Rental Companies',
    icon: Package,
    points: ['Inventory conflict prevention', 'Sub-rental margin tracking', 'Barcode scanning at every stage', 'Utilization reporting by asset'],
  },
  {
    label: 'Event Production Companies',
    icon: CalendarDays,
    points: ['Multi-show project management', 'Vendor & venue coordination', 'Show-day live dashboards', 'Client billing & payment tracking'],
  },
  {
    label: 'Touring & Broadcast Support',
    icon: Zap,
    points: ['Tour schedule management', 'Recurring crew assignments', 'Equipment maintenance tracking', 'On-the-road mobile scanning'],
  },
];

const STATS = [
  { value: '100%', label: 'Web-based — no install' },
  { value: 'Real-time', label: 'Inventory visibility' },
  { value: 'One place', label: 'Crew, gear & finance' },
  { value: '<2 min', label: 'Average quote turnaround' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activePersona, setActivePersona] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goSignIn = () => navigate('/signin');
  const goTrial = () => {
    sessionStorage.setItem('port24_flow', 'trial');
    navigate('/signin');
  };
  const goAcceptInvite = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) navigate(`/accept-invite?token=${params.get('token')}`);
    else navigate('/signin');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) goAcceptInvite();
  }, []);

  const navLinks = [
    { label: 'Inventory', href: '#inventory' },
    { label: 'Crew', href: '#crew' },
    { label: 'Quotes', href: '#quotes' },
    { label: 'Financials', href: '#finance' },
  ];

  return (
    <div style={{ backgroundColor: BG, color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif", overflowX: 'hidden' }}>

      {/* Skip to main content — keyboard / screen reader accessibility */}
      <a
        href="#main-content"
        style={{
          position: 'absolute', top: -9999, left: 8, zIndex: 9999,
          background: T, color: BG, fontWeight: 700, fontSize: 13,
          padding: '8px 16px', borderRadius: 6, textDecoration: 'none',
        }}
        onFocus={e => { e.currentTarget.style.top = '8px'; }}
        onBlur={e => { e.currentTarget.style.top = '-9999px'; }}
      >
        Skip to main content
      </a>

      {/* ── NAV ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: scrolled ? `1px solid ${BORDER_DIM}` : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        backgroundColor: scrolled ? 'rgba(8,12,18,0.92)' : 'transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Port24Mark size={26} />
            <span style={{ letterSpacing: '0.16em', fontWeight: 800, fontSize: '0.8rem', color: '#3DC9C0' }}>
              PORT <span style={{ color: T }}>24</span>
            </span>
          </div>

          {/* Desktop nav links */}
          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden-mobile">
            {navLinks.map(({ label, href }) => (
              <a key={label} href={href} style={{ color: TEXT_MUTED, fontSize: 14, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = TEXT_MUTED}>
                {label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={goSignIn} style={{ color: TEXT_MUTED, background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: '8px 4px' }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = TEXT_MUTED}>
              Sign In
            </button>
            <button onClick={goTrial} style={{ background: T, color: BG, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, padding: '9px 18px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = T_DIM}
              onMouseLeave={e => e.currentTarget.style.background = T}>
              Start Free Trial
            </button>
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: 4, display: 'none' }}
              className="show-mobile"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav id="mobile-nav" aria-label="Mobile navigation" style={{ background: SURFACE, borderBottom: `1px solid ${BORDER_DIM}`, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {navLinks.map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} style={{ color: TEXT_MUTED, fontSize: 15, textDecoration: 'none' }}>{label}</a>
            ))}
          </nav>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="main-content" ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 100, paddingBottom: 80, overflow: 'hidden' }}>
        <GridBg />

        {/* Ambient orb */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse, rgba(31,184,160,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div className="lp-two-col" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', position: 'relative', zIndex: 1, width: '100%' }}>
          <div>
            {/* Pre-label */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '6px 14px', marginBottom: 28, background: 'rgba(31,184,160,0.06)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T, animation: 'pulse 2s infinite' }} />
              <span style={{ color: T, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em' }}>Built for live production</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
              Every show.<br />
              Every piece of gear.<br />
              <span style={{ color: T }}>One place.</span>
            </h1>

            <p style={{ color: TEXT_MUTED, fontSize: 18, lineHeight: 1.7, margin: '0 0 36px', maxWidth: 480 }}>
              Port 24 is the operations platform built for AV and live production companies — inventory, crew, quoting, and financials in a single system that moves as fast as your team.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={goTrial} style={{ display: 'flex', alignItems: 'center', gap: 8, background: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, padding: '14px 28px', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = T_DIM}
                onMouseLeave={e => e.currentTarget.style.background = T}>
                Start Free Trial <ArrowRight size={16} />
              </button>
              <button onClick={goSignIn} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#fff', border: `1px solid ${BORDER_DIM}`, borderRadius: 12, fontWeight: 600, fontSize: 15, padding: '14px 28px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER_DIM; e.currentTarget.style.background = 'transparent'; }}>
                Sign In
              </button>
            </div>

            {/* Trust line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32, flexWrap: 'wrap' }}>
              {['No spreadsheets', 'No app installs', 'Real-time sync'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={13} color={T} />
                  <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero mockup */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative', paddingBottom: 32 }}>
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section style={{ padding: '100px 24px', borderTop: `1px solid ${BORDER_DIM}`, background: SURFACE }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 64px' }}>
            <p style={{ color: T, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Sound familiar?</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>The problems every production company knows</h2>
            <p style={{ color: TEXT_MUTED, fontSize: 16, lineHeight: 1.7, margin: 0 }}>We built Port 24 after working inside these exact problems. Here's what we heard.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {PAIN_POINTS.map(({ icon: Icon, title, body }) => (
              <div key={title} style={{ background: CARD, border: `1px solid ${BORDER_DIM}`, borderRadius: 16, padding: '28px 24px', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = BORDER}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER_DIM}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={18} color="#EF4444" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{title}</h3>
                <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <p style={{ color: TEXT_MUTED, fontSize: 16 }}>Port 24 solves all of these. Here's how. <span style={{ display: 'inline-flex', alignItems: 'center', color: T, fontWeight: 600 }}>↓</span></p>
          </div>
        </div>
      </section>

      {/* ── FEATURE SECTIONS ── */}
      {FEATURES.map(({ tag, headline, body, bullets, illo, flip }, idx) => (
        <section key={tag} id={tag.toLowerCase().split(' ')[0]} style={{ padding: '100px 24px', borderTop: `1px solid ${BORDER_DIM}`, background: idx % 2 === 0 ? BG : SURFACE }}>
          <div className="lp-two-col lp-feature-row" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center', direction: flip ? 'rtl' : 'ltr' }}>
            <div style={{ direction: 'ltr' }}>
              <span style={{ color: T, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{tag}</span>
              <h2 style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.1rem)', fontWeight: 800, margin: '12px 0 20px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{headline}</h2>
              <p style={{ color: TEXT_MUTED, fontSize: 16, lineHeight: 1.75, margin: '0 0 28px' }}>{body}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bullets.map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircle size={15} color={T} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ color: '#C8D6E5', fontSize: 14, lineHeight: 1.5 }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ direction: 'ltr' }}>
              <FeatureIllo type={illo} />
            </div>
          </div>
        </section>
      ))}

      {/* ── STATS BAR ── */}
      <section style={{ padding: '72px 24px', background: CARD, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40 }}>
          {STATS.map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: T, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{value}</p>
              <p style={{ color: TEXT_MUTED, fontSize: 14, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section style={{ padding: '100px 24px', background: BG, borderTop: `1px solid ${BORDER_DIM}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto 56px' }}>
            <p style={{ color: T, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Who it's for</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Built for teams that run the show</h2>
          </div>

          {/* Persona tabs */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
            {PERSONAS.map(({ label }, i) => (
              <button key={label} onClick={() => setActivePersona(i)} style={{ padding: '10px 20px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${activePersona === i ? BORDER : BORDER_DIM}`, background: activePersona === i ? 'rgba(31,184,160,0.1)' : 'transparent', color: activePersona === i ? T : TEXT_MUTED }}>
                {label}
              </button>
            ))}
          </div>

          {/* Active persona panel */}
          <div style={{ maxWidth: 640, margin: '0 auto', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 36 }}>
            {(() => {
              const p = PERSONAS[activePersona];
              const Icon = p.icon;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${T}12`, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} color={T} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{p.label}</h3>
                  </div>
                  <div className="lp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {p.points.map(pt => (
                      <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER_DIM}` }}>
                        <CheckCircle size={13} color={T} style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ color: '#C8D6E5', fontSize: 13, lineHeight: 1.5 }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ── VS OLD WAY ── */}
      <section style={{ padding: '100px 24px', background: SURFACE, borderTop: `1px solid ${BORDER_DIM}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: T, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Why Port 24</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>How it compares</h2>
          </div>
          <div className="lp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Old way */}
            <div style={{ background: CARD, border: '1px solid rgba(239,68,68,0.15)', borderRadius: 16, padding: 28 }}>
              <p style={{ color: '#EF4444', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>The old way</p>
              {[
                'Inventory tracked in spreadsheets',
                'Crew confirmed over text & email',
                'Quotes built in Word or Excel',
                'P&L assembled from receipts weeks later',
                'Show status guessed from memory',
                'Three different tools, none connected',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <span style={{ color: '#EF4444', fontSize: 14, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>✕</span>
                  <span style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            {/* Port 24 */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
              <p style={{ color: T, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>Port 24</p>
              {[
                'Every asset tracked, scanned, and located in real time',
                'Crew confirmed digitally with one-click call sheets',
                'Professional branded quotes in minutes',
                'Live P&L visible from day one of the show',
                'Show status visible to the whole team, always',
                'One platform — inventory, crew, and finance unified',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <CheckCircle size={14} color={T} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: '#C8D6E5', fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '120px 24px', background: BG, borderTop: `1px solid ${BORDER_DIM}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(31,184,160,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Port24Mark size={40} />
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, margin: '24px 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Ready to run tighter productions?
          </h2>
          <p style={{ color: TEXT_MUTED, fontSize: 17, lineHeight: 1.7, margin: '0 0 40px' }}>
            Join production companies using Port 24 to track every asset, book every crew member, and know their margins before the truck leaves the dock.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={goTrial} style={{ display: 'flex', alignItems: 'center', gap: 8, background: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, padding: '16px 32px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = T_DIM}
              onMouseLeave={e => e.currentTarget.style.background = T}>
              Start Free Trial <ArrowRight size={16} />
            </button>
            <button onClick={goSignIn} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#fff', border: `1px solid ${BORDER_DIM}`, borderRadius: 12, fontWeight: 600, fontSize: 16, padding: '16px 32px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER_DIM; e.currentTarget.style.background = 'transparent'; }}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '48px 24px 32px', borderTop: `1px solid ${BORDER_DIM}`, background: SURFACE }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Port24Mark size={20} />
              <span style={{ letterSpacing: '0.16em', fontWeight: 800, fontSize: '0.72rem', color: '#3DC9C0' }}>PORT <span style={{ color: T }}>24</span></span>
            </div>
            <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0 }}>The all-in-one platform for live production.</p>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <a href="mailto:support@port24av.com" style={{ color: TEXT_DIM, fontSize: 13, textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = TEXT_MUTED}
                onMouseLeave={e => e.target.style.color = TEXT_DIM}>support@port24av.com</a>
              <button onClick={goSignIn} style={{ color: TEXT_DIM, background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={e => e.target.style.color = TEXT_MUTED}
                onMouseLeave={e => e.target.style.color = TEXT_DIM}>Sign In</button>
            </div>
          </div>
          {/* Legal row */}
          <div style={{ borderTop: `1px solid ${BORDER_DIM}`, paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: TEXT_DIM, fontSize: 11, margin: 0 }}>
              &copy; {new Date().getFullYear()} Port 24. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: 20 }}>
              <Link to="/privacy" style={{ color: TEXT_DIM, fontSize: 11, textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = TEXT_MUTED}
                onMouseLeave={e => e.target.style.color = TEXT_DIM}>Privacy Policy</Link>
              <Link to="/terms" style={{ color: TEXT_DIM, fontSize: 11, textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = TEXT_MUTED}
                onMouseLeave={e => e.target.style.color = TEXT_DIM}>Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 860px) {
          .lp-two-col { grid-template-columns: minmax(0, 1fr) !important; gap: 40px !important; }
          .lp-feature-row { direction: ltr !important; }
          .lp-float-l { left: 8px !important; }
          .lp-float-r { right: 8px !important; }
        }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
