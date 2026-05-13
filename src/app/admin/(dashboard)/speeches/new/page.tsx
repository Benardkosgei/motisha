'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { C } from '@/components/Logo';
import { SpeechForm, type SpeechData } from '@/components/admin/SpeechForm';

export default function NewSpeechPage() {
  const router = useRouter();

  function handleSuccess(_speech: SpeechData) {
    router.push('/admin/speeches');
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin/speeches"
          style={{
            color: C.gray,
            fontSize: '0.78rem',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 10,
          }}
        >
          ← Back to Speeches
        </Link>
        <h1
          style={{
            margin: 0,
            fontSize: '1.4rem',
            fontWeight: 800,
            color: C.white,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Create New Speech
        </h1>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
          Fill in the details below to create a new speech.
        </p>
      </div>

      {/* Form card */}
      <div
        style={{
          background: C.navyMid,
          borderRadius: 12,
          border: `1px solid rgba(14,165,233,0.15)`,
          padding: 28,
          maxWidth: 680,
        }}
      >
        <SpeechForm
          initialData={{}}
          onSuccess={handleSuccess}
          mode="create"
        />
      </div>
    </div>
  );
}
