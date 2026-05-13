import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * GET /api/admin/services
 * Returns all service menus with their packages.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const { data: menus, error: menusError } = await supabaseAdmin
      .from('service_menus')
      .select('*')
      .order('sort_order', { ascending: true });

    if (menusError) throw menusError;

    const { data: packages, error: pkgsError } = await supabaseAdmin
      .from('service_packages')
      .select('*')
      .order('sort_order', { ascending: true });

    if (pkgsError) throw pkgsError;

    return NextResponse.json({ menus: menus ?? [], packages: packages ?? [] });
  } catch (err) {
    console.error('[admin/services] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

/**
 * POST /api/admin/services
 * Creates a new service menu.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { icon, title, color, gradient, tagline, has_submenu, sort_order, active } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('service_menus')
      .insert({
        icon: icon ?? '🎤',
        title: title.trim(),
        color: color ?? '#0EA5E9',
        gradient: gradient ?? 'linear-gradient(135deg, #0EA5E922, #06B6D412)',
        tagline: tagline ?? '',
        has_submenu: has_submenu ?? false,
        sort_order: sort_order ?? 0,
        active: active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[admin/services] POST error:', err);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
