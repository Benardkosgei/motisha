import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/health/slides
 * 
 * Health check endpoint to verify slides are working.
 * Returns detailed diagnostic information.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: {
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      node_env: process.env.NODE_ENV,
    },
  };

  try {
    // Test database connection
    const { data: testData, error: testError } = await supabaseAdmin
      .from('contents')
      .select('id')
      .limit(1);

    if (testError) {
      diagnostics.database_connection = 'ERROR';
      diagnostics.database_error = testError.message;
    } else {
      diagnostics.database_connection = 'OK';
      diagnostics.sample_content_exists = (testData?.length ?? 0) > 0;
    }

    // Query slides
    const now = new Date().toISOString();
    const { data: slides, error: slidesError, count } = await supabaseAdmin
      .from('contents')
      .select('id, title, type, slide_enabled, status, publish_at', { count: 'exact' })
      .eq('slide_enabled', true);

    if (slidesError) {
      diagnostics.slides_query = 'ERROR';
      diagnostics.slides_error = slidesError.message;
    } else {
      diagnostics.slides_query = 'OK';
      diagnostics.total_slide_enabled = count ?? 0;
      
      const published = slides?.filter(s => s.status === 'published') ?? [];
      const visible = published.filter(s => s.publish_at && new Date(s.publish_at) <= new Date(now));
      
      diagnostics.slide_breakdown = {
        total_slide_enabled: slides?.length ?? 0,
        published: published.length,
        visible_now: visible.length,
        sample_slides: visible.slice(0, 3).map(s => ({
          id: s.id,
          title: s.title,
          type: s.type,
          status: s.status,
          publish_at: s.publish_at,
        })),
      };
    }

    // Test the actual API endpoint
    try {
      const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const apiResponse = await fetch(`${apiUrl}/api/public/settings`);
      const apiData = await apiResponse.json();
      
      diagnostics.api_endpoint_test = {
        status: apiResponse.ok ? 'OK' : 'ERROR',
        status_code: apiResponse.status,
        has_hero_slides: Array.isArray(apiData.hero_slides),
        hero_slides_count: apiData.hero_slides?.length ?? 0,
        is_using_fallback: apiData.hero_slides?.[0]?.title === 'Opening Term Assembly Speech',
      };
    } catch (apiError) {
      diagnostics.api_endpoint_test = {
        status: 'ERROR',
        error: apiError instanceof Error ? apiError.message : 'Unknown error',
      };
    }

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (err) {
    diagnostics.health_check = 'FAILED';
    diagnostics.error = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
