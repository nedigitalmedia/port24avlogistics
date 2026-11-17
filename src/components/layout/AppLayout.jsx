import React, { useEffect } from 'react';
import { Outlet, useLocation, matchPath } from 'react-router-dom';
import { motion } from 'framer-motion';
import RouteGuard from './RouteGuard';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import BackButton from '@/components/shared/BackButton';
import AuthDebugPanel from '@/components/dev/AuthDebugPanel';
import './appShell.css';

const HOME_ROUTES = ['/', '/dashboard'];

// Pages that already render their own back link ("Back to Clients", "Templates", a header arrow…).
// The generic "Back" is hidden there so only one back button shows.
const OWN_BACK_ROUTES = [
  '/clients/:id', '/venues/:id', '/smart-builder', '/fulfillment-calibration',
  '/quote-template-builder', '/yearly-review/:id', '/qr-label-builder', '/truck-pack/:showId',
];

function BackButtonBar() {
  const location = useLocation();
  const isHome = HOME_ROUTES.includes(location.pathname);
  if (isHome) return null;
  if (OWN_BACK_ROUTES.some(pattern => matchPath({ path: pattern, end: true }, location.pathname))) return null;
  return <BackButton fallback="/" />;
}

export default function AppLayout() {
  // Lets portal-rendered dialogs/selects/menus (outside .p24-shell) use the same pale-panel tokens.
  useEffect(() => {
    document.body.classList.add('p24-app');
    return () => document.body.classList.remove('p24-app');
  }, []);
  return (
    <div className="p24-shell">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
      <main className="md:ml-60 min-h-screen transition-all duration-300">
        <div className="p-4 md:p-8">
          <BackButtonBar />
          <RouteGuard>
            <motion.div
              key={useLocation().pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </RouteGuard>
        </div>
      </main>
      <AuthDebugPanel />
    </div>
  );
}