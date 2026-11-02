import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { DetectedFace } from '../types';
import { getAssetBaseUrl } from '../utils/performance';

interface RawDetection {
  box: { x: number; y: number; width: number; height: number };
  score?: number;
  age: number;
  gender?: string;
  genderProbability?: number;
}

function applyNms(boxes: RawDetection[], iouThreshold = 0.38): RawDetection[] {
  const sorted = [...boxes].sort((a, b) => (b.score || 0) - (a.score || 0));
  const selected: RawDetection[] = [];

  for (const b of sorted) {
    let keep = true;
    for (const s of selected) {
      const x1 = Math.max(b.box.x, s.box.x);
      const y1 = Math.max(b.box.y, s.box.y);
      const x2 = Math.min(b.box.x + b.box.width, s.box.x + s.box.width);
      const y2 = Math.min(b.box.y + b.box.height, s.box.y + s.box.height);
      const interW = Math.max(0, x2 - x1);
      const interH = Math.max(0, y2 - y1);
      const interArea = interW * interH;
      const unionArea = b.box.width * b.box.height + s.box.width * s.box.height - interArea;
      const iou = unionArea > 0 ? interArea / unionArea : 0;
      if (iou > iouThreshold) {
        keep = false;
        break;
      }
    }
    if (keep) selected.push(b);
  }

  return selected;
}

export function useFaceApi() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      if (isModelLoaded || isInitializingRef.current) return;
      isInitializingRef.current = true;
      setIsLoading(true);
      setLoadError(null);

      try {
        const assetBase = getAssetBaseUrl();
        const MODEL_URL = `${assetBase}models`;
        console.log('[SafeFace Zero] Initializing Face-API models from:', MODEL_URL);

        // Load SSD MobileNetV1, TinyFaceDetector and AgeGenderNet
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL).catch((err) => {
            console.warn('[SafeFace Zero] SSD MobileNetV1 non disponible, utilisation exclusive de TinyFaceDetector:', err);
          }),
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);

        if (isMounted) {
          (window as unknown as { faceapi?: typeof faceapi }).faceapi = faceapi;
          setIsModelLoaded(true);
          console.log('[SafeFace Zero] Face-API models loaded successfully.');
        }
      } catch (err: unknown) {
        console.error('[SafeFace Zero] Failed to load Face-API models:', err);
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Échec du chargement des modèles IA.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          isInitializingRef.current = false;
        }
      }
    }

    loadModels();

    return () => {
      isMounted = false;
    };
  }, [isModelLoaded]);

  /**
   * Detects faces in an image, canvas, or video element with age & gender estimation
   */
  const detectFaces = useCallback(
    async (
      input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
      ageThreshold: number
    ): Promise<DetectedFace[]> => {
      if (!isModelLoaded) {
        throw new Error("Les modèles d'intelligence artificielle ne sont pas encore chargés.");
      }

      const detections: RawDetection[] = [];
      const isImage = 'naturalWidth' in input || input instanceof HTMLImageElement;
      const width =
        'naturalWidth' in input
          ? input.naturalWidth
          : 'videoWidth' in input
          ? input.videoWidth
          : input.width;
      const height =
        'naturalHeight' in input
          ? input.naturalHeight
          : 'videoHeight' in input
          ? input.videoHeight
          : input.height;

      // 1. High-accuracy SSD MobileNetV1 pass (global full image/frame)
      if (faceapi.nets.ssdMobilenetv1.isLoaded) {
        try {
          const globalDets = await faceapi
            .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 }))
            .withAgeAndGender();

          for (const d of globalDets) {
            detections.push({
              box: d.detection.box,
              score: d.detection.score,
              age: Math.round(d.age),
              gender: d.gender,
              genderProbability: d.genderProbability,
            });
          }

          // 2. Multi-scale tiled inspection for high-res images (catches tiny, distant & group faces)
          if (isImage && width >= 700 && height >= 500) {
            const tiles = [
              { sx: 0, sy: 0, sw: Math.round(width * 0.55), sh: Math.round(height * 0.55) },
              { sx: Math.round(width * 0.45), sy: 0, sw: Math.round(width * 0.55), sh: Math.round(height * 0.55) },
              { sx: 0, sy: Math.round(height * 0.45), sw: Math.round(width * 0.55), sh: Math.round(height * 0.55) },
              { sx: Math.round(width * 0.45), sy: Math.round(height * 0.45), sw: Math.round(width * 0.55), sh: Math.round(height * 0.55) },
              // Middle/background horizontal band
              { sx: 0, sy: Math.round(height * 0.2), sw: width, sh: Math.round(height * 0.4) },
            ];

            const scale = 1.7;
            for (const tile of tiles) {
              const tileCanvas = document.createElement('canvas');
              tileCanvas.width = Math.round(tile.sw * scale);
              tileCanvas.height = Math.round(tile.sh * scale);
              const tCtx = tileCanvas.getContext('2d');
              if (tCtx) {
                tCtx.drawImage(input, tile.sx, tile.sy, tile.sw, tile.sh, 0, 0, tileCanvas.width, tileCanvas.height);
                const tileDets = await faceapi
                  .detectAllFaces(tileCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.16 }))
                  .withAgeAndGender();

                for (const td of tileDets) {
                  detections.push({
                    box: {
                      x: tile.sx + td.detection.box.x / scale,
                      y: tile.sy + td.detection.box.y / scale,
                      width: td.detection.box.width / scale,
                      height: td.detection.box.height / scale,
                    },
                    score: td.detection.score,
                    age: Math.round(td.age),
                    gender: td.gender,
                    genderProbability: td.genderProbability,
                  });
                }
              }
            }
          }
        } catch (ssdErr) {
          console.warn('[SafeFace Zero] Erreur SSD MobileNetV1, bascule vers TinyFaceDetector:', ssdErr);
        }
      }

      // 3. Fallback TinyFaceDetector pass if SSD found no detections
      if (faceapi.nets.tinyFaceDetector.isLoaded && detections.length === 0) {
        try {
          const tinyDets = await faceapi
            .detectAllFaces(
              input,
              new faceapi.TinyFaceDetectorOptions({
                inputSize: isImage && width >= 800 ? 512 : 416,
                scoreThreshold: 0.35,
              })
            )
            .withAgeAndGender();

          for (const td of tinyDets) {
            // Reject unrealistic giant boxes
            if (td.detection.box.width <= width * 0.5 && td.detection.box.height <= height * 0.5) {
              detections.push({
                box: td.detection.box,
                score: td.detection.score,
                age: Math.round(td.age),
                gender: td.gender,
                genderProbability: td.genderProbability,
              });
            }
          }
        } catch (tinyErr) {
          console.warn('[SafeFace Zero] TinyFaceDetector error:', tinyErr);
        }
      }

      // 4. Non-Maximum Suppression to deduplicate candidate boxes
      const finalDetections = applyNms(detections, 0.38);

      // Filter out any box that is unreasonably huge (> 60% of image)
      const validDetections = finalDetections.filter(
        (det) => det.box.width <= width * 0.6 && det.box.height <= height * 0.6
      );

      return validDetections.map((det) => ({
        box: det.box,
        age: det.age,
        gender: det.gender || 'unknown',
        genderProbability: det.genderProbability ?? 0.5,
        shouldMask: ageThreshold >= 99 ? true : det.age <= ageThreshold,
      }));
    },
    [isModelLoaded]
  );

  return {
    isModelLoaded,
    isLoading,
    loadError,
    detectFaces,
  };
}
