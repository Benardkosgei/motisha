import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManagePlans } from '@/lib/admin-rbac';
import { z, validateBody } from '@/lib/validation-schemas';

// ─── Schema ───────────────────────────────────────────────────────────────────

const PlanUpdateSchema = z.object({
  price_kes: z
    .number({ invalid_type_error: 'price_kes must be a number' })
    .int('price_kes must be an integer')
    .min(0, 'Price must be a non-negative number')
    .optional(),

  max_accounts: z
    .number({ invalid_type_error: 'max_accounts must be a number' })
    .int('max_accounts must be an integer')
    .min(1, 'Max accounts must be at least 1')
    .optional(),

  features: z
    .array(
      z.string()
        .min(1, 'Feature text cannot be empty')
        .max(200, 'Feature text must be under 200 characters')
        .transform(s => s.trim())
    )
    .max(20, 'A plan can have at most 20 features')
    .optional(),
}).refine(
  data => Object.keys(data).length > 0,
  { message: 'No valid fields to update' }
);

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/plans/[tier]
 *
 * The route segment is named [tier] for URL readability, but the value
 * passed is always the plan's UUID (id). This is intentional — the admin
 * UI identifies plans by id to avoid ambiguity between "individual:monthly"
 * and so on.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tier: string } }
) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManagePlans(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // The param value is the plan's UUID, despite the folder being named [tier]
  const planId = params.tier;

  // Basic UUID guard — prevents passing arbitrary strings like "free" or "../"
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(planId)) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });
  }

  try {
    const rawBody = await request.json();

    const validation = validateBody(PlanUpdateSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message, details: validation.error.details },
        { status: 400 }
      );
    }

    const updateData = validation.data as Record<string, unknown>;

    const { data, error } = await supabaseAdmin
      .from('plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[admin/plans/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}
