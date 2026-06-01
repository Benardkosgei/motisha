import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface TrackingPayload {
  path?: string;
  pageTitle?: string;
  referrer?: string;
}

function getDeviceCategory(userAgent: string) {
  return /mobile|android|iphone|ipad|ipod|iemobile|opera mini|blackberry/i.test(userAgent)
    ? 'Mobile'
    : 'Desktop';
}

export async function POST(request: NextRequest) {
  let payload: TrackingPayload = {};

  try {
    payload = (await request.json()) as TrackingPayload;
  } catch {
    payload = {};
  }

  const path = typeof payload.path === 'string' && payload.path ? payload.path : request.nextUrl.pathname;
  const pageTitle = typeof payload.pageTitle === 'string' ? payload.pageTitle : null;
  const referrer = typeof payload.referrer === 'string' && payload.referrer ? payload.referrer : null;
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const device = getDeviceCategory(userAgent);

  const { error } = await supabaseAdmin.from('site_visits').insert([
    {
      path,
      page_title: pageTitle,
      referrer,
      user_agent: userAgent,
      ip_address: ipAddress,
      device,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: 'Failed to log analytics event' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
