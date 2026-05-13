import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { EditSpeechClient } from './EditSpeechClient';

/**
 * Server component — fetches the speech before rendering so the page
 * arrives fully populated with no client-side loading skeleton.
 */
export default async function EditSpeechPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('*')
    .eq('id', params.id)
    .eq('type', 'Speech')
    .single();

  if (error || !data) {
    notFound();
  }

  return <EditSpeechClient speech={data} />;
}
