import { Suspense } from 'react';
import { MotishaApp } from '@/components/MotishaApp';

// MotishaApp uses useSearchParams() which requires a Suspense boundary
// in Next.js 14 App Router to avoid a static-generation bailout.
export default function Home() {
  return (
    <Suspense>
      <MotishaApp />
    </Suspense>
  );
}
