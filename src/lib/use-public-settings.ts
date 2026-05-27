/**
 * usePublicSettings — fetches non-sensitive system settings for the teacher app.
 * Returns contact info, bank details, and hero slides from system_settings.
 */

import { useEffect, useState } from 'react';

export interface ContactInfo {
  owner_name: string;
  whatsapp: string;
  email: string;
  support_email: string;
  response_hours: number;
}

export interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string;
}

export interface HeroSlide {
  title: string;
  tag: string;
  sub: string;
  icon: string;
  accent: string;
  nav: string;
}

export interface ReferralRates {
  individual: number;
  admin: number;
}

export interface PublicSettings {
  contact_info: ContactInfo;
  bank_details: BankDetails;
  hero_slides: HeroSlide[];
  referral_rates: ReferralRates;
}

// Defaults used while loading or if the API fails
export const DEFAULT_CONTACT: ContactInfo = {
  owner_name: 'Tom Charles',
  whatsapp: '+254768205511',
  email: 'info@motisha.co.ke',
  support_email: 'support@motisha.co.ke',
  response_hours: 3,
};

export const DEFAULT_BANK: BankDetails = {
  bank_name: 'National Bank of Kenya (NBK)',
  account_name: 'Motisha Speaking & Training Services',
  account_number: '01521',
  branch: '',
};

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    title: 'Opening Term Assembly Speech',
    tag: 'WEEK 1 · NEW',
    sub: 'Powerful opening address welcoming students back — ready to deliver',
    icon: '🎤',
    accent: '#0EA5E9',
    nav: 'calendar',
  },
  {
    title: 'Financial Freedom for Teachers',
    tag: 'PREMIUM COURSE',
    sub: '10 modules · 4.5 hrs · TSC CPD hours included',
    icon: '💰',
    accent: '#10B981',
    nav: 'courses',
  },
  {
    title: 'Student Council Leadership Pack',
    tag: 'THIS WEEK',
    sub: 'Full training guide + meeting scripts + templates',
    icon: '🌟',
    accent: '#F5A623',
    nav: 'calendar',
  },
];

export const DEFAULT_REFERRAL_RATES: ReferralRates = {
  individual: 15,
  admin: 20,
};

// Module-level cache so all components share one fetch
let cachedSettings: PublicSettings | null = null;
let fetchPromise: Promise<PublicSettings> | null = null;

/**
 * Bust the in-memory cache so the next usePublicSettings() call re-fetches
 * from the API. Call this after the admin saves any public settings.
 */
export function invalidatePublicSettingsCache() {
  cachedSettings = null;
  fetchPromise = null;
}

async function loadSettings(): Promise<PublicSettings> {
  if (cachedSettings) return cachedSettings;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/public/settings')
    .then(r => (r.ok ? r.json() : null))
    .then((data: Partial<PublicSettings> | null) => {
      const result: PublicSettings = {
        contact_info: { ...DEFAULT_CONTACT, ...(data?.contact_info ?? {}) },
        bank_details: { ...DEFAULT_BANK, ...(data?.bank_details ?? {}) },
        hero_slides:
          Array.isArray(data?.hero_slides) && data.hero_slides.length > 0
            ? data.hero_slides
            : DEFAULT_HERO_SLIDES,
        referral_rates: { ...DEFAULT_REFERRAL_RATES, ...(data?.referral_rates ?? {}) },
      };
      cachedSettings = result;
      return result;
    })
    .catch(() => ({
      contact_info: DEFAULT_CONTACT,
      bank_details: DEFAULT_BANK,
      hero_slides: DEFAULT_HERO_SLIDES,
      referral_rates: DEFAULT_REFERRAL_RATES,
    }));

  return fetchPromise;
}

export function usePublicSettings(): PublicSettings & { loading: boolean } {
  const [settings, setSettings] = useState<PublicSettings>({
    contact_info: DEFAULT_CONTACT,
    bank_details: DEFAULT_BANK,
    hero_slides: DEFAULT_HERO_SLIDES,
    referral_rates: DEFAULT_REFERRAL_RATES,
  });
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }
    loadSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  return { ...settings, loading };
}
