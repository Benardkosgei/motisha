import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminSession, canManageSettings } from '@/lib/admin-rbac';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * GET /api/admin/settings
 */
export async function GET(request: NextRequest) {
  // Any authenticated admin can read settings (both super_admin and editor need
  // to read logo/system_name for the sidebar). Write is restricted to super_admin.
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

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
 * Restricted to super_admin only.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageSettings(auth.role)) {
    return NextResponse.json({ error: 'Forbidden: only super_admin can modify settings' }, { status: 403 });
  }

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
    // Contact & bank settings
    const contactOwnerName      = formData.get('contact_owner_name') as string | null;
    const contactWhatsapp       = formData.get('contact_whatsapp') as string | null;
    const contactEmail          = formData.get('contact_email') as string | null;
    const contactSupportEmail   = formData.get('contact_support_email') as string | null;
    const contactResponseHours  = formData.get('contact_response_hours') as string | null;
    const bankName              = formData.get('bank_name') as string | null;
    const bankAccountName       = formData.get('bank_account_name') as string | null;
    const bankAccountNumber     = formData.get('bank_account_number') as string | null;
    const bankBranch            = formData.get('bank_branch') as string | null;
    const heroSlidesRaw         = formData.get('hero_slides') as string | null;
    // SMTP config fields
    const smtpHost              = formData.get('smtp_host') as string | null;
    const smtpPort              = formData.get('smtp_port') as string | null;
    const smtpSecure            = formData.get('smtp_secure') as string | null;
    const smtpUsername          = formData.get('smtp_username') as string | null;
    const smtpPassword          = formData.get('smtp_password') as string | null; // empty string = keep existing

    const updates: Array<{ key: string; value: Record<string, unknown> }> = [];

    // ── File uploads ──────────────────────────────────────────────────────────

    /**
     * Helper: extract the storage path from a Supabase public URL.
     * e.g. "https://xxx.supabase.co/storage/v1/object/public/system-assets/logo-123.png"
     *   → "logo-123.png"
     * Returns null if the URL doesn't match the expected pattern.
     */
    function extractStoragePath(publicUrl: string): string | null {
      try {
        const marker = '/storage/v1/object/public/system-assets/';
        const idx = publicUrl.indexOf(marker);
        if (idx === -1) return null;
        return decodeURIComponent(publicUrl.slice(idx + marker.length));
      } catch {
        return null;
      }
    }

    if (logoFile && logoFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(logoFile.type)) {
        return NextResponse.json({ error: 'Logo must be PNG, JPEG, SVG, or ICO' }, { status: 400 });
      }
      if (logoFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Logo must be smaller than 2 MB' }, { status: 400 });
      }

      // Delete the previous logo file from storage to avoid accumulation
      const { data: existingLogo } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'logo_url')
        .single();
      const oldLogoUrl = (existingLogo?.value as { url?: string | null })?.url;
      if (oldLogoUrl) {
        const oldPath = extractStoragePath(oldLogoUrl);
        if (oldPath) {
          await supabaseAdmin.storage.from('system-assets').remove([oldPath]).catch(() => {});
        }
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

      // Delete the previous favicon file from storage
      const { data: existingFavicon } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'favicon_url')
        .single();
      const oldFaviconUrl = (existingFavicon?.value as { url?: string | null })?.url;
      if (oldFaviconUrl) {
        const oldPath = extractStoragePath(oldFaviconUrl);
        if (oldPath) {
          await supabaseAdmin.storage.from('system-assets').remove([oldPath]).catch(() => {});
        }
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

    // ── Contact info ──────────────────────────────────────────────────────────
    if (
      contactOwnerName !== null || contactWhatsapp !== null ||
      contactEmail !== null || contactSupportEmail !== null || contactResponseHours !== null
    ) {
      const { data: existing } = await supabaseAdmin
        .from('system_settings').select('value').eq('key', 'contact_info').single();
      const current = (existing?.value ?? {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...current };
      if (contactOwnerName !== null) merged.owner_name = contactOwnerName;
      if (contactWhatsapp !== null) merged.whatsapp = contactWhatsapp;
      if (contactEmail !== null) merged.email = contactEmail;
      if (contactSupportEmail !== null) merged.support_email = contactSupportEmail;
      if (contactResponseHours !== null) merged.response_hours = Number(contactResponseHours);
      updates.push({ key: 'contact_info', value: merged });
    }

    // ── Bank details ──────────────────────────────────────────────────────────
    if (bankName !== null || bankAccountName !== null || bankAccountNumber !== null || bankBranch !== null) {
      const { data: existing } = await supabaseAdmin
        .from('system_settings').select('value').eq('key', 'bank_details').single();
      const current = (existing?.value ?? {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...current };
      if (bankName !== null) merged.bank_name = bankName;
      if (bankAccountName !== null) merged.account_name = bankAccountName;
      if (bankAccountNumber !== null) merged.account_number = bankAccountNumber;
      if (bankBranch !== null) merged.branch = bankBranch;
      updates.push({ key: 'bank_details', value: merged });
    }

    // ── Hero slides ───────────────────────────────────────────────────────────
    if (heroSlidesRaw !== null) {
      try {
        const slides = JSON.parse(heroSlidesRaw);
        if (!Array.isArray(slides)) throw new Error('hero_slides must be an array');
        updates.push({ key: 'hero_slides', value: slides as unknown as Record<string, unknown> });
      } catch {
        return NextResponse.json({ error: 'Invalid hero_slides JSON' }, { status: 400 });
      }
    }

    // ── SMTP config ───────────────────────────────────────────────────────────
    if (smtpHost !== null || smtpPort !== null || smtpSecure !== null || smtpUsername !== null || smtpPassword !== null) {
      // Fetch existing to merge (so we never wipe the password if not re-entered)
      const { data: existingSmtp } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'smtp_config')
        .single();
      const current = (existingSmtp?.value ?? {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...current };

      if (smtpHost !== null) merged.host = smtpHost;
      if (smtpPort !== null) {
        const port = Number(smtpPort);
        if (isNaN(port) || port < 1 || port > 65535) {
          return NextResponse.json({ error: 'SMTP port must be between 1 and 65535' }, { status: 400 });
        }
        merged.port = port;
      }
      if (smtpSecure !== null) merged.secure = smtpSecure === 'true';
      if (smtpUsername !== null) merged.username = smtpUsername;
      // Only update password if a non-empty value was submitted
      if (smtpPassword !== null && smtpPassword.trim() !== '') merged.password = smtpPassword;

      // Sync sender_name and sender_address from the email settings if present
      const senderNameVal = formData.get('email_sender_name') as string | null;
      const senderAddrVal = formData.get('email_sender_address') as string | null;
      if (senderNameVal !== null) merged.sender_name = senderNameVal;
      if (senderAddrVal !== null) merged.sender_address = senderAddrVal;

      updates.push({ key: 'smtp_config', value: merged });
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
