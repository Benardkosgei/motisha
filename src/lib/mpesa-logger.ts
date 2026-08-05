/**
 * lib/mpesa-logger.ts
 *
 * Fire-and-forget logger for M-Pesa payment events.
 * Writes to the mpesa_logs table via the service-role client.
 * Never throws — a logging failure must never break a payment flow.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export type MpesaLogEvent =
  | 'stk_push_initiated'
  | 'stk_push_failed'
  | 'callback_received'
  | 'callback_success'
  | 'callback_failed'
  | 'callback_ip_rejected'
  | 'amount_mismatch'
  | 'no_pending_record'
  | 'idempotent_skip';

export interface MpesaLogEntry {
  event: MpesaLogEvent;
  checkout_id?: string | null;
  user_id?: string | null;
  phone?: string | null;
  amount?: number | null;
  package?: string | null;
  billing?: string | null;
  mpesa_receipt?: string | null;
  result_code?: number | null;
  result_desc?: string | null;
  error_message?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw_payload?: Record<string, any> | null;
}

/**
 * Logs an M-Pesa event to the database.
 * Safe to call without await — errors are swallowed and printed to console only.
 */
export function logMpesa(entry: MpesaLogEntry): void {
  void Promise.resolve(
    supabaseAdmin
      .from('mpesa_logs')
      .insert(entry)
  ).then(({ error }) => {
    if (error) {
      console.error('[mpesa-logger] Failed to write log:', error.message, '| Entry:', entry.event, entry.checkout_id);
    }
  }).catch((err: unknown) => {
    console.error('[mpesa-logger] Unexpected error:', err);
  });
}
