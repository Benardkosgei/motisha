'use client';

import React, { useState, useRef } from 'react';
import { C } from './Logo';
import { TYPE_COLORS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const TYPES = ['Speech', 'Newsletter', 'Course', 'Template', 'Guide'] as const;
type ContentType = typeof TYPES[number];

export function AuthorTab() {
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<{ title: string; type: ContentType; desc: string; file: File | null }>({
    title: '', type: 'Speech', desc: '', file: null,
  });
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm(f => ({ ...f, file }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Please enter a title.'); return; }
    if (!session?.user) { setError('You must be signed in.'); return; }
    setError(null);
    setUploading(true);

    let fileUrl: string | null = null;

    // Upload file to Supabase Storage if one was selected
    if (form.file) {
      const ext = form.file.name.split('.').pop();
      const path = `submissions/${session.user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('content-files')
        .upload(path, form.file, { upsert: false });

      if (uploadError) {
        // Storage bucket may not exist yet — proceed without file URL
        console.warn('File upload failed:', uploadError.message);
      } else {
        const { data: urlData } = supabase.storage.from('content-files').getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }
    }

    // Insert submission record
    const { error: insertError } = await supabase.from('author_submissions').insert({
      user_id: session.user.id,
      title: form.title.trim(),
      type: form.type,
      description: form.desc.trim(),
      file_url: fileUrl,
      status: 'pending',
      earnings: 0,
    });

    setUploading(false);

    if (insertError) {
      setError('Submission failed: ' + insertError.message);
      return;
    }

    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(0);
    setForm({ title: '', type: 'Speech', desc: '', file: null });
    setError(null);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 4 }}>Author & Earn</h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>Publish your content on Motisha. Earn commission every time a teacher downloads or accesses it.</p>
      </div>

      {/* Earnings model */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Per Download', value: 'KES 20', icon: '⬇', color: C.teal, note: 'Free content' },
          { label: 'Per Course Sale', value: '30%', icon: '🎓', color: C.mustard, note: 'Revenue share' },
          { label: 'Lifetime Royalty', value: 'KES 340', icon: '💰', color: C.success, note: 'Your earnings so far' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px 14px', borderRadius: 14, background: `${s.color}10`, border: `1px solid ${s.color}25`, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 6 }} aria-hidden="true">{s.icon}</div>
            <div style={{ color: s.color, fontWeight: 900, fontSize: '1.3rem' }}>{s.value}</div>
            <div style={{ color: C.white, fontSize: '0.74rem', fontWeight: 600 }}>{s.label}</div>
            <div style={{ color: C.gray, fontSize: '0.65rem', marginTop: 2 }}>{s.note}</div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <div style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid rgba(14,165,233,0.2)`, background: C.navyMid }}>
          {/* Steps header */}
          <div style={{ display: 'flex', borderBottom: `1px solid rgba(255,255,255,0.07)` }} role="tablist">
            {['Content Details', 'Upload File', 'Review & Submit'].map((s, i) => (
              <button
                key={s}
                role="tab"
                aria-selected={step === i}
                onClick={() => setStep(i)}
                style={{
                  flex: 1, padding: '14px 10px', background: step === i ? `${C.teal}15` : 'transparent',
                  borderBottom: `2px solid ${step === i ? C.teal : 'transparent'}`,
                  color: step === i ? C.teal : C.gray, fontSize: '0.76rem', fontWeight: 700,
                  cursor: 'pointer', border: 'none', borderBottomWidth: 2,
                  borderBottomStyle: 'solid', borderBottomColor: step === i ? C.teal : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ display: 'block', marginBottom: 2, fontSize: '0.65rem', color: step > i ? C.success : 'inherit' }}>
                  {step > i ? '✓ ' : `${i + 1}. `}
                </span>
                {s}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="content-title" style={{ color: C.gray, fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 8, letterSpacing: '0.08em' }}>CONTENT TITLE *</label>
                  <input
                    id="content-title"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. End of Year Assembly Speech – Secondary"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(14,165,233,0.25)`, color: C.white, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ color: C.gray, fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 8, letterSpacing: '0.08em' }}>CONTENT TYPE</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Content type">
                    {TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        aria-pressed={form.type === t}
                        style={{
                          padding: '8px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                          background: form.type === t ? `${TYPE_COLORS[t] || C.teal}25` : 'rgba(255,255,255,0.05)',
                          color: form.type === t ? (TYPE_COLORS[t] || C.teal) : C.gray,
                          border: `1px solid ${form.type === t ? `${TYPE_COLORS[t] || C.teal}40` : 'rgba(255,255,255,0.1)'}`,
                          transition: 'all 0.2s',
                        }}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="content-desc" style={{ color: C.gray, fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 8, letterSpacing: '0.08em' }}>DESCRIPTION</label>
                  <textarea
                    id="content-desc"
                    value={form.desc}
                    onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                    rows={3}
                    placeholder="Describe your content — audience, purpose, what makes it valuable..."
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(14,165,233,0.25)`, color: C.white, fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
                <button
                  onClick={() => setStep(1)}
                  style={{ padding: '12px 24px', borderRadius: 10, fontWeight: 800, fontSize: '0.85rem', background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', border: 'none', cursor: 'pointer', alignSelf: 'flex-end' }}
                >
                  Next: Upload File →
                </button>
              </div>
            )}

            {step === 1 && (
              <div>
                {/* Real file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  aria-label="Upload content file"
                />
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={form.file ? `File selected: ${form.file.name}` : 'Click to upload your file'}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  style={{ border: `2px dashed ${C.teal}40`, borderRadius: 14, padding: '40px 20px', textAlign: 'center', marginBottom: 20, background: `${C.teal}05`, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }} aria-hidden="true">{form.file ? '✅' : '📁'}</div>
                  <div style={{ color: form.file ? C.success : C.white, fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                    {form.file ? `File selected: ${form.file.name}` : 'Click to upload your file'}
                  </div>
                  <div style={{ color: C.gray, fontSize: '0.75rem' }}>PDF, Word, PPTX · Max 50MB</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(0)} style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: '0.84rem', background: 'rgba(255,255,255,0.06)', color: C.gray, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>← Back</button>
                  <button onClick={() => setStep(2)} style={{ flex: 2, padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: '0.84rem', background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', border: 'none', cursor: 'pointer' }}>Review →</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={{ padding: '18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                  <div style={{ color: C.gray, fontSize: '0.72rem', marginBottom: 12, fontWeight: 700, letterSpacing: '0.1em' }}>SUBMISSION PREVIEW</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '2rem' }} aria-hidden="true">{form.type === 'Course' ? '🎓' : '📄'}</div>
                    <div>
                      <div style={{ color: C.white, fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>{form.title || 'Untitled Content'}</div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: `${TYPE_COLORS[form.type] || C.teal}20`, color: TYPE_COLORS[form.type] || C.teal }}>{form.type}</span>
                      {form.file && <div style={{ color: C.gray, fontSize: '0.72rem', marginTop: 6 }}>📎 {form.file.name}</div>}
                      {form.desc && <p style={{ color: C.gray, fontSize: '0.78rem', marginTop: 8, lineHeight: 1.5 }}>{form.desc}</p>}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 10, background: `${C.mustard}10`, border: `1px solid ${C.mustard}25`, marginBottom: 20, fontSize: '0.78rem', color: C.offWhite, lineHeight: 1.6 }}>
                  💡 <strong style={{ color: C.mustard }}>Earning terms:</strong> You'll receive KES 20 per free download and 30% of revenue on paid content. Payments are sent monthly to your M-Pesa.
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.82rem', marginBottom: 16 }}>
                    {error}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: '0.84rem', background: 'rgba(255,255,255,0.06)', color: C.gray, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>← Back</button>
                  <button
                    onClick={handleSubmit}
                    disabled={uploading}
                    style={{ flex: 2, padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: '0.88rem', background: uploading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`, color: uploading ? C.gray : C.navy, border: 'none', cursor: uploading ? 'not-allowed' : 'pointer' }}
                  >
                    {uploading ? 'Uploading…' : '🚀 Submit for Review'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ borderRadius: 18, padding: 40, textAlign: 'center', background: `${C.success}10`, border: `1px solid ${C.success}30` }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }} aria-hidden="true">🎉</div>
          <h3 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em', marginBottom: 8 }}>Submitted for Review!</h3>
          <p style={{ color: C.gray, fontSize: '0.85rem', marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>Your content will be reviewed by the Motisha team within 48 hours. Once approved, it goes live and starts earning.</p>
          <button
            onClick={handleReset}
            style={{ padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', background: `${C.teal}20`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer' }}
          >
            Submit Another
          </button>
        </div>
      )}
    </div>
  );
}
