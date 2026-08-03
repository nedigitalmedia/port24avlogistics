import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

const BG = '#070B11';
const CARD = '#0D1219';
const T = '#1FB8A0';
const T_DIM = '#17907C';
const BORDER = 'rgba(31,184,160,0.2)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#6B7A92';
const PLATFORM_ADMIN_EMAILS = ['port24avlogistics@gmail.com'];

function Port24Mark() {
  return <img src="/port24-logo.svg" alt="Port 24" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />;
}

export default function PlatformLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handles the return trip from Google OAuth — a full page redirect back to this
  // route, so (unlike the email path below) there's no in-memory navigate() to rely on.
  useEffect(() => {
    const init = async () => {
      const hash = window.location.hash;
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const desc = params.get('error_description') || params.get('error') || 'Google sign-in failed.';
        setError(decodeURIComponent(desc.replace(/\+/g, ' ')));
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const normalizedEmail = session.user.email?.toLowerCase();
      if (PLATFORM_ADMIN_EMAILS.includes(normalizedEmail)) {
        await supabase.from('users').upsert(
          { id: session.user.id, email: session.user.email, is_platform_admin: true, role: 'admin', org_id: null },
          { onConflict: 'id' }
        );
        sessionStorage.removeItem('port24_login_source');
        navigate('/platform', { replace: true });
        return;
      }

      const { data: profile } = await supabase.from('users').select('is_platform_admin').eq('id', session.user.id).single();
      if (profile?.is_platform_admin) {
        sessionStorage.removeItem('port24_login_source');
        navigate('/platform', { replace: true });
      } else {
        await supabase.auth.signOut();
        setError('Access denied. This portal is for Port 24 staff only.');
      }
    };
    init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    sessionStorage.setItem('port24_login_source', 'platform_admin');
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInErr) throw signInErr;

      const { data: { user } } = await supabase.auth.getUser();
      const normalizedEmail = user.email?.toLowerCase();

      // Hardcoded super-admins: ensure DB flag is set and org_id=null, then allow through
      if (PLATFORM_ADMIN_EMAILS.includes(normalizedEmail)) {
        await supabase.from('users').upsert(
          { id: user.id, email: user.email, is_platform_admin: true, role: 'admin', org_id: null },
          { onConflict: 'id' }
        );
        sessionStorage.removeItem('port24_login_source');
        navigate('/platform', { replace: true });
        return;
      }

      // Otherwise check DB
      const { data: profile } = await supabase.from('users').select('is_platform_admin').eq('id', user.id).single();
      if (!profile?.is_platform_admin) {
        await supabase.auth.signOut();
        throw new Error('Access denied. This portal is for Port 24 staff only.');
      }

      navigate('/platform', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[120px] opacity-20"
          style={{ backgroundColor: T }} />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Port24Mark />
          <div className="mt-3 text-center">
            <span style={{ letterSpacing: '0.18em', fontWeight: 800, fontSize: '0.75rem', color: '#3DC9C0' }}>
              PORT <span style={{ color: T }}>24</span>
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border" style={{ backgroundColor: CARD, borderColor: BORDER }}>

          {/* Internal badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-2 border rounded-full px-3 py-1.5" style={{ borderColor: BORDER, backgroundColor: 'rgba(31,184,160,0.08)' }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: T }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: T }}>Internal Access Only</span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-white text-center mb-1">Platform Admin</h1>
          <p className="text-sm text-center mb-7" style={{ color: TEXT_MUTED }}>Port 24 staff login</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@port24.com"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={{ backgroundColor: '#060A10', border: `1px solid ${BORDER_DIM}` }}
                onFocus={e => e.target.style.borderColor = BORDER}
                onBlur={e => e.target.style.borderColor = BORDER_DIM}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: TEXT_MUTED }}>Password</label>
                <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: TEXT_MUTED }}
                  onMouseEnter={e => e.currentTarget.style.color = T}
                  onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                  style={{ backgroundColor: '#060A10', border: `1px solid ${BORDER_DIM}` }}
                  onFocus={e => e.target.style.borderColor = BORDER}
                  onBlur={e => e.target.style.borderColor = BORDER_DIM}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_MUTED }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm mt-2 disabled:opacity-50 transition-colors"
              style={{ backgroundColor: T, color: BG }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = T_DIM)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = T)}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Access Platform</span><ArrowRight className="w-4 h-4" /></>}
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
              setError('');
              // Tag this login as platform_admin BEFORE the redirect so AuthContext knows,
              // on return, to skip company-membership routing entirely (see AuthContext.loadProfile).
              sessionStorage.setItem('port24_login_source', 'platform_admin');
              // Sign out any stale session first so a failed/cancelled OAuth doesn't auto-login the old account
              await supabase.auth.signOut();
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/platform/login` },
              });
            }}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: '#060A10',
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
        </div>

        {/* Back to main site */}
        <p className="text-center mt-6 text-xs" style={{ color: '#2D3748' }}>
          <button onClick={() => navigate('/signin')} className="hover:underline transition-colors" style={{ color: '#374151' }}
            onMouseEnter={e => e.currentTarget.style.color = TEXT_MUTED}
            onMouseLeave={e => e.currentTarget.style.color = '#374151'}>
            ← Back to company login
          </button>
        </p>

      </div>
    </div>
  );
}
