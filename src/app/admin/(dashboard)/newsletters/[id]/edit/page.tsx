import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { EditNewsletterClient } from './EditNewsletterClient';

/**
 * Server component — fetches the newsletter before rendering so the page
 * arrives fully populated with no client-side loading skeleton.
 */
export default async function EditNewsletterPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('*')
    .eq('id', params.id)
    .eq('type', 'Newsletter')
    .single();

  if (error || !data) {
    notFound();
  }

  return <EditNewsletterClient newsletter={data} />;
}
