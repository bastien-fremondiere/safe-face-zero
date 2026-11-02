import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function main() {
  console.log('Launching Chromium to generate animated face test video...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('about:blank');

  // Read sample-portrait.jpg as base64 to animate inside video
  const imgData = fs.readFileSync(path.join(projectRoot, 'public', 'samples', 'sample-portrait.jpg')).toString('base64');

  const videoBase64 = await page.evaluate(async (b64Img) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${b64Img}`;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(10); // 10 fps
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
        });
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        };

        mediaRecorder.start();

        let frame = 0;
        const totalFrames = 25; // 2.5 seconds at 10 fps

        function draw() {
          if (!ctx) return;
          // Gradient background
          const grad = ctx.createLinearGradient(0, 0, 480, 360);
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(1, '#1e293b');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 480, 360);

          // Animate the face moving across the screen
          const progress = frame / totalFrames;
          const x = 50 + progress * 140;
          const y = 40 + Math.sin(progress * Math.PI) * 20;

          // Draw the real human face from sample-portrait
          ctx.drawImage(img, x, y, 220, 260);

          // Timestamp overlay
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 16px monospace';
          ctx.fillText(`Frame ${frame + 1}/25 - ${(frame * 0.1).toFixed(1)}s`, 20, 30);

          frame++;
          if (frame < totalFrames) {
            setTimeout(draw, 100);
          } else {
            setTimeout(() => mediaRecorder.stop(), 150);
          }
        }

        draw();
      };
    });
  }, imgData);

  const outPath = path.join(projectRoot, 'public', 'samples', 'sample-face-walking.webm');
  fs.writeFileSync(outPath, Buffer.from(videoBase64, 'base64'));
  console.log('Video generated successfully! Saved to:', outPath);
  console.log('File size:', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');

  await browser.close();
}

main().catch(console.error);
