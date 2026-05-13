import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { EditArticleClient } from './EditArticleClient';

/**
 * Server component — fetches the article before rendering so the page
 * arrives fully populated with no client-side loading skeleton.
 */
export default async function EditArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('*')
    .eq('id', params.id)
    .eq('type', 'Article')
    .single();

  if (error || !data) {
    notFound();
  }

  return <EditArticleClient article={data} />;
}
