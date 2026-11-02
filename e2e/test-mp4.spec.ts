import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('Diagnostiquer le traitement vidéo MP4', async ({ page }) => {
  test.setTimeout(120000);

  page.on('console', (msg) => {
    console.log('[BrowserConsole]', msg.type(), msg.text());
  });

  page.on('pageerror', (err) => {
    console.error('[PageError]', err);
  });

  await page.goto('/');
  await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

  // Load sample-face-walking.mp4 (6.2 MB) via drop
  const mp4Buffer = fs.readFileSync(path.resolve('public/samples/sample-face-walking.mp4'));
  const dataTransfer = await page.evaluateHandle((data) => {
    const dt = new DataTransfer();
    const file = new File([new Uint8Array(data)], 'sample-face-walking.mp4', { type: 'video/mp4' });
    dt.items.add(file);
    return dt;
  }, Array.from(mp4Buffer));

  await page.dispatchEvent('div.group.relative.cursor-pointer', 'drop', { dataTransfer });
  await expect(page.locator('text=sample-face-walking.mp4')).toBeVisible();

  // Process all
  await page.getByRole('button', { name: /Tout anonymiser/i }).click();

  // Monitor progress messages
  const interval = setInterval(async () => {
    try {
      const texts = await page.locator('.font-mono.text-blue-400, span:text-matches("Traitement|Découpage|Initialisation|Bascule|Encodage")').allInnerTexts();
      if (texts.length > 0) {
        console.log('[LiveProgress]', texts.join(' | '));
      }
    } catch {}
  }, 2000);

  // Wait for processing to complete or fail
  await expect(page.getByText(/Succès|Erreur/).first()).toBeVisible({ timeout: 120000 });
  clearInterval(interval);

  // Check status
  const isDone = await page.getByText('Succès').isVisible();
  const isError = await page.getByText('Erreur').isVisible();
  console.log('Test result: isDone =', isDone, 'isError =', isError);

  if (isDone) {
    // Open Preview Modal
    await page.getByTitle(/Aperçu Comparatif/).first().click();
    await expect(page.locator('text=Aperçu : sample-face-walking.mp4')).toBeVisible({ timeout: 10000 });

    // Check preview videos exist and have source
    const previewInfo = await page.evaluate(async () => {
      const vids = Array.from(document.querySelectorAll('.fixed video')) as HTMLVideoElement[];
      const details = [];
      for (const v of vids) {
        let size = 0;
        try {
          const res = await fetch(v.src);
          const b = await res.blob();
          size = b.size;
        } catch {}
        details.push({
          src: v.src ? v.src.substring(0, 30) : '',
          blobSize: size,
        });
      }
      return details;
    });
    console.log('Preview videos info:', previewInfo);
    expect(previewInfo.length).toBeGreaterThan(0);
    expect(previewInfo[0].blobSize).toBeGreaterThan(100000); // Must be > 100 KB!

    // Decode the processed video and make sure frames are NOT black
    const lumas = await page.evaluate(async () => {
      const src = (document.querySelector('.fixed video') as HTMLVideoElement).src;
      const v = document.createElement('video');
      v.muted = true;
      v.src = src;
      await new Promise((r) => (v.onloadeddata = r));
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 36;
      const ctx = c.getContext('2d')!;
      const out: number[] = [];
      for (const t of [0.5, 2, 5, 10]) {
        if (t >= v.duration) continue;
        v.currentTime = t;
        await new Promise((r) => (v.onseeked = r));
        ctx.drawImage(v, 0, 0, 64, 36);
        const d = ctx.getImageData(0, 0, 64, 36).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
        out.push(Math.round(s / (d.length / 4)));
      }
      return { lumas: out, duration: v.duration };
    });
    console.log('Processed video mean luminance per sample:', lumas);
    for (const l of lumas.lumas) expect(l).toBeGreaterThan(15);
  }
});
