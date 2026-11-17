import React from 'react';
const q = new URLSearchParams(window.location.search);
const ORGS = { A: { id: 'org-A', name: 'Harness AV' }, B: { id: 'org-B', name: 'Other Company' } };
const orgKey = () => (sessionStorage.getItem('h_org') || q.get('org') || 'A');
export const setHarnessOrg = (k) => { sessionStorage.setItem('h_org', k); };
export const useAuth = () => {
  const o = ORGS[orgKey()];
  const role = q.get('role') || 'admin';
  return {
    orgId: o.id, organization: { id: o.id, name: o.name, plan: 'pro' },
    userRecord: { id: 'u1', email: 'tester@example.com', role },
    user: { id: 'u1', email: 'tester@example.com' },
    companyMemberships: [{ org_id: 'org-A', organizations: ORGS.A }, { org_id: 'org-B', organizations: ORGS.B }],
    logout: () => {}, isAuthenticated: true, isPlatformAdmin: false,
  };
};
export const AuthProvider = ({ children }) => children;
