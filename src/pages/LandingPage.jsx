import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import HeroDemo from '@/components/landing/HeroDemo';
import Walkthrough from '@/components/landing/Walkthrough';
import '@/components/landing/landing.css';

function Port24Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0" />
      <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0" />
      <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0" />
      <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0" />
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goSignIn = () => navigate('/signin');
  const goTrial = () => {
    try { sessionStorage.setItem('port24_flow', 'trial'); } catch { /* storage can be blocked; the sign-in page still works */ }
    navigate('/signin');
  };

  // Invite links land on the landing page with ?token=; send them straight to the accept screen.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) navigate(`/accept-invite?token=${token}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lp">
      <a className="lp-skip" href="#main-content">Skip to content</a>

      <header className="lp-nav" data-scrolled={scrolled ? 'true' : 'false'}>
        <div className="lp-nav-inner">
          <Link to="/" className="lp-brand" aria-label="Port 24 home"><Port24Mark size={26} /><span>Port 24</span></Link>
          <nav className="lp-nav-links" aria-label="Primary">
            <a href="#walkthrough" className="lp-nav-link lp-nav-link--wide">Walkthrough</a>
            <button type="button" className="lp-nav-link" onClick={goSignIn}>Sign in</button>
            <button type="button" className="lp-nav-cta" onClick={goTrial}>Start free trial</button>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="lp-hero" aria-labelledby="lp-h1">
          <div className="lp-hero-inner">
            <div className="lp-hero-copy">
              <h1 id="lp-h1">From first quote to final return.</h1>
              <p className="lp-lede">Plan shows, assign gear by room, and run warehouse pick and return in one workspace.</p>
              <div className="lp-cta-row">
                <a className="lp-btn lp-btn--primary" href="#walkthrough">See Port 24 in action <ArrowRight size={16} aria-hidden="true" /></a>
                <button type="button" className="lp-btn lp-btn--ghost" onClick={goSignIn}>Sign in</button>
              </div>
            </div>
            <HeroDemo />
          </div>
        </section>

        <section id="walkthrough" className="lp-walk" aria-labelledby="lp-h2">
          <div className="lp-walk-inner">
            <h2 id="lp-h2">One job, from the quote to the last case back.</h2>
            <Walkthrough />
          </div>
        </section>

        <section className="lp-close" aria-labelledby="lp-h3">
          <div className="lp-close-inner">
            <Port24Mark size={36} />
            <h2 id="lp-h3">Run your next show in Port 24.</h2>
            <div className="lp-cta-row lp-cta-row--center">
              <button type="button" className="lp-btn lp-btn--primary" onClick={goTrial}>Start free trial <ArrowRight size={16} aria-hidden="true" /></button>
              <button type="button" className="lp-btn lp-btn--ghost" onClick={goSignIn}>Sign in</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-foot-inner">
          <div className="lp-foot-brand"><Port24Mark size={20} /><span>Port 24</span></div>
          <p className="lp-foot-line">The all-in-one platform for live production.</p>
          <nav className="lp-foot-links" aria-label="Footer">
            <a href="mailto:support@port24av.com">support@port24av.com</a>
            <button type="button" onClick={goSignIn}>Sign in</button>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </nav>
          <p className="lp-foot-copy">&copy; {new Date().getFullYear()} Port 24. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
