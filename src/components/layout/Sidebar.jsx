import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, CalendarDays, ScanBarcode,
  Settings, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Boxes, History,
  LogOut, Archive, Bell, TrendingUp, Upload, Users, FileText, DollarSign, Palette, CalendarRange, HeartPulse, Briefcase, Telescope, UserCircle, Handshake, Tag, ClipboardList, Building2, MapPin, Truck, Printer, ChevronsUpDown, Lock, Zap
} from 'lucide-react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/usePermissions';
import { usePlan } from '@/lib/usePlan';
import { PLANS } from '@/lib/planLimits';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import UpgradeModal from '@/components/shared/UpgradeModal';


function Port24Icon() {
  return <img src="/port24-logo.svg" alt="Port 24" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />;
}

function Port24Logo() {
  return (
    <div className="flex items-center min-w-0">
      <img src="/port24-logo.svg" alt="Port 24" style={{ height: 28, width: 'auto', objectFit: 'contain', maxWidth: 140 }} />
    </div>
  );
}

// Persist which groups are collapsed in localStorage — stays until user reopens them
const STORAGE_KEY = 'sidebar_collapsed_groups';
function loadCollapsedGroups() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(loadCollapsedGroups);
  const [upgradeModal, setUpgradeModal] = useState(null); // { featureKey, requiredPlan, message }

  const openUpgrade = (featureKey, requiredPlan, message) =>
    setUpgradeModal({ featureKey, requiredPlan, message });
  const closeUpgrade = () => setUpgradeModal(null);

  const toggleGroup = (label) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };
  const location = useLocation();
  const navigate = useNavigate();
  const { orgId, organization, companyMemberships, logout } = useAuth();
  const { role, canAccessAdmin, canAccessFinance, canAccessMissionControl, canManageCrew, canViewInventory, canAccessBusiness, canAccessPrintTemplates, canViewOwnProfile, canAccessRoundtable } = usePermissions();
  const { can, requiredPlan, requiredPlanLabel } = usePlan();

  if (import.meta.env.DEV) {
    console.log('[Sidebar] rendering for role:', role);
  }
  const isAdmin = role === 'admin';
  const level = { admin: 5, director: 4, manager: 3, coordinator: 2, crew: 1 }[role] || 1;

  // Helper: make a locked nav item that opens the upgrade modal instead of navigating
  const locked = (icon, label, featureKey) => {
    const rPlan = requiredPlan(featureKey);
    return {
      icon,
      label,
      lockedFeature: featureKey,
      requiredPlan: requiredPlanLabel(featureKey),
      onClick: () => openUpgrade(featureKey, rPlan, undefined),
    };
  };

  const navGroups = (() => {
    const groups = [];

    // ── Operations ────────────────────────────────────────────────────────────
    if (role !== 'crew') {
      const opsItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/shows', icon: CalendarDays, label: 'Projects' },
      ];
      // QR Scanning — locked for trial
      if (can('qr_scanning')) {
        opsItems.push({ path: '/scan', icon: ScanBarcode, label: 'Scan' });
      } else {
        opsItems.push(locked(ScanBarcode, 'Scan', 'qr_scanning'));
      }
      // AV Hospital — locked for trial + starter
      if (level >= 2) {
        if (can('av_hospital')) {
          opsItems.push({ path: '/av-hospital', icon: HeartPulse, label: 'AV Hospital', badge: 'hospital' });
        } else {
          opsItems.push(locked(HeartPulse, 'AV Hospital', 'av_hospital'));
        }
      }
      groups.push({ label: 'Operations', items: opsItems });
    } else {
      // Crew role: scan only
      groups.push({
        label: 'Operations',
        items: [
          can('qr_scanning')
            ? { path: '/scan', icon: ScanBarcode, label: 'Scan' }
            : locked(ScanBarcode, 'Scan', 'qr_scanning'),
        ],
      });
    }

    // ── Crew ──────────────────────────────────────────────────────────────────
    if (canManageCrew) {
      // Role allows crew management — check plan
      if (can('crew_management')) {
        groups.push({
          label: 'Crew',
          items: [
            { path: '/crew-members', icon: Users, label: 'Employees' },
            { path: '/crew-bookings', icon: Briefcase, label: 'Crew Bookings' },
          ],
        });
      } else {
        groups.push({
          label: 'Crew',
          items: [
            locked(Users, 'Employees', 'crew_management'),
            locked(Briefcase, 'Crew Bookings', 'crew_management'),
          ],
        });
      }
    } else if (canViewOwnProfile) {
      groups.push({
        label: 'My Portal',
        items: [{ path: '/my-profile', icon: UserCircle, label: 'My Profile' }],
      });
    }

    // ── Inventory ─────────────────────────────────────────────────────────────
    if (canViewInventory) {
      const invItems = [
        { path: '/assets', icon: Package, label: 'Assets' },
        { path: '/kits', icon: Archive, label: 'Kits' },
        { path: '/categories', icon: Boxes, label: 'Categories' },
        { path: '/movements', icon: History, label: 'Movement Log' },
        { path: '/containers', icon: Archive, label: 'Containers' },
      ];
      // Assign Barcodes — QR scanning feature
      if (can('qr_scanning')) {
        invItems.splice(2, 0, { path: '/assign-barcode', icon: Tag, label: 'Assign Barcodes' });
      } else {
        invItems.splice(2, 0, locked(Tag, 'Assign Barcodes', 'qr_scanning'));
      }
      // Asset Reviews — yearly_review feature
      if (can('yearly_review')) {
        invItems.push({ path: '/yearly-review', icon: ClipboardList, label: 'Asset Reviews' });
      } else {
        invItems.push(locked(ClipboardList, 'Asset Reviews', 'yearly_review'));
      }
      groups.push({ label: 'Inventory', items: invItems });
    }

    // ── CRM ───────────────────────────────────────────────────────────────────
    if (level >= 3) {
      groups.push({
        label: 'CRM',
        items: [
          { path: '/clients', icon: Building2, label: 'Clients' },
          { path: '/venues', icon: MapPin, label: 'Venues' },
        ],
      });
    }

    // ── Business ──────────────────────────────────────────────────────────────
    if (canAccessBusiness) {
      const businessItems = [
        { path: '/availability', icon: CalendarRange, label: 'Availability' },
        { path: '/alerts', icon: Bell, label: 'Alerts', badge: true },
      ];
      if (canAccessMissionControl) {
        businessItems.push({ path: '/mission-control', icon: Telescope, label: 'Mission Control' });
      }
      if (canAccessRoundtable) {
        businessItems.push({ path: '/roundtable', icon: Handshake, label: 'Roundtable' });
      }
      groups.push({ label: 'Business', items: businessItems });
    }

    // ── Quotes & Invoices ─────────────────────────────────────────────────────
    if (canAccessFinance) {
      if (can('quotes_invoices')) {
        groups.push({
          label: 'Quotes & Invoices',
          items: [
            { path: '/quotes', icon: FileText, label: 'Quotes' },
            { path: '/invoices', icon: DollarSign, label: 'Invoices' },
            { path: '/billing', icon: TrendingUp, label: 'Billing Dashboard' },
          ],
        });
      } else {
        groups.push({
          label: 'Quotes & Invoices',
          items: [
            locked(FileText, 'Quotes', 'quotes_invoices'),
            locked(DollarSign, 'Invoices', 'quotes_invoices'),
          ],
        });
      }
    }

    // ── Financial Reports ─────────────────────────────────────────────────────
    if (canAccessFinance) {
      if (can('financial_reports')) {
        groups.push({
          label: 'Reports',
          items: [{ path: '/reports', icon: TrendingUp, label: 'Financial Reports' }],
        });
      } else {
        groups.push({
          label: 'Reports',
          items: [locked(TrendingUp, 'Financial Reports', 'financial_reports')],
        });
      }
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    if (canAccessAdmin) {
      const adminItems = [
        { path: '/print-templates', icon: FileText, label: 'Print Templates' },
        { path: '/document-settings', icon: Printer, label: 'Documents & PDFs' },
        { path: '/admin', icon: Settings, label: 'Settings' },
        { path: '/plan-usage', icon: Zap, label: 'Plan & Usage' },
      ];
      // API / Integrations
      if (can('api_integrations')) {
        adminItems.push({ path: '/integrations', icon: Upload, label: 'Integrations' });
      } else {
        adminItems.push(locked(Upload, 'Integrations', 'api_integrations'));
      }
      groups.push({ label: 'Admin', items: adminItems });
    } else if (canAccessPrintTemplates) {
      groups.push({
        label: 'Admin',
        items: [
          { path: '/print-templates', icon: FileText, label: 'Print Templates' },
          { path: '/document-settings', icon: Printer, label: 'Documents & PDFs' },
        ],
      });
    }

    return groups;
  })();

  // Share cache key with ThemeProvider so they don't double-fetch; filter by orgId to prevent cross-company bleed
  const { data: brandList = [] } = useQuery({
    queryKey: ['brand', orgId],
    queryFn: () => orgId ? db.entities.BrandSettings.filter({ org_id: orgId }) : Promise.resolve([]),
    staleTime: 10 * 60 * 1000,
    enabled: !!orgId,
  });
  const brand = brandList[0] || {};

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', orgId],
    queryFn: () => orgId ? db.entities.Alert.filter({ org_id: orgId }, '-created_date') : Promise.resolve([]),
    staleTime: 2 * 60 * 1000,
    enabled: !!orgId,
  });
  const unreadAlerts = alerts.filter(a => !a.is_resolved && !a.is_read).length;

  const { data: hospitalRecords = [] } = useQuery({
    queryKey: ['avhospital', orgId],
    queryFn: () => orgId ? db.entities.AVHospital.filter({ org_id: orgId }, '-created_date') : Promise.resolve([]),
    staleTime: 2 * 60 * 1000,
    enabled: !!orgId,
  });
  const activeHospital = hospitalRecords.filter(r => r.is_active).length;

  return (
    <>
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-40 flex flex-col transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="border-b border-sidebar-border">
        {/* Logo row */}
        <div className="flex items-center justify-between p-4 pb-2">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {brand.logo_url
                  ? <img src={brand.logo_url} alt="Logo" className="h-8 max-w-[120px] object-contain" />
                  : <Port24Logo />
                }
              </div>
              <button onClick={() => setCollapsed(true)} className="p-1 rounded-md hover:bg-sidebar-accent transition-colors shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto cursor-pointer" onClick={() => setCollapsed(false)}>
              {brand.logo_url
                ? <img src={brand.logo_url} alt="" className="w-6 h-6 object-contain" />
                : <Port24Icon />}
            </div>
          )}
        </div>

        {/* Workspace indicator */}
        {!collapsed && organization?.name && (
          <div className="px-3 pb-3">
            {companyMemberships && companyMemberships.length > 1 ? (
              <button
                onClick={() => navigate('/workspace-picker')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors hover:bg-sidebar-accent group"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="text-xs font-medium text-sidebar-foreground/80 truncate flex-1">{organization.name}</span>
                <ChevronsUpDown className="w-3 h-3 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 shrink-0" />
              </button>
            ) : (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: 'rgba(31,184,160,0.05)' }}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="text-xs font-medium text-sidebar-foreground/80 truncate">{organization.name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navGroups.map(group => {
          const isGroupCollapsed = !collapsed && !!collapsedGroups[group.label];
          return (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 mb-1 group"
                >
                  <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider group-hover:text-sidebar-foreground/60 transition-colors">
                    {group.label}
                  </p>
                  {isGroupCollapsed
                    ? <ChevronRight className="w-3 h-3 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors" />
                    : <ChevronDown className="w-3 h-3 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors" />
                  }
                </button>
              )}
              {!isGroupCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item, idx) => {
                    // Locked plan-gated item
                    if (item.lockedFeature) {
                      const lockedCls = cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 w-full cursor-pointer",
                        "text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/60"
                      );
                      return (
                        <button key={`${item.lockedFeature}-${idx}`} className={lockedCls} onClick={item.onClick}>
                          <item.icon className="w-4 h-4 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                              <span className="flex items-center gap-1 shrink-0">
                                <Lock className="w-3 h-3" />
                                <span className="text-xs">{item.requiredPlan}</span>
                              </span>
                            </>
                          )}
                        </button>
                      );
                    }

                    const isActive = location.pathname === item.path ||
                      (item.path === '/' && location.pathname === '/dashboard') ||
                      (item.path !== '/' && location.pathname.startsWith(item.path));
                    const alertCount = item.badge === true ? unreadAlerts : item.badge === 'hospital' ? activeHospital : 0;

                    const cls = cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 w-full",
                      isActive
                        ? "text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    );
                    const activeStyle = isActive ? { backgroundColor: 'hsl(var(--primary) / 0.15)' } : {};

                    const inner = (
                      <>
                        <item.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                        {!collapsed && (
                          <>
                            <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                            {alertCount > 0 && <Badge className="h-4 px-1 text-xs bg-red-500/10 text-red-600 border-red-500/20 shrink-0">{alertCount}</Badge>}
                          </>
                        )}
                      </>
                    );

                    return item.external
                      ? <a key={item.path} href={item.path} className={cls} style={activeStyle} aria-current={isActive ? 'page' : undefined}>{inner}</a>
                      : <Link key={item.path} to={item.path} className={cls} style={activeStyle} aria-current={isActive ? 'page' : undefined}>{inner}</Link>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="w-full p-2 rounded-lg hover:bg-sidebar-accent transition-colors flex justify-center mb-1">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={logout}
          className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "justify-center")}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Log out</span>}
        </button>
      </div>
    </aside>

    {upgradeModal && (
      <UpgradeModal
        open={true}
        onClose={closeUpgrade}
        featureKey={upgradeModal.featureKey}
        requiredPlan={upgradeModal.requiredPlan}
        message={upgradeModal.message}
      />
    )}
  </>
  );
}