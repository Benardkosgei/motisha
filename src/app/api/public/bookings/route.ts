import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/public/bookings
 * Creates a new booking from the teacher-facing Book a Service tab.
 * Auth is optional — logged-in users have user_id set, guests do not.
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

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[public/bookings] POST error:', err);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
