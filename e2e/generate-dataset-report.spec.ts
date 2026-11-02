import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = path.resolve('dataset-report-results');

test.beforeAll(() => {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
});

test.describe('Génération du Rapport Visuel - Dataset Complet', () => {
  test.setTimeout(180000); // 3 minutes timeout

  test('Générer les captures Avant/Après de tout le dataset', async ({ page }) => {
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text());
    });

    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    // ==========================================
    // 1. DATASET ITEM 1: Photo Portrait Ado/Adulte
    // ==========================================
    console.log('-> Traitement Dataset Item 1: Photo Portrait...');
    await page.getByRole('button', { name: /Photo Portrait/i }).click();
    await expect(page.locator('text=portrait_ado_test.jpg')).toBeVisible();
    await page.getByRole('button', { name: /Tout anonymiser/i }).click();
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 25000 });

    // Open preview
    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-portrait-slider-50.png') });

    // Side by side view
    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-portrait-side-by-side.png') });
    await page.keyboard.press('Escape');

    // Clear queue
    await page.getByRole('button', { name: /Vider/i }).click();
    await page.waitForTimeout(300);

    // ==========================================
    // 2. DATASET ITEM 2: Photo Enfant / Jeune Fille
    // ==========================================
    console.log('-> Traitement Dataset Item 2: Photo Enfant / Jeune Fille...');
    // Load sample-teen.jpg via file input simulation
    const teenBuffer = fs.readFileSync(path.resolve('public/samples/sample-teen.jpg'));
    const dataTransfer = await page.evaluateHandle((data) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(data)], 'jeune_fille_enfant.jpg', { type: 'image/jpeg' });
      dt.items.add(file);
      return dt;
    }, Array.from(teenBuffer));

    await page.dispatchEvent('div.group.relative.cursor-pointer', 'drop', { dataTransfer });
    await expect(page.locator('text=jeune_fille_enfant.jpg')).toBeVisible();

    await page.getByRole('button', { name: /Tout anonymiser/i }).click();
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 25000 });

    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-teen-slider-50.png') });

    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-teen-side-by-side.png') });
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Vider/i }).click();
    await page.waitForTimeout(300);

    // ==========================================
    // 3. DATASET ITEM 3: Photo Groupe d’Enfants (Mode Hybride + Watermark)
    // ==========================================
    console.log('-> Traitement Dataset Item 3: Photo Groupe d’Enfants...');
    // Enable Hybride mode
    await page.getByRole('button', { name: /3. Hybride/i }).click();

    await page.getByRole('button', { name: /Photo Groupe/i }).click();
    await expect(page.locator('text=groupe_enfants_test.jpg')).toBeVisible();

    await page.getByRole('button', { name: /Tout anonymiser/i }).click();
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 30000 });

    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-group-hybrid-slider-50.png') });

    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-group-hybrid-side-by-side.png') });
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Vider/i }).click();
    await page.waitForTimeout(300);

    // ==========================================
    // 4. DATASET ITEM 4: Vidéo Complète (FFmpeg.wasm) & Multi-moments
    // ==========================================
    console.log('-> Traitement Dataset Item 4: Vidéo Piéton & Visages via FFmpeg.wasm...');
    // Switch back to Flou mode for video
    await page.getByRole('button', { name: /1. Flou Gaussien/i }).click();

    await page.getByRole('button', { name: /Clip Vidéo/i }).click();
    await expect(page.locator('text=video_visages_test.webm')).toBeVisible();

    // Start video anonymization
    await page.getByRole('button', { name: /Tout anonymiser/i }).click();

    // Wait for video processing
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 60000 });
    console.log('-> Vidéo traitée avec succès !');

    // Open video preview
    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(800);

    // Pause video to capture specific timestamps
    const pauseBtn = page.getByTitle('Pause');
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
    }

    // Capture Moment 1: t ~ 0.4s (Slider Diff 50%)
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        v.currentTime = 0.4;
      });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-video-moment-1-t0.4s-slider50.png') });

    // Moment 1 in Side by Side
    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-video-moment-1-t0.4s-side-by-side.png') });

    // Capture Moment 2: t ~ 1.0s
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        v.currentTime = 1.0;
      });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-video-moment-2-t1.0s-side-by-side.png') });

    // Capture Moment 3: t ~ 1.6s
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        v.currentTime = 1.6;
      });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-video-moment-3-t1.6s-side-by-side.png') });

    // Capture Moment 4: t ~ 2.2s
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        v.currentTime = 2.2;
      });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-video-moment-4-t2.2s-side-by-side.png') });

    console.log('-> Toutes les captures de la vidéo et du dataset ont été générées avec succès !');
  });
});
