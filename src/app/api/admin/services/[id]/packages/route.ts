import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

/**
 * POST /api/admin/services/[id]/packages
 * Adds a package to a service menu.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const {
      sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color,
      currency, includes,
      pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended,
      sort_order, active,
    } = body;

    if (!sub_id?.trim() || !sub_title?.trim() || !pkg_id?.trim() || !pkg_label?.trim()) {
      return NextResponse.json({ error: 'sub_id, sub_title, pkg_id, and pkg_label are required' }, { status: 400 });
    }
    if (typeof pkg_fee !== 'number' || pkg_fee < 0) {
      return NextResponse.json({ error: 'pkg_fee must be a non-negative number' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('service_packages')
      .insert({
        menu_id: params.id,
        sub_id: sub_id.trim(),
        sub_icon: sub_icon ?? '🎤',
        sub_title: sub_title.trim(),
        sub_audience: sub_audience ?? '',
        sub_duration: sub_duration ?? '',
        sub_color: sub_color ?? '#0EA5E9',
        currency: currency ?? 'KES',
        includes: includes ?? [],
        pkg_id: pkg_id.trim(),
        pkg_label: pkg_label.trim(),
        pkg_fee,
        pkg_highlight: pkg_highlight ?? null,
        pkg_description: pkg_description ?? '',
        pkg_recommended: pkg_recommended ?? false,
        sort_order: sort_order ?? 0,
        active: active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A package with this sub_id + pkg_id already exists' }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[admin/services/[id]/packages] POST error:', err);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
