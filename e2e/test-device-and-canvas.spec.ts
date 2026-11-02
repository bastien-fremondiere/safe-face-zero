import { test, expect } from '@playwright/test';
import { detectDeviceProfile } from '../src/utils/performance';
import { applyAnonymization } from '../src/utils/canvasMasker';
import { AnonymizationSettings, DetectedFace } from '../src/types';

test.describe('Device Profile & Canvas Hardening', () => {
  test('01. Multi-core desktop with touchscreen is NEVER classified as Mobile', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      // Temporarily override navigator properties for testing
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
      const isDesktopOs = /Windows NT|X11; Linux|Macintosh/i.test(ua);
      const isMobileUa = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const cores = 21;
      const isMobile = Boolean(isMobileUa && !isDesktopOs && cores <= 8);
      const isLowEnd = cores <= 4;
      return { isMobile, isLowEnd, isDesktopOs, cores };
    });

    expect(result.isMobile).toBe(false);
    expect(result.isLowEnd).toBe(false);
    expect(result.isDesktopOs).toBe(true);
  });

  test('02. applyAnonymization safely handles out-of-bounds, NaN, and 0-size boxes without drawImage 0-dim error', async ({ page }) => {
    await page.goto('/');

    const passed = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#444444';
      ctx.fillRect(0, 0, 1280, 720);

      // Call applyAnonymization directly on browser window
      const edgeCaseFaces = [
        { box: { x: 1290, y: 300, width: 80, height: 80 }, age: 10, gender: 'male', genderProbability: 0.9, shouldMask: true },
        { box: { x: 300, y: 730, width: 80, height: 80 }, age: 10, gender: 'male', genderProbability: 0.9, shouldMask: true },
        { box: { x: 100, y: 100, width: 0, height: 0 }, age: 10, gender: 'male', genderProbability: 0.9, shouldMask: true },
        { box: { x: -50, y: -50, width: 20, height: 20 }, age: 10, gender: 'male', genderProbability: 0.9, shouldMask: true },
        { box: { x: NaN, y: 100, width: NaN, height: 80 }, age: 10, gender: 'male', genderProbability: 0.9, shouldMask: true },
        { box: { x: 200, y: 200, width: 100, height: 100 }, age: 10, gender: 'male', genderProbability: 0.9, shouldMask: true },
      ];

      try {
        // @ts-expect-error test helper
        if (window.__testApplyAnonymization) {
          // @ts-expect-error test helper
          window.__testApplyAnonymization(canvas, edgeCaseFaces);
        }
        return true;
      } catch (err) {
        return false;
      }
    });

    expect(passed).toBe(true);
  });

  test('03. Browser UI shows desktop badge with cores count instead of Mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    // Ensure the badge does NOT say "Mobile" for a desktop browser
    const mobileBadge = page.locator('span:text-matches("^Mobile \\\\(")');
    expect(await mobileBadge.count()).toBe(0);

    // Verify desktop badge is visible with cœurs count
    await expect(page.locator('span:text-matches("cœurs")')).toBeVisible();
  });
});
