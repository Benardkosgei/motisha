/**
 * Generates a device fingerprint based on stable device characteristics.
 * This allows multiple browsers on the same device while blocking different devices.
 * 
 * Uses a combination of:
 * - Screen resolution (stable across browsers)
 * - Timezone (stable across browsers)
 * - Language (stable across browsers)
 * - Platform (OS - stable across browsers)
 * - Hardware concurrency (CPU cores - stable across browsers)
 * 
 * Note: We avoid using User-Agent as it varies between browsers.
 */

export async function generateDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server-side';
  }

  const components: string[] = [];

  // Screen resolution (stable across browsers on same device)
  components.push(`screen:${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);

  // Timezone offset (stable across browsers)
  components.push(`tz:${new Date().getTimezoneOffset()}`);

  // Language (stable across browsers)
  components.push(`lang:${navigator.language}`);

  // Platform/OS (stable across browsers)
  components.push(`platform:${navigator.platform}`);

  // CPU cores (stable across browsers)
  components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);

  // Device memory (if available, stable across browsers)
  if ('deviceMemory' in navigator) {
    components.push(`mem:${(navigator as any).deviceMemory}`);
  }

  // Combine all components
  const fingerprint = components.join('|');

  // Hash the fingerprint for privacy and consistency
  const hash = await simpleHash(fingerprint);
  return hash;
}

/**
 * Simple hash function for browser environments
 */
async function simpleHash(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for older browsers
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Check if the current device matches the stored fingerprint
 */
export async function verifyDeviceFingerprint(storedFingerprint: string): Promise<boolean> {
  const currentFingerprint = await generateDeviceFingerprint();
  return currentFingerprint === storedFingerprint;
}
