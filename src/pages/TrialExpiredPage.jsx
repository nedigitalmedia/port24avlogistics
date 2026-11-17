import React from 'react';
import { useAuth } from '@/lib/AuthContext';

/**
 * Blocking popup shown to everyone in a company whose 72-hour trial has ended.
 * No way to dismiss it and use the app; the only options are to sign out or switch workspace.
 */
export default function TrialExpiredPage() {
  const { logout, organization, companyMemberships } = useAuth();
  const canSwitch = (companyMemberships?.length ?? 0) > 1;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'Inter, sans-serif',
        background: 'radial-gradient(900px 520px at 78% -8%, rgba(45,212,191,0.22), transparent 62%), linear-gradient(135deg, #06222d 0%, #0a4458 46%, #0c2d5a 100%)' }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="trial-ended-title"
        aria-describedby="trial-ended-desc"
        style={{ maxWidth: 440, width: '100%', textAlign: 'center', background: '#EEF5FB', color: '#0B1F2E', borderRadius: 20, padding: '2.25rem 2rem', boxShadow: '0 24px 60px -20px rgba(0,10,25,0.7)' }}
      >
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(15,157,138,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#0B7F70" strokeWidth={1.7} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 id="trial-ended-title" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.6rem' }}>Your trial has ended</h2>
        <p id="trial-ended-desc" style={{ color: '#4B6378', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 auto 1.75rem', maxWidth: 340 }}>
          {organization?.name ? <><strong style={{ color: '#0B1F2E' }}>{organization.name}</strong>&rsquo;s 72-hour trial is over. </> : null}
          Reach out to your rep if you still have any questions.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {canSwitch && (
            <a href="/workspace-picker" style={{ padding: '0.65rem 1.3rem', background: '#0F9D8A', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>
              Switch workspace
            </a>
          )}
          <button
            onClick={logout}
            style={{ padding: '0.65rem 1.3rem', background: canSwitch ? 'transparent' : '#0F9D8A', color: canSwitch ? '#0B1F2E' : '#fff', border: canSwitch ? '1px solid #B3C3D1' : 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
