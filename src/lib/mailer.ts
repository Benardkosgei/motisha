/**
 * lib/mailer.ts
 *
 * Central email utility. Reads SMTP config from:
 *   1. system_settings table (smtp_config key) — set via admin Settings > Email
 *   2. Environment variable fallbacks (SMTP_HOST, SMTP_PORT, etc.)
 *
 * Usage:
 *   import { sendMail } from '@/lib/mailer';
 *   await sendMail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>' });
 */

import nodemailer, { type Transporter, type SendMailOptions } from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;       // true = TLS on connect (port 465), false = STARTTLS (port 587)
  username: string;
  password: string;
  sender_name: string;
  sender_address: string;
}

export interface MailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;         // plain-text fallback (auto-stripped from html if omitted)
  replyTo?: string;
}

// ─── Config loader ────────────────────────────────────────────────────────────

/**
 * Load SMTP config. DB values take precedence; env vars are the fallback.
 * Returns null if no usable config is found.
 */
export async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  // Try DB first
  try {
    const { data } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'smtp_config')
      .single();

    if (data?.value) {
      const v = data.value as Partial<SmtpConfig>;
      if (v.host && v.username && v.password) {
        return {
          host:           v.host,
          port:           v.port ?? 587,
          secure:         v.secure ?? false,
          username:       v.username,
          password:       v.password,
          sender_name:    v.sender_name ?? 'Motisha Platform',
          sender_address: v.sender_address ?? v.username,
        };
      }
    }
  } catch {
    // DB unavailable — fall through to env vars
  }

  // Env var fallback
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  return {
    host,
    port:           Number(process.env.SMTP_PORT ?? 587),
    secure:         process.env.SMTP_SECURE === 'true',
    username:       user,
    password:       pass,
    sender_name:    process.env.SMTP_SENDER_NAME ?? 'Motisha Platform',
    sender_address: process.env.SMTP_SENDER_ADDRESS ?? user,
  };
}

// ─── Transporter cache ────────────────────────────────────────────────────────

let _transporter: Transporter | null = null;
let _transporterKey = '';

function configKey(c: SmtpConfig) {
  return `${c.host}:${c.port}:${c.username}`;
}

async function getTransporter(config: SmtpConfig): Promise<Transporter> {
  const key = configKey(config);
  if (_transporter && _transporterKey === key) return _transporter;

  _transporter = nodemailer.createTransport({
    host:   config.host,
    port:   config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      // Allow self-signed certs in dev; in production this should be true
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  _transporterKey = key;
  return _transporter;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SendMailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a transactional email.
 * Returns { ok: true, messageId } on success or { ok: false, error } on failure.
 * Never throws — callers can decide whether to surface the error.
 */
export async function sendMail(payload: MailPayload): Promise<SendMailResult> {
  try {
    const config = await loadSmtpConfig();
    if (!config) {
      return { ok: false, error: 'SMTP not configured. Set up SMTP in Settings > Email.' };
    }

    const transporter = await getTransporter(config);

    const from = config.sender_name
      ? `"${config.sender_name}" <${config.sender_address}>`
      : config.sender_address;

    const options: SendMailOptions = {
      from,
      to:      Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      subject: payload.subject,
      html:    payload.html,
      text:    payload.text ?? stripHtml(payload.html),
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    };

    const info = await transporter.sendMail(options);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[mailer] sendMail error:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * Verify SMTP connectivity without sending a message.
 * Used by the "Send Test Email" button.
 */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  try {
    const config = await loadSmtpConfig();
    if (!config) return { ok: false, error: 'SMTP not configured.' };
    const transporter = await getTransporter(config);
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Naive HTML → plain text stripper for the text fallback. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
