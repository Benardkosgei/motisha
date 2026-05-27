import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canViewRevenue } from '@/lib/admin-rbac';

/**
 * GET /api/admin/revenue/export
 * Exports all completed subscription transactions as a CSV file.
 * Supports the same filters as GET /api/admin/revenue:
 *   ?plan=individual|admin
 *   ?status=completed|pending|failed|cancelled  (default: all)
 *   ?dateFrom=YYYY-MM-DD
 *   ?dateTo=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canViewRevenue(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const planFilter   = searchParams.get('plan')     ?? '';
    const statusFilter = searchParams.get('status')   ?? '';
    const dateFrom     = searchParams.get('dateFrom') ?? '';
    const dateTo       = searchParams.get('dateTo')   ?? '';

    // Build query — fetch all rows (no pagination for export)
    let query = supabaseAdmin
      .from('subscriptions')
      .select(`
        id, package, billing, amount_kes, payment_method,
        mpesa_receipt, status, created_at,
        profiles!inner(name, email)
      `)
      .order('created_at', { ascending: false });

    if (planFilter && planFilter !== 'all') {
      query = query.eq('package', planFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      query = query.lt('created_at', end.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Build CSV
    const PLAN_LABELS: Record<string, string> = { individual: 'Individual', admin: 'Admin' };
    const BILLING_LABELS: Record<string, string> = { monthly: 'Monthly', termly: 'Termly', yearly: 'Yearly' };

    const headers = [
      'Transaction ID',
      'User Name',
      'Email',
      'Plan',
      'Billing',
      'Amount (KES)',
      'Payment Method',
      'M-Pesa Receipt',
      'Status',
      'Date',
    ];

    function escapeCSV(val: string | number | null | undefined): string {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    const rows = (data ?? []).map(tx => {
      const profile = tx.profiles as { name?: string; email?: string } | null;
      return [
        escapeCSV(tx.id),
        escapeCSV(profile?.name ?? ''),
        escapeCSV(profile?.email ?? ''),
        escapeCSV(PLAN_LABELS[tx.package as string] ?? tx.package),
        escapeCSV(BILLING_LABELS[tx.billing as string] ?? tx.billing),
        escapeCSV(tx.amount_kes),
        escapeCSV(tx.payment_method),
        escapeCSV(tx.mpesa_receipt),
        escapeCSV(tx.status),
        escapeCSV(new Date(tx.created_at as string).toISOString().split('T')[0]),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `transactions-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[admin/revenue/export] error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
