'use client';

import React, { useEffect, useState } from 'react';

interface SlideAnalysis {
  id: string;
  type: string;
  title: string;
  slide_title: string | null;
  status: string;
  publish_at: string | null;
  published_at: string | null;
  access_tier: string;
  icon: string | null;
  premium: boolean;
  issues: string[];
  isVisible: boolean;
}

interface DebugResponse {
  summary: {
    total_slide_enabled: number;
    visible_slides: number;
    issues_found: number;
  };
  visible_slides: unknown[];
  all_slides_with_analysis: SlideAnalysis[];
  query_used: {
    slide_enabled: boolean;
    status: string;
    publish_at_lte: string;
  };
}

export default function DebugSlidesPage() {
  const [data, setData] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/debug-slides')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading diagnostic data...</div>;
  if (error) return <div style={{ padding: 40, color: 'red' }}>Error: {error}</div>;
  if (!data) return <div style={{ padding: 40 }}>No data</div>;

  return (
    <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 30, fontSize: 28 }}>Hero Sliders Diagnostic</h1>

      {/* Summary */}
      <div style={{ 
        padding: 24, 
        background: '#f8f9fa', 
        borderRadius: 12, 
        marginBottom: 32,
        border: '2px solid #e9ecef'
      }}>
        <h2 style={{ marginBottom: 16, fontSize: 20 }}>📊 Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>Total with slide_enabled</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0ea5e9' }}>
              {data.summary.total_slide_enabled}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>Visible on HomeTab</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
              {data.summary.visible_slides}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>With Issues</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>
              {data.summary.issues_found}
            </div>
          </div>
        </div>
      </div>

      {/* Query Info */}
      <div style={{ 
        padding: 16, 
        background: '#f8f9fa', 
        borderRadius: 8, 
        marginBottom: 32,
        fontSize: 13,
        fontFamily: 'monospace'
      }}>
        <strong>Query used:</strong> slide_enabled = true AND status = &apos;published&apos; AND publish_at &lt;= {data.query_used.publish_at_lte.split('T')[0]}
      </div>

      {/* All Slides Analysis */}
      <h2 style={{ marginBottom: 16, fontSize: 20 }}>🔍 All Content with slide_enabled = true</h2>
      
      {data.all_slides_with_analysis.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#fff3cd', borderRadius: 8, border: '2px solid #ffc107' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>⚠️ No content found with slide_enabled = true</p>
          <p style={{ fontSize: 14, color: '#666' }}>
            Create or edit a content item (Course, Speech, Article, etc.) and check the &quot;Feature on home slider&quot; checkbox.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.all_slides_with_analysis.map(slide => (
            <div 
              key={slide.id} 
              style={{ 
                padding: 20, 
                background: slide.isVisible ? '#d1fae5' : '#fee2e2',
                border: `2px solid ${slide.isVisible ? '#10b981' : '#ef4444'}`,
                borderRadius: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: 16, marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{slide.icon || '📄'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                    {slide.slide_title || slide.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 8 }}>
                    {slide.type} · ID: {slide.id}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: slide.status === 'published' ? '#10b981' : '#fbbf24',
                      color: 'white',
                      borderRadius: 4,
                      fontWeight: 600
                    }}>
                      {slide.status}
                    </span>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: '#6b7280',
                      color: 'white',
                      borderRadius: 4
                    }}>
                      {slide.access_tier}
                    </span>
                    {slide.premium && (
                      <span style={{ 
                        padding: '4px 8px', 
                        background: '#f59e0b',
                        color: 'white',
                        borderRadius: 4,
                        fontWeight: 600
                      }}>
                        PREMIUM
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ 
                  padding: '6px 12px', 
                  background: slide.isVisible ? '#10b981' : '#ef4444',
                  color: 'white',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 12
                }}>
                  {slide.isVisible ? '✓ VISIBLE' : '✗ HIDDEN'}
                </div>
              </div>

              {slide.issues.length > 0 && (
                <div style={{ 
                  padding: 12, 
                  background: 'white', 
                  borderRadius: 6, 
                  border: '1px solid #ef4444'
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#ef4444' }}>
                    Issues ({slide.issues.length}):
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#dc2626' }}>
                    {slide.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {slide.issues.length === 0 && slide.isVisible && (
                <div style={{ 
                  padding: 12, 
                  background: 'white', 
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#059669'
                }}>
                  ✓ This slide meets all requirements and should appear on HomeTab
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Visible Slides JSON */}
      {data.visible_slides.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ marginBottom: 16, fontSize: 20 }}>📦 API Response (visible_slides)</h2>
          <pre style={{ 
            padding: 16, 
            background: '#1e293b', 
            color: '#e2e8f0', 
            borderRadius: 8, 
            fontSize: 12, 
            overflow: 'auto',
            maxHeight: 400
          }}>
            {JSON.stringify(data.visible_slides, null, 2)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        marginTop: 40, 
        padding: 24, 
        background: '#eff6ff', 
        borderRadius: 12,
        border: '2px solid #3b82f6'
      }}>
        <h3 style={{ marginBottom: 12, fontSize: 16, color: '#1e40af' }}>🔧 How to Fix</h3>
        <ol style={{ fontSize: 14, lineHeight: 1.8, color: '#1e3a8a', paddingLeft: 20 }}>
          <li>For each HIDDEN slide above, read the issues listed</li>
          <li>Go to the admin panel and edit that content item</li>
          <li>Fix the issues:
            <ul style={{ marginTop: 8 }}>
              <li>If status is &quot;draft&quot;: Click &quot;Publish Now&quot;</li>
              <li>If publish_at is in future: Change the date to today or earlier</li>
              <li>If missing fields: Add title, icon, etc.</li>
            </ul>
          </li>
          <li>Wait 60 seconds (API cache) or restart dev server</li>
          <li>Refresh this page to verify</li>
          <li>Check HomeTab - slides should now appear</li>
        </ol>
      </div>
    </div>
  );
}
