import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Cpu, Network, Layers, ShieldCheck, Mail, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function Port24BracketIcon() {
  return <img src="/port24-logo.svg" alt="Port 24" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />;
}

function Port24Wordmark() {
  return (
    <div className="flex items-center">
      <img src="/port24-logo.svg" alt="Port 24" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
    </div>
  );
}

const T = '#1FB8A0';
const T_DIM = '#17907C';
const C = '#3DC9C0';
const BG = '#0E1117';
const CARD = '#131920';
const CARD2 = '#0B0F18';
const BORDER = 'rgba(31,184,160,0.15)';
const BORDER_DIM = 'rgba(255,255,255,0.06)';
const TEXT_MUTED = '#7B8EA8';

const FEATURES = [
  { icon: Cpu, label: 'Mission Control', desc: 'Live ops dashboard across all active shows' },
  { icon: Network, label: 'Crew & Gear', desc: 'Bookings, inventory, and logistics in one place' },
  { icon: Layers, label: 'Quotes to Invoices', desc: 'Full production document workflow built in' },
];

const OTP_LENGTH = 6;

function VerifyModal({ email, password, onClose, onVerified }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Auto-focus first cell when modal opens
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const otpCode = digits.join('');

  const focusCell = (idx) => {
    if (idx >= 0 && idx < OTP_LENGTH) inputRefs.current[idx]?.focus();
  };

  const handleCellChange = (idx, val) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError('');
    if (char && idx < OTP_LENGTH - 1) focusCell(idx + 1);
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      } else {
        focusCell(idx - 1);
      }
    } else if (e.key === 'ArrowLeft') focusCell(idx - 1);
    else if (e.key === 'ArrowRight') focusCell(idx + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    focusCell(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (otpCode.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
      if (verifyErr) throw verifyErr;
      setSuccess(true);
      setTimeout(() => onVerified(), 1000);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('expired')) setError('This code has expired. Use "Resend Code" to get a new one.');
      else if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong')) setError('Incorrect code. Double-check and try again.');
      else if (msg.includes('already') || msg.includes('verified')) {
        setSuccess(true);
        setTimeout(() => onVerified(), 1000);
      } else setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email });
      if (resendErr) throw resendErr;
      setResendMsg('A new code was sent to your email.');
      setCooldown(60);
      setDigits(Array(OTP_LENGTH).fill(''));
      focusCell(0);
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-8"
        style={{ backgroundColor: CARD, border: `1px solid rgba(31,184,160,0.2)`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: TEXT_MUTED }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(31,184,160,0.12)', border: `1px solid rgba(31,184,160,0.25)` }}>
              <ShieldCheck className="w-7 h-7" style={{ color: T }} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Email verified!</h3>
            <p className="text-sm" style={{ color: TEXT_MUTED }}>
              {password ? 'Signing you in…' : 'Redirecting to sign in…'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(31,184,160,0.1)', border: `1px solid rgba(31,184,160,0.2)` }}>
                <Mail className="w-5 h-5" style={{ color: T }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Verify your email</h3>
                <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
                  Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify}>
              {/* OTP cells */}
              <div className="flex gap-2 justify-between mb-5">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleCellChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl outline-none transition-all"
                    style={{
                      width: '44px', height: '52px',
                      backgroundColor: CARD2,
                      border: `1.5px solid rgba(255,255,255,0.08)`,
                      color: '#fff',
                      caretColor: T,
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(31,184,160,0.4)'; e.target.style.boxShadow = `0 0 0 3px rgba(31,184,160,0.1)`; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                ))}
              </div>

              {/* Single-field paste fallback */}
              <div className="mb-5">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Or paste full code here: 123456"
                  maxLength={6}
                  value={digits.every(d => d === '') ? '' : otpCode}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
                    const next = Array(OTP_LENGTH).fill('');
                    val.split('').forEach((c, i) => { next[i] = c; });
                    setDigits(next);
                    setError('');
                  }}
                  onPaste={handlePaste}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all text-center font-mono tracking-widest"
                  style={{
                    backgroundColor: CARD2,
                    border: `1px solid rgba(255,255,255,0.06)`,
                    color: '#fff',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(31,184,160,0.3)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                />
                <p className="text-xs mt-1 text-center" style={{ color: TEXT_MUTED }}>Paste your 6-digit code in either field</p>
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2.5 text-xs mb-4"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                  {error}
                </div>
              )}
              {resendMsg && (
                <div className="rounded-lg px-3 py-2.5 text-xs mb-4"
                  style={{ backgroundColor: 'rgba(31,184,160,0.08)', border: `1px solid rgba(31,184,160,0.2)`, color: T }}>
                  {resendMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={verifying || otpCode.length < OTP_LENGTH}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 mb-3"
                style={{ backgroundColor: T, color: BG, boxShadow: '0 4px 16px rgba(31,184,160,0.25)' }}
                onMouseEnter={e => !verifying && (e.currentTarget.style.backgroundColor = T_DIM)}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
              >
                {verifying ? 'Verifying…' : <><ShieldCheck className="w-4 h-4" /> Verify Email</>}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2">
              <span className="text-xs" style={{ color: TEXT_MUTED }}>Didn't get a code?</span>
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50"
                style={{ color: cooldown > 0 ? TEXT_MUTED : T }}
              >
                <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const SLIDES = [
  {
    tag: 'Mission Control',
    headline: 'Every active show, one screen.',
    body: 'See gear fill, crew status, and show health across all live projects simultaneously. Most platforms make you dig through menus — Port 24 puts it all on one dashboard.',
    badge: 'vs. spreadsheets & disconnected tools',
    screen: ({ T, SURFACE, CARD, BORDER_DIM, TEXT_MUTED }) => (
      <div style={{ background: CARD, border: '1px solid rgba(31,184,160,0.15)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER_DIM}`, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.5 }} />)}
          <span style={{ marginLeft: 8, fontSize: 10, color: TEXT_MUTED }}>Mission Control</span>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[{ l: 'Total Assets', v: '830', c: T }, { l: 'On Show', v: '9', c: '#F59E0B' }, { l: 'Available', v: '820', c: '#10B981' }].map(({ l, v, c }) => (
              <div key={l} style={{ background: SURFACE, borderRadius: 8, padding: '8px 10px', border: `1px solid ${BORDER_DIM}` }}>
                <p style={{ color: c, fontSize: 16, fontWeight: 700, margin: 0 }}>{v}</p>
                <p style={{ color: TEXT_MUTED, fontSize: 9, margin: '2px 0 0' }}>{l}</p>
              </div>
            ))}
          </div>
          {[
            { name: 'Cisco Keynote 2025', status: 'On Location', color: T, fill: 82 },
            { name: 'NFL Draft Experience', status: 'Picking', color: '#F59E0B', fill: 44 },
            { name: 'AWS re:Invent', status: 'Confirmed', color: '#818CF8', fill: 10 },
          ].map((s, i) => (
            <div key={i} style={{ background: SURFACE, borderRadius: 8, padding: '9px 12px', border: `1px solid ${BORDER_DIM}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: s.color, fontSize: 9, fontWeight: 600, background: `${s.color}18`, borderRadius: 10, padding: '2px 7px' }}>{s.status}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${s.fill}%`, background: s.color, borderRadius: 2, opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: 'Inventory & Scanning',
    headline: 'Know where every piece of gear is. Right now.',
    body: 'Scan assets in and out with any phone. Real-time status from warehouse to show floor to return. Conflict alerts fire before you double-book. No more "where\'s the X32?"',
    badge: 'vs. Excel inventory sheets',
    screen: ({ T, SURFACE, CARD, BORDER_DIM, TEXT_MUTED }) => (
      <div style={{ background: CARD, border: '1px solid rgba(31,184,160,0.15)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER_DIM}`, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.5 }} />)}
          <span style={{ marginLeft: 8, fontSize: 10, color: TEXT_MUTED }}>Assets</span>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { name: 'ETC Ion Xe 20', sn: 'ETC-8823', status: 'In Warehouse', color: T },
            { name: 'Shure AD4D Wireless', sn: 'SHR-1142', status: 'On Show', color: '#F59E0B' },
            { name: 'Barco E2 Screen Mgr', sn: 'BAR-0095', status: 'In Transit', color: '#818CF8' },
            { name: 'Sennheiser G4 IEM ×4', sn: 'SEN-3309', status: 'In Warehouse', color: T },
            { name: 'QSC K10.2 ×2', sn: 'QSC-0041', status: 'On Show', color: '#F59E0B' },
          ].map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: SURFACE, borderRadius: 8, padding: '8px 12px', border: `1px solid ${BORDER_DIM}` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</p>
                <p style={{ color: TEXT_MUTED, fontSize: 9, margin: 0 }}>{a.sn}</p>
              </div>
              <span style={{ color: a.color, fontSize: 9, fontWeight: 600, flexShrink: 0 }}>{a.status}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(31,184,160,0.06)', border: '1px solid rgba(31,184,160,0.2)', borderRadius: 8, padding: '8px 12px', marginTop: 2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
            <span style={{ color: T, fontSize: 10, fontWeight: 600 }}>Shure AD4D → Checked Out to NFL Draft</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    tag: 'Crew Management',
    headline: 'Confirm your crew in minutes, not a week.',
    body: 'See your entire roster\'s availability before you make a single call. Send digital call sheets, collect confirmations, handle transport — all tracked. No more group texts.',
    badge: 'vs. texting crew one by one',
    screen: ({ T, SURFACE, CARD, BORDER_DIM, TEXT_MUTED }) => (
      <div style={{ background: CARD, border: '1px solid rgba(31,184,160,0.15)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER_DIM}`, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.5 }} />)}
          <span style={{ marginLeft: 8, fontSize: 10, color: TEXT_MUTED }}>NFL Draft — Call Sheet</span>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { name: 'Marcus Webb', role: 'A1 — Audio Lead', avail: 'Confirmed', color: T },
            { name: 'Priya Sánchez', role: 'Video Director', avail: 'Confirmed', color: T },
            { name: 'Tyler Knox', role: 'LED Tech', avail: 'Pending', color: '#F59E0B' },
            { name: 'Dana Osei', role: 'Broadcast Eng.', avail: 'Confirmed', color: T },
            { name: 'Lena Cho', role: 'Stage Manager', avail: 'Confirmed', color: T },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: SURFACE, borderRadius: 8, padding: '8px 12px', border: `1px solid ${BORDER_DIM}` }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: c.color, flexShrink: 0 }}>
                {c.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontSize: 11, fontWeight: 600, margin: 0 }}>{c.name}</p>
                <p style={{ color: TEXT_MUTED, fontSize: 9, margin: 0 }}>{c.role}</p>
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: c.color, background: `${c.color}18`, borderRadius: 10, padding: '2px 7px' }}>{c.avail}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: 'Quotes & Invoices',
    headline: 'Send a quote before they call the next vendor.',
    body: 'Build itemized quotes from your live inventory. Apply your branding, set margins, get digital sign-off. One click to convert to an invoice. No spreadsheets, no PDFs cobbled together in Word.',
    badge: 'vs. Word docs & emailed PDFs',
    screen: ({ T, SURFACE, CARD, BORDER_DIM, TEXT_MUTED }) => (
      <div style={{ background: CARD, border: '1px solid rgba(31,184,160,0.15)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER_DIM}`, padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.5 }} />)}
            <span style={{ marginLeft: 8, fontSize: 10, color: TEXT_MUTED }}>Quote #2041</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', borderRadius: 10, padding: '2px 8px' }}>Signed</span>
        </div>
        <div style={{ padding: 14 }}>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>AWS re:Invent Pre-Show</p>
          <p style={{ color: TEXT_MUTED, fontSize: 10, margin: '0 0 12px' }}>Venetian Expo · Jun 28, 2025</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: `1px solid ${BORDER_DIM}`, paddingTop: 10 }}>
            {[
              { item: 'LED Wall — 20×12ft', total: '$12,400' },
              { item: 'Broadcast Audio Package', total: '$8,200' },
              { item: 'Video Switching — Barco E2', total: '$6,800' },
              { item: 'Crew (8 persons, 2 days)', total: '$11,200' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: TEXT_MUTED }}>{r.item}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{r.total}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${BORDER_DIM}`, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: TEXT_MUTED, fontSize: 12 }}>Total</span>
            <span style={{ color: T, fontSize: 20, fontWeight: 800 }}>$38,600</span>
          </div>
          <div style={{ marginTop: 10, background: 'rgba(31,184,160,0.06)', border: '1px solid rgba(31,184,160,0.2)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <span style={{ color: T, fontSize: 10, fontWeight: 700 }}>✓ Client signed digitally · Jun 3, 2025</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    tag: 'Show Financials',
    headline: 'Know your margin before the truck leaves.',
    body: 'Every cost — gear, crew, subrental, travel — rolls up against your quoted revenue in real time. See which shows are profitable and why. No waiting until accounting catches up.',
    badge: 'vs. finding out weeks later',
    screen: ({ T, SURFACE, CARD, BORDER_DIM, TEXT_MUTED }) => (
      <div style={{ background: CARD, border: '1px solid rgba(31,184,160,0.15)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER_DIM}`, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.5 }} />)}
          <span style={{ marginLeft: 8, fontSize: 10, color: TEXT_MUTED }}>Show P&L — Q2 2025</span>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Revenue', value: '$312,400', color: T },
              { label: 'Direct Costs', value: '$187,200', color: '#818CF8' },
              { label: 'Gross Margin', value: '40.1%', color: '#10B981' },
              { label: 'Open Invoices', value: '$48,200', color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: SURFACE, borderRadius: 8, padding: '8px 10px', border: `1px solid ${BORDER_DIM}` }}>
                <p style={{ color: TEXT_MUTED, fontSize: 9, margin: '0 0 3px' }}>{label}</p>
                <p style={{ color, fontSize: 15, fontWeight: 700, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p style={{ color: TEXT_MUTED, fontSize: 9, margin: '0 0 6px' }}>Revenue by week</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 52 }}>
              {[28, 52, 41, 68, 79, 57, 90].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 6 ? T : `${T}28`, borderRadius: '3px 3px 0 0', transition: 'all 0.3s' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { show: 'Cisco Keynote', margin: '52%', color: '#10B981' },
              { show: 'NFL Draft', margin: '38%', color: T },
              { show: 'AWS re:Invent', margin: '29%', color: '#F59E0B' },
            ].map(({ show, margin, color }) => (
              <div key={show} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: TEXT_MUTED, fontSize: 10, flex: 1 }}>{show}</span>
                <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: margin, background: color, borderRadius: 2 }} />
                </div>
                <span style={{ color, fontSize: 10, fontWeight: 700, width: 32, textAlign: 'right' }}>{margin}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef(null);

  const goTo = (idx, dir = 1) => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setActive(idx);
      setAnimating(false);
    }, 280);
  };

  const next = () => goTo((active + 1) % SLIDES.length, 1);
  const prev = () => goTo((active - 1 + SLIDES.length) % SLIDES.length, -1);

  useEffect(() => {
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [active]);

  const slide = SLIDES[active];
  const colors = { T, SURFACE: '#0D1219', CARD: '#111820', BORDER_DIM: 'rgba(255,255,255,0.06)', TEXT_MUTED: '#6B7A92' };

  return (
    <div
      className="hidden lg:flex flex-col w-[55%] flex-shrink-0 relative overflow-hidden"
      style={{ background: '#070B11' }}
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={() => { timerRef.current = setInterval(next, 5000); }}
    >
      {/* Grid texture */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ssgrid" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#1FB8A0" strokeWidth="0.6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ssgrid)" />
      </svg>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 55% 45%, rgba(31,184,160,0.08) 0%, transparent 65%)' }} />

      {/* Content */}
      <div className="relative flex-1 flex flex-col justify-between p-10">

        {/* Top: feature tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: T, flexShrink: 0 }} />
          <span style={{ color: T, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {slide.tag}
          </span>
        </div>

        {/* Middle: screen mockup */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            paddingTop: 24,
            paddingBottom: 24,
            opacity: animating ? 0 : 1,
            transform: animating ? `translateY(${direction * 12}px)` : 'translateY(0)',
            transition: 'opacity 0.28s ease, transform 0.28s ease',
          }}
        >
          <div style={{ width: '100%', maxWidth: 380 }}>
            {slide.screen(colors)}
          </div>
        </div>

        {/* Bottom: text + controls */}
        <div>
          {/* Competitor badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 20, padding: '4px 12px', marginBottom: 14 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {slide.badge}
            </span>
          </div>

          <div
            style={{
              opacity: animating ? 0 : 1,
              transform: animating ? `translateY(${direction * 8}px)` : 'translateY(0)',
              transition: 'opacity 0.28s ease, transform 0.28s ease',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              {slide.headline}
            </h2>
            <p style={{ color: '#6B7A92', fontSize: 13, lineHeight: 1.65, margin: '0 0 24px' }}>
              {slide.body}
            </p>
          </div>

          {/* Dot nav + arrows */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > active ? 1 : -1)}
                  style={{
                    width: i === active ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === active ? T : 'rgba(255,255,255,0.15)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={prev} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>‹</button>
              <button onClick={next} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Look up the admin contact email for a given user email (by domain match)
async function findAdminContact(userEmail) {
  const domain = userEmail?.split('@')[1];
  if (!domain) return null;
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('role', 'admin')
    .ilike('email', `%@${domain}`)
    .limit(1)
    .single();
  return data?.email ?? null;
}

function NoAccountModal({ userEmail, onClose }) {
  const [adminEmail, setAdminEmail] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    findAdminContact(userEmail).then(e => { setAdminEmail(e); setChecking(false); });
  }, [userEmail]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="rounded-2xl p-8 w-full max-w-sm text-center border" style={{ backgroundColor: '#0D1219', borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Account Found</h2>
        <p className="text-sm mb-6" style={{ color: '#6B7A92' }}>
          <span className="text-white font-medium">{userEmail}</span> isn't registered in Port 24.
          Access is by invite only — contact your company administrator to get set up.
        </p>

        {checking ? (
          <p className="text-xs mb-6" style={{ color: '#6B7A92' }}>Looking up your company admin…</p>
        ) : adminEmail ? (
          <a
            href={`mailto:${adminEmail}?subject=Port 24 Access Request&body=Hi, I'm trying to sign in to Port 24 with ${userEmail} but don't have an account yet. Can you send me an invite?`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm mb-4 transition-colors"
            style={{ backgroundColor: T, color: '#070B11' }}
          >
            Email {adminEmail}
          </a>
        ) : (
          <p className="text-xs mb-6 px-2" style={{ color: '#6B7A92' }}>
            No admin found for your domain. Ask your company to contact Port 24 support.
          </p>
        )}

        <button onClick={onClose} className="text-xs" style={{ color: '#374151' }}>
          ← Back to sign in
        </button>
      </div>
    </div>
  );
}

export default function SignIn() {
  // email/password are uncontrolled — refs read the actual DOM value at submit time,
  // which correctly captures browser autofill that controlled inputs would override.
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [noAccountEmail, setNoAccountEmail] = useState(null);
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const justVerified = urlParams.get('verified') === '1';

  useEffect(() => {
    const init = async () => {
      // If returning from a failed OAuth (Supabase puts error in URL hash), do NOT auto-redirect
      const hash = window.location.hash;
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const desc = params.get('error_description') || params.get('error') || 'Google sign-in failed.';
        setError(decodeURIComponent(desc.replace(/\+/g, ' ')));
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }

      // Show any error stored by a previous failed loadProfile attempt
      try {
        const steps = JSON.parse(localStorage.getItem('port24_auth_steps') || '[]');
        localStorage.removeItem('port24_auth_steps');
        const dbg = localStorage.getItem('port24_auth_debug');
        localStorage.removeItem('port24_auth_debug');
        if (dbg) {
          const e = JSON.parse(dbg);
          if (Date.now() - e.ts < 120_000) {
            const stepStr = steps.length ? `\nSteps: ${steps.join(' → ')}` : '';
            setError(`Auth error: ${e.msg || 'unknown'}${stepStr}`);
          }
        } else if (steps.length) {
          setError(`Auth trace (no error captured): ${steps.join(' → ')}`);
        }
      } catch {}

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Existing valid session — let AuthContext handle validation, just navigate
      navigate('/dashboard');
    };
    init();

    return () => {};
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const actualEmail = emailRef.current?.value?.trim() || '';
    const actualPassword = passwordRef.current?.value || '';
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: actualEmail, password: actualPassword });
      if (signInErr) throw signInErr;
      // SPA navigation — keeps the Supabase session in memory without needing localStorage.
      const pendingToken = sessionStorage.getItem('pending_invite_token');
      if (pendingToken) {
        const invitePath = sessionStorage.getItem('pending_invite_path') || '/accept-invite';
        sessionStorage.removeItem('pending_invite_path');
        navigate(`${invitePath}?token=${pendingToken}`, { replace: true });
        return;
      }
      navigate('/dashboard', { replace: true });
      return;
    } catch (err) {
      setLoading(false);
      const msg = (err?.message || '').toLowerCase();
      // Always show a static message for credential failures — never leak raw Supabase
      // error text that could reveal whether an email exists (user enumeration).
      if (msg.includes('email not confirmed')) {
        setShowVerifyModal(true);
        return;
      }
      setError('Invalid email or password. Please try again.');
    }
  };

  // Called by VerifyModal after successful verification + auto-login
  const handleVerified = () => {
    const pendingToken = sessionStorage.getItem('pending_invite_token');
    if (pendingToken) {
      const invitePath = sessionStorage.getItem('pending_invite_path') || '/accept-invite';
      sessionStorage.removeItem('pending_invite_path');
      window.location.href = `${invitePath}?token=${pendingToken}`;
      return;
    }
    window.location.href = '/dashboard';
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}
    >
      {/* No Account Modal */}
      {noAccountEmail && (
        <NoAccountModal userEmail={noAccountEmail} onClose={() => setNoAccountEmail(null)} />
      )}

      {/* Verify Email Modal */}
      {showVerifyModal && (
        <VerifyModal
          email={emailRef.current?.value?.trim() || ''}
          password={passwordRef.current?.value || ''}
          onClose={() => setShowVerifyModal(false)}
          onVerified={handleVerified}
        />
      )}

      {/* ── Left panel — form ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 relative z-10">

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-3xl"
            style={{ backgroundColor: 'rgba(31,184,160,0.04)' }}
          />
        </div>

        <div className="relative w-full max-w-sm">

          {/* Wordmark + back */}
          <div className="mb-12 flex items-center justify-between">
            <Port24Wordmark />
            <button
              type="button"
              onClick={() => navigate('/landing')}
              style={{ color: TEXT_MUTED, background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
            >
              ← Back
            </button>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Sign in to your workspace
            </h1>
            <p className="text-sm" style={{ color: TEXT_MUTED }}>
              Access your crew, gear, shows, and operations.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-opacity-40 outline-none transition-all"
                style={{
                  backgroundColor: CARD,
                  border: `1px solid ${BORDER_DIM}`,
                  color: '#fff',
                }}
                onFocus={e => e.target.style.borderColor = BORDER}
                onBlur={e => e.target.style.borderColor = BORDER_DIM}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: TEXT_MUTED }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs transition-colors"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={e => e.currentTarget.style.color = T}
                  onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                  style={{
                    backgroundColor: CARD,
                    border: `1px solid ${BORDER_DIM}`,
                    color: '#fff',
                  }}
                  onFocus={e => e.target.style.borderColor = BORDER}
                  onBlur={e => e.target.style.borderColor = BORDER_DIM}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Verified success banner */}
            {justVerified && (
              <div
                className="rounded-lg px-4 py-3 text-xs"
                style={{ backgroundColor: 'rgba(31,184,160,0.08)', border: '1px solid rgba(31,184,160,0.25)', color: '#1FB8A0' }}
              >
                ✓ Email verified! Sign in below to enter your workspace.
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-4 py-3 text-xs"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
              >
                {error}
                {emailRef.current?.value && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(239,68,68,0.2)' }}>
                    New user or need to verify?{' '}
                    <button
                      type="button"
                      onClick={() => { setError(''); setShowVerifyModal(true); }}
                      style={{ color: T, textDecoration: 'underline' }}
                    >
                      Enter verification code
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2 disabled:opacity-60"
              style={{
                backgroundColor: T,
                color: BG,
                boxShadow: '0 8px 32px rgba(31,184,160,0.2)',
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = T_DIM)}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
            >
              {loading ? 'Signing in...' : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: BORDER_DIM }} />
            <span className="text-xs" style={{ color: TEXT_MUTED }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: BORDER_DIM }} />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={async () => {
              // Sign out any stale session first so a failed OAuth doesn't auto-login the old account
              await supabase.auth.signOut();
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/signin` },
              });
            }}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: CARD,
              border: `1px solid ${BORDER_DIM}`,
              color: '#fff',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = BORDER_DIM}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Footer note */}
          <p className="text-xs mt-8 text-center" style={{ color: '#374151' }}>
            Don't have access?{' '}
            <a
              href="mailto:info@port24.io"
              style={{ color: T }}
              className="hover:underline"
            >
              Contact your administrator
            </a>
          </p>

          <p className="text-xs mt-4 text-center">
            <Link to="/platform/login" style={{ color: '#1e2a38', fontSize: 11 }} className="hover:opacity-60 transition-opacity">
              Platform Admin
            </Link>
          </p>
        </div>
      </div>

      <HeroSlideshow />
    </div>
  );
}