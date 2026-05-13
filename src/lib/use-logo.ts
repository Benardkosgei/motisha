'use client';

import { useState, useEffect } from 'react';

let cachedLogoUrl: string | null | undefined = undefined; // undefined = not fetched yet

export function useLogo(): string | null {
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(cachedLogoUrl);

  useEffect(() => {
    if (cachedLogoUrl !== undefined) {
      setLogoUrl(cachedLogoUrl);
      return;
    }
    fetch('/api/public/logo')
      .then(r => r.json())
      .then(({ url }) => {
        cachedLogoUrl = url ?? null;
        setLogoUrl(cachedLogoUrl);
      })
      .catch(() => {
        cachedLogoUrl = null;
        setLogoUrl(null);
      });
  }, []);

  return logoUrl ?? null;
}

// Call this after uploading a new logo so the cache is invalidated
export function invalidateLogoCache() {
  cachedLogoUrl = undefined;
  // Also bust the server-side cache
  fetch('/api/public/logo', { method: 'POST' }).catch(() => {});
}
