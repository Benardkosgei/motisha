import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { EditCourseClient } from './EditCourseClient';

/**
 * Server component — fetches the course before rendering so the page
 * arrives fully populated with no client-side loading skeleton.
 */
export default async function EditCoursePage({
  params,
}: {
  params: { id: string };
}) {
  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('*')
    .eq('id', params.id)
    .eq('type', 'Course')
    .single();

  if (error || !data) {
    notFound();
  }

  return <EditCourseClient course={data} />;
}
