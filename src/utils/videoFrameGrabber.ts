/**
 * Robust frame grabbing from an HTMLVideoElement, designed for mobile browsers
 * (Firefox Android, Chrome Android, Safari iOS).
 *
 * Known pitfalls handled here:
 * - Firefox suspends decoding of videos that are not visible in the viewport
 *   ("video decode suspend") → drawImage() returns black frames. The element must
 *   stay inside the viewport (tiny, almost transparent).
 * - Seeking on mobile can take several hundred ms; drawing before the frame is
 *   actually presented yields black/stale frames.
 * - Some decoders only output frames once playback has started at least once.
 */

type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const nextAnimationFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Creates a video element attached INSIDE the viewport so the browser keeps decoding it. */
export function createDecodingVideo(src: string): HTMLVideoElement {
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  video.preload = 'auto';
  // Crucial for Firefox Android & Mobile WebKit: The element must be genuinely visible in the
  // compositor layout (positive z-index, non-zero opacity, real dimensions) so hardware
  // video decode suspension is never triggered.
  Object.assign(video.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    width: '112px',
    height: '63px',
    opacity: '0.9',
    zIndex: '9999',
    borderRadius: '8px',
    border: '2px solid rgba(59, 130, 246, 0.7)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
    objectFit: 'cover',
    pointerEvents: 'none',
    backgroundColor: '#000000',
  } as Partial<CSSStyleDeclaration>);
  video.src = src;
  document.body.appendChild(video);
  return video;
}

function waitEvent(target: EventTarget, event: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      target.removeEventListener(event, onEvent);
      clearTimeout(timer);
      resolve(ok);
    };
    const onEvent = () => finish(true);
    target.addEventListener(event, onEvent);
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

/** Waits until the decoder has actually presented a frame. */
async function waitFramePresented(video: HTMLVideoElement, timeoutMs = 600): Promise<void> {
  const v = video as VideoWithRvfc;
  if (typeof v.requestVideoFrameCallback === 'function') {
    await Promise.race([
      new Promise<void>((r) => v.requestVideoFrameCallback!(() => r())),
      wait(timeoutMs),
    ]);
  } else {
    await nextAnimationFrame();
    await nextAnimationFrame();
  }
}

/** Loads metadata + first frame data and "primes" the decoder with a short muted play. */
export async function prepareVideo(video: HTMLVideoElement): Promise<void> {
  if (video.readyState < 1) {
    const ok = await Promise.race([
      waitEvent(video, 'loadedmetadata', 15000),
      new Promise<boolean>((_, rej) =>
        video.addEventListener('error', () => rej(new Error('Format vidéo non lisible par ce navigateur.')), { once: true })
      ),
    ]);
    if (!ok) throw new Error('Impossible de lire les métadonnées de la vidéo.');
  }
  if (video.readyState < 2) {
    await waitEvent(video, 'loadeddata', 10000);
  }
  // Prime the hardware decoder (required on some Android/Firefox builds)
  try {
    await video.play();
    await Promise.race([waitEvent(video, 'timeupdate', 1500), wait(1500)]);
  } catch {
    /* autoplay may be refused: seeking still works on most browsers */
  }
  video.pause();

  // Ensure intrinsic dimensions are populated (some iPhone/QuickTime MP4s only expose dimensions after initial seek)
  if (!video.videoWidth || !video.videoHeight || video.videoWidth <= 0 || video.videoHeight <= 0) {
    try {
      const seeked = waitEvent(video, 'seeked', 3000);
      video.currentTime = 0.05;
      await seeked;
    } catch {
      /* ignore */
    }
  }
}

let probeCanvas: HTMLCanvasElement | null = null;

/** Returns true when the canvas content is (almost) uniformly black. */
export function isCanvasBlack(source: HTMLCanvasElement): boolean {
  if (!source || source.width <= 0 || source.height <= 0) return false;
  if (!probeCanvas) {
    probeCanvas = document.createElement('canvas');
    probeCanvas.width = 24;
    probeCanvas.height = 24;
  }
  const pctx = probeCanvas.getContext('2d', { willReadFrequently: true });
  if (!pctx) return false;
  pctx.drawImage(source, 0, 0, 24, 24);
  const data = pctx.getImageData(0, 0, 24, 24).data;
  let max = 0;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sum += lum;
    if (lum > max) max = lum;
  }
  const mean = sum / (data.length / 4);
  return max < 12 && mean < 6;
}

async function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  const target = Math.min(Math.max(0, t), Math.max(0, (video.duration || t) - 0.05));
  if (Math.abs(video.currentTime - target) < 0.001 && !video.seeking) {
    await waitFramePresented(video, 300);
    return;
  }
  const seeked = waitEvent(video, 'seeked', 4000);
  video.currentTime = target;
  await seeked;
  await waitFramePresented(video);
}

/**
 * Seeks to `t`, waits for the decoded frame and draws it onto ctx.
 * Retries with a short play/pause nudge when the browser hands back a black frame.
 * Returns false if the frame is still black after retries.
 */
export async function grabFrame(
  video: HTMLVideoElement,
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  checkBlack = false
): Promise<boolean> {
  await seekTo(video, t);
  ctx.drawImage(video, 0, 0, width, height);

  // Skip heavy ReadPixels GPU stall unless explicit validation is requested (first few frames or periodic check)
  if (!checkBlack) return true;
  if (!isCanvasBlack(ctx.canvas)) return true;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await video.play();
      await Promise.race([waitEvent(video, 'timeupdate', 800), wait(800)]);
    } catch {
      /* ignore */
    }
    video.pause();
    await seekTo(video, t);
    await wait(80 * (attempt + 1));
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    if (!isCanvasBlack(ctx.canvas)) return true;
  }
  return false;
}

interface Mp4Box {
  type: string;
  dataOffset: number;
  end: number;
}

function parseBoxes(dv: DataView, startOffset: number, endOffset: number): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let offset = startOffset;
  while (offset + 8 <= endOffset) {
    const size = dv.getUint32(offset);
    let type = '';
    for (let i = 0; i < 4; i++) {
      type += String.fromCharCode(dv.getUint8(offset + 4 + i));
    }
    const is64 = size === 1;
    const realSize = is64
      ? Number(dv.getBigUint64(offset + 8))
      : size === 0
      ? endOffset - offset
      : size;
    const headerLen = is64 ? 16 : 8;
    if (realSize < headerLen || offset + realSize > endOffset) break;
    boxes.push({ type, dataOffset: offset + headerLen, end: offset + realSize });
    offset += realSize;
  }
  return boxes;
}

function extractFpsFromMp4DataView(dv: DataView): number | null {
  const len = dv.byteLength;
  let pos = 0;
  while (pos + 8 <= len) {
    const size = dv.getUint32(pos);
    let type = '';
    for (let i = 0; i < 4; i++) {
      type += String.fromCharCode(dv.getUint8(pos + 4 + i));
    }
    const is64 = size === 1;
    const realSize = is64 ? Number(dv.getBigUint64(pos + 8)) : size === 0 ? len - pos : size;
    const headerLen = is64 ? 16 : 8;
    if (realSize < headerLen || pos + realSize > len) break;

    if (type === 'moov') {
      const traks = parseBoxes(dv, pos + headerLen, pos + realSize).filter((b) => b.type === 'trak');
      for (const trak of traks) {
        const mdias = parseBoxes(dv, trak.dataOffset, trak.end).filter((b) => b.type === 'mdia');
        for (const mdia of mdias) {
          const mdiaBoxes = parseBoxes(dv, mdia.dataOffset, mdia.end);
          const hdlr = mdiaBoxes.find((b) => b.type === 'hdlr');
          let isVideo = false;
          if (hdlr && hdlr.end - hdlr.dataOffset >= 12) {
            let subtype = '';
            for (let i = 0; i < 4; i++) {
              subtype += String.fromCharCode(dv.getUint8(hdlr.dataOffset + 8 + i));
            }
            isVideo = subtype === 'vide';
          }
          if (isVideo) {
            const mdhd = mdiaBoxes.find((b) => b.type === 'mdhd');
            const minf = mdiaBoxes.find((b) => b.type === 'minf');
            let timescale = 0;
            if (mdhd) {
              const version = dv.getUint8(mdhd.dataOffset);
              timescale = dv.getUint32(mdhd.dataOffset + (version === 0 ? 12 : 20));
            }
            if (minf && timescale > 0) {
              const minfBoxes = parseBoxes(dv, minf.dataOffset, minf.end);
              const stbl = minfBoxes.find((b) => b.type === 'stbl');
              if (stbl) {
                const stblBoxes = parseBoxes(dv, stbl.dataOffset, stbl.end);
                const stts = stblBoxes.find((b) => b.type === 'stts');
                if (stts) {
                  const entryCount = dv.getUint32(stts.dataOffset + 4);
                  let totalFrames = 0;
                  let totalTicks = 0;
                  for (let i = 0; i < entryCount; i++) {
                    const sc = dv.getUint32(stts.dataOffset + 8 + i * 8);
                    const sd = dv.getUint32(stts.dataOffset + 12 + i * 8);
                    totalFrames += sc;
                    totalTicks += sc * sd;
                  }
                  if (totalTicks > 0) {
                    return (totalFrames * timescale) / totalTicks;
                  }
                }
              }
            }
          }
        }
      }
    }
    pos += realSize;
  }
  return null;
}

/**
 * Detects the native framerate (FPS) of a video file directly in the browser.
 * Reads MP4/MOV container metadata with 0 network calls and minimal memory footprint.
 * Returns the exact framerate (e.g. 24, 25, 30, 60), defaulting to 30 fps if undetectable.
 */
export async function detectVideoFps(file?: File | Blob): Promise<number> {
  if (!file) return 30;

  try {
    // 1. Try reading first 512 KB
    const headSlice = file.slice(0, Math.min(file.size, 524288));
    const headBuf = await headSlice.arrayBuffer();
    let fps = extractFpsFromMp4DataView(new DataView(headBuf));

    // 2. If moov is placed at the end of the file (common in camera MP4s), check last 1 MB
    if (!fps && file.size > 524288) {
      const tailOffset = Math.max(0, file.size - 1048576);
      const tailSlice = file.slice(tailOffset);
      const tailBuf = await tailSlice.arrayBuffer();
      fps = extractFpsFromMp4DataView(new DataView(tailBuf));
    }

    if (fps && fps > 5 && fps < 125) {
      // Snap to standard framerates when within delta
      if (Math.abs(fps - 30) < 0.1 || Math.abs(fps - 29.97) < 0.05) return 30;
      if (Math.abs(fps - 25) < 0.1) return 25;
      if (Math.abs(fps - 24) < 0.1 || Math.abs(fps - 23.976) < 0.05) return 24;
      if (Math.abs(fps - 60) < 0.1 || Math.abs(fps - 59.94) < 0.05) return 60;
      return Math.round(fps);
    }
  } catch (err) {
    console.warn('[SafeFace Zero] Could not extract container FPS, fallback to standard:', err);
  }

  return 30;
}
