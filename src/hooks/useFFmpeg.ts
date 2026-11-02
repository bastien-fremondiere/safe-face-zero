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
      console.log('[FFmpeg]', message);
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

      // Load single-threaded FFmpeg (fully deterministic, no pthread deadlock in headless environments)
      await ffmpeg.load({
        coreURL: await toBlobURL(`${ffmpegUrl}/st/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${ffmpegUrl}/st/ffmpeg-core.wasm`, 'application/wasm'),
      });
      console.log('[SafeFace Zero] FFmpeg loaded successfully.');

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
