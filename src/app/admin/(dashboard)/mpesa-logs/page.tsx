'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { C } from '@/components/Logo';

type LogEvent =
  | 'stk_push_initiated'
  | 'stk_push_failed'
  | 'callback_received'
  | 'callback_success'
  | 'callback_failed'
  | 'callback_ip_rejected'
  | 'amount_mismatch'
  | 'no_pending_record'
  | 'idempotent_skip';

interface MpesaLog {
  id: string;
  event: LogEvent;
  checkout_id: string | null;
  user_id: string | null;
  phone: string | null;
  amount: number | null;
  package: string | null;
  billing: string | null;
  mpesa_receipt: string | null;
  result_code: number | null;
  result_desc: string | null;
  error_message: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_COLORS: Record<LogEvent, string> = {
  stk_push_initiated:  C.teal,
  stk_push_failed:     '#ef4444',
  callback_received:   '#a78bfa',
  callback_success:    '#22c55e',
  callback_failed:     '#ef4444',
  callback_ip_rejected:'#f97316',
  amount_mismatch:     '#f59e0b',
  no_pending_record:   '#f59e0b',
  idempotent_skip:     '#6b7280',
};

const EVENT_ICONS: Record<LogEvent, string> = {
  stk_push_initiated:  '📤',
  stk_push_failed:     '❌',
  callback_received:   '📥',
  callback_success:    '✅',
  callback_failed:     '❌',
  callback_ip_rejected:'🚫',
  amount_mismatch:     '⚠️',
  no_pending_record:   '❓',
  idempotent_skip:     '⏭',
};

const ALL_EVENTS: LogEvent[] = [
  'stk_push_initiated','stk_push_failed','callback_received','callback_success',
  'callback_failed','callback_ip_rejected','amount_mismatch','no_pending_record','idempotent_skip',
];

export default function MpesaLogsPage() {
  const [logs, setLogs] = useState<MpesaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterEvent) params.set('event', filterEvent);
      if (filterPhone) params.set('phone', filterPhone);
      const res = await fetch(`/api/admin/mpesa-logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [filterEvent, filterPhone]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-refresh every 5 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchLogs]);

  function fmt(ts: string) {
    return new Date(ts).toLocaleString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  const cardStyle: React.CSSProperties = {
    background: C.navyMid,
    border: '1px solid rgba(14,165,233,0.15)',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 8,
    cursor: 'pointer',
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white }}>📋 M-Pesa Payment Logs</h1>
          <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.8rem' }}>
            Every STK push and callback event is logged here for debugging.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setAutoRefresh(r => !r)}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: 'none', background: autoRefresh ? `${C.success}25` : 'rgba(255,255,255,0.07)', color: autoRefresh ? C.success : C.gray, outline: autoRefresh ? `1px solid ${C.success}40` : '1px solid rgba(255,255,255,0.1)' }}
          >
            {autoRefresh ? '⏸ Auto-refresh ON' : '▶ Auto-refresh'}
          </button>
          <button
            onClick={fetchLogs}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: `1px solid rgba(14,165,233,0.3)`, background: 'rgba(14,165,233,0.1)', color: C.teal }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={filterEvent}
          onChange={e => setFilterEvent(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, background: C.navyMid, border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.82rem', cursor: 'pointer' }}
        >
          <option value=''>All events</option>
          {ALL_EVENTS.map(e => (
            <option key={e} value={e}>{EVENT_ICONS[e]} {e.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <input
          type='text'
          value={filterPhone}
          onChange={e => setFilterPhone(e.target.value)}
          placeholder='Filter by phone…'
          style={{ padding: '8px 12px', borderRadius: 8, background: C.navyMid, border: '1px solid rgba(14,165,233,0.2)', color: C.white, fontSize: '0.82rem', minWidth: 180 }}
        />
      </div>

      {/* Stats bar */}
      {!loading && logs.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['callback_success', 'stk_push_failed', 'callback_failed', 'amount_mismatch'] as LogEvent[]).map(ev => {
            const count = logs.filter(l => l.event === ev).length;
            if (!count) return null;
            return (
              <div key={ev} style={{ padding: '6px 14px', borderRadius: 20, background: `${EVENT_COLORS[ev]}18`, border: `1px solid ${EVENT_COLORS[ev]}35`, color: EVENT_COLORS[ev], fontSize: '0.76rem', fontWeight: 700 }}>
                {EVENT_ICONS[ev]} {ev.replace(/_/g, ' ')}: {count}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#ef444418', border: '1px solid #ef444440', color: '#ef4444', fontSize: '0.82rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ color: C.gray, fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>Loading logs…</div>
      )}

      {!loading && logs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.gray }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>No logs yet. Trigger a payment to see events here.</p>
        </div>
      )}

      {/* Log entries */}
      {logs.map(log => {
        const color = EVENT_COLORS[log.event] ?? C.gray;
        const isOpen = expanded === log.id;
        return (
          <div key={log.id} style={{ ...cardStyle, borderLeft: `3px solid ${color}40` }} onClick={() => setExpanded(isOpen ? null : log.id)}>
            {/* Row summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{EVENT_ICONS[log.event]}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color, fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {log.event.replace(/_/g, ' ')}
                    </span>
                    {log.mpesa_receipt && (
                      <span style={{ color: C.success, fontSize: '0.72rem', fontWeight: 700 }}>
                        Receipt: {log.mpesa_receipt}
                      </span>
                    )}
                    {log.result_code !== null && log.result_code !== 0 && (
                      <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>
                        Code: {log.result_code}
                      </span>
                    )}
                  </div>
                  <div style={{ color: C.gray, fontSize: '0.74rem', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {log.phone && <span>📱 {log.phone}</span>}
                    {log.amount && <span>💰 KES {log.amount.toLocaleString()}</span>}
                    {log.package && <span>📦 {log.package} / {log.billing}</span>}
                    {log.checkout_id && <span style={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>{log.checkout_id.slice(-16)}</span>}
                  </div>
                  {log.error_message && (
                    <div style={{ color: '#f59e0b', fontSize: '0.74rem', marginTop: 4 }}>⚠ {log.error_message}</div>
                  )}
                  {log.result_desc && !log.error_message && (
                    <div style={{ color: C.gray, fontSize: '0.74rem', marginTop: 2 }}>↳ {log.result_desc}</div>
                  )}
                </div>
              </div>
              <div style={{ color: C.gray, fontSize: '0.72rem', flexShrink: 0, textAlign: 'right' }}>
                {fmt(log.created_at)}
                <div style={{ color: isOpen ? C.teal : C.gray, fontSize: '0.7rem', marginTop: 2 }}>{isOpen ? '▲ hide' : '▼ raw'}</div>
              </div>
            </div>

            {/* Expanded raw payload */}
            {isOpen && log.raw_payload && (
              <div
                style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
                <pre style={{ margin: 0, color: '#94a3b8', fontSize: '0.72rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(log.raw_payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
