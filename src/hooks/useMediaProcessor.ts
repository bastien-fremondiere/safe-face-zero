import { useState, useRef, useCallback } from 'react';
import fileSaver from 'file-saver';
import {
  AnonymizationSettings,
  QueueItem,
  DetectedFace,
} from '../types';
import { useFaceApi } from './useFaceApi';
import { useFFmpeg } from './useFFmpeg';
import {
  applyAnonymization,
  createSourceCanvas,
  loadImage,
} from '../utils/canvasMasker';
import {
  extractZipFiles,
  createAnonymizedZip,
  getFileCategory,
} from '../utils/zipHandler';
import { detectDeviceProfile, yieldToEventLoop } from '../utils/performance';
import { createDecodingVideo, prepareVideo, grabFrame, detectVideoFps } from '../utils/videoFrameGrabber';
import { FaceTracker } from '../utils/faceTracker';

const saveAs = (fileSaver as unknown as { saveAs?: typeof fileSaver }).saveAs || fileSaver;

const deviceProfile = detectDeviceProfile();

const DEFAULT_SETTINGS: AnonymizationSettings = {
  ageThreshold: 99, // Anonymize all faces by default (complete privacy)
  maskMode: 'blur',
  blurRadius: 30,
  facePadding: 15,
  selectedEmoji: '🌈', // Rainbow emoji by default for hybrid/stickers
  faceLogoUrl: null,
  faceLogoImage: null,
  watermarkEnabled: false,
  watermarkUrl: null,
  watermarkImage: null,
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 80,
  watermarkScale: 15,
  videoEcoMode: deviceProfile.isLowEnd,
  videoMaxResolution: deviceProfile.isLowEnd ? '720p' : 'original',
  videoFps: 0, // 0 = Cadence d'origine (Auto, no artificial FPS limit)
  videoFrameSkip: true, // Interpolate 1 frame out of 2 with temporal tracking for 2x faster processing without loss of smoothness
  videoTracking: true, // Temporal face tracking across frames to eliminate flickering
};

export function useMediaProcessor() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AnonymizationSettings>(DEFAULT_SETTINGS);
  const [hasSettingsChanged, setHasSettingsChanged] = useState(false);

  const { isModelLoaded, isLoading: isModelLoading, loadError: modelError, detectFaces } = useFaceApi();
  const { isLoaded: isFFmpegLoaded, isLoading: isFFmpegLoading, error: ffmpegError, loadFFmpeg } = useFFmpeg();

  // Reference to cancel processing if needed
  const cancelProcessingRef = useRef(false);

  /**
   * Update anonymization settings
   */
  const updateSettings = useCallback((partial: Partial<AnonymizationSettings>) => {
    setSettings((prev) => {
      const changed = Object.entries(partial).some(
        ([key, val]) => (prev as unknown as Record<string, unknown>)[key] !== val
      );
      if (changed) {
        setHasSettingsChanged(true);
      }
      return { ...prev, ...partial };
    });
  }, []);

  /**
   * Add files to queue (supports single, multiple, and ZIP files)
   */
  const addFilesToQueue = useCallback(async (files: File[]) => {
    const newItems: QueueItem[] = [];

    for (const file of files) {
      const category = getFileCategory(file.name);

      if (category === 'zip') {
        try {
          const extracted = await extractZipFiles(file);
          for (const extFile of extracted) {
            const extCat = getFileCategory(extFile.name);
            if (extCat === 'image' || extCat === 'video') {
              newItems.push({
                id: crypto.randomUUID(),
                file: extFile,
                name: extFile.name,
                type: extCat,
                size: extFile.size,
                status: 'idle',
                progress: 0,
              });
            }
          }
        } catch (err) {
          console.error('[SafeFace Zero] Erreur décompression ZIP:', err);
          newItems.push({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            type: 'zip',
            size: file.size,
            status: 'error',
            progress: 0,
            error: "Impossible d'extraire le fichier ZIP.",
          });
        }
      } else if (category === 'image' || category === 'video') {
        newItems.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          type: category,
          size: file.size,
          status: 'idle',
          progress: 0,
        });
      }
    }

    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  /**
   * Remove item from queue and revoke object URLs
   */
  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.resultUrl) {
        URL.revokeObjectURL(item.resultUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  /**
   * Clear all items in queue
   */
  const clearQueue = useCallback(() => {
    setQueue((prev) => {
      prev.forEach((item) => {
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      });
      return [];
    });
    setHasSettingsChanged(false);
  }, []);

  /**
   * Process a single image item
   */
  const processImageItem = useCallback(
    async (
      item: QueueItem,
      onProgress: (progress: number, msg: string) => void
    ): Promise<{ blob: Blob; facesDetected: number; facesMasked: number; dimensions: { width: number; height: number } }> => {
      onProgress(15, 'Chargement de l’image...');
      const objectUrl = URL.createObjectURL(item.file);

      try {
        const img = await loadImage(objectUrl);
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        onProgress(35, 'Détection faciale et analyse de l’âge (IA)...');
        const faces: DetectedFace[] = await detectFaces(img, settings.ageThreshold);

        onProgress(70, 'Application des masques d’anonymisation...');
        const canvas = createSourceCanvas(img, width, height);
        applyAnonymization(canvas, faces, settings);

        onProgress(90, 'Génération du fichier anonymisé...');
        const outBlob: Blob = await new Promise((resolve, reject) => {
          let mime = item.file.type || 'image/jpeg';
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
            mime = 'image/jpeg';
          }
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Canvas toBlob failed'));
            },
            mime,
            0.92
          );
        });

        // Clean canvas
        canvas.width = 0;
        canvas.height = 0;

        const maskedCount = faces.filter((f) => f.shouldMask).length;
        return {
          blob: outBlob,
          facesDetected: faces.length,
          facesMasked: maskedCount,
          dimensions: { width, height },
        };
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    },
    [detectFaces, settings]
  );

  /**
   * Process a single video item:
   * 1. Decodes frames natively via HTML5 Video element (hardware accelerated, 0 WASM decoding overhead)
   * 2. Detects & anonymizes faces per frame with AI
   * 3. Re-encodes frames into MP4 using FFmpeg WASM (with automatic native MediaRecorder fallback if FFmpeg fails)
   */
  const processVideoItem = useCallback(
    async (
      item: QueueItem,
      onProgress: (progress: number, msg: string) => void
    ): Promise<{ blob: Blob; facesDetected: number; facesMasked: number; dimensions?: { width: number; height: number } }> => {
      onProgress(5, 'Initialisation du lecteur matériel...');
      const videoUrl = URL.createObjectURL(item.file);
      // Must stay inside the viewport: Firefox suspends decoding of off-screen videos (→ black frames)
      const video = createDecodingVideo(videoUrl);

      try {
        await prepareVideo(video);

        const originalWidth =
          video.videoWidth && video.videoWidth > 0 ? video.videoWidth : 1280;
        const originalHeight =
          video.videoHeight && video.videoHeight > 0 ? video.videoHeight : 720;
        const originalDuration =
          video.duration && video.duration > 0 && !isNaN(video.duration) ? video.duration : 4;

        // 1. Calculate target dimensions divisible by 2 for H.264
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (settings.videoMaxResolution !== 'original') {
          let maxDim = 1280; // default 720p
          if (settings.videoEcoMode || settings.videoMaxResolution === '480p') {
            maxDim = 640;
          } else if (settings.videoMaxResolution === '720p') {
            maxDim = 1280;
          } else if (settings.videoMaxResolution === '1080p') {
            maxDim = 1920;
          }

          if (targetWidth > maxDim || targetHeight > maxDim) {
            if (targetWidth >= targetHeight) {
              targetHeight = Math.round((originalHeight * maxDim) / targetWidth);
              targetWidth = maxDim;
            } else {
              targetWidth = Math.round((originalWidth * maxDim) / targetHeight);
              targetHeight = maxDim;
            }
          }
        }

        targetWidth = Math.max(2, Math.floor(targetWidth) || 1280);
        targetHeight = Math.max(2, Math.floor(targetHeight) || 720);
        targetWidth = targetWidth - (targetWidth % 2);
        targetHeight = targetHeight - (targetHeight % 2);
        if (targetWidth < 2) targetWidth = 2;
        if (targetHeight < 2) targetHeight = 2;

        // Target FPS: Cadence should match the original video (or user custom setting without arbitrary 15 fps limit)
        let targetFps = settings.videoFps;
        if (!targetFps || targetFps <= 0) {
          onProgress(7, 'Détection de la cadence originale de la vidéo...');
          const sourceFps = await detectVideoFps(item.file);
          targetFps = Math.max(1, Math.min(60, Math.round(sourceFps)));
        }

        // Duration: Do not limit duration unless Eco Mode is explicitly active for low-memory devices
        const maxDuration = settings.videoEcoMode
          ? Math.min(originalDuration, 30)
          : originalDuration;
        const step = 1 / targetFps;
        const totalSteps = Math.max(1, Math.ceil(maxDuration / step));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Impossible d’initialiser le contexte canvas.');

        // Initialize temporal face tracker to eliminate flickering ("clignotant")
        const tracker = new FaceTracker({ fps: targetFps });

        // Initialize FFmpeg for re-encoding
        onProgress(10, 'Initialisation du moteur d’encodage...');
        let ffmpeg: Awaited<ReturnType<typeof loadFFmpeg>> | null = null;
        try {
          ffmpeg = await loadFFmpeg();
        } catch (ffErr) {
          console.warn('[SafeFace Zero] FFmpeg indisponible, passage au fallback natif:', ffErr);
        }

        const processedFrames: Blob[] = [];
        let totalFacesDetected = 0;
        let totalFacesMasked = 0;
        let previousFaces: DetectedFace[] = [];
        let blackFrames = 0;

        // 2. Frame-by-frame seeking, face detection, and anonymization
        for (let stepIdx = 0; stepIdx < totalSteps; stepIdx++) {
          if (cancelProcessingRef.current) {
            throw new Error('Traitement annulé par l’utilisateur.');
          }

          const t = stepIdx * step;
          const percent = 15 + Math.round((stepIdx / totalSteps) * 65);
          onProgress(percent, `Traitement IA frame ${stepIdx + 1}/${totalSteps} (${targetFps} fps)...`);

          const shouldCheckBlack = stepIdx < 4 || stepIdx % 45 === 0;
          const gotFrame = await grabFrame(video, t, ctx, targetWidth, targetHeight, shouldCheckBlack);
          if (!gotFrame) {
            blackFrames++;
            // Abort early only if the video decoder repeatedly delivers solid black beyond the intro
            if (stepIdx >= 16 && blackFrames === stepIdx + 1) {
              throw new Error(
                'Le décodeur vidéo du navigateur ne renvoie que des images noires. Veuillez désactiver les bloqueurs stricts ou essayer un autre navigateur (Chrome/Edge).'
              );
            }
          }

          // AI Face Detection (with frame-skipping optimization if enabled)
          let rawFaces: DetectedFace[] = [];
          const skipInterval = targetFps >= 24 ? 2 : 1;
          const shouldRunDetection =
            !settings.videoFrameSkip ||
            stepIdx % skipInterval === 0 ||
            tracker.activeTrackCount === 0;

          if (shouldRunDetection) {
            rawFaces = await detectFaces(canvas, settings.ageThreshold);
          }

          // Temporal Face Tracking & Stabilization: eliminates the "clignotant" effect
          const faces = settings.videoTracking
            ? tracker.update(
                rawFaces,
                targetWidth,
                targetHeight,
                settings.ageThreshold,
                !shouldRunDetection
              )
            : shouldRunDetection
            ? rawFaces
            : previousFaces;

          previousFaces = faces;
          totalFacesDetected += faces.length;
          totalFacesMasked += faces.filter((f) => f.shouldMask).length;

          applyAnonymization(canvas, faces, settings);

          if (ffmpeg) {
            // Convert frame to fast JPEG buffer for FFmpeg (libjpeg-turbo SIMD accelerated, 10x faster than PNG)
            const frameBlob: Blob = await new Promise((res, rej) => {
              canvas.toBlob((b) => (b ? res(b) : rej(new Error('Blob conversion failed'))), 'image/jpeg', 0.94);
            });
            const frameBuf = new Uint8Array(await frameBlob.arrayBuffer());
            const frameFileName = `out_${String(stepIdx + 1).padStart(5, '0')}.jpg`;
            await ffmpeg.writeFile(frameFileName, frameBuf);
          } else {
            // Keep in memory if falling back
            const frameBlob: Blob = await new Promise((res, rej) => {
              canvas.toBlob((b) => (b ? res(b) : rej(new Error('Blob conversion failed'))), 'image/jpeg', 0.85);
            });
            processedFrames.push(frameBlob);
          }

          await yieldToEventLoop(settings.videoEcoMode ? 20 : 5);
        }

        if (blackFrames / totalSteps > 0.9) {
          throw new Error(
            `Échec du décodage : ${blackFrames}/${totalSteps} images noires renvoyées par le navigateur. Export annulé pour éviter une vidéo noire.`
          );
        }

        let resultBlob: Blob;

        // 3. Encode into final video file
        if (ffmpeg) {
          onProgress(85, 'Encodage final MP4 (H.264 optimisé)...');
          const outputName = `output_${Date.now()}.mp4`;

          const encodeArgs = [
            '-nostdin',
            '-y',
            '-framerate',
            `${targetFps}`,
            '-i',
            'out_%05d.jpg',
            '-c:v',
            'libx264',
            '-preset',
            settings.videoEcoMode ? 'ultrafast' : 'veryfast',
            '-tune',
            'fastdecode',
            '-crf',
            settings.videoEcoMode ? '28' : '23',
            '-pix_fmt',
            'yuv420p',
            '-movflags',
            '+faststart',
            outputName,
          ];

          const encodeRes = await ffmpeg.exec(encodeArgs);
          if (encodeRes !== 0) {
            throw new Error(`Échec du réencodage vidéo FFmpeg (code ${encodeRes}).`);
          }

          onProgress(95, 'Finalisation du fichier vidéo...');
          const outData = (await ffmpeg.readFile(outputName)) as Uint8Array;
          resultBlob = new Blob([new Uint8Array(outData)], { type: 'video/mp4' });

          // Virtual FS Cleanup
          await ffmpeg.deleteFile(outputName).catch(() => {});
          for (let i = 1; i <= totalSteps; i++) {
            const fName = `out_${String(i).padStart(5, '0')}.jpg`;
            await ffmpeg.deleteFile(fName).catch(() => {});
          }
        } else {
          // Native fallback with MediaRecorder using paced playback of processed frames
          onProgress(85, 'Génération vidéo native matérielle...');

          // Attach canvas to DOM inside a hidden container so mobile compositor (especially Firefox Gecko)
          // keeps rendering frames to the captureStream track
          const streamHolder = document.createElement('div');
          Object.assign(streamHolder.style, {
            position: 'fixed',
            left: '-9999px',
            bottom: '0',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            opacity: '0.01',
            pointerEvents: 'none',
            zIndex: '-1',
          });
          streamHolder.appendChild(canvas);
          document.body.appendChild(streamHolder);

          let mimeType = 'video/webm;codecs=vp8';
          if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
            mimeType = 'video/mp4;codecs=avc1';
          } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
          } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
          }

          const stream = canvas.captureStream(targetFps);
          const track = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;

          const mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: settings.videoEcoMode ? 1000000 : 2500000,
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          try {
            mediaRecorder.start(250);

            const frameDurationMs = Math.round(1000 / targetFps);
            for (let i = 0; i < processedFrames.length; i++) {
              const blob = processedFrames[i];
              const url = URL.createObjectURL(blob);
              try {
                const img = await loadImage(url);
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                if (track && typeof track.requestFrame === 'function') {
                  track.requestFrame();
                }
              } finally {
                URL.revokeObjectURL(url);
              }
              await new Promise((r) => setTimeout(r, frameDurationMs));
            }

            // Flush any buffered frame data
            try {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.requestData();
              }
            } catch {
              /* ignore */
            }

            await new Promise((r) => setTimeout(r, 150));

            resultBlob = await new Promise<Blob>((resolve, reject) => {
              mediaRecorder.onstop = () => {
                const totalBytes = chunks.reduce((acc, c) => acc + c.size, 0);
                if (totalBytes < 500) {
                  reject(new Error('Échec de la capture vidéo native (flux vide).'));
                  return;
                }
                resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));
              };
              mediaRecorder.stop();
            });
          } finally {
            if (streamHolder.parentNode) {
              streamHolder.parentNode.removeChild(streamHolder);
            }
          }
        }

        canvas.width = 0;
        canvas.height = 0;

        return {
          blob: resultBlob,
          facesDetected: totalFacesDetected,
          facesMasked: totalFacesMasked,
          dimensions: { width: targetWidth, height: targetHeight },
        };
      } finally {
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
        URL.revokeObjectURL(videoUrl);
      }
    },
    [detectFaces, loadFFmpeg, settings]
  );





  /**
   * Process a single item by ID
   */
  const processItem = useCallback(
    async (id: string) => {
      const item = queue.find((q) => q.id === id);
      if (!item) return;

      cancelProcessingRef.current = false;
      setActiveItemId(id);

      // Clean up previous result URL to prevent browser memory leaks on mobile
      if (item.resultUrl) {
        try {
          URL.revokeObjectURL(item.resultUrl);
        } catch {
          /* ignore */
        }
      }

      const updateItemState = (updates: Partial<QueueItem>) => {
        setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
      };

      updateItemState({
        status: 'processing',
        progress: 0,
        progressMessage: 'Démarrage...',
        resultBlob: undefined,
        resultUrl: undefined,
        facesDetected: undefined,
        facesMasked: undefined,
        error: undefined,
      });

      try {
        if (item.type === 'image') {
          const result = await processImageItem(item, (prog, msg) => {
            updateItemState({ progress: prog, progressMessage: msg });
          });

          const resUrl = URL.createObjectURL(result.blob);
          updateItemState({
            status: 'done',
            progress: 100,
            progressMessage: 'Terminé avec succès',
            resultBlob: result.blob,
            resultUrl: resUrl,
            facesDetected: result.facesDetected,
            facesMasked: result.facesMasked,
            dimensions: result.dimensions,
          });
        } else if (item.type === 'video') {
          const result = await processVideoItem(item, (prog, msg) => {
            updateItemState({ progress: prog, progressMessage: msg });
          });

          const resUrl = URL.createObjectURL(result.blob);
          updateItemState({
            status: 'done',
            progress: 100,
            progressMessage: 'Terminé avec succès',
            resultBlob: result.blob,
            resultUrl: resUrl,
            facesDetected: result.facesDetected,
            facesMasked: result.facesMasked,
            dimensions: result.dimensions,
          });
        }
      } catch (err: unknown) {
        let errorMsg = 'Erreur lors du traitement.';
        if (err instanceof Error) {
          errorMsg = err.message;
        } else if (typeof err === 'string') {
          errorMsg = err;
        } else if (typeof err === 'number') {
          errorMsg = `Code d’erreur système: ${err}`;
        } else if (err && typeof err === 'object') {
          errorMsg = (err as { message?: string; error?: string }).message || (err as { error?: string }).error || JSON.stringify(err);
        }

        console.error(`[SafeFace Zero] Erreur traitement ${item.name}:`, err);
        updateItemState({
          status: 'error',
          progress: 0,
          error: errorMsg,
          progressMessage: `Erreur: ${errorMsg}`,
        });
      } finally {
        setActiveItemId(null);
      }
    },
    [queue, processImageItem, processVideoItem]
  );

  /**
   * Reprocess all items in the queue (or re-run after settings modification)
   */
  const reprocessAll = useCallback(async () => {
    setIsProcessing(true);
    setHasSettingsChanged(false);
    cancelProcessingRef.current = false;

    const itemsToProcess = [...queue];
    for (const item of itemsToProcess) {
      if (cancelProcessingRef.current) break;
      await processItem(item.id);
    }

    setIsProcessing(false);
  }, [queue, processItem]);

  /**
   * Process pending items sequentially, or re-process all if all are already done
   */
  const processAll = useCallback(async () => {
    const pendingItems = queue.filter((i) => i.status !== 'done');
    if (pendingItems.length === 0 && queue.length > 0) {
      await reprocessAll();
      return;
    }

    setIsProcessing(true);
    setHasSettingsChanged(false);
    cancelProcessingRef.current = false;

    for (const item of pendingItems) {
      if (cancelProcessingRef.current) break;
      await processItem(item.id);
    }

    setIsProcessing(false);
  }, [queue, processItem, reprocessAll]);

  /**
   * Export all processed items as a single ZIP archive
   */
  const exportAllAsZip = useCallback(async () => {
    const doneItems = queue.filter((i) => i.status === 'done' && i.resultBlob);
    if (doneItems.length === 0) return;

    const itemsToZip = doneItems.map((item) => ({
      name: item.name,
      blob: item.resultBlob!,
    }));

    const zipBlob = await createAnonymizedZip(itemsToZip);
    saveAs(zipBlob, `SafeFaceZero_Export_${Date.now()}.zip`);
  }, [queue]);

  /**
   * Cancel ongoing processing
   */
  const cancelProcessing = useCallback(() => {
    cancelProcessingRef.current = true;
    setIsProcessing(false);
    setActiveItemId(null);
  }, []);

  return {
    queue,
    settings,
    isProcessing,
    hasSettingsChanged,
    activeItemId,
    isModelLoaded,
    isModelLoading,
    modelError,
    isFFmpegLoaded,
    isFFmpegLoading,
    ffmpegError,
    updateSettings,
    addFilesToQueue,
    removeFromQueue,
    clearQueue,
    processItem,
    processAll,
    reprocessAll,
    cancelProcessing,
    exportAllAsZip,
  };
}
