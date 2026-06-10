import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mailer';
import { trialExpiringEmail, trialExpiredEmail } from '@/lib/email-templates';

/**
 * GET /api/admin/scheduler/trial-reminders
 *
 * Sends trial expiration reminder emails:
 * - 3 days before expiry: "Trial expiring soon" email
 * - On expiry day: "Trial expired" email
 *
 * Should be called by a cron job daily (e.g., at 9 AM).
 *
 * Authentication: Internal cron secret only (no user auth).
 */
export async function GET(request: NextRequest) {
  try {
    // Verify internal secret to prevent unauthorized calls
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
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);

    // Fetch logo_url from system_settings
    const { data: logoSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'logo_url')
      .single();
    
    const logoUrl = (logoSettings?.value as { url?: string | null } | undefined)?.url ?? null;

    // ─── Find users with trials expiring in 3 days (and not already reminded) ───
    const { data: expiringUsers } = await supabase
      .from('profiles')
      .select('id, email, name, trial_ends_at')
      .eq('subscription_tier', 'free')
      .not('trial_ends_at', 'is', null)
      .gte('trial_ends_at', threeDaysFromNow.toISOString())
      .lt('trial_ends_at', new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .is('trial_reminder_sent', null);

    let expiringSent = 0;
    if (expiringUsers && expiringUsers.length > 0) {
      for (const user of expiringUsers) {
        if (!user.email || !user.trial_ends_at) continue;

        const trialEnd = new Date(user.trial_ends_at);
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const { subject, html } = trialExpiringEmail({
          name: user.name ?? 'there',
          daysLeft,
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke',
          logoUrl,
        });

        await sendMail({
          to: user.email,
          subject,
          html,
        });

        // Mark reminder as sent
        await supabase
          .from('profiles')
          .update({ trial_reminder_sent: now.toISOString() })
          .eq('id', user.id);

        expiringSent++;
      }
    }

    // ─── Find users whose trials expired today (and not already notified) ───
    const { data: expiredUsers } = await supabase
      .from('profiles')
      .select('id, email, name, trial_ends_at')
      .eq('subscription_tier', 'free')
      .not('trial_ends_at', 'is', null)
      .lt('trial_ends_at', now.toISOString())
      .gte('trial_ends_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .is('trial_expired_sent', null);

    let expiredSent = 0;
    if (expiredUsers && expiredUsers.length > 0) {
      for (const user of expiredUsers) {
        if (!user.email) continue;

        const { subject, html } = trialExpiredEmail({
          name: user.name ?? 'there',
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke',
          logoUrl,
        });

        await sendMail({
          to: user.email,
          subject,
          html,
        });

        // Mark expired notification as sent
        await supabase
          .from('profiles')
          .update({ trial_expired_sent: now.toISOString() })
          .eq('id', user.id);

        expiredSent++;
      }
    }

    return NextResponse.json({
      success: true,
      expiringSent,
      expiredSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[admin/scheduler/trial-reminders] error:', error);
    return NextResponse.json({ error: 'Trial reminder scheduler failed' }, { status: 500 });
  }
}

/**
 * POST /api/admin/scheduler/trial-reminders — same as GET for cron services that require POST.
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
