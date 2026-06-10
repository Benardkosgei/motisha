import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mailer';

/**
 * POST /api/admin/sub-accounts/invite
 *
 * Sends invitation email to a sub-account member.
 * Called when a school plan admin invites a new team member.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteEmail, roleName, adminName } = body;

    if (!inviteEmail || !roleName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://motisha.co.ke';
    const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME ?? 'Motisha';

    const subject = `${systemName} — School Plan Invitation`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;font-family:'DM Sans',-apple-system,sans-serif;background:#0F172A;">
        <div style="max-width:600px;margin:40px auto;background:#1E293B;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg, #0EA5E9, #0284C7);padding:32px;text-align:center;">
            <h1 style="color:#fff;font-size:1.8rem;font-weight:900;margin:0;">
              ${systemName}
            </h1>
            <p style="color:rgba(255,255,255,0.9);font-size:0.9rem;margin:8px 0 0;">
              Inspire. Impact. Transform.
            </p>
          </div>

          <!-- Content -->
          <div style="padding:32px;color:#E2E8F0;">
            <h2 style="color:#0EA5E9;font-size:1.5rem;font-weight:900;margin:0 0 16px;">
              You've Been Invited! 🎉
            </h2>

            <p style="font-size:0.95rem;line-height:1.7;margin:0 0 20px;color:#94A3B8;">
              ${adminName ? `<strong>${adminName}</strong> has` : 'Your school admin has'} invited you to join their ${systemName} School Plan as <strong style="color:#0EA5E9;">${roleName}</strong>.
            </p>

            <p style="font-size:0.95rem;line-height:1.7;margin:0 0 20px;color:#94A3B8;">
              With this account, you'll get full access to:
            </p>

            <ul style="font-size:0.9rem;line-height:1.8;color:#94A3B8;margin:0 0 24px;padding-left:20px;">
              <li>📚 Complete course library for teachers</li>
              <li>🎤 Weekly speeches and motivational content</li>
              <li>📰 Professional newsletters</li>
              <li>📁 Teaching resources and templates</li>
            </ul>

            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0;">
              <a href="${appUrl}/?tab=profile"
                 style="display:inline-block;background:linear-gradient(135deg, #0EA5E9, #0284C7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:0.95rem;box-shadow:0 4px 16px rgba(14,165,233,0.3);">
                Accept Invitation & Sign Up
              </a>
            </div>

            <p style="font-size:0.85rem;line-height:1.7;margin:24px 0 0;color:#64748B;">
              Click the button above to create your account using this email address. If you already have a ${systemName} account, contact support to link your invitation.
            </p>
          </div>

          <!-- Footer -->
          <div style="background:#0F172A;padding:24px;text-align:center;border-top:1px solid rgba(14,165,233,0.2);">
            <p style="color:#64748B;font-size:0.8rem;margin:0;">
              © ${new Date().getFullYear()} ${systemName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: inviteEmail,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[sub-accounts/invite] error:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}
