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
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) ||
    Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

  const cores = navigator.hardwareConcurrency || 4;

  // @ts-expect-error navigator.deviceMemory is standard in Chromium
  const memoryGb = navigator.deviceMemory || (isMobile ? 4 : 8);

  // Criteria for low-end: mobile OR <= 4 cores OR <= 4 GB RAM
  const isLowEnd = isMobile || cores <= 4 || memoryGb <= 4;

  let description = 'PC de bureau standard (Performances optimales)';
  if (isMobile) {
    description = 'Smartphone / Tablette (Mode Éco recommandé pour éviter les surchauffes)';
  } else if (isLowEnd) {
    description = 'PC modeste (Mode Éco activé pour fluidifier la mémoire vive)';
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
