import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendMail } from '@/lib/mailer';
import { bookingConfirmationEmail, bookingAdminNotificationEmail } from '@/lib/email-templates';

/**
 * POST /api/email/booking-confirmation
 * Internal route — called after a booking is submitted.
 * Body: { bookingId: string }
 *
 * Sends two emails:
 *   1. Confirmation to the teacher who booked
 *   2. Notification to the admin (contact_info.email)
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.EMAIL_INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bookingId } = await request.json();
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 });

    // Fetch booking
    const { data: booking, error: bookErr } = await supabaseAdmin
      .from('bookings')
      .select('id, user_id, service_type, event_date, event_venue, message, name, email, phone')
      .eq('id', bookingId)
      .single();

    if (bookErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // System settings
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', ['system_name', 'contact_info']);
    const sysMap = Object.fromEntries((settings ?? []).map(r => [r.key, r.value]));
    const systemName = (sysMap.system_name as { name?: string } | undefined)?.name ?? 'Motisha';
    const contact = (sysMap.contact_info as { owner_name?: string; whatsapp?: string; email?: string } | undefined) ?? {};
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';

    const emailData = {
      name:         booking.name ?? 'Teacher',
      email:        booking.email ?? '',
      serviceType:  booking.service_type ?? 'Speaking Engagement',
      eventDate:    booking.event_date ?? undefined,
      eventVenue:   booking.event_venue ?? undefined,
      message:      booking.message ?? undefined,
      ownerName:    contact.owner_name ?? 'Tom Charles',
      ownerWhatsapp: contact.whatsapp ?? '+254768205511',
      appUrl,
      systemName,
    };

    const results: { teacher?: string; admin?: string; errors: string[] } = { errors: [] };

    // 1. Teacher confirmation
    if (booking.email) {
      const { subject, html } = bookingConfirmationEmail(emailData);
      const r = await sendMail({ to: booking.email, subject, html });
      if (r.ok) results.teacher = r.messageId;
      else results.errors.push(`Teacher email: ${r.error}`);
    }

    // 2. Admin notification
    const adminEmail = contact.email;
    if (adminEmail) {
      const { subject, html } = bookingAdminNotificationEmail(emailData);
      const r = await sendMail({ to: adminEmail, subject, html });
      if (r.ok) results.admin = r.messageId;
      else results.errors.push(`Admin email: ${r.error}`);
    }

    return NextResponse.json({ ok: results.errors.length === 0, ...results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email/booking-confirmation] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
