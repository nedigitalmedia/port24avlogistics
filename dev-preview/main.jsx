import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import ROUTES from './routes.json';
import Dashboard from '@/pages/Dashboard';
import TrialExpiredPage from '@/pages/TrialExpiredPage';
import { usePlan } from '@/lib/usePlan';
import { useAuth } from '@/lib/AuthContext';
// mirrors the gate in App.jsx so the preview can show it
function TrialGate() { const { isTrialExpired, trialEndsAt } = usePlan(); const { isPlatformAdmin } = useAuth(); return <div data-trial-ends={trialEndsAt || ''}>{isTrialExpired && !isPlatformAdmin ? <TrialExpiredPage /> : <Dashboard />}</div>; }
const PAGES = import.meta.glob('../src/pages/*.jsx');
const lazyPage = (name) => React.lazy(PAGES[`../src/pages/${name}.jsx`]);
class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() { return this.state.err ? <div style={{ padding: 24, color: '#fca5a5' }}>Preview crashed on this page: {String(this.state.err.message).slice(0, 120)}</div> : this.props.children; }
}
import { setHarnessOrg } from './mockAuth';
import '@/index.css';
import './sweep.js';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
window.__qc = qc;
window.__setOrg = (k) => { setHarnessOrg(k); location.reload(); };
const Stub = ({ name }) => <div style={{ padding: 24 }}><h1>{name}</h1><Link to="/dashboard">Back</Link></div>;

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={qc}>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<TrialGate />} />
          <Route path="/dashboard" element={<TrialGate />} />
          {ROUTES.filter(([p]) => p !== '/dashboard').map(([p, c]) => {
            if (!PAGES[`../src/pages/${c}.jsx`]) return null;
            const C = lazyPage(c);
            return <Route key={p} path={p} element={<Boundary key={p}><React.Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}><C /></React.Suspense></Boundary>} />;
          })}
          <Route path="*" element={<Stub name="Other page" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
