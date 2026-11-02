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
  Object.assign(video.style, {
    position: 'fixed',
    right: '0px',
    bottom: '0px',
    width: '4px',
    height: '4px',
    opacity: '0.01',
    pointerEvents: 'none',
    zIndex: '-1',
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
}

let probeCanvas: HTMLCanvasElement | null = null;

/** Returns true when the canvas content is (almost) uniformly black. */
export function isCanvasBlack(source: HTMLCanvasElement): boolean {
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
  height: number
): Promise<boolean> {
  await seekTo(video, t);
  ctx.drawImage(video, 0, 0, width, height);
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
    ctx.drawImage(video, 0, 0, width, height);
    if (!isCanvasBlack(ctx.canvas)) return true;
  }
  return false;
}
