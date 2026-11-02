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
import { createDecodingVideo, prepareVideo, grabFrame } from '../utils/videoFrameGrabber';

const saveAs = (fileSaver as unknown as { saveAs?: typeof fileSaver }).saveAs || fileSaver;

const deviceProfile = detectDeviceProfile();

const DEFAULT_SETTINGS: AnonymizationSettings = {
  ageThreshold: 16,
  maskMode: 'blur',
  blurRadius: 30,
  facePadding: 15,
  faceLogoUrl: null,
  faceLogoImage: null,
  watermarkEnabled: false,
  watermarkUrl: null,
  watermarkImage: null,
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 80,
  watermarkScale: 15,
  videoEcoMode: deviceProfile.isLowEnd,
  videoMaxResolution: deviceProfile.isLowEnd ? '480p' : '720p',
  videoFps: 8,
  videoFrameSkip: deviceProfile.isLowEnd,
};

export function useMediaProcessor() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AnonymizationSettings>(DEFAULT_SETTINGS);

  const { isModelLoaded, isLoading: isModelLoading, loadError: modelError, detectFaces } = useFaceApi();
  const { isLoaded: isFFmpegLoaded, isLoading: isFFmpegLoading, error: ffmpegError, loadFFmpeg } = useFFmpeg();

  // Reference to cancel processing if needed
  const cancelProcessingRef = useRef(false);

  /**
   * Update anonymization settings
   */
  const updateSettings = useCallback((partial: Partial<AnonymizationSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
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

        const originalWidth = video.videoWidth || 640;
        const originalHeight = video.videoHeight || 480;
        const originalDuration = video.duration || 4;

        // 1. Calculate target dimensions divisible by 2 for H.264
        let maxDim = 1280; // default 720p
        if (settings.videoEcoMode || settings.videoMaxResolution === '480p') {
          maxDim = 640;
        } else if (settings.videoMaxResolution === '1080p') {
          maxDim = 1920;
        }

        let targetWidth = originalWidth;
        let targetHeight = originalHeight;
        if (targetWidth > maxDim || targetHeight > maxDim) {
          if (targetWidth >= targetHeight) {
            targetHeight = Math.round((originalHeight * maxDim) / targetWidth);
            targetWidth = maxDim;
          } else {
            targetWidth = Math.round((originalWidth * maxDim) / targetHeight);
            targetHeight = maxDim;
          }
        }
        targetWidth = targetWidth - (targetWidth % 2);
        targetHeight = targetHeight - (targetHeight % 2);
        if (targetWidth < 2) targetWidth = 2;
        if (targetHeight < 2) targetHeight = 2;

        const targetFps = Math.max(6, Math.min(15, settings.videoFps || 8));
        const maxDuration = settings.videoEcoMode ? Math.min(originalDuration, 10) : Math.min(originalDuration, 30);
        const step = 1 / targetFps;
        const totalSteps = Math.max(1, Math.ceil(maxDuration / step));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Impossible d’initialiser le contexte canvas.');

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
          onProgress(percent, `Traitement IA frame ${stepIdx + 1}/${totalSteps}...`);

          const gotFrame = await grabFrame(video, t, ctx, targetWidth, targetHeight);
          if (!gotFrame) {
            blackFrames++;
            // Abort early instead of silently producing a black video
            if (stepIdx >= 7 && blackFrames === stepIdx + 1) {
              throw new Error(
                'Le navigateur ne fournit que des images noires pour cette vidéo (décodeur matériel indisponible). Essayez Chrome ou réduisez la résolution.'
              );
            }
          }

          // AI Face Detection (with frame-skipping optimization)
          let faces: DetectedFace[] = [];
          const shouldRunDetection = !settings.videoFrameSkip || stepIdx % 2 === 0 || previousFaces.length === 0;

          if (shouldRunDetection) {
            faces = await detectFaces(canvas, settings.ageThreshold);
            previousFaces = faces;
            totalFacesDetected += faces.length;
            totalFacesMasked += faces.filter((f) => f.shouldMask).length;
          } else {
            faces = previousFaces;
          }

          applyAnonymization(canvas, faces, settings);

          if (ffmpeg) {
            // Convert frame to JPEG buffer for FFmpeg
            const frameBlob: Blob = await new Promise((res, rej) => {
              canvas.toBlob((b) => (b ? res(b) : rej(new Error('Blob conversion failed'))), 'image/jpeg', 0.88);
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
            settings.videoEcoMode ? '28' : '24',
            '-pix_fmt',
            'yuv420p',
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
          const stream = canvas.captureStream(targetFps);
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

          const mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: settings.videoEcoMode ? 1000000 : 2500000,
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.start(500);

          const frameDurationMs = Math.round(1000 / targetFps);
          for (let i = 0; i < processedFrames.length; i++) {
            const blob = processedFrames[i];
            const url = URL.createObjectURL(blob);
            try {
              const img = await loadImage(url);
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            } finally {
              URL.revokeObjectURL(url);
            }
            await new Promise((r) => setTimeout(r, frameDurationMs));
          }

          resultBlob = await new Promise<Blob>((resolve) => {
            mediaRecorder.onstop = () => {
              resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));
            };
            mediaRecorder.stop();
          });
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

      const updateItemState = (updates: Partial<QueueItem>) => {
        setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
      };

      updateItemState({ status: 'processing', progress: 0, progressMessage: 'Démarrage...' });

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
   * Process all pending items sequentially
   */
  const processAll = useCallback(async () => {
    setIsProcessing(true);
    cancelProcessingRef.current = false;

    // Snapshot of items that are not done
    const pendingItems = queue.filter((i) => i.status !== 'done');

    for (const item of pendingItems) {
      if (cancelProcessingRef.current) break;
      await processItem(item.id);
    }

    setIsProcessing(false);
  }, [queue, processItem]);

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
    cancelProcessing,
    exportAllAsZip,
  };
}
