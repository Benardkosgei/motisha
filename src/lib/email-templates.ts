/**
 * lib/email-templates.ts
 *
 * HTML email templates for all transactional emails.
 * Each function returns a { subject, html } object ready for sendMail().
 *
 * Design: dark-navy branded, mobile-responsive, inline styles only
 * (email clients strip <style> blocks).
 */

// ─── Base layout ──────────────────────────────────────────────────────────────

interface LayoutOptions {
  systemName?: string;
  logoUrl?: string | null;
}

function layout(content: string, options?: LayoutOptions): string {
  const systemName = options?.systemName ?? 'Motisha';
  const logoUrl = options?.logoUrl;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${systemName}</title>
</head>
<body style="margin:0;padding:0;background:#0B1628;font-family:'Segoe UI',Arial,sans-serif;color:#CBD5E1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1628;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${logoUrl 
                      ? `<img src="${logoUrl}" alt="${systemName}" style="height:40px;max-width:180px;object-fit:contain;" />`
                      : `<span style="font-size:1.4rem;font-weight:900;color:#0EA5E9;letter-spacing:-0.02em;">${systemName}</span>`
                    }
                  </td>
                  <td align="right">
                    <span style="font-size:0.72rem;color:#475569;text-transform:uppercase;letter-spacing:0.08em;">Inspire · Impact · Transform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#132035;border:1px solid rgba(14,165,233,0.15);border-radius:14px;padding:32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;font-size:0.72rem;color:#334155;line-height:1.6;">
              © ${new Date().getFullYear()} ${systemName} · Kenya<br/>
              You received this email because you have an account on ${systemName}.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:1.4rem;font-weight:900;color:#F1F5F9;line-height:1.2;">${text}</h1>`;
}

function subheading(text: string): string {
  return `<p style="margin:0 0 24px;font-size:0.85rem;color:#64748B;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid rgba(14,165,233,0.12);margin:24px 0;" />`;
}

function ctaButton(label: string, url: string, color = '#0EA5E9'): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:${color};border-radius:10px;">
        <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:0.88rem;font-weight:700;color:#0B1628;text-decoration:none;letter-spacing:0.01em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.8rem;color:#64748B;width:140px;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.8rem;color:#F1F5F9;font-weight:600;">${value}</td>
  </tr>`;
}

function infoTable(rows: [string, string][]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    ${rows.map(([l, v]) => infoRow(l, v)).join('')}
  </table>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export interface WelcomeEmailData {
  name: string;
  email: string;
  trialDays?: number;
  appUrl: string;
  systemName?: string;
  logoUrl?: string | null;
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const sn = data.systemName ?? 'Motisha';
  const trial = data.trialDays ?? 7;
  const html = layout(`
    ${heading(`Welcome to ${sn}, ${data.name}! 🎉`)}
    ${subheading('Your account is ready. Here\'s what you get with your free trial.')}

    <p style="font-size:0.88rem;color:#94A3B8;line-height:1.7;margin:0 0 20px;">
      You now have <strong style="color:#F1F5F9;">${trial} days</strong> of free trial access to explore
      speeches, newsletters, and resources on ${sn}.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${[
        ['✓ Speeches & Newsletters', 'Full access during your trial'],
        ['✓ Resources & Templates', 'Download PDF and Word formats'],
        ['✓ Weekly New Content', 'Fresh content every week'],
        ['🔒 Courses', 'Unlock with a paid subscription'],
      ].map(([f, d]) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:0.82rem;color:#F1F5F9;font-weight:600;">${f}</span>
            <span style="font-size:0.78rem;color:#64748B;margin-left:8px;">${d}</span>
          </td>
        </tr>`).join('')}
    </table>

    ${ctaButton('Open ' + sn, data.appUrl)}

    ${divider()}
    <p style="font-size:0.76rem;color:#475569;margin:0;line-height:1.6;">
      Your trial ends in ${trial} days. After that, subscribe from KES 1,500/month to keep access.
    </p>
  `, { systemName: sn, logoUrl: data.logoUrl });

  return { subject: `Welcome to ${sn} — your ${trial}-day trial has started`, html };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface TrialExpiringEmailData {
  name: string;
  daysLeft: number;
  appUrl: string;
  systemName?: string;
  logoUrl?: string | null;
}

export function trialExpiringEmail(data: TrialExpiringEmailData): { subject: string; html: string } {
  const sn = data.systemName ?? 'Motisha';
  const html = layout(`
    ${heading(`Your trial ends in ${data.daysLeft} day${data.daysLeft !== 1 ? 's' : ''} ⏳`)}
    ${subheading(`Don't lose access to your ${sn} content.`)}

    <p style="font-size:0.88rem;color:#94A3B8;line-height:1.7;margin:0 0 20px;">
      Hi ${data.name}, your free trial expires soon. Subscribe now to keep accessing
      speeches, newsletters, resources — and unlock the full course library.
    </p>

    ${infoTable([
      ['Individual Plan', 'From KES 1,500 / month'],
      ['Admin Plan', 'From KES 6,500 / month (5 accounts)'],
      ['Trial ends', `In ${data.daysLeft} day${data.daysLeft !== 1 ? 's' : ''}`],
    ])}

    ${ctaButton('View Plans & Subscribe', `${data.appUrl}/?tab=pricing`, '#F5A623')}
  `, { systemName: sn, logoUrl: data.logoUrl });

  return {
    subject: `⏳ Your ${sn} trial ends in ${data.daysLeft} day${data.daysLeft !== 1 ? 's' : ''} — subscribe to keep access`,
    html,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface TrialExpiredEmailData {
  name: string;
  appUrl: string;
  systemName?: string;
  logoUrl?: string | null;
}

export function trialExpiredEmail(data: TrialExpiredEmailData): { subject: string; html: string } {
  const sn = data.systemName ?? 'Motisha';
  const html = layout(`
    ${heading('Your free trial has ended 🔒')}
    ${subheading('Subscribe to restore access to all content.')}

    <p style="font-size:0.88rem;color:#94A3B8;line-height:1.7;margin:0 0 20px;">
      Hi ${data.name}, your 7-day free trial on ${sn} has expired.
      Your account is still active — subscribe to unlock speeches, newsletters,
      resources, and the full course library.
    </p>

    ${ctaButton('Subscribe Now', `${data.appUrl}/?tab=pricing`, '#EF4444')}

    ${divider()}
    <p style="font-size:0.76rem;color:#475569;margin:0;line-height:1.6;">
      Plans start from KES 1,500/month. Pay via M-Pesa or bank transfer.
    </p>
  `, { systemName: sn, logoUrl: data.logoUrl });

  return {
    subject: `Your ${sn} trial has ended — subscribe to restore access`,
    html,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface SubscriptionConfirmedEmailData {
  name: string;
  package: 'individual' | 'admin';
  billing: 'monthly' | 'termly' | 'yearly';
  amountKes: number;
  expiresAt: string;   // ISO date string
  receiptNo?: string;
  appUrl: string;
  systemName?: string;
  logoUrl?: string | null;
}

export function subscriptionConfirmedEmail(data: SubscriptionConfirmedEmailData): { subject: string; html: string } {
  const sn = data.systemName ?? 'Motisha';
  const packageLabel = data.package === 'admin' ? 'Admin (School)' : 'Individual';
  const billingLabel = { monthly: 'Monthly', termly: 'Termly', yearly: 'Yearly' }[data.billing];
  const expires = new Date(data.expiresAt).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi',
  });

  const html = layout(`
    ${heading('Subscription Confirmed ✅')}
    ${subheading(`Thank you, ${data.name}. Your ${sn} subscription is now active.`)}

    ${infoTable([
      ['Plan', `${packageLabel} · ${billingLabel}`],
      ['Amount Paid', `KES ${data.amountKes.toLocaleString()}`],
      ...(data.receiptNo ? [['M-Pesa Receipt', data.receiptNo] as [string, string]] : []),
      ['Access Until', expires],
      ['Max Accounts', data.package === 'admin' ? '5 staff accounts' : '1 account'],
    ])}

    <p style="font-size:0.88rem;color:#94A3B8;line-height:1.7;margin:16px 0 0;">
      You now have full access to all ${sn} content including speeches, newsletters,
      resources${data.package === 'admin' ? ', usage analytics, and up to 5 staff accounts' : ', and the full course library'}.
    </p>

    ${ctaButton('Go to ' + sn, data.appUrl)}
  `, { systemName: sn, logoUrl: data.logoUrl });

  return {
    subject: `✅ ${sn} subscription confirmed — ${packageLabel} ${billingLabel}`,
    html,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface BookingConfirmationEmailData {
  name: string;
  email: string;
  serviceType: string;
  eventDate?: string;
  eventVenue?: string;
  message?: string;
  ownerName: string;
  ownerWhatsapp: string;
  appUrl: string;
  systemName?: string;
  logoUrl?: string | null;
}

export function bookingConfirmationEmail(data: BookingConfirmationEmailData): { subject: string; html: string } {
  const sn = data.systemName ?? 'Motisha';
  const html = layout(`
    ${heading('Booking Request Received 📋')}
    ${subheading(`We've received your booking request and will respond within 3 hours.`)}

    ${infoTable([
      ['Name', data.name],
      ['Email', data.email],
      ['Service', data.serviceType],
      ...(data.eventDate ? [['Event Date', data.eventDate] as [string, string]] : []),
      ...(data.eventVenue ? [['Venue', data.eventVenue] as [string, string]] : []),
    ])}

    ${data.message ? `
    <div style="margin:16px 0;padding:14px 16px;background:rgba(14,165,233,0.06);border-left:3px solid #0EA5E9;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:0.82rem;color:#94A3B8;line-height:1.6;">${data.message}</p>
    </div>` : ''}

    ${divider()}
    <p style="font-size:0.82rem;color:#94A3B8;line-height:1.7;margin:0;">
      <strong style="color:#F1F5F9;">${data.ownerName}</strong> will contact you via WhatsApp
      (<a href="https://wa.me/${data.ownerWhatsapp.replace(/\D/g, '')}" style="color:#0EA5E9;">${data.ownerWhatsapp}</a>)
      or email within 3 hours to confirm details and discuss the deposit.
    </p>
  `, { systemName: sn, logoUrl: data.logoUrl });

  return {
    subject: `Booking request received — ${data.serviceType} · ${sn}`,
    html,
  };
}

/** Admin notification when a new booking comes in */
export function bookingAdminNotificationEmail(data: BookingConfirmationEmailData): { subject: string; html: string } {
  const sn = data.systemName ?? 'Motisha';
  const html = layout(`
    ${heading('New Booking Request 🔔')}
    ${subheading('A teacher has submitted a booking request.')}

    ${infoTable([
      ['Name', data.name],
      ['Email', data.email],
      ['Service', data.serviceType],
      ...(data.eventDate ? [['Event Date', data.eventDate] as [string, string]] : []),
      ...(data.eventVenue ? [['Venue', data.eventVenue] as [string, string]] : []),
    ])}

    ${data.message ? `
    <div style="margin:16px 0;padding:14px 16px;background:rgba(14,165,233,0.06);border-left:3px solid #0EA5E9;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-size:0.82rem;color:#94A3B8;line-height:1.6;">${data.message}</p>
    </div>` : ''}

    ${ctaButton('View Bookings Dashboard', `${data.appUrl}/admin/bookings`)}
  `, { systemName: sn, logoUrl: data.logoUrl });

  return {
    subject: `[${sn}] New booking: ${data.serviceType} from ${data.name}`,
    html,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface TestEmailData {
  recipientEmail: string;
  systemName?: string;
  smtpHost: string;
  logoUrl?: string | null;
}

export function testEmail(data: TestEmailData): { subject: string; html: string } {
  const sn = data.systemName ?? 'Motisha';
  const html = layout(`
    ${heading('SMTP Test Successful ✅')}
    ${subheading('Your email configuration is working correctly.')}

    ${infoTable([
      ['SMTP Host', data.smtpHost],
      ['Sent To', data.recipientEmail],
      ['Sent At', new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })],
    ])}

    <p style="font-size:0.82rem;color:#94A3B8;line-height:1.7;margin:16px 0 0;">
      Transactional emails (welcome, subscription confirmations, booking notifications) will
      be delivered using this SMTP configuration.
    </p>
  `, { systemName: sn, logoUrl: data.logoUrl });

  return { subject: `[${sn}] SMTP test email — configuration verified`, html };
}
