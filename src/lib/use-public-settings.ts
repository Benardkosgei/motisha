/**
 * usePublicSettings — fetches non-sensitive system settings for the teacher app.
 * Returns contact info, bank details, referral rates, and hero slides.
 *
 * Hero slides are driven exclusively by published content items that have
 * slide_enabled = true — they are NOT stored in system_settings.
 * Default placeholder slides are shown until content slides are published.
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
  id?: string;      // content row id — used for deep-link navigation via "Open Now"
  title: string;
  tag: string;
  sub: string;
  icon: string;
  accent: string;
  nav: string;       // tab name: speeches | courses | newsletters | articles | resources | calendar
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
    nav: 'speeches',
  },
  {
    title: 'Financial Freedom for Teachers',
    tag: 'PREMIUM COURSE',
    sub: '10 modules · TSC CPD hours included',
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
    nav: 'resources',
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

/**
 * Bust the cache and immediately re-fetch. Returns updated settings.
 * Call this in admin forms after publishing slide-enabled content.
 */
export async function refreshPublicSettings(): Promise<PublicSettings> {
  invalidatePublicSettingsCache();
  return loadSettings();
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

  // Re-fetch when the page regains visibility so slides update
  // after the admin publishes new content in another tab.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        invalidatePublicSettingsCache();
        loadSettings().then(setSettings);
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return { ...settings, loading };
}
