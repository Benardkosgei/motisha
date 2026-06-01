import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { createClient } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/ThemeToggle";import { PageViewTracker } from '@/components/PageViewTracker';
// ─── Default inline SVG favicon (used when no custom favicon is uploaded) ────
const DEFAULT_FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>" +
  "<rect width='48' height='48' rx='12' fill='%230D1F3C'/>" +
  "<path d='M8 34 L8 18 L24 30 L40 18 L40 34' stroke='%230EA5E9' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/>" +
  "<circle cx='24' cy='30' r='2.5' fill='%23F5A623'/>" +
  "<rect x='12' y='38' width='24' height='3' rx='1.5' fill='%230EA5E9'/>" +
  "</svg>";

/**
 * Fetch the current favicon and system name from system_settings.
 * This runs server-side on every request (no static export), so changes
 * made in Admin → Settings → Branding take effect on the next page load.
 *
 * We use the service-role client directly here because this is a server
 * component and we need to bypass RLS to read system_settings.
 */
async function fetchBrandingSettings(): Promise<{
  faviconUrl: string | null;
  systemName: string;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return { faviconUrl: null, systemName: 'Motisha' };
    }

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data } = await client
      .from('system_settings')
      .select('key, value')
      .in('key', ['favicon_url', 'system_name']);

    const faviconRow = data?.find(r => r.key === 'favicon_url');
    const nameRow    = data?.find(r => r.key === 'system_name');

    const faviconUrl = (faviconRow?.value as { url?: string | null })?.url ?? null;
    const systemName = (nameRow?.value as { name?: string })?.name ?? 'Motisha';

    return { faviconUrl, systemName };
  } catch {
    return { faviconUrl: null, systemName: 'Motisha' };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { faviconUrl, systemName } = await fetchBrandingSettings();

  return {
    title: `${systemName} - Inspire · Impact · Transform`,
    description:
      'Premium content platform for Kenyan teachers. Assembly speeches, newsletters, courses, and templates for CBC-aligned education.',
    icons: {
      icon: faviconUrl ?? DEFAULT_FAVICON,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ThemeToggle />
          <PageViewTracker />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
