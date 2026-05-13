import { supabaseAdmin } from './supabase-admin';

/**
 * Log a destructive admin action to the admin_audit_log table.
 *
 * This is a best-effort utility — errors are caught and logged to the console
 * so that a logging failure never blocks the primary operation.
 *
 * Requirements: 13.5
 */
export async function logAdminAction({
  adminUserId,
  actionType,
  targetRecordId,
  targetTable,
  details = {},
}: {
  adminUserId: string | null | undefined;
  actionType: string;
  targetRecordId?: string | null;
  targetTable?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  if (!adminUserId) return;

  try {
    const { error } = await supabaseAdmin.from('admin_audit_log').insert({
      admin_user_id: adminUserId,
      action_type: actionType,
      target_record_id: targetRecordId ?? null,
      target_table: targetTable ?? null,
      details,
    });

    if (error) {
      console.error('[audit-log] Insert error:', error.message);
    }
  } catch (err) {
    console.error('[audit-log] Unexpected error:', err);
  }
}
