import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  getPlanLimits, canUseFeature, requiredPlanFor,
  canAddUser, canAddAsset, canAddShow, PLANS,
} from '@/lib/planLimits';

export function usePlan() {
  const { orgId } = useAuth();

  const { data: org } = useQuery({
    queryKey: ['org-plan', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('plan, status, trial_ends_at')
        .eq('id', orgId)
        .single();
      return data;
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Re-evaluate the trial cutoff while the app is open so an expiring trial locks without a reload.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15 * 1000);
    return () => clearInterval(t);
  }, []);

  const plan     = org?.plan   ?? 'trial';
  const orgStatus = org?.status ?? 'active';
  const limits   = getPlanLimits(plan);

  // Trials last 72 hours (organizations.trial_ends_at). Only counts once the org row has loaded, so
  // there is no flash of the locked screen, and a missing end date never locks anyone out.
  const trialEndsAtMs = org?.plan === 'trial' && org?.trial_ends_at ? new Date(org.trial_ends_at).getTime() : null;

  return {
    plan,
    orgStatus,
    isSuspended: orgStatus === 'suspended',
    trialEndsAt: trialEndsAtMs ? new Date(trialEndsAtMs).toISOString() : null,
    isTrialExpired: trialEndsAtMs != null && now >= trialEndsAtMs,
    planLabel: PLANS[plan]?.label ?? 'Trial',
    limits,

    can:              (featureKey) => canUseFeature(plan, featureKey).allowed,
    check:            (featureKey) => canUseFeature(plan, featureKey),
    requiredPlan:     (featureKey) => requiredPlanFor(featureKey),
    requiredPlanLabel:(featureKey) => PLANS[requiredPlanFor(featureKey)]?.label ?? '',

    canAddUser:  (count) => canAddUser(plan, count),
    canAddAsset: (count) => canAddAsset(plan, count),
    canAddShow:  (count) => canAddShow(plan, count),
  };
}
