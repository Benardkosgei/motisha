'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { C } from '@/components/Logo';
import { NewsletterForm, type NewsletterData } from '@/components/admin/NewsletterForm';

export default function NewNewsletterPage() {
  const router = useRouter();

  function handleSuccess(_newsletter: NewsletterData) {
    router.push('/admin/newsletters');
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/newsletters"
          style={{ color: C.gray, fontSize: '0.78rem', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          ← Back to Newsletters
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans', sans-serif" }}>
          Create New Newsletter
        </h1>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
          Upload a PDF or Word document to create a new newsletter.
        </p>
      </div>

      <div style={{ background: C.navyMid, borderRadius: 12, border: `1px solid rgba(14,165,233,0.15)`, padding: 28, maxWidth: 680 }}>
        <NewsletterForm initialData={{}} onSuccess={handleSuccess} mode="create" />
      </div>
    </div>
  );
}
