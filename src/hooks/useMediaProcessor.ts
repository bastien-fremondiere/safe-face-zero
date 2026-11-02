import { useState, useRef, useCallback } from 'react';
import { fetchFile } from '@ffmpeg/util';
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
   * Process a single video item via FFmpeg.wasm and face-api
   * Optimized for Mobile and Low-End PCs (Anti-OOM & Anti-Freeze)
   */
  const processVideoItem = useCallback(
    async (
      item: QueueItem,
      onProgress: (progress: number, msg: string) => void
    ): Promise<{ blob: Blob; facesDetected: number; facesMasked: number; dimensions?: { width: number; height: number } }> => {
      onProgress(5, 'Initialisation du moteur FFmpeg WebAssembly...');
      const ffmpeg = await loadFFmpeg();

      const inputExt = item.name.substring(item.name.lastIndexOf('.')) || '.mp4';
      const inputName = `input_${Date.now()}${inputExt}`;
      const outputName = `output_${Date.now()}.mp4`;

      onProgress(10, 'Chargement de la vidéo dans le système virtuel...');
      const fileData = await fetchFile(item.file);
      await ffmpeg.writeFile(inputName, fileData);

      // 1. Calculate optimal scaling to avoid OOM on mobile/low-end hardware
      let maxDim = 1280; // default 720p
      if (settings.videoEcoMode || settings.videoMaxResolution === '480p') {
        maxDim = 640;
      } else if (settings.videoMaxResolution === '1080p') {
        maxDim = 1920;
      }

      const targetFps = Math.max(6, Math.min(15, settings.videoFps || 8));
      const vfFilter = `scale='min(${maxDim},iw)':-2,fps=${targetFps}`;

      // 2. Extract frames with downscaling filter (max 4s at targeted fps)
      onProgress(18, `Découpage optimisé (${settings.videoEcoMode ? 'Mode Éco 480p' : '720p'}, ${targetFps} fps)...`);
      const framePattern = 'frame_%05d.jpg';
      const extractRes = await ffmpeg.exec([
        '-i',
        inputName,
        '-t',
        '4',
        '-vf',
        vfFilter,
        '-q:v',
        '3',
        framePattern,
      ]);

      if (extractRes !== 0) {
        throw new Error('Échec de l’extraction des frames vidéo.');
      }

      // 3. Count extracted frames
      const dirList = await ffmpeg.listDir('.');
      const frameFiles = dirList
        .filter((f) => !f.isDir && f.name.startsWith('frame_') && f.name.endsWith('.jpg'))
        .map((f) => f.name)
        .sort();

      const totalFrames = frameFiles.length;
      if (totalFrames === 0) {
        throw new Error('Aucune frame extraite de la vidéo.');
      }

      let totalFacesDetected = 0;
      let totalFacesMasked = 0;
      let videoWidth = 0;
      let videoHeight = 0;
      let previousFaces: DetectedFace[] = [];

      // 4. Process each frame with in-flight memory deallocation and UI yielding
      for (let i = 0; i < totalFrames; i++) {
        if (cancelProcessingRef.current) {
          throw new Error('Traitement annulé par l’utilisateur.');
        }

        const frameFileName = frameFiles[i];
        const percent = 20 + Math.round((i / totalFrames) * 60);
        onProgress(percent, `Traitement IA frame ${i + 1}/${totalFrames}...`);

        // Read raw frame data
        const rawFrameData = (await ffmpeg.readFile(frameFileName)) as Uint8Array;
        // Immediately delete extracted frame from FFmpeg MEMFS to prevent heap bloat!
        await ffmpeg.deleteFile(frameFileName);

        const frameBlob = new Blob([new Uint8Array(rawFrameData)], { type: 'image/jpeg' });
        const frameUrl = URL.createObjectURL(frameBlob);

        try {
          const img = await loadImage(frameUrl);
          videoWidth = img.naturalWidth;
          videoHeight = img.naturalHeight;

          // AI Face Detection (with frame-skipping optimization for mobile/low-end CPUs)
          let faces: DetectedFace[] = [];
          const shouldRunDetection = !settings.videoFrameSkip || i % 2 === 0 || previousFaces.length === 0;

          if (shouldRunDetection) {
            faces = await detectFaces(img, settings.ageThreshold);
            previousFaces = faces;
            totalFacesDetected += faces.length;
            totalFacesMasked += faces.filter((f) => f.shouldMask).length;
          } else {
            // Smoothly track / reuse previous frame face locations
            faces = previousFaces;
          }

          // Render & mask
          const canvas = createSourceCanvas(img, videoWidth, videoHeight);
          applyAnonymization(canvas, faces, settings);

          // Convert back to JPEG Uint8Array
          const processedBlob: Blob = await new Promise((res, rej) => {
            canvas.toBlob((b) => (b ? res(b) : rej(new Error('Blob conversion failed'))), 'image/jpeg', 0.88);
          });
          const processedBuffer = new Uint8Array(await processedBlob.arrayBuffer());

          // Write out to out_%05d.jpg
          const outFrameName = frameFileName.replace('frame_', 'out_');
          await ffmpeg.writeFile(outFrameName, processedBuffer);

          // Free canvas memory explicitly
          canvas.width = 0;
          canvas.height = 0;
        } finally {
          URL.revokeObjectURL(frameUrl);
        }

        // Cooperative yield to browser event loop (prevents freezing UI & enables GC)
        await yieldToEventLoop(settings.videoEcoMode ? 25 : 5);
      }

      // 5. Final Re-encoding with FFmpeg (ultrafast/veryfast preset to prevent CPU throttling)
      onProgress(85, 'Encodage final MP4 (H.264 ultra-léger)...');
      const ffmpegArgs = [
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

      const encodeRes = await ffmpeg.exec(ffmpegArgs);
      if (encodeRes !== 0) {
        throw new Error('Échec du réencodage vidéo final.');
      }

      onProgress(95, 'Finalisation du fichier vidéo...');
      const outData = (await ffmpeg.readFile(outputName)) as Uint8Array;
      const resultBlob = new Blob([new Uint8Array(outData)], { type: 'video/mp4' });

      // 6. Cleanup FFmpeg virtual filesystem
      try {
        await ffmpeg.deleteFile(inputName).catch(() => {});
        await ffmpeg.deleteFile(outputName).catch(() => {});
        for (let i = 0; i < totalFrames; i++) {
          const outName = frameFiles[i].replace('frame_', 'out_');
          await ffmpeg.deleteFile(outName).catch(() => {});
        }
      } catch (cleanErr) {
        console.warn('[SafeFace Zero] FFmpeg virtual FS cleanup notice:', cleanErr);
      }

      return {
        blob: resultBlob,
        facesDetected: totalFacesDetected,
        facesMasked: totalFacesMasked,
        dimensions: { width: videoWidth, height: videoHeight },
      };
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
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue lors du traitement.';
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
