/**
 * Performance & Hardware Capabilities Detection for SafeFace Zero
 * Optimizes memory and CPU load for mobile devices and low-end hardware.
 */

export interface DeviceProfile {
  isMobile: boolean;
  isLowEnd: boolean;
  cores: number;
  memoryGb: number;
  description: string;
}

export function detectDeviceProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isLowEnd: false,
      cores: 4,
      memoryGb: 8,
      description: 'Environnement serveur',
    };
  }

  const ua = navigator.userAgent || '';
  const cores = navigator.hardwareConcurrency || 4;

  // @ts-expect-error navigator.deviceMemory is standard in Chromium
  const memoryGb = navigator.deviceMemory || 8;

  // Modern Client Hints API check
  // @ts-expect-error navigator.userAgentData is standard in modern Chromium
  const uadMobile = navigator.userAgentData?.mobile;

  // Desktop OS detection (never consider desktop OSes as mobile phones, even with touchscreens)
  const isDesktopOs = /Windows NT|X11; Linux|Macintosh/i.test(ua);

  // Mobile User Agent pattern
  const isMobileUa =
    /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // Only consider as mobile if UA or Client Hints say so, AND it's not a desktop OS, AND core count is typical of a phone/small tablet
  const isMobile =
    uadMobile !== undefined
      ? Boolean(uadMobile && !isDesktopOs && cores <= 8)
      : Boolean(isMobileUa && !isDesktopOs && cores <= 8);

  // Low-end criteria: actual low-spec hardware (<= 4 cores or <= 4 GB RAM)
  const isLowEnd = cores <= 4 || memoryGb <= 4;

  let description = 'PC de bureau standard (Performances optimales)';
  if (cores >= 12) {
    description = `Station de travail puissante (${cores} cœurs)`;
  } else if (isMobile) {
    description = 'Smartphone / Tablette';
  } else if (isLowEnd) {
    description = 'Machine modeste (Mode Éco disponible)';
  }

  return {
    isMobile,
    isLowEnd,
    cores,
    memoryGb,
    description,
  };
}

/**
 * Cooperative yielding to browser event loop
 * Allows browser to repaint progress bars, process UI interactions, and run garbage collection.
 */
export function yieldToEventLoop(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely resolves the absolute base URL for public assets (models, ffmpeg, samples)
 * Handles subpath deployments (like GitHub Pages /safe-face-zero/) even without trailing slash.
 */
export function getAssetBaseUrl(): string {
  if (typeof window === 'undefined') return './';
  let path = window.location.pathname;
  if (!path.endsWith('/')) {
    path = path + '/';
  }
  return `${window.location.origin}${path}`;
}
