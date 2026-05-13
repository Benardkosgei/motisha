import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, canViewRevenue } from '@/lib/admin-rbac';

/**
 * GET /api/admin/revenue/export
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canViewRevenue(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Placeholder: no payments table yet.
  const headers = ['Transaction ID', 'User Name', 'Email', 'Plan', 'Amount (KES)', 'Payment Date', 'Status'];
  const csvContent = [headers.join(',')].join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
