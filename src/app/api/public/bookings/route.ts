import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { bookingConfirmationEmail, bookingAdminNotificationEmail } from '@/lib/email-templates';
import { BookingPublicCreateSchema, validateBody } from '@/lib/validation-schemas';
import { bookingsLimiter, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/public/bookings
 */
export async function POST(req: NextRequest) {
  // Rate limit: 5 bookings per 10 minutes per IP
  const ip = getClientIp(req);
  if (!bookingsLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Too many booking requests. Please try again in a few minutes.' },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();

    const validation = validateBody(BookingPublicCreateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message, details: validation.error.details }, { status: 400 });
    }

    const {
      user_id,
      service_menu_id,
      service_name,
      sub_service_id,
      sub_service_name,
      package_id,
      package_label,
      fee,
      currency,
      event_date,
      event_time,
      school,
      county,
      contact_name,
      contact_phone,
      contact_email,
      attendees,
      description,
    } = validation.data;

    const deposit_amount = fee ? Math.round(fee * 0.5) : null;

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: user_id ?? null,
        service_menu_id: service_menu_id ?? null,
        service_name: service_name.trim(),
        sub_service_id: sub_service_id ?? '',
        sub_service_name: sub_service_name ?? '',
        package_id: package_id ?? '',
        package_label: package_label ?? '',
        fee: fee ?? 0,
        currency: currency ?? 'KES',
        event_date: event_date || null,
        event_time: event_time || null,
        school: school.trim(),
        county: county ?? '',
        contact_name: contact_name.trim(),
        contact_phone: contact_phone.trim(),
        contact_email: contact_email ?? '',
        attendees: attendees ?? '',
        description: description.trim(),
        status: 'pending',
        deposit_amount,
      })
      .select()
      .single();

    if (error) throw error;

    // ── Send emails (fire-and-forget — don't block the response) ─────────────
    if (contact_email?.trim()) {
      Promise.all([
        // 1. Fetch system settings for owner contact info and app URL
        supabaseAdmin
          .from('system_settings')
          .select('key, value')
          .in('key', ['contact_info', 'system_name'])
          .then(async ({ data: settings }) => {
            const sysMap = Object.fromEntries((settings ?? []).map(r => [r.key, r.value]));
            const systemName = (sysMap.system_name as { name?: string } | undefined)?.name ?? 'Motisha';
            const contactInfo = (sysMap.contact_info as {
              owner_name?: string;
              whatsapp?: string;
              support_email?: string;
            } | undefined) ?? {};
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
            const ownerName = contactInfo.owner_name ?? 'Tom Charles';
            const ownerWhatsapp = contactInfo.whatsapp ?? '+254768205511';
            const supportEmail = contactInfo.support_email ?? 'support@motisha.co.ke';

            const emailData = {
              name: contact_name.trim(),
              email: contact_email.trim(),
              serviceType: service_name.trim(),
              eventDate: event_date ?? undefined,
              eventVenue: school?.trim() ?? undefined,
              message: description?.trim() ?? undefined,
              ownerName,
              ownerWhatsapp,
              appUrl,
              systemName,
            };

            // Confirmation to the requester
            const conf = bookingConfirmationEmail(emailData);
            await sendMail({ to: contact_email.trim(), subject: conf.subject, html: conf.html });

            // Notification to admin/owner
            const adminNotif = bookingAdminNotificationEmail(emailData);
            await sendMail({ to: supportEmail, subject: adminNotif.subject, html: adminNotif.html });
          }),
      ]).catch(e => console.warn('[public/bookings] email send failed:', e));
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[public/bookings] POST error:', err);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
