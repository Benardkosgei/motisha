import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/audit-log';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('contents')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch the record first so we can include the title in the audit log
  const { data: resource, error: fetchError } = await supabaseAdmin
    .from('contents')
    .select('id, title, type')
    .eq('id', params.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('contents')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminUserId: req.headers.get('x-admin-user-id'),
    actionType: 'DELETE_RESOURCE',
    targetRecordId: params.id,
    targetTable: 'contents',
    details: { title: resource.title, type: resource.type },
  });

  return NextResponse.json({ success: true });
}
