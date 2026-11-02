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

  test('02. Traitement d’une photo, réglage du slider de flou & Preview live', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    // Click on demo sample: 1 Enfant (7 ans)
    const childBtn = page.getByRole('button', { name: /1 Enfant \(7 ans\)/i });
    await expect(childBtn).toBeVisible();
    await childBtn.click();

    // Verify item appeared in queue
    const queueItem = page.locator('text=enfant_7ans.jpg');
    await expect(queueItem).toBeVisible();

    // Adjust blur slider in settings to 50px using preset button
    const presetFort = page.getByRole('button', { name: /50px \(Fort\)/i });
    await expect(presetFort).toBeVisible();
    await presetFort.click();
    await expect(page.getByText('50 px')).toBeVisible();

    // Click "Tout anonymiser"
    const processBtn = page.getByRole('button', { name: /Tout anonymiser/i });
    await processBtn.click();

    // Wait for success status
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 25000 });

    // Open Preview modal
    const previewBtn = page.getByTitle('Aperçu Comparatif (Slider Avant/Après)');
    await previewBtn.click();

    // Verify Preview modal is opened with Diff Slider and new blur controls
    await expect(page.getByText('Slider Diff 50%')).toBeVisible();
    await expect(page.getByText('AVANT (ORIGINAL)')).toBeVisible();
    await expect(page.getByText('APRÈS (ANONYMISÉ)')).toBeVisible();
    await expect(page.locator('text=Flou :')).toContainText('50 px');
    await expect(page.getByRole('button', { name: /Appliquer ce flou/i })).toBeVisible();

    // Take screenshot of 50% slider diff with 50px blur
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

  test('03. Traitement Photo en Mode Hybride (Flou + Sticker Bouclier)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    // Change mask mode to Hybride in settings panel
    const hybridModeBtn = page.getByRole('button', { name: /3. Hybride/i });
    await hybridModeBtn.click();

    // Click on demo sample: 2 Enfants (8-10 ans)
    const groupBtn = page.getByRole('button', { name: /2 Enfants \(8-10 ans\)/i });
    await groupBtn.click();

    // Wait for file in queue
    await expect(page.locator('text=deux_enfants_ecole.jpg')).toBeVisible();

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
