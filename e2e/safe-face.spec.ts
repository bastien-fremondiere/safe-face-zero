import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('e2e-results');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.describe('SafeFace Zero - Suite de Tests E2E', () => {
  test('01. Chargement de l’application & Garantie Zero-Server', async ({ page }) => {
    const externalRequests: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://localhost:4173') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }
    });

    await page.goto('/');

    // Check title and RGPD banner
    await expect(page.locator('h1')).toContainText('SafeFace Zero');
    await expect(page.getByText('Garantie 100% Zero-Server & Conforme RGPD')).toBeVisible();

    // Wait for IA model loading indicator
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-landing-page.png') });

    // Assert that zero external requests were made
    expect(externalRequests).toEqual([]);
  });

  test('02. Traitement d’une photo de portrait & Comparaison Slider Diff 50%', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    // Click on demo sample: Photo Portrait
    const portraitBtn = page.getByRole('button', { name: /Photo Portrait/i });
    await expect(portraitBtn).toBeVisible();
    await portraitBtn.click();

    // Verify item appeared in queue
    const queueItem = page.locator('text=portrait_ado_test.jpg');
    await expect(queueItem).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-sample-portrait-loaded.png') });

    // Click "Tout anonymiser"
    const processBtn = page.getByRole('button', { name: /Tout anonymiser/i });
    await processBtn.click();

    // Wait for success status
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 25000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-portrait-anonymized.png') });

    // Open Preview modal
    const previewBtn = page.getByTitle('Aperçu Comparatif (Slider Avant/Après)');
    await previewBtn.click();

    // Verify Preview modal is opened with Diff Slider
    await expect(page.getByText('Slider Diff 50%')).toBeVisible();
    await expect(page.getByText('AVANT (ORIGINAL)')).toBeVisible();
    await expect(page.getByText('APRÈS (ANONYMISÉ)')).toBeVisible();

    // Take screenshot of 50% slider diff
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-preview-diff-slider-50.png') });

    // Test slider presets: Anonymisé (0%)
    const anonymizedPresetBtn = page.getByRole('button', { name: 'Anonymisé' });
    await anonymizedPresetBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-preview-diff-slider-0.png') });

    // Close preview modal
    await page.keyboard.press('Escape');
    await expect(page.getByText('AVANT (ORIGINAL)')).not.toBeVisible();
  });

  test('03. Traitement Photo de Groupe en Mode Hybride (Flou + Sticker Bouclier)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    // Change mask mode to Hybride in settings panel
    const hybridModeBtn = page.getByRole('button', { name: /3. Hybride/i });
    await hybridModeBtn.click();

    // Click on demo sample: Photo Groupe
    const groupBtn = page.getByRole('button', { name: /Photo Groupe/i });
    await groupBtn.click();

    // Wait for file in queue
    await expect(page.locator('text=groupe_enfants_test.jpg')).toBeVisible();

    // Process all
    const processBtn = page.getByRole('button', { name: /Tout anonymiser/i });
    await processBtn.click();

    // Wait for detection and completion
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 30000 });

    // Open preview
    const previewBtn = page.getByTitle('Aperçu Comparatif (Slider Avant/Après)');
    await previewBtn.click();

    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-group-hybrid-diff-50.png') });

    // Switch to side-by-side mode
    const sideBySideBtn = page.getByRole('button', { name: /Côte-à-côte/i });
    await sideBySideBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-group-hybrid-side-by-side.png') });
  });
});
