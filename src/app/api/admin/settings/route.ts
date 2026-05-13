import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminSession } from '@/lib/admin-session';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * GET /api/admin/settings
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('key, value, updated_at');

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    const timestamps: Record<string, string> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
      timestamps[row.key] = row.updated_at;
    }
    settings._timestamps = timestamps;

    return NextResponse.json(settings);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[admin/settings] GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/settings
 * Accepts multipart/form-data to support file uploads.
 */
export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();

    const systemName            = formData.get('system_name') as string | null;
    const emailSenderName       = formData.get('email_sender_name') as string | null;
    const emailSenderAddress    = formData.get('email_sender_address') as string | null;
    const notificationsEnabled  = formData.get('notifications_enabled') as string | null;
    const mpesaShortcode        = formData.get('mpesa_shortcode') as string | null;
    const mpesaCallbackUrl      = formData.get('mpesa_callback_url') as string | null;
    const mpesaEnv              = formData.get('mpesa_env') as string | null;
    const referralRateIndividual = formData.get('referral_rate_individual') as string | null;
    const referralRateAdmin     = formData.get('referral_rate_admin') as string | null;
    const logoFile              = formData.get('logo') as File | null;
    const faviconFile           = formData.get('favicon') as File | null;

    const updates: Array<{ key: string; value: Record<string, unknown> }> = [];

    // ── File uploads ──────────────────────────────────────────────────────────
    if (logoFile && logoFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(logoFile.type)) {
        return NextResponse.json({ error: 'Logo must be PNG, JPEG, SVG, or ICO' }, { status: 400 });
      }
      if (logoFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Logo must be smaller than 2 MB' }, { status: 400 });
      }
      const ext = logoFile.name.split('.').pop() ?? 'png';
      const fileName = `logo-${Date.now()}.${ext}`;
      const buffer = new Uint8Array(await logoFile.arrayBuffer());
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('system-assets')
        .upload(fileName, buffer, { contentType: logoFile.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabaseAdmin.storage.from('system-assets').getPublicUrl(uploadData.path);
      updates.push({ key: 'logo_url', value: { url: urlData.publicUrl } });
    }

    if (faviconFile && faviconFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(faviconFile.type)) {
        return NextResponse.json({ error: 'Favicon must be PNG, JPEG, SVG, or ICO' }, { status: 400 });
      }
      if (faviconFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Favicon must be smaller than 2 MB' }, { status: 400 });
      }
      const ext = faviconFile.name.split('.').pop() ?? 'ico';
      const fileName = `favicon-${Date.now()}.${ext}`;
      const buffer = new Uint8Array(await faviconFile.arrayBuffer());
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('system-assets')
        .upload(fileName, buffer, { contentType: faviconFile.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabaseAdmin.storage.from('system-assets').getPublicUrl(uploadData.path);
      updates.push({ key: 'favicon_url', value: { url: urlData.publicUrl } });
    }

    // ── Scalar settings ───────────────────────────────────────────────────────
    if (systemName !== null)
      updates.push({ key: 'system_name', value: { name: systemName } });

    if (emailSenderName !== null)
      updates.push({ key: 'email_sender_name', value: { name: emailSenderName } });

    if (emailSenderAddress !== null)
      updates.push({ key: 'email_sender_address', value: { address: emailSenderAddress } });

    if (notificationsEnabled !== null)
      updates.push({ key: 'notifications_enabled', value: { enabled: notificationsEnabled === 'true' } });

    // ── M-Pesa settings ───────────────────────────────────────────────────────
    if (mpesaShortcode !== null || mpesaCallbackUrl !== null || mpesaEnv !== null) {
      // Fetch existing mpesa config to merge
      const { data: existing } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'mpesa_config')
        .single();
      const current = (existing?.value ?? {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...current };
      if (mpesaShortcode !== null) merged.shortcode = mpesaShortcode;
      if (mpesaCallbackUrl !== null) merged.callback_url = mpesaCallbackUrl;
      if (mpesaEnv !== null) merged.env = mpesaEnv;
      updates.push({ key: 'mpesa_config', value: merged });
    }

    // ── Referral commission rates ─────────────────────────────────────────────
    if (referralRateIndividual !== null || referralRateAdmin !== null) {
      const rateInd = referralRateIndividual !== null ? Number(referralRateIndividual) : null;
      const rateAdm = referralRateAdmin !== null ? Number(referralRateAdmin) : null;
      if (rateInd !== null && (isNaN(rateInd) || rateInd < 0 || rateInd > 100)) {
        return NextResponse.json({ error: 'Individual commission rate must be 0–100' }, { status: 400 });
      }
      if (rateAdm !== null && (isNaN(rateAdm) || rateAdm < 0 || rateAdm > 100)) {
        return NextResponse.json({ error: 'Admin commission rate must be 0–100' }, { status: 400 });
      }
      const { data: existing } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'referral_rates')
        .single();
      const current = (existing?.value ?? { individual: 15, admin: 20 }) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...current };
      if (rateInd !== null) merged.individual = rateInd;
      if (rateAdm !== null) merged.admin = rateAdm;
      updates.push({ key: 'referral_rates', value: merged });
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No settings to update' }, { status: 400 });
    }

    // Upsert each setting
    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('system_settings')
        .upsert({ key: update.key, value: update.value }, { onConflict: 'key' });
      if (error) throw error;
    }

    // Return full updated settings
    const { data: allSettings, error: fetchError } = await supabaseAdmin
      .from('system_settings')
      .select('key, value, updated_at');
    if (fetchError) throw fetchError;

    const settings: Record<string, unknown> = {};
    const timestamps: Record<string, string> = {};
    for (const row of allSettings ?? []) {
      settings[row.key] = row.value;
      timestamps[row.key] = row.updated_at;
    }
    settings._timestamps = timestamps;

    return NextResponse.json(settings);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[admin/settings] PATCH error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
