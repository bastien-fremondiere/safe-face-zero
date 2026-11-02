import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export function useFFmpeg() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current && isLoaded) return ffmpegRef.current;
    setIsLoading(true);
    setError(null);

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('log', ({ message }) => {
      // debug logs
      if (message.includes('Error') || message.includes('failed')) {
        console.warn('[FFmpeg]', message);
      }
    });

    try {
      const isMultiThreadSupported =
        typeof window !== 'undefined' &&
        typeof SharedArrayBuffer !== 'undefined' &&
        window.crossOriginIsolated;

      console.log(
        `[SafeFace Zero] Loading FFmpeg.wasm (${
          isMultiThreadSupported ? 'Multithreaded / SAB' : 'Single-threaded'
        })...`
      );

      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
      const ffmpegUrl = `${baseUrl}ffmpeg`;

      if (isMultiThreadSupported) {
        try {
          await ffmpeg.load({
            coreURL: await toBlobURL(`${ffmpegUrl}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${ffmpegUrl}/ffmpeg-core.wasm`, 'application/wasm'),
            workerURL: await toBlobURL(`${ffmpegUrl}/ffmpeg-core.worker.js`, 'text/javascript'),
          });
          console.log('[SafeFace Zero] Multithreaded FFmpeg loaded.');
        } catch (mtErr) {
          console.warn('[SafeFace Zero] Multithreaded load failed, falling back to single-threaded:', mtErr);
          await ffmpeg.load({
            coreURL: await toBlobURL(`${ffmpegUrl}/st/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${ffmpegUrl}/st/ffmpeg-core.wasm`, 'application/wasm'),
          });
        }
      } else {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${ffmpegUrl}/st/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${ffmpegUrl}/st/ffmpeg-core.wasm`, 'application/wasm'),
        });
        console.log('[SafeFace Zero] Single-threaded FFmpeg loaded.');
      }

      setIsLoaded(true);
      return ffmpeg;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Échec du chargement de FFmpeg.wasm';
      console.error('[SafeFace Zero] FFmpeg load error:', err);
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded]);

  return {
    isLoaded,
    isLoading,
    error,
    loadFFmpeg,
    ffmpegRef,
  };
}
