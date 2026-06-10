import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { bookingConfirmationEmail, bookingAdminNotificationEmail } from '@/lib/email-templates';

/**
 * POST /api/public/bookings
 * Creates a new booking from the teacher-facing Book a Service tab.
 * Auth is optional — logged-in users have user_id set, guests do not.
 * Sends two emails on success (fire-and-forget):
 *   1. Confirmation to the teacher/requester
 *   2. Admin notification to the owner
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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
    } = body;

    // Minimal validation
    if (!service_name?.trim()) {
      return NextResponse.json({ error: 'service_name is required' }, { status: 400 });
    }
    if (!contact_name?.trim() || !contact_phone?.trim()) {
      return NextResponse.json({ error: 'contact_name and contact_phone are required' }, { status: 400 });
    }
    if (!school?.trim()) {
      return NextResponse.json({ error: 'school is required' }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

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
