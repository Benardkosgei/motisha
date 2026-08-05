import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mailer';
import { subscriptionExpiringEmail, subscriptionExpiredEmail } from '@/lib/email-templates';

/**
 * GET /api/admin/scheduler/subscription-reminders
 *
 * Sends subscription renewal reminder emails to paid subscribers:
 *   - 7 days before expiry: "Subscription expiring soon" (once per subscription cycle)
 *   - On expiry day (after the fact): "Subscription expired" — triggers the
 *     actual account downgrade (profiles.subscription_tier → 'free') so the DB
 *     is consistent even if pg_cron is unavailable.
 *
 * Should be called daily by a cron job (e.g. 09:00 EAT).
 * Authentication: Bearer CRON_SECRET header.
 *
 * Also reachable as POST for cron services that require POST.
 */
export async function GET(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();

    // Fetch logo_url from system_settings
    const { data: logoSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'logo_url')
      .single();

    const logoUrl = (logoSettings?.value as { url?: string | null } | undefined)?.url ?? null;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';

    const PACKAGE_LABELS: Record<string, string> = { individual: 'Individual', admin: 'Admin (School)' };
    const BILLING_LABELS: Record<string, string> = { monthly: 'Monthly', termly: 'Termly', yearly: 'Yearly' };

    // ── 1. Expiring in 7 days ─────────────────────────────────────────────────
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const sevenDaysPlusOne = new Date(sevenDaysFromNow);
    sevenDaysPlusOne.setDate(sevenDaysFromNow.getDate() + 1);

    const { data: expiringUsers } = await supabase
      .from('profiles')
      .select('id, email, name, subscription_package, subscription_billing, subscription_expires_at')
      .in('subscription_tier', ['pro', 'school'])
      .not('subscription_expires_at', 'is', null)
      .gte('subscription_expires_at', sevenDaysFromNow.toISOString())
      .lt('subscription_expires_at', sevenDaysPlusOne.toISOString())
      .is('subscription_reminder_sent', null); // only send once per cycle

    let expiringSent = 0;

    for (const user of expiringUsers ?? []) {
      if (!user.email || !user.subscription_expires_at) continue;

      const expiresAt = new Date(user.subscription_expires_at);
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const packageLabel = PACKAGE_LABELS[user.subscription_package ?? ''] ?? 'Unknown';
      const billingLabel = BILLING_LABELS[user.subscription_billing ?? ''] ?? '';

      const { subject, html } = subscriptionExpiringEmail({
        name: user.name ?? 'there',
        daysLeft,
        packageLabel,
        billingLabel,
        expiresAt: user.subscription_expires_at,
        appUrl,
        logoUrl,
      });

      try {
        await sendMail({ to: user.email, subject, html });

        // Mark reminder as sent so it doesn't repeat this cycle
        await supabase
          .from('profiles')
          .update({ subscription_reminder_sent: now.toISOString() })
          .eq('id', user.id);

        expiringSent++;
      } catch (emailErr) {
        console.warn('[subscription-reminders] Failed to send expiring email to', user.email, emailErr);
      }
    }

    // ── 2. Expired today — downgrade + notify ─────────────────────────────────
    // These are users whose subscription_expires_at is in the past but
    // subscription_tier is still pro/school (pg_cron may not be running).

    const { data: expiredUsers } = await supabase
      .from('profiles')
      .select('id, email, name, subscription_package, subscription_billing, subscription_expires_at')
      .in('subscription_tier', ['pro', 'school'])
      .not('subscription_expires_at', 'is', null)
      .lt('subscription_expires_at', now.toISOString());

    let expiredDowngraded = 0;
    let expiredNotified = 0;

    for (const user of expiredUsers ?? []) {
      if (!user.email) continue;

      const packageLabel = PACKAGE_LABELS[user.subscription_package ?? ''] ?? 'Subscription';

      // Downgrade the account
      await supabase
        .from('profiles')
        .update({
          subscription_tier:          'free',
          subscription_package:       null,
          subscription_billing:       null,
          subscription_expires_at:    null,
          subscription_reminder_sent: null,
          downloads_limit:            10,
        })
        .eq('id', user.id);

      expiredDowngraded++;

      // Send expiry notification email
      const { subject, html } = subscriptionExpiredEmail({
        name: user.name ?? 'there',
        packageLabel,
        appUrl,
        logoUrl,
      });

      try {
        await sendMail({ to: user.email, subject, html });
        expiredNotified++;
      } catch (emailErr) {
        console.warn('[subscription-reminders] Failed to send expired email to', user.email, emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      expiringSent,
      expiredDowngraded,
      expiredNotified,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[admin/scheduler/subscription-reminders] error:', error);
    return NextResponse.json({ error: 'Subscription reminder scheduler failed' }, { status: 500 });
  }
}

/** POST alias for cron services that require POST. */
export async function POST(request: NextRequest) {
  return GET(request);
}
