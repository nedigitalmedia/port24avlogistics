import React, { useMemo, useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import { DEFAULT_LAYOUTS } from '@/lib/dashboardWidgetRegistry';
import { useAuth } from '@/lib/AuthContext';
import DashboardV2 from '@/components/dashboard/v2/DashboardV2';

const VIEW_KEY = 'port24_dashboard_view';
const readClassic = () => { try { return localStorage.getItem(VIEW_KEY) === 'classic'; } catch { return false; } };
const writeView = (v) => { try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ } };

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { userRecord } = useAuth();
  const user = userRecord;
  const [classic, setClassic] = useState(readClassic);

  // Load user's saved layout (optional, render default immediately)
  const { data: userDashboard } = useQuery({
    queryKey: ['userDashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const configs = await db.entities.UserDashboard.filter({ user_id: user.id });
      return configs[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  // Use default layout immediately, update when userDashboard loads
  const layout = useMemo(() => {
    if (userDashboard?.widgets) return userDashboard.widgets;
    const role = user?.role || 'admin';
    return DEFAULT_LAYOUTS[role] ?? DEFAULT_LAYOUTS['admin'] ?? null;
  }, [userDashboard, user?.role]);

  const handleLayoutChange = async (newLayout) => {
    try {
      if (userDashboard?.id) {
        await db.entities.UserDashboard.update(userDashboard.id, {
          widgets: newLayout,
          saved_at: new Date().toISOString()
        });
      } else {
        await db.entities.UserDashboard.create({
          user_id: user.id,
          user_role: user.role,
          widgets: newLayout,
          saved_at: new Date().toISOString()
        });
      }
      queryClient.invalidateQueries({ queryKey: ['userDashboard'] });
    } catch (err) {
      console.error('Failed to save layout:', err);
    }
  };

  if (!classic) {
    return <DashboardV2 onClassic={() => { writeView('classic'); setClassic(true); }} />;
  }

  return (
    <div className="space-y-0">
      <PageHeader
        title="Dashboard"
        description="Customizable operations command center"
        actions={
          <button type="button" className="text-sm text-primary underline underline-offset-4" onClick={() => { writeView('v2'); setClassic(false); }}>
            New dashboard
          </button>
        }
      />

      {layout && (
        <DashboardGrid
          userRole={user?.role || 'admin'}
          initialLayout={layout}
          onLayoutChange={handleLayoutChange}
        />
      )}
    </div>
  );
}