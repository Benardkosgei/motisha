import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/public/settings
 *
 * Returns non-sensitive system settings for the teacher-facing app.
 * Specifically: contact_info, bank_details, hero_slides.
 * Public — no auth required.
 */

const PUBLIC_KEYS = ['contact_info', 'bank_details', 'hero_slides', 'referral_rates'];

export async function GET() {
  try {
    const [settingsResult, slidesResult] = await Promise.all([
      supabaseAdmin
        .from('system_settings')
        .select('key, value')
        .in('key', PUBLIC_KEYS),
      supabaseAdmin
        .from('contents')
        .select(
          'id, type, title, icon, description, premium, slide_title, slide_tag, slide_sub, slide_accent'
        )
        .eq('slide_enabled', true)
        .eq('status', 'published')
        .lte('publish_at', new Date().toISOString())
        .order('publish_at', { ascending: false })
        .limit(6),
    ]);

    if (settingsResult.error) throw settingsResult.error;
    if (slidesResult.error) throw slidesResult.error;

    const settings: Record<string, unknown> = {};
    for (const row of settingsResult.data ?? []) {
      settings[row.key] = row.value;
    }

    const slideItems = (slidesResult.data ?? []).map((item) => ({
      id: item.id,
      title: item.slide_title || item.title,
      tag:
        item.slide_tag ||
        (item.type === 'Speech'
          ? 'FEATURED SPEECH'
          : item.type === 'Course'
          ? item.premium
            ? 'PREMIUM COURSE'
            : 'COURSE'
          : item.type === 'Newsletter'
          ? 'NEWSLETTER'
          : item.type === 'Article'
          ? 'ARTICLE'
          : 'FEATURED'),
      sub: item.slide_sub || item.description || '',
      icon: item.icon || '📄',
      accent:
        item.slide_accent ||
        (item.type === 'Course'
          ? '#10B981'
          : item.type === 'Newsletter'
          ? '#F5A623'
          : item.type === 'Article'
          ? '#8B5CF6'
          : '#0EA5E9'),
      nav:
        item.type === 'Speech'
          ? 'speeches'
          : item.type === 'Course'
          ? 'courses'
          : item.type === 'Newsletter'
          ? 'newsletters'
          : item.type === 'Article'
          ? 'articles'
          : 'calendar',
    }));

    if (slideItems.length > 0) {
      settings.hero_slides = slideItems;
    }

    return NextResponse.json(settings, {
      headers: {
        // Cache for 2 minutes — contact info rarely changes
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[public/settings] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
