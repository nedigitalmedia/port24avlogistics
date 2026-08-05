import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, CalendarDays, ScanBarcode,
  Settings, Boxes, History, Menu, LogOut, Layers, Bell, TrendingUp, Upload, Users, DollarSign, Palette
} from 'lucide-react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

const navGroups = [
  {
    label: 'Operations',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/shows', icon: CalendarDays, label: 'Projects' },
      { path: '/scan', icon: ScanBarcode, label: 'Scan In/Out' },
      { path: '/crew', icon: Users, label: 'Crew Mode', external: true },
    ]
  },
  {
    label: 'Inventory',
    items: [
      { path: '/assets', icon: Package, label: 'Assets' },
      { path: '/kits', icon: Layers, label: 'Kits' },
      { path: '/categories', icon: Boxes, label: 'Categories' },
      { path: '/movements', icon: History, label: 'Movement Log' },
    ]
  },
  {
    label: 'Business',
    items: [
      { path: '/utilization', icon: TrendingUp, label: 'Utilization' },
      { path: '/alerts', icon: Bell, label: 'Alerts', badge: true },
    ]
  },
  {
    label: 'Finance',
    items: [
      { path: '/invoices', icon: DollarSign, label: 'Invoices' },
    ]
  },
  {
    label: 'Admin',
    items: [
      { path: '/import', icon: Upload, label: 'Import Inventory' },
      { path: '/branding', icon: Palette, label: 'Branding' },
      { path: '/admin', icon: Settings, label: 'Settings' },
    ]
  },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { orgId, organization } = useAuth();

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', orgId],
    queryFn: () => orgId ? db.entities.Alert.filter({ org_id: orgId }, '-created_date') : Promise.resolve([]),
    enabled: !!orgId,
  });
  const unreadAlerts = alerts.filter(a => !a.is_resolved && !a.is_read).length;

  const { data: brandList = [] } = useQuery({
    queryKey: ['brand', orgId],
    queryFn: () => orgId ? db.entities.BrandSettings.filter({ org_id: orgId }) : Promise.resolve([]),
    staleTime: 10 * 60 * 1000,
    enabled: !!orgId,
  });
  const brand = brandList[0] || {};
  const workspaceName = organization?.name || 'Port 24';

  return (
    <div className="sticky top-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        {brand.logo_url
          ? <img src={brand.logo_url} alt="Logo" className="w-7 h-7 rounded-lg object-contain shrink-0" />
          : (
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <ScanBarcode className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          )
        }
        <span className="font-bold text-sm tracking-wide text-sidebar-accent-foreground truncate">{workspaceName}</span>
      </div>
      <div className="flex items-center gap-2">
        {unreadAlerts > 0 && (
          <Link to="/alerts" onClick={() => setOpen(false)}>
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">{unreadAlerts}</Badge>
          </Link>
        )}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 text-sidebar-foreground"><Menu className="w-5 h-5" /></button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-sidebar border-sidebar-border w-64 p-0 overflow-y-auto">
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2 min-w-0">
                {brand.logo_url
                  ? <img src={brand.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain shrink-0" />
                  : (
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <ScanBarcode className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )
                }
                <span className="font-bold text-sm tracking-wide text-sidebar-accent-foreground truncate">{workspaceName}</span>
              </div>
            </div>
            <nav className="py-3 px-2">
              {navGroups.map(group => (
                <div key={group.label} className="mb-3">
                  <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 mb-1">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      const alertCount = item.badge ? unreadAlerts : 0;
                      const cls = cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full",
                        isActive ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent");
                      const inner = (
                        <>
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm font-medium flex-1">{item.label}</span>
                          {alertCount > 0 && <Badge className="h-4 px-1 text-xs bg-red-500/10 text-red-600 border-red-500/20">{alertCount}</Badge>}
                        </>
                      );
                      return item.external
                        ? <a key={item.path} href={item.path} className={cls} onClick={() => setOpen(false)}>{inner}</a>
                        : <Link key={item.path} to={item.path} onClick={() => setOpen(false)} className={cls}>{inner}</Link>;
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="px-2 pb-4">
              <button onClick={() => db.auth.logout()}
                className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Log out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}