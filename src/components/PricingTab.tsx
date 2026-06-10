'use client';

import React, { useEffect, useState } from 'react';
import { C } from './Logo';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/auth-context';
import type { NavItem } from '@/lib/data';
import { usePublicSettings } from '@/lib/use-public-settings';

interface PricingTabProps {
  profile: Profile | null;
  onNav?: (id: NavItem) => void;
}

type BillingPeriod = 'monthly' | 'termly' | 'yearly';
type PackageType = 'individual' | 'admin';

// Fallback prices shown while loading or if the API fails
const FALLBACK_PRICES: Record<PackageType, Record<BillingPeriod, number>> = {
  individual: { monthly: 1500, termly: 5000, yearly: 12000 },
  admin:      { monthly: 6500, termly: 22500, yearly: 60000 },
};

// Fallback features shown while loading or if the API fails
const FALLBACK_FEATURES: Record<PackageType, string[]> = {
  individual: [
    'All assembly speeches & newsletters',
    'Full course library',
    'Unlimited downloads',
    'PDF + Word formats',
    'Weekly new content',
    'Resources library',
    'Referral commission earnings',
  ],
  admin: [
    'Up to 5 staff accounts',
    'Principal, Deputy, Senior Teacher, DoS, HoD G&C',
    'All content access for each account (same as Individual)',
    'School-wide access',
    'Usage analytics',
    'Priority support',
    'Referral commission earnings (20%)',
  ],
};

interface DbPlan {
  id: string;
  package: PackageType;
  billing: BillingPeriod;
  price_kes: number;
  max_accounts: number;
  features: string[];
}

const BILLING_LABELS: Record<BillingPeriod, string> = {
  monthly: 'Monthly',
  termly: 'Termly',
  yearly: 'Yearly',
};

const BILLING_SAVINGS: Record<BillingPeriod, string | null> = {
  monthly: null,
  termly: 'Save ~11%',
  yearly: 'Save ~33%',
};

interface PaymentModalProps {
  pkg: PackageType;
  billing: BillingPeriod;
  amount: number;
  onClose: () => void;
  profile: Profile | null;
  onPaymentSuccess?: () => void;
}

function PaymentModal({ pkg, billing, amount, onClose, profile, onPaymentSuccess }: PaymentModalProps) {
  const { bank_details, contact_info } = usePublicSettings();
  const [method, setMethod] = useState<'mpesa' | 'bank' | null>(null);
  const [phone, setPhone] = useState(profile?.phone?.replace('+254', '0') ?? '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleMpesa = async () => {
    if (!phone.trim()) { setMessage('Please enter your M-Pesa phone number.'); return; }
    setLoading(true);
    setStatus('pending');
    setMessage('Sending STK push to your phone…');

    try {
      const res = await fetch('/api/payments/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount, package: pkg, billing, userId: profile?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment initiation failed');
      setStatus('success');
      setMessage('✅ Check your phone and enter your M-Pesa PIN to complete payment. Your account will be activated automatically.');
      // Notify parent to refresh the profile once payment is confirmed
      onPaymentSuccess?.();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: 16 }}
    >
      <div style={{ background: C.navyMid, border: `1px solid rgba(14,165,233,0.2)`, borderRadius: 18, padding: 28, maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 id="payment-modal-title" style={{ color: C.white, margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
            Complete Payment
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.gray, cursor: 'pointer', fontSize: '1.2rem' }} aria-label="Close">×</button>
        </div>

        {/* Summary */}
        <div style={{ padding: '14px 16px', borderRadius: 10, background: `${C.teal}10`, border: `1px solid ${C.teal}25`, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem' }}>
                {pkg === 'individual' ? 'Individual' : 'Admin'} Plan · {BILLING_LABELS[billing]}
              </div>
              <div style={{ color: C.gray, fontSize: '0.76rem', marginTop: 2 }}>
                {pkg === 'admin' ? 'Up to 5 accounts' : '1 account'}
              </div>
            </div>
            <div style={{ color: C.mustard, fontWeight: 900, fontSize: '1.3rem' }}>
              KES {amount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Payment method selection */}
        {!method && (
          <>
            <p style={{ color: C.gray, fontSize: '0.82rem', marginBottom: 14 }}>Choose payment method:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setMethod('mpesa')}
                style={{ padding: '16px 20px', borderRadius: 12, background: `${C.success}12`, border: `1px solid ${C.success}30`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <span style={{ fontSize: '1.8rem' }}>📱</span>
                <div>
                  <div style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem' }}>M-Pesa STK Push</div>
                  <div style={{ color: C.gray, fontSize: '0.76rem', marginTop: 2 }}>Enter your PIN on your phone — instant activation</div>
                </div>
              </button>
              <button
                onClick={() => setMethod('bank')}
                style={{ padding: '16px 20px', borderRadius: 12, background: `${C.teal}10`, border: `1px solid ${C.teal}25`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <span style={{ fontSize: '1.8rem' }}>🏦</span>
                <div>
                  <div style={{ color: C.white, fontWeight: 700, fontSize: '0.9rem' }}>Bank Transfer (NBK)</div>
                  <div style={{ color: C.gray, fontSize: '0.76rem', marginTop: 2 }}>Manual transfer — activation within 24 hours</div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* M-Pesa flow */}
        {method === 'mpesa' && status === 'idle' && (
          <div>
            <button onClick={() => setMethod(null)} style={{ background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.8rem', marginBottom: 16, padding: 0 }}>← Back</button>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: C.gray, fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 8, letterSpacing: '0.08em' }}>
                M-PESA PHONE NUMBER
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712345678"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(14,165,233,0.25)`, color: C.white, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
              <p style={{ color: C.gray, fontSize: '0.72rem', marginTop: 6 }}>
                A payment request of <strong style={{ color: C.mustard }}>KES {amount.toLocaleString()}</strong> will be sent to this number.
              </p>
            </div>
            {message && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, color: C.danger, fontSize: '0.82rem', marginBottom: 14 }}>
                {message}
              </div>
            )}
            <button
              onClick={handleMpesa}
              disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', background: loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${C.success}, #059669)`, color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Sending…' : '📱 Send M-Pesa Request'}
            </button>
          </div>
        )}

        {/* M-Pesa pending/success/error */}
        {method === 'mpesa' && status !== 'idle' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
              {status === 'pending' ? '⏳' : status === 'success' ? '✅' : '❌'}
            </div>
            <p style={{ color: status === 'error' ? C.danger : status === 'success' ? C.success : C.white, fontSize: '0.88rem', lineHeight: 1.6 }}>
              {message}
            </p>
            {status === 'error' && (
              <button onClick={() => { setStatus('idle'); setMessage(''); }} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: `${C.teal}20`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer', fontWeight: 700 }}>
                Try Again
              </button>
            )}
            {status === 'success' && (
              <button onClick={onClose} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: `${C.success}20`, color: C.success, border: `1px solid ${C.success}30`, cursor: 'pointer', fontWeight: 700 }}>
                Done
              </button>
            )}
          </div>
        )}

        {/* Bank transfer details */}
        {method === 'bank' && (
          <div>
            <button onClick={() => setMethod(null)} style={{ background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.8rem', marginBottom: 16, padding: 0 }}>← Back</button>
            <div style={{ padding: '18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 16 }}>
              <div style={{ color: C.gray, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>BANK TRANSFER DETAILS</div>
              {[
                { label: 'Bank', value: bank_details.bank_name },
                { label: 'Account Name', value: bank_details.account_name },
                { label: 'Account Number', value: bank_details.account_number },
                { label: 'Amount', value: `KES ${amount.toLocaleString()}` },
                { label: 'Reference', value: profile?.name ?? 'Your Name + Phone' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: C.gray, fontSize: '0.8rem' }}>{row.label}</span>
                  <span style={{ color: C.white, fontWeight: 700, fontSize: '0.8rem', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: `${C.mustard}10`, border: `1px solid ${C.mustard}25`, fontSize: '0.78rem', color: C.offWhite, lineHeight: 1.6 }}>
              💡 After transferring, send your payment confirmation to{' '}
              <strong style={{ color: C.mustard }}>{contact_info.support_email}</strong> or WhatsApp{' '}
              <strong style={{ color: C.mustard }}>{contact_info.whatsapp}</strong> with your name and phone number. Your account will be activated within 24 hours.
            </div>
            <button onClick={onClose} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 10, fontWeight: 700, background: `${C.teal}20`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer', fontSize: '0.88rem' }}>
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PricingTab({ profile, onNav }: PricingTabProps) {
  const { refreshProfile } = useAuth();
  const currentTier = profile?.subscription_tier ?? 'free';
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const [payingFor, setPayingFor] = useState<{ pkg: PackageType; billing: BillingPeriod; amount: number } | null>(null);

  // Live prices fetched from the plans table
  const [prices, setPrices] = useState<Record<PackageType, Record<BillingPeriod, number>>>(FALLBACK_PRICES);
  const [features, setFeatures] = useState<Record<PackageType, string[]>>(FALLBACK_FEATURES);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/plans')
      .then(r => r.ok ? r.json() : null)
      .then((data: { plans?: DbPlan[] } | null) => {
        if (!data?.plans?.length) return;
        const newPrices = { ...FALLBACK_PRICES };
        const newFeatures = { ...FALLBACK_FEATURES };
        for (const plan of data.plans) {
          if (!newPrices[plan.package]) continue;
          newPrices[plan.package] = { ...newPrices[plan.package], [plan.billing]: plan.price_kes };
          // Use DB features for the monthly plan as the canonical feature list
          if (plan.billing === 'monthly' && plan.features?.length) {
            newFeatures[plan.package] = plan.features;
          }
        }
        setPrices(newPrices);
        setFeatures(newFeatures);
      })
      .catch(() => { /* keep fallback */ })
      .finally(() => setPlansLoading(false));
  }, []);

  const isSubscribed = currentTier === 'pro' || currentTier === 'school';

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2.2rem', letterSpacing: '0.08em', marginBottom: 6 }}>
          Simple, Honest Pricing
        </h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>Pay with M-Pesa · Bank Transfer · No hidden fees</p>
      </div>

      {/* Billing period toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', background: C.navyMid, borderRadius: 12, padding: 4, border: `1px solid rgba(14,165,233,0.15)`, gap: 2 }}>
          {(['monthly', 'termly', 'yearly'] as BillingPeriod[]).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: '8px 18px', borderRadius: 9, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: billing === b ? `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` : 'transparent',
                color: billing === b ? '#fff' : C.gray,
                position: 'relative',
              }}
            >
              {BILLING_LABELS[b]}
              {BILLING_SAVINGS[b] && (
                <span style={{ position: 'absolute', top: -8, right: -4, background: C.success, color: '#fff', fontSize: '0.55rem', fontWeight: 800, padding: '2px 5px', borderRadius: 5 }}>
                  {BILLING_SAVINGS[b]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
        {/* Individual Plan */}
        <div style={{
          borderRadius: 18, padding: 24, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${C.teal}15, ${C.navyLight})`,
          border: `1px solid ${C.teal}`,
          boxShadow: `0 0 40px ${C.teal}15`,
        }}>
          <div style={{ position: 'absolute', top: 16, right: 16, background: C.teal, color: '#fff', fontSize: '0.6rem', fontWeight: 900, padding: '3px 9px', borderRadius: 8 }}>
            POPULAR
          </div>
          {currentTier === 'pro' && (
            <div style={{ position: 'absolute', top: 16, left: 16, background: `${C.success}25`, color: C.success, fontSize: '0.6rem', fontWeight: 900, padding: '3px 9px', borderRadius: 8, border: `1px solid ${C.success}40` }}>
              YOUR PLAN
            </div>
          )}
          <div style={{ marginTop: currentTier === 'pro' ? 20 : 0 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>👤</div>
            <h3 style={{ color: C.white, fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>Individual</h3>
            <p style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 16 }}>For a single teacher</p>
            <div style={{ marginBottom: 20 }}>
              <span style={{ color: C.white, fontWeight: 900, fontSize: '2rem' }}>
                {plansLoading ? '…' : `KES ${prices.individual[billing].toLocaleString()}`}
              </span>
              <span style={{ color: C.gray, fontSize: '0.78rem' }}> / {BILLING_LABELS[billing].toLowerCase()}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {features.individual.map(f => (
                <li key={f} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: '#CBD5E1' }}>
                  <span style={{ color: C.teal, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => !isSubscribed && setPayingFor({ pkg: 'individual', billing, amount: prices.individual[billing] })}
              disabled={currentTier === 'pro'}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: '0.85rem',
                background: currentTier === 'pro' ? 'transparent' : `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
                color: currentTier === 'pro' ? C.grayDark : '#fff',
                border: currentTier === 'pro' ? `1px solid ${C.grayDark}40` : 'none',
                cursor: currentTier === 'pro' ? 'default' : 'pointer',
              }}
            >
              {currentTier === 'pro' ? 'Current Plan' : '📱 Subscribe via M-Pesa'}
            </button>
          </div>
        </div>

        {/* Admin Plan */}
        <div style={{
          borderRadius: 18, padding: 24, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${C.mustard}12, ${C.navyLight})`,
          border: `1px solid ${C.mustard}60`,
        }}>
          {currentTier === 'school' && (
            <div style={{ position: 'absolute', top: 16, left: 16, background: `${C.success}25`, color: C.success, fontSize: '0.6rem', fontWeight: 900, padding: '3px 9px', borderRadius: 8, border: `1px solid ${C.success}40` }}>
              YOUR PLAN
            </div>
          )}
          <div style={{ marginTop: currentTier === 'school' ? 20 : 0 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏫</div>
            <h3 style={{ color: C.white, fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>Admin</h3>
            <p style={{ color: C.gray, fontSize: '0.78rem', marginBottom: 16 }}>For school leadership teams · same content as Individual</p>
            <div style={{ marginBottom: 20 }}>
              <span style={{ color: C.white, fontWeight: 900, fontSize: '2rem' }}>
                {plansLoading ? '…' : `KES ${prices.admin[billing].toLocaleString()}`}
              </span>
              <span style={{ color: C.gray, fontSize: '0.78rem' }}> / {BILLING_LABELS[billing].toLowerCase()}</span>
            </div>
            {/* Sub-account roles */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: `${C.mustard}10`, border: `1px solid ${C.mustard}25`, marginBottom: 14 }}>
              <div style={{ color: C.mustard, fontSize: '0.72rem', fontWeight: 700, marginBottom: 6 }}>5 ACCOUNTS INCLUDED</div>
              {['Principal', 'Deputy Principal', 'Senior Teacher', 'DoS', 'HoD Guidance & Counselling'].map(r => (
                <div key={r} style={{ color: C.offWhite, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: C.mustard }}>•</span> {r}
                </div>
              ))}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {features.admin.map(f => (
                <li key={f} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: '#CBD5E1' }}>
                  <span style={{ color: C.mustard, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => currentTier !== 'school' && setPayingFor({ pkg: 'admin', billing, amount: prices.admin[billing] })}
              disabled={currentTier === 'school'}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: '0.85rem',
                background: currentTier === 'school' ? 'transparent' : `linear-gradient(135deg, ${C.mustard}, ${C.mustardDark})`,
                color: currentTier === 'school' ? C.grayDark : C.navy,
                border: currentTier === 'school' ? `1px solid ${C.grayDark}40` : 'none',
                cursor: currentTier === 'school' ? 'default' : 'pointer',
              }}
            >
              {currentTier === 'school' ? 'Current Plan' : '📱 Subscribe via M-Pesa'}
            </button>
          </div>
        </div>
      </div>

      {/* Free trial note */}
      <div style={{ padding: '16px 20px', borderRadius: 12, background: `${C.turquoise}10`, border: `1px solid ${C.turquoise}25`, textAlign: 'center' }}>
        <div style={{ color: C.white, fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>
          🎉 7-Day Free Trial Available
        </div>
        <div style={{ color: C.gray, fontSize: '0.78rem' }}>
          New accounts get a 7-day free trial. Note: courses are not accessible during the trial period.
        </div>
      </div>

      {payingFor && (
        <PaymentModal
          pkg={payingFor.pkg}
          billing={payingFor.billing}
          amount={payingFor.amount}
          profile={profile}
          onClose={() => setPayingFor(null)}
          onPaymentSuccess={() => {
            // Poll for profile update — the M-Pesa callback updates the DB
            // asynchronously, so we retry a few times with a delay.
            let attempts = 0;
            const poll = setInterval(() => {
              refreshProfile().finally(() => {
                attempts++;
                if (attempts >= 6) clearInterval(poll); // stop after ~30s
              });
            }, 5000);
          }}
        />
      )}
    </div>
  );
}
