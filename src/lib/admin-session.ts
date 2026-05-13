/**
 * Admin session utilities — compatible with both Node.js and Edge runtimes.
 *
 * Uses only Web Crypto API + TextEncoder/TextDecoder (no Buffer, no Node builtins)
 * so this module is safe to import from Next.js middleware (Edge runtime).
 *
 * Admin roles:
 *   super_admin — full access to all dashboard sections
 *   editor      — content management only (speeches, courses, articles,
 *                 newsletters, resources). Cannot access users, revenue,
 *                 plans, settings, or bookings.
 */

export const ADMIN_COOKIE_NAME = 'motisha-admin-session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export type AdminRole = 'super_admin' | 'editor';

// ---------------------------------------------------------------------------
// Base64url helpers — no Buffer, works in Edge runtime
// ---------------------------------------------------------------------------

function base64urlEncode(bytes: Uint8Array): string {
  // Convert bytes → binary string → btoa → make url-safe
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  // Restore standard base64 padding and chars
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToBase64url(str: string): string {
  const enc = new TextEncoder();
  return base64urlEncode(enc.encode(str));
}

function base64urlToString(b64: string): string {
  const dec = new TextDecoder();
  return dec.decode(base64urlDecode(b64));
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 helpers — Web Crypto only
// ---------------------------------------------------------------------------

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return base64urlEncode(new Uint8Array(sig));
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sigBytes = base64urlDecode(signature);
  return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
}

// ---------------------------------------------------------------------------
// Token creation / validation
// ---------------------------------------------------------------------------

export interface AdminTokenPayload {
  username: string;
  role: AdminRole;
  exp: number; // unix ms
  /** Profile UUID — stored at login so middleware never needs a DB lookup. */
  userId?: string;
}

export async function createAdminToken(
  username: string,
  role: AdminRole = 'super_admin',
  userId?: string
): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET environment variable is not set. ' +
        'Add a strong random secret to .env.local to secure admin sessions.'
    );
  }
  const payload: AdminTokenPayload = {
    username,
    role,
    exp: Date.now() + SESSION_DURATION_MS,
    ...(userId ? { userId } : {}),
  };
  const payloadB64 = stringToBase64url(JSON.stringify(payload));
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function verifyAdminToken(
  token: string
): Promise<AdminTokenPayload | null> {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) return null; // misconfigured — treat as invalid
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payloadB64 = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);

    if (!payloadB64 || !sig) return null;

    const valid = await hmacVerify(payloadB64, sig, secret);
    if (!valid) return null;

    const payload: AdminTokenPayload = JSON.parse(base64urlToString(payloadB64));

    if (Date.now() > payload.exp) return null; // expired

    // Back-compat: tokens minted before role was added default to super_admin
    if (!payload.role) payload.role = 'super_admin';

    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Request-level helper — reads the session cookie and verifies it
// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server';

export async function verifyAdminSession(
  request: NextRequest
): Promise<{ ok: boolean; username?: string; role?: AdminRole }> {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return { ok: false };
  const payload = await verifyAdminToken(token);
  if (!payload) return { ok: false };
  return { ok: true, username: payload.username, role: payload.role };
}
