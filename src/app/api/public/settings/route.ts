import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/public/settings
 *
 * Returns non-sensitive system settings for the teacher-facing app.
 * Hero slides are driven exclusively from published content rows with
 * slide_enabled = true — there are no manually-configured hero slides.
 */

const PUBLIC_KEYS = ['contact_info', 'bank_details', 'referral_rates'];

/** Default slides shown when no content has slide_enabled = true yet. */
const FALLBACK_SLIDES = [
  {
    id: undefined,
    title: 'Opening Term Assembly Speech',
    tag: 'WEEK 1 · NEW',
    sub: 'Powerful opening address welcoming students back — ready to deliver',
    icon: '🎤',
    accent: '#0EA5E9',
    nav: 'speeches',
  },
  {
    id: undefined,
    title: 'Financial Freedom for Teachers',
    tag: 'PREMIUM COURSE',
    sub: '10 modules · TSC CPD hours included',
    icon: '💰',
    accent: '#10B981',
    nav: 'courses',
  },
  {
    id: undefined,
    title: 'Student Council Leadership Pack',
    tag: 'THIS WEEK',
    sub: 'Full training guide + meeting scripts + templates',
    icon: '🌟',
    accent: '#F5A623',
    nav: 'resources',
  },
];

const TYPE_NAV: Record<string, string> = {
  Speech:     'speeches',
  Course:     'courses',
  Newsletter: 'newsletters',
  Article:    'articles',
  Resource:   'resources',
  Guide:      'resources',
  Template:   'resources',
};

const TYPE_ACCENT: Record<string, string> = {
  Speech:     '#0EA5E9',
  Course:     '#10B981',
  Newsletter: '#F5A623',
  Article:    '#8B5CF6',
  Resource:   '#A855F7',
  Guide:      '#F97316',
  Template:   '#22C55E',
};

const TYPE_TAG: Record<string, string> = {
  Speech:     'FEATURED SPEECH',
  Course:     'COURSE',
  Newsletter: 'NEWSLETTER',
  Article:    'ARTICLE',
  Resource:   'RESOURCE',
  Guide:      'GUIDE',
  Template:   'TEMPLATE',
};

export async function GET() {
  try {
    const now = new Date().toISOString();
    
    // Log for debugging production issues
    console.log('[public/settings] Fetching slides at:', now);
    
    const [settingsResult, slidesResult] = await Promise.all([
      supabaseAdmin
        .from('system_settings')
        .select('key, value')
        .in('key', PUBLIC_KEYS),

      // Content-driven hero slides — published items with slide_enabled = true that haven't expired
      supabaseAdmin
        .from('contents')
        .select('id, type, title, icon, description, premium, slide_title, slide_tag, slide_sub, slide_accent, slide_expires_at')
        .eq('slide_enabled', true)
        .eq('status', 'published')
        .lte('publish_at', now)
        .or(`slide_expires_at.is.null,slide_expires_at.gt.${now}`)
        .order('publish_at', { ascending: false })
        .limit(6),
    ]);

    if (settingsResult.error) {
      console.error('[public/settings] Settings query error:', settingsResult.error);
      throw settingsResult.error;
    }
    if (slidesResult.error) {
      console.error('[public/settings] Slides query error:', slidesResult.error);
      throw slidesResult.error;
    }
    
    console.log('[public/settings] Found', slidesResult.data?.length ?? 0, 'slides');

    const settings: Record<string, unknown> = {};
    for (const row of settingsResult.data ?? []) {
      settings[row.key] = row.value;
    }

    // Map content rows to HeroSlide shape
    const slideItems = (slidesResult.data ?? []).map((item) => ({
      id:     item.id,
      title:  item.slide_title  || item.title,
      tag:    item.slide_tag    || (item.premium && item.type === 'Course' ? 'PREMIUM COURSE' : ((TYPE_TAG[item.type] ?? 'FEATURED'))),
      sub:    item.slide_sub    || item.description || '',
      icon:   item.icon         || '📄',
      accent: item.slide_accent || ((TYPE_ACCENT[item.type] ?? '#0EA5E9')),
      nav:    (TYPE_NAV[item.type] ?? 'calendar'),
    }));

    // Use content-driven slides when available, otherwise fall back to defaults
    const usingFallback = slideItems.length === 0;
    settings.hero_slides = usingFallback ? FALLBACK_SLIDES : slideItems;
    
    if (usingFallback) {
      console.warn('[public/settings] No slides found, using fallback slides');
    } else {
      console.log('[public/settings] Returning', slideItems.length, 'content slides');
    }

    return NextResponse.json(settings, {
      headers: {
        // Short cache — slides should appear promptly after content is published
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=10',
      },
    });
  } catch (err) {
    console.error('[public/settings] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
