'use client';

import React from 'react';
import { C } from './Logo';
import type { Profile } from '@/lib/auth-context';

interface PricingTabProps {
  profile: Profile | null;
}

export function PricingTab({ profile }: PricingTabProps) {
  const currentRole = profile?.role ?? 'free';

  const PLANS: Array<{
    id: string;
    name: string;
    price: string;
    period: string;
    color: string;
    features: readonly string[];
    cta: string;
    popular?: boolean;
  }> = [
    {
      id: 'free',
      name: 'Free',
      price: 'KES 0',
      period: 'forever',
      color: C.grayDark,
      features: ['5 downloads/month', 'Assembly speeches', 'Basic newsletters', 'Community forum', '1 free course preview'],
      cta: 'Current Plan',
    },
    {
      id: 'pro',
      name: 'Teacher Pro',
      price: 'KES 599',
      period: 'per month',
      color: C.teal,
      features: ['Unlimited downloads', 'All speeches & newsletters', 'Full course library', 'Financial growth content', 'PDF + Word formats', 'Offline access', 'New content weekly', 'TSC CPD hours'],
      cta: 'Upgrade · M-Pesa',
      popular: true,
    },
    {
      id: 'school',
      name: 'School License',
      price: 'KES 18,000',
      period: 'per year',
      color: C.mustard,
      features: ['Up to 50 staff accounts', 'Admin dashboard', 'Usage analytics', 'Custom school branding', 'Priority support', 'TSC hours tracking', 'Bulk content packs', 'Onboarding session'],
      cta: 'Contact Us',
    },
  ];

  const handleUpgrade = (planId: string) => {
    if (planId === 'pro') {
      // In production: integrate M-Pesa STK push or Stripe
      alert('M-Pesa payment integration coming soon. Contact support@motisha.co.ke to upgrade manually.');
    } else if (planId === 'school') {
      window.open('mailto:support@motisha.co.ke?subject=School License Enquiry', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ color: C.white, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '2.2rem', letterSpacing: '0.08em', marginBottom: 6 }}>Simple, Honest Pricing</h2>
        <p style={{ color: C.gray, fontSize: '0.85rem' }}>Pay with M-Pesa · Card · Bank Transfer · No hidden fees</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
        {PLANS.map(p => {
          const isCurrent = currentRole === p.id;
          return (
            <div
              key={p.name}
              style={{
                borderRadius: 18, padding: 22, position: 'relative', overflow: 'hidden',
                background: p.popular ? `linear-gradient(135deg, ${C.teal}15, ${C.navyLight})` : C.navyMid,
                border: `1px solid ${p.popular ? C.teal : `${p.color}30`}`,
                boxShadow: p.popular ? `0 0 40px ${C.teal}15` : 'none',
              }}
            >
              {p.popular && (
                <div style={{ position: 'absolute', top: 16, right: 16, background: C.teal, color: '#fff', fontSize: '0.6rem', fontWeight: 900, padding: '3px 9px', borderRadius: 8 }}>
                  POPULAR
                </div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: 16, left: 16, background: `${C.success}25`, color: C.success, fontSize: '0.6rem', fontWeight: 900, padding: '3px 9px', borderRadius: 8, border: `1px solid ${C.success}40` }}>
                  YOUR PLAN
                </div>
              )}
              <h3 style={{ color: C.white, fontWeight: 800, fontSize: '1rem', marginBottom: 8, marginTop: isCurrent ? 20 : 0 }}>{p.name}</h3>
              <div style={{ marginBottom: 18 }}>
                <span style={{ color: C.white, fontWeight: 900, fontSize: '1.8rem' }}>{p.price}</span>
                <span style={{ color: C.gray, fontSize: '0.78rem' }}> / {p.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: '#CBD5E1' }}>
                    <span style={{ color: p.color, flexShrink: 0 }} aria-hidden="true">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => !isCurrent && handleUpgrade(p.id)}
                disabled={isCurrent}
                aria-disabled={isCurrent}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, fontWeight: 800, fontSize: '0.82rem',
                  background: isCurrent ? 'transparent' : p.popular ? `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` : `${p.color}20`,
                  color: isCurrent ? C.grayDark : p.popular ? '#fff' : p.color,
                  border: isCurrent ? `1px solid ${C.grayDark}40` : p.popular ? 'none' : `1px solid ${p.color}40`,
                  cursor: isCurrent ? 'default' : 'pointer',
                }}
              >
                {isCurrent ? 'Current Plan' : p.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
