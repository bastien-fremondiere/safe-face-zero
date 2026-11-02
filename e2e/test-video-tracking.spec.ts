import { test, expect } from '@playwright/test';
import { FaceTracker } from '../src/utils/faceTracker';
import { detectVideoFps } from '../src/utils/videoFrameGrabber';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Video Tracking & Cadence Integrity', () => {
  test('01. FaceTracker tracks faces across dropouts and prevents clignotant effect', async () => {
    const tracker = new FaceTracker({ fps: 30, maxCoastingFrames: 6 });

    // Frame 1-3: Face moving smoothly rightward
    for (let f = 1; f <= 3; f++) {
      const detections = [
        {
          box: { x: 100 + f * 10, y: 200, width: 80, height: 80 },
          age: 12,
          gender: 'female',
          genderProbability: 0.9,
          shouldMask: true,
        },
      ];
      const tracked = tracker.update(detections, 1280, 720, 16);
      expect(tracked.length).toBe(1);
      expect(tracked[0].trackId).toBe(1);
      expect(tracked[0].shouldMask).toBe(true);
    }

    // Frame 4-6: Complete AI detector dropout (e.g. tilted head, motion blur, 0 detections)
    for (let f = 4; f <= 6; f++) {
      const tracked = tracker.update([], 1280, 720, 16);
      // Tracker MUST keep the face alive and masked across these frames!
      expect(tracked.length).toBe(1);
      expect(tracked[0].trackId).toBe(1);
      expect(tracked[0].shouldMask).toBe(true);
      // Box should have coasted forward smoothly with velocity
      expect(tracked[0].box.x).toBeGreaterThan(120);
    }

    // Frame 7: Detection returns
    const returnedDetection = [
      {
        box: { x: 170, y: 200, width: 80, height: 80 },
        age: 12,
        gender: 'female',
        genderProbability: 0.9,
        shouldMask: true,
      },
    ];
    const tracked7 = tracker.update(returnedDetection, 1280, 720, 16);
    expect(tracked7.length).toBe(1);
    expect(tracked7[0].trackId).toBe(1); // Same track ID maintained!
  });

  test('02. detectVideoFps extracts accurate native framerate without arbitrary 15 fps limit', async () => {
    const sampleMp4Path = path.resolve('public/samples/sample-face-walking.mp4');
    const buf = fs.readFileSync(sampleMp4Path);
    const file = new File([buf], 'sample-face-walking.mp4', { type: 'video/mp4' });

    const fps = await detectVideoFps(file);
    console.log('Detected FPS for sample-face-walking.mp4:', fps);
    expect(fps).toBe(12);

    // Also test user's uploaded iPhone video if present
    const userVideoPath = '/home/primate/.gemini/antigravity/brain/5f18346d-b2ea-46b1-aef8-f575ab6bf44a/.user_uploaded/media_1793625645302_3b376ad7.mp4';
    if (fs.existsSync(userVideoPath)) {
      const userBuf = fs.readFileSync(userVideoPath);
      const userFile = new File([userBuf], 'IMG_1518.mp4', { type: 'video/mp4' });
      const userFps = await detectVideoFps(userFile);
      console.log('Detected FPS for user video IMG_1518.mp4:', userFps);
      expect(userFps).toBe(30); // Exactly native 30 fps!
    }
  });

  test('03. Settings panel renders video tracking, native cadence (auto) and original resolution', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Prêt (WebGL)')).toBeVisible({ timeout: 20000 });

    // Verify Tracking switch exists and is enabled
    await expect(page.getByText(/Suivi temporel des visages \(Anti-clignotement\)/i)).toBeVisible();
    await expect(page.getByText('Actif').first()).toBeVisible();

    // Verify Resolution selector has "Source" (Plein format / original)
    await expect(page.getByRole('button', { name: /\(Source\)/i })).toBeVisible();

    // Verify FPS selector shows "Cadence d'origine (Auto)"
    await expect(page.getByRole('button', { name: /Cadence d'origine \(Auto\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '30 fps' })).toBeVisible();
    await expect(page.getByRole('button', { name: '60 fps' })).toBeVisible();
  });
});
