import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageContent } from '@/lib/admin-rbac';

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';

  let query = supabaseAdmin
    .from('contents')
    .select('*')
    .in('type', ['Resource', 'Guide', 'Template'])
    .order('created_at', { ascending: false });

  if (search) query = query.ilike('title', `%${search}%`);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ resources: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;
  if (!canManageContent(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, type, icon, description, premium, file_url, status } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('contents')
    .insert({
      title: title.trim(),
      type: type ?? 'Resource',
      icon: icon ?? '📚',
      description: description ?? '',
      premium: premium ?? false,
      pdf_available: !!file_url,
      week: 'Resources',
      file_url: file_url ?? null,
      status: status ?? 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
