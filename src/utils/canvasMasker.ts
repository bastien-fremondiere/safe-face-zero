import { AnonymizationSettings, DetectedFace } from '../types';

/**
 * Creates an in-memory canvas from an HTMLImageElement, HTMLCanvasElement, or ImageBitmap
 */
export function createSourceCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.drawImage(source, 0, 0, width, height);
  }
  return canvas;
}

/**
 * Creates an HTMLImageElement from a URL or Blob
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Default sticker SVG data URL when no custom logo is uploaded for face masking
 */
export const DEFAULT_FACE_STICKER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <circle cx="50" cy="50" r="48" fill="%231e293b" stroke="%2338bdf8" stroke-width="4"/>
  <path d="M50 20v24M50 44l16 16M50 44l-16 16" stroke="%2338bdf8" stroke-width="6" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="44" stroke="%230284c7" stroke-width="2" stroke-dasharray="4 4"/>
  <circle cx="36" cy="40" r="5" fill="%2338bdf8"/>
  <circle cx="64" cy="40" r="5" fill="%2338bdf8"/>
  <path d="M38 65c6 6 18 6 24 0" stroke="%2338bdf8" stroke-width="4" stroke-linecap="round"/>
</svg>`;

/**
 * Default watermark SVG data URL
 */
export const DEFAULT_WATERMARK_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" fill="none">
  <rect width="200" height="50" rx="8" fill="%230f172a" fill-opacity="0.8"/>
  <circle cx="28" cy="25" r="14" fill="%232563eb"/>
  <path d="M28 17s6 3 6 8-6 8-6 8-6-3-6-8 6-8 6-8z" fill="white"/>
  <text x="52" y="32" font-family="sans-serif" font-size="16" font-weight="bold" fill="white">SafeFace Zero</text>
</svg>`;

/**
 * Applies anonymization masks (blur, logo, or hybrid) to all target faces,
 * and then optionally overlays a global watermark.
 */
export function applyAnonymization(
  targetCanvas: HTMLCanvasElement,
  faces: DetectedFace[],
  settings: AnonymizationSettings
): void {
  if (!targetCanvas || targetCanvas.width <= 0 || targetCanvas.height <= 0) return;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const canvasWidth = targetCanvas.width;
  const canvasHeight = targetCanvas.height;

  // Filter faces that should be masked (e.g. age <= threshold)
  const maskedFaces = faces.filter((f) => f && f.shouldMask && f.box);

  // Apply face masking
  for (const face of maskedFaces) {
    const { box } = face;
    const rawX = Number(box.x);
    const rawY = Number(box.y);
    const rawW = Number(box.width);
    const rawH = Number(box.height);

    // Skip if coordinates are invalid or dimensions zero
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(rawW) || !Number.isFinite(rawH)) {
      continue;
    }
    if (rawW <= 2 || rawH <= 2) continue;

    // Skip if face bounding box is entirely outside canvas boundaries
    if (rawX >= canvasWidth || rawY >= canvasHeight || rawX + rawW <= 0 || rawY + rawH <= 0) {
      continue;
    }

    const padding = Math.max(0, Math.min(100, Number(settings.facePadding) || 0)) / 100;
    const padX = rawW * padding;
    const padY = rawH * padding;

    // Expand bounding box with padding and clamp strictly to canvas viewport
    const x = Math.max(0, Math.min(canvasWidth - 2, Math.floor(rawX - padX)));
    const y = Math.max(0, Math.min(canvasHeight - 2, Math.floor(rawY - padY)));
    const w = Math.max(2, Math.min(canvasWidth - x, Math.ceil(rawW + padX * 2)));
    const h = Math.max(2, Math.min(canvasHeight - y, Math.ceil(rawH + padY * 2)));

    if (w <= 2 || h <= 2) continue;

    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const radiusX = w / 2;
    const radiusY = h / 2;

    // 1. PIXEL BLUR / MOSAIC (Pixelation) or HYBRID
    if (settings.maskMode === 'blur' || settings.maskMode === 'hybrid') {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.clip();

      const requestedPixelSize = Math.max(4, Math.min(100, Math.round(settings.blurRadius || 30)));
      // Ensure at least 4 blocks across the face so a single lip pixel does not dominate half the face with reddish artifacts
      const minDimension = Math.min(w, h);
      const effectivePixelSize = Math.max(4, Math.min(requestedPixelSize, Math.max(4, Math.round(minDimension / 4))));

      // Snap coordinates to a global grid to prevent temporal flickering and dancing color blocks in videos
      const gridX = Math.max(0, Math.min(canvasWidth - 1, Math.floor(x / effectivePixelSize) * effectivePixelSize));
      const gridY = Math.max(0, Math.min(canvasHeight - 1, Math.floor(y / effectivePixelSize) * effectivePixelSize));
      const availW = Math.max(1, canvasWidth - gridX);
      const availH = Math.max(1, canvasHeight - gridY);
      const gridW = Math.min(availW, Math.max(1, Math.ceil((x + w - gridX) / effectivePixelSize) * effectivePixelSize));
      const gridH = Math.min(availH, Math.max(1, Math.ceil((y + h - gridY) / effectivePixelSize) * effectivePixelSize));

      if (gridW > 0 && gridH > 0 && targetCanvas.width > 0 && targetCanvas.height > 0) {
        const scaledW = Math.max(1, Math.round(gridW / effectivePixelSize));
        const scaledH = Math.max(1, Math.round(gridH / effectivePixelSize));

        const mosaicCanvas = document.createElement('canvas');
        mosaicCanvas.width = scaledW;
        mosaicCanvas.height = scaledH;
        const mCtx = mosaicCanvas.getContext('2d');

        if (mCtx && mosaicCanvas.width > 0 && mosaicCanvas.height > 0) {
          mCtx.imageSmoothingEnabled = true;
          mCtx.imageSmoothingQuality = 'medium';
          // Step 1: Downscale face region into low-res mosaic canvas
          mCtx.drawImage(targetCanvas, gridX, gridY, gridW, gridH, 0, 0, scaledW, scaledH);

          // Step 2: Upscale back with nearest-neighbor interpolation to render sharp, big pixels
          const prevSmoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          (ctx as unknown as { mozImageSmoothingEnabled?: boolean }).mozImageSmoothingEnabled = false;
          (ctx as unknown as { webkitImageSmoothingEnabled?: boolean }).webkitImageSmoothingEnabled = false;
          (ctx as unknown as { msImageSmoothingEnabled?: boolean }).msImageSmoothingEnabled = false;

          ctx.drawImage(mosaicCanvas, 0, 0, scaledW, scaledH, gridX, gridY, gridW, gridH);

          ctx.imageSmoothingEnabled = prevSmoothing;
        }
      }

      ctx.restore();
    }

    // 2. LOGO, EMOJI or HYBRID (Emoji / Logo portion)
    if (settings.maskMode === 'logo' || settings.maskMode === 'hybrid') {
      const isHybrid = settings.maskMode === 'hybrid';
      const logoImg = settings.faceLogoImage;

      // In hybrid mode, default to '🌈' (rainbow) if no specific emoji or logo is set
      const effectiveEmoji = settings.selectedEmoji ?? (isHybrid && !logoImg ? '🌈' : null);

      if (effectiveEmoji) {
        let emojiToDraw = effectiveEmoji;
        if (emojiToDraw === 'random') {
          emojiToDraw = face.assignedEmoji || FUN_EMOJIS[Math.abs(Math.round(centerX * 31 + centerY * 17)) % FUN_EMOJIS.length];
        }
        drawEmojiSticker(ctx, emojiToDraw, centerX, centerY, radiusX, radiusY, isHybrid);
      } else if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.clip();
        if (isHybrid) {
          const subW = w * 0.75;
          const subH = h * 0.75;
          ctx.drawImage(logoImg, centerX - subW / 2, centerY - subH / 2, subW, subH);
        } else {
          ctx.drawImage(logoImg, x, y, w, h);
        }
        ctx.restore();
      } else {
        drawFallbackSticker(ctx, centerX, centerY, radiusX, radiusY, isHybrid);
      }
    }
  }

  // 3. GLOBAL WATERMARK
  if (settings.watermarkEnabled) {
    applyWatermark(ctx, canvasWidth, canvasHeight, settings);
  }
}

const FUN_EMOJIS = ['😎', '😀', '🥳', '🤩', '😇', '🤠', '🎃', '👻', '🎭', '🐱', '🐶', '🦊', '🐼', '🦁', '🦄', '🤖', '🚀', '⭐', '🎈'];

/**
 * Draws an emoji centered over the face with a subtle backdrop disc in hybrid mode
 */
function drawEmojiSticker(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  isHybrid: boolean
) {
  const r = Math.min(rx, ry) * (isHybrid ? 0.85 : 0.98);
  const fontSize = Math.max(14, Math.round(r * 1.65));

  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = '#000000';

  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Pass 1: Crisp drop shadow for separation from the pixel blur background
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = Math.max(4, r * 0.22);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(1, r * 0.08);
  ctx.fillText(emoji, cx, cy);

  // Pass 2: Draw on top with 100% solid, full-colored opacity without shadow bleed
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(emoji, cx, cy);

  ctx.restore();
}

/**
 * Draws a stylish fallback privacy shield sticker when no custom logo is uploaded
 */
function drawFallbackSticker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  isHybrid: boolean
) {
  const r = Math.min(rx, ry) * (isHybrid ? 0.75 : 0.95);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = isHybrid ? 'rgba(15, 23, 42, 0.92)' : '#0f172a';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  // Draw shield icon inside
  const s = r * 0.55;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.bezierCurveTo(cx + s, cy - s * 0.8, cx + s, cy + s * 0.3, cx, cy + s);
  ctx.bezierCurveTo(cx - s, cy + s * 0.3, cx - s, cy - s * 0.8, cx, cy - s);
  ctx.fillStyle = '#2563eb';
  ctx.fill();

  // Checkmark inside shield
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy);
  ctx.lineTo(cx - s * 0.05, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.3);
  ctx.lineWidth = Math.max(2, s * 0.16);
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.restore();
}

/**
 * Applies the global watermark overlay
 */
function applyWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: AnonymizationSettings
): void {
  const img = settings.watermarkImage;
  const opacity = settings.watermarkOpacity / 100;
  const scale = settings.watermarkScale / 100;

  // Watermark target dimensions
  let wmWidth = width * scale;
  let wmHeight = wmWidth * 0.25; // default 4:1 ratio

  if (img && img.complete && img.naturalWidth > 0) {
    const ratio = img.naturalHeight / img.naturalWidth;
    wmHeight = wmWidth * ratio;
  }

  // Margin (2% of media width, min 10px)
  const margin = Math.max(12, Math.round(width * 0.02));

  let x = margin;
  let y = margin;

  switch (settings.watermarkPosition) {
    case 'top-left':
      x = margin;
      y = margin;
      break;
    case 'top-right':
      x = width - wmWidth - margin;
      y = margin;
      break;
    case 'bottom-left':
      x = margin;
      y = height - wmHeight - margin;
      break;
    case 'bottom-right':
      x = width - wmWidth - margin;
      y = height - wmHeight - margin;
      break;
    case 'center':
      x = (width - wmWidth) / 2;
      y = (height - wmHeight) / 2;
      break;
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, wmWidth, wmHeight);
  } else {
    // Render default built-in watermark badge
    renderDefaultWatermarkBadge(ctx, x, y, wmWidth, wmHeight);
  }

  ctx.restore();
}

/**
 * Renders default SafeFace Zero watermark badge
 */
function renderDefaultWatermarkBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const radius = Math.min(8, h * 0.2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text
  const fontSize = Math.max(10, Math.round(h * 0.42));
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText('SafeFace Zero', x + w * 0.12, y + h / 2);
}
