import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageSettings } from '@/lib/admin-rbac';

/**
 * GET /api/admin/academic-terms
 * Returns all academic terms ordered by year desc, term asc.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from('academic_terms')
      .select('*')
      .order('year', { ascending: false })
      .order('term', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ terms: data ?? [] });
  } catch (error) {
    console.error('[admin/academic-terms] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch academic terms' }, { status: 500 });
  }
}

/**
 * POST /api/admin/academic-terms
 * Creates a new academic term.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageSettings(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { year, term, label, start_date, end_date, is_active, notes } = body;

    // Validate required fields
    if (!year || !term || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'year, term, start_date, and end_date are required' },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(Number(term))) {
      return NextResponse.json({ error: 'term must be 1, 2, or 3' }, { status: 400 });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: 'end_date must be after start_date' }, { status: 400 });
    }

    const insertData = {
      year: Number(year),
      term: Number(term),
      label: label?.trim() || `Term ${term} ${year}`,
      start_date,
      end_date,
      is_active: is_active === true,
      notes: notes?.trim() || null,
    };

    const { data, error } = await supabaseAdmin
      .from('academic_terms')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Term ${term} for year ${year} already exists` },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[admin/academic-terms] POST error:', error);
    return NextResponse.json({ error: 'Failed to create academic term' }, { status: 500 });
  }
}
