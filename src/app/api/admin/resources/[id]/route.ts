import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

/**
 * GET /api/admin/resources/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('*')
    .eq('id', params.id)
    .in('type', ['Resource', 'Guide', 'Template'])
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/resources/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, type, icon, description, file_url, premium, status } = body;

  if (title !== undefined && !String(title).trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = String(title).trim();
  if (type !== undefined) updateData.type = type;
  if (icon !== undefined) updateData.icon = icon;
  if (description !== undefined) updateData.description = description;
  if (file_url !== undefined) {
    updateData.file_url = file_url || null;
    updateData.pdf_available = !!file_url;
  }
  if (premium !== undefined) updateData.premium = premium;
  if (status !== undefined) {
    if (!['draft', 'published'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updateData.status = status;
    if (status === 'published') updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('contents')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/resources/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminUserId = req.headers.get('x-admin-user-id');

  // Fetch first to get file_url for storage cleanup
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('contents')
    .select('id, title, file_url')
    .eq('id', params.id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Remove file from storage if present
  if (existing.file_url) {
    try {
      const url = new URL(existing.file_url);
      const pathParts = url.pathname.split('/storage/v1/object/public/');
      if (pathParts.length === 2) {
        const [bucket, ...rest] = pathParts[1].split('/');
        await supabaseAdmin.storage.from(bucket).remove([rest.join('/')]);
      }
    } catch {
      // Non-fatal — continue with DB deletion
    }
  }

  const { error } = await supabaseAdmin
    .from('contents')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminUserId,
    actionType: 'DELETE_RESOURCE',
    targetRecordId: params.id,
    targetTable: 'contents',
    details: { title: existing.title },
  });

  return NextResponse.json({ ok: true });
}
