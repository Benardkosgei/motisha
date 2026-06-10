import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/admin/debug-slides
 * 
 * Diagnostic endpoint to help debug why slides aren't showing.
 * Returns detailed info about content rows with slide_enabled = true.
 */
export async function GET() {
  try {
    // Query all content with slide_enabled = true (regardless of status)
    const { data: allSlides, error: allError } = await supabaseAdmin
      .from('contents')
      .select('id, type, title, status, publish_at, published_at, slide_enabled, slide_expires_at, slide_title, slide_tag, slide_sub, slide_accent, icon, description, premium, access_tier')
      .eq('slide_enabled', true)
      .order('created_at', { ascending: false });

    if (allError) throw allError;

    // Query slides that should show (published + publish_at in past)
    const now = new Date().toISOString();
    const { data: visibleSlides, error: visibleError } = await supabaseAdmin
      .from('contents')
      .select('id, type, title, status, publish_at, slide_enabled, slide_expires_at, slide_title')
      .eq('slide_enabled', true)
      .eq('status', 'published')
      .lte('publish_at', now)
      .or(`slide_expires_at.is.null,slide_expires_at.gt.${now}`)
      .order('publish_at', { ascending: false })
      .limit(6);

    if (visibleError) throw visibleError;

    // Analyze each slide to identify issues
    const analysis = (allSlides ?? []).map(slide => {
      const issues: string[] = [];
      
      if (slide.status !== 'published') {
        issues.push(`Status is '${slide.status}' (must be 'published')`);
      }
      
      if (!slide.publish_at) {
        issues.push('publish_at is null');
      } else if (new Date(slide.publish_at) > new Date()) {
        issues.push(`publish_at is in the future: ${slide.publish_at}`);
      }

      if (slide.slide_expires_at && new Date(slide.slide_expires_at) <= new Date()) {
        issues.push(`Slide expired on: ${slide.slide_expires_at}`);
      }
      
      if (!slide.slide_title && !slide.title) {
        issues.push('No title (both slide_title and title are null)');
      }
      
      if (!slide.icon) {
        issues.push('icon is null');
      }

      const isVisible = slide.status === 'published' && 
                       slide.publish_at && 
                       new Date(slide.publish_at) <= new Date() &&
                       (!slide.slide_expires_at || new Date(slide.slide_expires_at) > new Date());
      
      return {
        id: slide.id,
        type: slide.type,
        title: slide.title,
        slide_title: slide.slide_title,
        status: slide.status,
        publish_at: slide.publish_at,
        published_at: slide.published_at,
        slide_expires_at: slide.slide_expires_at ?? null,
        access_tier: slide.access_tier,
        icon: slide.icon,
        premium: slide.premium,
        issues,
        isVisible,
      };
    });

    return NextResponse.json({
      summary: {
        total_slide_enabled: allSlides?.length ?? 0,
        visible_slides: visibleSlides?.length ?? 0,
        issues_found: analysis.filter(a => a.issues.length > 0).length,
      },
      visible_slides: visibleSlides,
      all_slides_with_analysis: analysis,
      query_used: {
        slide_enabled: true,
        status: 'published',
        publish_at_lte: now,
      },
    });
  } catch (err) {
    console.error('[admin/debug-slides] GET error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
