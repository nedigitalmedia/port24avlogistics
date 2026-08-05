import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Loader2, Building2, LogIn } from 'lucide-react';

const T = '#1FB8A0';
const BG = '#0E1117';
const CARD = '#131920';
const CARD2 = '#0B0F18';
const BORDER = 'rgba(31,184,160,0.2)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#7B8EA8';

function Port24Logo() {
  return <img src="/port24-logo.svg" alt="Port 24" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />;
}

// Phases:
// checking      — loading invite + session
// needs_auth    — not authenticated, show options
// creating      — new account password form
// mismatch      — authenticated with wrong email
// claiming      — auto-claiming (authenticated + email matches)
// success       — claimed, redirecting
// error         — invalid/expired invite

async function loadInvite(token) {
  const { data, error } = await supabase
    .from('pending_invites')
    .select('*, organizations(name, plan)')
    .eq('token', token)
    .single();
  if (error || !data) throw new Error('Invite not found. It may have already been used or the link is incorrect.');
  // 'accepted' is allowed here — the component may remount after auth state settles and the
  // edge function handles already-accepted invites idempotently (ensures users row + membership).
  if (data.status !== 'pending' && data.status !== 'accepted') throw new Error(`This invite has already been ${data.status}.`);
  if (new Date(data.expires_at) < new Date()) throw new Error('This invite link has expired. Ask your Port 24 account manager for a new one.');
  if (data.invite_type !== 'company_owner' && data.invite_type !== 'company_admin') {
    throw new Error('This invite link is not valid for company setup. Check that you followed the correct link from your email.');
  }
  return data;
}

async function claimInvite(token, fullName) {
  const { data, error } = await supabase.functions.invoke('claim-invite', {
    body: { token, full_name: fullName },
  });
  if (error) {
    let msg = error.message;
    try { const b = await error.context?.json(); msg = b?.error || msg; } catch {}
    // OAuth flow may have already claimed via AuthContext step 3 — treat as success
    if (msg.toLowerCase().includes('already accepted') || msg.toLowerCase().includes('already claimed')) return { ok: true };
    throw new Error(msg);
  }
  if (data?.error) {
    if (data.error.toLowerCase().includes('already accepted') || data.error.toLowerCase().includes('already claimed')) return { ok: true };
    throw new Error(data.error);
  }
  return data;
}

export default function AcceptCompanyInvite() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [phase, setPhase] = useState('checking');
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [authedUser, setAuthedUser] = useState(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError('No invite token found. Check the link you were sent.');
      setPhase('error');
      return;
    }

    let cancelled = false;

    async function init() {
      const inv = await loadInvite(token);
      if (cancelled) return;
      setInvite(inv);
      setFullName(inv.full_name || '');

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        sessionStorage.setItem('pending_invite_token', token);
        sessionStorage.setItem('pending_invite_path', '/accept-company-invite');
        setPhase('needs_auth');
        return;
      }

      const userEmail = session.user.email?.toLowerCase().trim();
      const inviteEmail = inv.email?.toLowerCase().trim();

      if (userEmail !== inviteEmail) {
        setAuthedUser(session.user);
        setPhase('mismatch');
        return;
      }

      // Email matches — auto-claim
      setPhase('claiming');
      await claimInvite(token, session.user.user_metadata?.full_name || inv.full_name || '');

      // Verify the membership actually landed before redirecting — the hard
      // reload below re-runs AuthContext's loadProfile from scratch, and if it
      // queries before this write is visible, it shows "No Workspace Access".
      let verified = false;
      for (let i = 0; i < 12; i++) {
        const { data: row } = await supabase
          .from('company_memberships')
          .select('org_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1);
        if (row?.length) { verified = true; break; }
        await new Promise(r => setTimeout(r, 400));
      }
      if (!verified) throw new Error('Account setup incomplete. Please refresh and try again.');

      sessionStorage.removeItem('pending_invite_token');
      sessionStorage.removeItem('pending_invite_path');
      setPhase('success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    }

    init().catch(err => {
      if (!cancelled) {
        setInviteError(err.message);
        setPhase('error');
        sessionStorage.removeItem('pending_invite_token');
        sessionStorage.removeItem('pending_invite_path');
      }
    });

    return () => { cancelled = true; };
  }, [token]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!fullName.trim()) return setFormError('Please enter your full name.');
    if (password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password)) return setFormError('Password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(password)) return setFormError('Password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(password)) return setFormError('Password must contain at least one number.');
    if (password !== confirmPassword) return setFormError('Passwords do not match.');

    setSubmitting(true);
    setPhase('claiming');
    try {
      // Call edge function with password — it creates the user server-side (auto-confirmed)
      // and claims the invite in one shot, so no separate signUp + email confirmation needed.
      const { data, error: fnError } = await supabase.functions.invoke('claim-invite', {
        body: { token, full_name: fullName, password },
      });

      if (fnError) {
        let errorCode = null;
        let msg = fnError.message;
        try {
          const b = await fnError.context?.json();
          errorCode = b?.error;
          msg = b?.message || b?.error || msg;
        } catch {}
        if (errorCode === 'user_exists') {
          setFormError('This email already has a Port 24 account. Please use Sign In instead.');
          setPhase('creating');
          return;
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      // Account created + invite claimed. Sign in now.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (signInErr) {
        // Rare — account was created but sign-in failed. User can sign in manually.
        setFormError(`Account created — please sign in with your new password.`);
        setPhase('creating');
        return;
      }

      sessionStorage.removeItem('pending_invite_token');
      sessionStorage.removeItem('pending_invite_path');
      window.location.href = '/dashboard';
    } catch (err) {
      setFormError(err.message);
      setPhase('creating');
    } finally {
      setSubmitting(false);
    }
  };

  const goToSignIn = () => {
    sessionStorage.setItem('pending_invite_token', token);
    sessionStorage.setItem('pending_invite_path', '/accept-company-invite');
    navigate('/signin');
  };

  // Sign up / sign in with Google, redirecting straight back to this same
  // invite link so the existing session-check logic above claims it —
  // works whether or not the Google account already has a Port 24 login.
  const handleGoogle = async () => {
    sessionStorage.setItem('pending_invite_token', token);
    sessionStorage.setItem('pending_invite_path', '/accept-company-invite');
    await supabase.auth.signOut();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/accept-company-invite?token=${token}` },
    });
  };


  // ── Company badge ──
  const CompanyBadge = () => invite ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${BORDER}`, backgroundColor: 'rgba(31,184,160,0.06)', borderRadius: 12, padding: '10px 14px', marginBottom: 28 }}>
      <Building2 style={{ color: T, width: 18, height: 18, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{invite.organizations?.name || 'Your Company'}</p>
        <p style={{ color: TEXT_MUTED, fontSize: 11, margin: 0 }}>Workspace Owner</p>
      </div>
    </div>
  ) : null;

  // ── Checking / Claiming ──
  if (phase === 'checking' || phase === 'claiming') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2 style={{ color: T, width: 32, height: 32 }} className="animate-spin" />
          <p style={{ color: TEXT_MUTED, fontSize: 14, margin: 0 }}>
            {phase === 'checking' ? 'Verifying your invite…' : 'Setting up your workspace…'}
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (phase === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <CheckCircle style={{ color: T, width: 44, height: 44 }} />
          <p style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Workspace Ready!</p>
          <p style={{ color: TEXT_MUTED, fontSize: 14, margin: 0 }}>Taking you to your Port 24 workspace…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 40, border: '1px solid rgba(239,68,68,0.2)', backgroundColor: CARD, textAlign: 'center' }}>
          <AlertCircle style={{ color: '#EF4444', width: 44, height: 44, margin: '0 auto 16px' }} />
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Invite Issue</h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{inviteError}</p>
          <button onClick={() => navigate('/signin')} style={{ width: '100%', padding: '12px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Email mismatch ──
  if (phase === 'mismatch') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 40, border: '1px solid rgba(245,158,11,0.2)', backgroundColor: CARD, textAlign: 'center' }}>
          <AlertCircle style={{ color: '#F59E0B', width: 44, height: 44, margin: '0 auto 16px' }} />
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Wrong Account</h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
            This invite was sent to <strong style={{ color: '#fff' }}>{invite?.email}</strong>.
          </p>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            You're signed in as <strong style={{ color: '#fff' }}>{authedUser?.email}</strong>. Sign out and use the invited email address.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              sessionStorage.setItem('pending_invite_token', token);
              sessionStorage.setItem('pending_invite_path', '/accept-company-invite');
              navigate('/signin');
            }}
            style={{ width: '100%', padding: '12px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
            Sign Out &amp; Use Correct Account
          </button>
        </div>
      </div>
    );
  }

  // ── needs_auth: show options ──
  if (phase === 'needs_auth') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}><Port24Logo /></div>
          <CompanyBadge />

          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Set Up Your Workspace</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            You've been invited to set up the <strong style={{ color: '#fff' }}>{invite?.organizations?.name}</strong> workspace on Port 24.
            Sign in or create your account to continue.
          </p>

          <button onClick={goToSignIn}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', backgroundColor: 'rgba(31,184,160,0.08)', border: `1px solid ${BORDER}`, borderRadius: 12, color: T, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            <LogIn style={{ width: 16, height: 16 }} />
            Sign In with Existing Account
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: BORDER_DIM }} />
            <span style={{ color: TEXT_MUTED, fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: BORDER_DIM }} />
          </div>

          <button onClick={handleGoogle}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: BORDER_DIM }} />
            <span style={{ color: TEXT_MUTED, fontSize: 12 }}>or create account with email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: BORDER_DIM }} />
          </div>

          <button onClick={() => setPhase('creating')}
            style={{ width: '100%', padding: '12px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Create New Account →
          </button>
        </div>
      </div>
    );
  }

  // ── creating: password form ──
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 32 }}><Port24Logo /></div>
        <CompanyBadge />

        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Create your account</h1>
        <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Set a password to finish setting up <strong style={{ color: '#fff' }}>{invite?.organizations?.name}</strong>.
        </p>

        {/* Locked email */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD2, border: `1px solid ${BORDER_DIM}`, borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
          <span style={{ color: TEXT_MUTED, fontSize: 12 }}>Email</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{invite?.email}</span>
        </div>

        <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Your Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus placeholder="Jane Smith"
              style={{ width: '100%', backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 8 characters"
                style={{ width: '100%', backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, borderRadius: 10, padding: '11px 40px 11px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 0 }}>
                {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat your password"
              style={{ width: '100%', backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {formError && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', color: '#F87171', fontSize: 13 }}>
              {formError}
            </div>
          )}

          <button type="submit" disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <><span>Accept Invite &amp; Set Up Account</span><ArrowRight style={{ width: 16, height: 16 }} /></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#374151' }}>
          Already have an account?{' '}
          <button onClick={goToSignIn} style={{ color: T, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
