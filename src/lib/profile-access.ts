/**
 * Account role (`profiles.role`): registered teacher vs staff dashboard access.
 * Subscription tier (`profiles.subscription_tier`): free / pro / school product access.
 */

export type SubscriptionTier = 'free' | 'pro' | 'school';
export type AccountRole = 'user' | 'admin';

export function isPaidSubscriptionTier(
  tier: SubscriptionTier | undefined | null
): boolean {
  return tier === 'pro' || tier === 'school';
}

// ---------------------------------------------------------------------------
// Content access helpers — used by teacher-facing pages and API routes
// ---------------------------------------------------------------------------

/**
 * Can the user access premium content?
 * Pro and school subscribers can; free users cannot (unless on trial — checked separately).
 */
export function canAccessPremiumContent(
  tier: SubscriptionTier | undefined | null
): boolean {
  return tier === 'pro' || tier === 'school';
}

/**
 * Can the user access newsletters?
 * Newsletters are school-tier only.
 */
export function canAccessNewsletters(
  tier: SubscriptionTier | undefined | null
): boolean {
  return tier === 'school';
}

/**
 * Can the user download files?
 * All tiers can download up to their limit; this checks if they have any allowance left.
 */
export function canDownload(
  downloadsUsed: number,
  downloadsLimit: number
): boolean {
  return downloadsLimit === 9999 || downloadsUsed < downloadsLimit;
}

/**
 * Returns a human-readable label for a subscription tier.
 */
export function tierLabel(tier: SubscriptionTier | undefined | null): string {
  switch (tier) {
    case 'pro':    return 'Pro';
    case 'school': return 'School';
    default:       return 'Free';
  }
}
