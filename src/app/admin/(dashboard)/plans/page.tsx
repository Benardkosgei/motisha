'use client';

import React, { useEffect, useState } from 'react';
import { C } from '@/components/Logo';

interface Plan {
  id: string;
  package: 'individual' | 'admin';
  billing: 'monthly' | 'termly' | 'yearly';
  price_kes: number;
  max_accounts: number;
  features: string[];
  active_subscribers: number;
  updated_at: string;
}

const PACKAGE_ICONS: Record<string, string> = { individual: '👤', admin: '🏫' };
const PACKAGE_LABELS: Record<string, string> = { individual: 'Individual', admin: 'Admin' };
const BILLING_LABELS: Record<string, string> = { monthly: 'Monthly', termly: 'Termly', yearly: 'Yearly' };

interface EditModalProps {
  plan: Plan;
  onSave: (id: string, updates: Partial<Plan>) => Promise<void>;
  onClose: () => void;
}

function EditModal({ plan, onSave, onClose }: EditModalProps) {
  const [price, setPrice] = useState(String(plan.price_kes));
  const [maxAccounts, setMaxAccounts] = useState(String(plan.max_accounts));
  const [features, setFeatures] = useState<string[]>(plan.features ?? []);
  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: C.navyLight, border: `1px solid rgba(14,165,233,0.2)`,
    color: C.white, fontSize: '0.88rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  };

  async function handleSave() {
    const priceNum = Number(price);
    const maxNum = Number(maxAccounts);
    if (isNaN(priceNum) || priceNum < 0) { setError('Price must be a non-negative number'); return; }
    if (isNaN(maxNum) || maxNum < 1) { setError('Max accounts must be at least 1'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(plan.id, { price_kes: priceNum, max_accounts: maxNum, features });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function addFeature() {
    if (newFeature.trim()) {
      setFeatures((prev) => [...prev, newFeature.trim()]);
      setNewFeature('');
    }
  }

  function removeFeature(idx: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="edit-plan-title"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.2)`, borderRadius: 14, padding: 28, maxWidth: 480, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: '1.4rem' }}>{PACKAGE_ICONS[plan.package]}</span>
          <h3 id="edit-plan-title" style={{ color: C.white, margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            Edit {PACKAGE_LABELS[plan.package]} · {BILLING_LABELS[plan.billing]}
          </h3>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
            Price (KES)
          </label>
          <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
            Max Accounts
          </label>
          <input type="number" min="1" value={maxAccounts} onChange={(e) => setMaxAccounts(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: C.offWhite, fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>
            Features
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.navyLight, borderRadius: 6, padding: '6px 10px' }}>
                <span style={{ flex: 1, color: C.offWhite, fontSize: '0.82rem' }}>✓ {f}</span>
                <button type="button" onClick={() => removeFeature(i)}
                  style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: '0.9rem', padding: '0 4px' }}
                  aria-label={`Remove feature: ${f}`}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={newFeature} onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFeature()}
              placeholder="Add a feature…" style={{ ...inputStyle, flex: 1 }} />
            <button type="button" onClick={addFeature}
              style={{ padding: '10px 16px', borderRadius: 8, background: `rgba(14,165,233,0.15)`, color: C.teal, border: `1px solid rgba(14,165,233,0.3)`, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
              + Add
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" style={{ padding: '8px 12px', borderRadius: 6, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.8rem', marginBottom: 14 }}>
            {error}
          </div>
        )}
        {success && (
          <div role="status" style={{ padding: '8px 12px', borderRadius: 6, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.8rem', marginBottom: 14 }}>
            ✓ Plan saved successfully!
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 8, background: C.navyLight, color: C.white, border: `1px solid rgba(14,165,233,0.3)`, fontWeight: 600, fontSize: '0.82rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 8, background: `linear-gradient(135deg, ${C.teal}, ${C.turquoise})`, color: C.navy, border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      setPlans(data.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(id: string, updates: Partial<Plan>) {
    const res = await fetch(`/api/admin/plans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save plan');
    }
    const updated = await res.json();
    setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
    setSuccessMessage(`${PACKAGE_LABELS[updated.package]} ${BILLING_LABELS[updated.billing]} plan updated.`);
    setTimeout(() => setSuccessMessage(''), 4000);
  }

  const cardStyle: React.CSSProperties = {
    background: C.navyMid, border: `1px solid rgba(14,165,233,0.15)`,
    borderRadius: 14, padding: 24, flex: '1 1 280px', minWidth: 0,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.white, fontFamily: "'DM Sans', sans-serif" }}>
          💳 Subscription Plans
        </h1>
        <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
          Manage pricing, download limits, and features for each plan tier.
        </p>
      </div>

      {successMessage && (
        <div role="status" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.success}18`, border: `1px solid ${C.success}40`, color: C.success, fontSize: '0.85rem', marginBottom: 16 }}>
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div role="alert" style={{ padding: '10px 16px', borderRadius: 8, background: `${C.danger}18`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.85rem', marginBottom: 16 }}>
          {error}
          <button type="button" onClick={fetchPlans} style={{ marginLeft: 12, background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...cardStyle, minHeight: 280 }}>
              {[120, 80, 200, 160, 140].map((w, j) => (
                <div key={j} style={{ height: j === 0 ? 24 : 14, width: w, borderRadius: 6, marginBottom: 14, background: `linear-gradient(90deg, ${C.navyLight} 25%, rgba(14,165,233,0.08) 50%, ${C.navyLight} 75%)`, backgroundSize: '400% 100%', animation: 'shimmer 1.4s infinite' }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {plans.map((plan) => (
            <div key={plan.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.6rem' }}>{PACKAGE_ICONS[plan.package]}</span>
                  <div>
                    <div style={{ color: C.white, fontWeight: 800, fontSize: '1rem' }}>
                      {PACKAGE_LABELS[plan.package]} · {BILLING_LABELS[plan.billing]}
                    </div>
                    <div style={{ color: C.mustard, fontWeight: 700, fontSize: '0.9rem' }}>
                      KES {plan.price_kes.toLocaleString()}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setEditingPlan(plan)}
                  style={{ padding: '6px 14px', borderRadius: 6, background: `rgba(14,165,233,0.12)`, color: C.teal, fontSize: '0.78rem', fontWeight: 600, border: `1px solid rgba(14,165,233,0.25)`, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Edit
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ background: C.navyLight, borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                  <div style={{ color: C.teal, fontWeight: 800, fontSize: '1.2rem' }}>{plan.max_accounts}</div>
                  <div style={{ color: C.gray, fontSize: '0.7rem', marginTop: 2 }}>Max Accounts</div>
                </div>
                <div style={{ background: C.navyLight, borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                  <div style={{ color: C.success, fontWeight: 800, fontSize: '1.2rem' }}>{plan.active_subscribers}</div>
                  <div style={{ color: C.gray, fontSize: '0.7rem', marginTop: 2 }}>Subscribers</div>
                </div>
              </div>

              <div>
                <div style={{ color: C.gray, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Features</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(plan.features ?? []).map((f, i) => (
                    <li key={i} style={{ color: C.offWhite, fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: C.success, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingPlan && (
        <EditModal plan={editingPlan} onSave={handleSave} onClose={() => setEditingPlan(null)} />
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
