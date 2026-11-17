// ─── Plan definitions ─────────────────────────────────────────────────────────

export const PLAN_ORDER = ['trial', 'starter', 'pro', 'enterprise'];

export const PLANS = {
  // Trial = full product, no limits. Trial users can click through and use every feature.
  trial: {
    label: 'Trial',
    price: 'Free',
    // Numeric limits (null = unlimited)
    users_limit: null,
    assets_limit: null,
    shows_limit: null,
    // Feature flags
    branding: 'full',          // none | logo_only | full
    quotes_invoices: true,
    qr_scanning: true,
    crew_management: true,
    av_hospital: true,
    yearly_review: true,
    financial_reports: true,
    api_integrations: true,
    priority_support: true,
  },
  starter: {
    label: 'Starter',
    price: '$49/mo',
    users_limit: 10,
    assets_limit: 500,
    shows_limit: null,
    branding: 'logo_only',
    quotes_invoices: true,
    qr_scanning: true,
    crew_management: false,
    av_hospital: false,
    yearly_review: false,
    financial_reports: false,
    api_integrations: false,
    priority_support: false,
  },
  pro: {
    label: 'Pro',
    price: '$149/mo',
    users_limit: 25,
    assets_limit: null,
    shows_limit: null,
    branding: 'full',
    quotes_invoices: true,
    qr_scanning: true,
    crew_management: true,
    av_hospital: true,
    yearly_review: true,
    financial_reports: true,
    api_integrations: false,
    priority_support: false,
  },
  enterprise: {
    label: 'Enterprise',
    price: 'Contact us',
    users_limit: null,
    assets_limit: null,
    shows_limit: null,
    branding: 'full',
    quotes_invoices: true,
    qr_scanning: true,
    crew_management: true,
    av_hospital: true,
    yearly_review: true,
    financial_reports: true,
    api_integrations: true,
    priority_support: true,
  },
};

// ─── Which plan first enables each feature ────────────────────────────────────

export const FEATURE_REQUIRED_PLAN = {
  branding_logo:      'starter',
  branding_full:      'pro',
  quotes_invoices:    'starter',
  qr_scanning:        'starter',
  crew_management:    'pro',
  av_hospital:        'pro',
  yearly_review:      'pro',
  financial_reports:  'pro',
  api_integrations:   'enterprise',
  priority_support:   'enterprise',
};

// Human-readable labels for features
export const FEATURE_LABELS = {
  quotes_invoices:   'Quotes & Invoices',
  qr_scanning:       'QR Scanning',
  crew_management:   'Crew Management',
  av_hospital:       'AV Hospital',
  yearly_review:     'Yearly Review',
  financial_reports: 'Financial Reports',
  api_integrations:  'API / Integrations',
  priority_support:  'Priority Support',
};

// Upgrade messages per feature
export const UPGRADE_MESSAGES = {
  quotes_invoices:   'Quotes & Invoices are available on Starter. Upgrade to Starter to create quotes and invoices.',
  qr_scanning:       'QR Scanning is available on Starter. Upgrade to Starter to scan and assign barcodes.',
  crew_management:   'Crew Management is available on Pro. Upgrade to Pro to assign crew and manage per diem.',
  av_hospital:       'AV Hospital is available on Pro. Upgrade to Pro to track repairs and maintenance.',
  yearly_review:     'Yearly Review is available on Pro. Upgrade to Pro to run inventory audits and asset reviews.',
  financial_reports: 'Financial Reports are available on Pro. Upgrade to Pro to access profit, revenue, and billing reports.',
  api_integrations:  'API and Integrations are available on Enterprise. Contact Port 24 to enable Enterprise features.',
  priority_support:  'Priority Support is available on Enterprise. Contact Port 24 to upgrade.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPlanLimits(plan) {
  return PLANS[plan] ?? PLANS.trial;
}

/** Return the plan tier index (higher = better) */
export function planTier(plan) {
  return PLAN_ORDER.indexOf(plan ?? 'trial');
}

/** True if the given plan includes the feature */
export function planHasFeature(plan, featureKey) {
  const limits = getPlanLimits(plan);
  return !!limits[featureKey];
}

/** The minimum plan name required for a feature */
export function requiredPlanFor(featureKey) {
  return FEATURE_REQUIRED_PLAN[featureKey] ?? 'trial';
}

/** True if this plan can use branding at all */
export function canUseBranding(plan) {
  return getPlanLimits(plan).branding !== 'none';
}

/** True if this plan has full branding (colors + logo + documents) */
export function canUseFullBranding(plan) {
  return getPlanLimits(plan).branding === 'full';
}

// ─── Usage limit checks ──────────────────────────────────────────────────────

export function canAddUser(plan, currentCount) {
  const { users_limit, label } = getPlanLimits(plan);
  if (users_limit === null) return { allowed: true };
  if (currentCount >= users_limit) {
    const next = nextPlan(plan);
    return {
      allowed: false,
      current: currentCount,
      limit: users_limit,
      reason: `You have reached your ${label} limit of ${users_limit} users.`,
      upgrade_message: next ? `Upgrade to ${PLANS[next].label} to add more users.` : 'Contact Port 24 to increase your user limit.',
      required_plan: next,
    };
  }
  return { allowed: true, current: currentCount, limit: users_limit };
}

export function canAddAsset(plan, currentCount) {
  const { assets_limit, label } = getPlanLimits(plan);
  if (assets_limit === null) return { allowed: true };
  if (currentCount >= assets_limit) {
    const next = nextPlan(plan);
    return {
      allowed: false,
      current: currentCount,
      limit: assets_limit,
      reason: `You have reached your ${label} limit of ${assets_limit} assets.`,
      upgrade_message: next ? `Upgrade to ${PLANS[next].label} to add more assets.` : 'Contact Port 24 to increase your asset limit.',
      required_plan: next,
    };
  }
  return { allowed: true, current: currentCount, limit: assets_limit };
}

export function canAddShow(plan, currentCount) {
  const { shows_limit, label } = getPlanLimits(plan);
  if (shows_limit === null) return { allowed: true };
  if (currentCount >= shows_limit) {
    const next = nextPlan(plan);
    return {
      allowed: false,
      current: currentCount,
      limit: shows_limit,
      reason: `You have reached your ${label} limit of ${shows_limit} shows.`,
      upgrade_message: next ? `Upgrade to ${PLANS[next].label} for unlimited shows.` : 'Contact Port 24 to upgrade.',
      required_plan: next,
    };
  }
  return { allowed: true, current: currentCount, limit: shows_limit };
}

/** The next tier up from the given plan */
function nextPlan(plan) {
  const idx = planTier(plan);
  return PLAN_ORDER[idx + 1] ?? null;
}

// ─── canUseFeature — main gate used by UI and backend logic ──────────────────

/**
 * Returns { allowed, current_plan, required_plan, reason, upgrade_message }
 * featureKey: one of the FEATURE_REQUIRED_PLAN keys
 */
export function canUseFeature(plan, featureKey) {
  const currentPlan = plan ?? 'trial';
  const reqPlan = requiredPlanFor(featureKey);

  // Trial has no restrictions: every feature is available, including Enterprise-only ones.
  if (currentPlan === 'trial' || planTier(currentPlan) >= planTier(reqPlan)) {
    return {
      allowed: true,
      current_plan: currentPlan,
      required_plan: reqPlan,
    };
  }

  return {
    allowed: false,
    current_plan: currentPlan,
    required_plan: reqPlan,
    reason: `${FEATURE_LABELS[featureKey] ?? featureKey} requires ${PLANS[reqPlan]?.label ?? reqPlan}.`,
    upgrade_message: UPGRADE_MESSAGES[featureKey] ?? `Upgrade to ${PLANS[reqPlan]?.label} to use this feature.`,
  };
}
