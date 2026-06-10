/**
 * Account role (`profiles.role`): registered teacher vs staff dashboard access.
 * Subscription tier (`profiles.subscription_tier`): free / pro / school product access.
 *
 * Trial rules:
 *  - Trial users are `free` tier but get access to premium speeches and newsletters.
 *  - Courses remain locked during trial (intentional — courses are the paid upsell).
 *  - Pass `onTrial = true` (from `isOnTrial()` in auth-context) to unlock trial content.
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
 * Can the user access premium content (speeches, resources, templates)?
 * Pro and school subscribers always can.
 * Trial users also get access — pass `onTrial = true` from `isOnTrial()`.
 */
export function canAccessPremiumContent(
  tier: SubscriptionTier | undefined | null,
  onTrial = false
): boolean {
  if (tier === 'pro' || tier === 'school') return true;
  return onTrial; // trial grants premium content access (but not courses)
}

/**
 * Can the user access newsletters?
 * Both pro and school subscribers can access newsletters — newsletters are not
 * exclusive to the school plan.  The school plan differs from pro only in that
 * it covers multiple accounts (up to 5 staff members); the content access is
 * identical.
 * Trial users also get access — pass `onTrial = true` from `isOnTrial()`.
 */
export function canAccessNewsletters(
  tier: SubscriptionTier | undefined | null,
  onTrial = false
): boolean {
  if (tier === 'pro' || tier === 'school') return true;
  return onTrial; // trial grants newsletter access
}

/**
 * Can the user access courses?
 * Courses are locked during trial — this is intentional.
 * Only paid subscribers (pro / school) can access courses.
 */
export function canAccessCourses(
  tier: SubscriptionTier | undefined | null
): boolean {
  return tier === 'pro' || tier === 'school';
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
