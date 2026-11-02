import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = path.resolve('dataset-report-results');

test.beforeAll(() => {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
});

test.describe('Génération du Rapport Visuel - Dataset Vérité Terrain (Ground Truth)', () => {
  test.setTimeout(180000); // 3 minutes timeout

  test('01. Évaluation sur les photos avec vérités-terrain (mineurs & adultes)', async ({ page }) => {
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text());
    });

    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    // ==========================================
    // 1. CAS 1: 1 Enfant seul (7 ans)
    // Vérité terrain: 1 visage détecté, 1 mineur flouté (100%)
    // ==========================================
    console.log('-> Traitement Cas 1: 1 Enfant seul (7 ans)...');
    await page.getByRole('button', { name: /1 Enfant \(7 ans\)/i }).click();
    await expect(page.locator('text=enfant_7ans.jpg')).toBeVisible();

    await page.getByRole('button', { name: /Tout anonymiser/i }).click();
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 25000 });

    // Ouvrir aperçu comparatif
    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-single-child-slider-50.png') });

    // Vue côte-à-côte
    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-single-child-side-by-side.png') });
    await page.keyboard.press('Escape');

    // Vider la file
    await page.getByRole('button', { name: /Vider/i }).click();
    await page.waitForTimeout(300);

    // ==========================================
    // 2. CAS 2: 2 Enfants (8 et 10 ans)
    // Vérité terrain: 2 visages détectés, 2 mineurs floutés (100%)
    // ==========================================
    console.log('-> Traitement Cas 2: 2 Enfants (8-10 ans)...');
    await page.getByRole('button', { name: /2 Enfants \(8-10 ans\)/i }).click();
    await expect(page.locator('text=deux_enfants_ecole.jpg')).toBeVisible();

    await page.getByRole('button', { name: /Tout anonymiser/i }).click();
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 25000 });

    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-two-children-slider-50.png') });

    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-two-children-side-by-side.png') });
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Vider/i }).click();
    await page.waitForTimeout(300);

    // ==========================================
    // 3. CAS 3: Mixte Adulte & Enfant (Père et Fille)
    // Vérité terrain: 2 visages détectés.
    // Âge estimé père ~ 38 ans (> 16 ans) -> VISAGE PRÉSERVÉ (non flouté)
    // Âge estimé fille ~ 6 ans (<= 16 ans) -> VISAGE FLOUTÉ
    // ==========================================
    console.log('-> Traitement Cas 3: Mixte Adulte & Enfant (Père & Fille)...');
    await page.getByRole('button', { name: /Père & Fille \(Mixte\)/i }).click();
    await expect(page.locator('text=pere_et_fille.jpg')).toBeVisible();

    await page.getByRole('button', { name: /Tout anonymiser/i }).click();
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 25000 });

    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-adult-and-child-slider-50.png') });

    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-adult-and-child-side-by-side.png') });
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Vider/i }).click();
    await page.waitForTimeout(300);

    // ==========================================
    // 4. CAS 4: Classe (1 Professeure + 3 Élèves) en mode Hybride
    // Vérité terrain: 4 visages détectés.
    // 1 Adulte préservé, 3 Enfants masqués avec badge/sticker hybride
    // ==========================================
    console.log('-> Traitement Cas 4: Classe (1 Professeure + 3 Élèves)...');
    await page.getByRole('button', { name: /3. Hybride/i }).click();

    await page.getByRole('button', { name: /Classe \(1 Prof \+ 3 Élèves\)/i }).click();
    await expect(page.locator('text=classe_prof_et_eleves.jpg')).toBeVisible();

    await page.getByRole('button', { name: /Tout anonymiser/i }).click();
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 30000 });

    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-classroom-hybrid-slider-50.png') });

    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04-classroom-hybrid-side-by-side.png') });
    await page.keyboard.press('Escape');
  });

  test('02. Évaluation sur la vidéo via FFmpeg.wasm', async ({ page }) => {
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text());
    });

    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    console.log('-> Traitement Cas 5: Vidéo Enfant en Mouvement via FFmpeg.wasm...');
    await page.getByRole('button', { name: /Clip Vidéo \(WebM\)/i }).click();
    await expect(page.locator('text=video_enfant_anime.webm')).toBeVisible();

    await page.getByRole('button', { name: /Tout anonymiser/i }).click();

    // Attente de l'encodage complet
    await expect(page.getByText('Succès')).toBeVisible({ timeout: 90000 });
    console.log('-> Vidéo traitée avec succès !');

    // Ouvrir aperçu vidéo
    await page.getByTitle('Aperçu Comparatif (Slider Avant/Après)').click();
    await page.waitForTimeout(800);

    const pauseBtn = page.getByTitle('Pause');
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
    }

    // Capture Moment 1: t ~ 0.4s (Slider 50%)
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        v.currentTime = 0.4;
      });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-video-moment-1-t0.4s-slider50.png') });

    // Moment 1 côte-à-côte
    await page.getByRole('button', { name: /Côte-à-côte/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-video-moment-1-t0.4s-side-by-side.png') });

    // Moment 2: t ~ 1.0s
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        v.currentTime = 1.0;
      });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-video-moment-2-t1.0s-side-by-side.png') });

    // Moment 3: t ~ 1.6s
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        v.currentTime = 1.6;
      });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-video-moment-3-t1.6s-side-by-side.png') });

    // Moment 4: t ~ 2.2s
    await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        v.currentTime = 2.2;
      });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05-video-moment-4-t2.2s-side-by-side.png') });

    console.log('-> Toutes les captures de validation ont été générées !');
  });
});
