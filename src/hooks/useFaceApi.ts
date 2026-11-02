import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { DetectedFace } from '../types';
import { getAssetBaseUrl } from '../utils/performance';

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let detections: any[] = [];

      // 1. High-accuracy detection with SSD MobileNetV1 (critical for group shots, small/distant faces, costumes)
      if (faceapi.nets.ssdMobilenetv1.isLoaded) {
        try {
          detections = await faceapi
            .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
            .withAgeAndGender();
        } catch (ssdErr) {
          console.warn('[SafeFace Zero] Erreur SSD MobileNetV1, bascule vers TinyFaceDetector:', ssdErr);
        }
      }

      // 2. Fallback / complementary detection with TinyFaceDetector if 0 faces found
      if (detections.length === 0 && faceapi.nets.tinyFaceDetector.isLoaded) {
        const inputWidth =
          'naturalWidth' in input
            ? input.naturalWidth
            : 'videoWidth' in input
            ? input.videoWidth
            : input.width;

        let inputSize = 416;
        if (inputWidth >= 1200) inputSize = 608;
        else if (inputWidth >= 800) inputSize = 512;

        const detectorOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize,
          scoreThreshold: 0.25,
        });

        detections = await faceapi
          .detectAllFaces(input, detectorOptions)
          .withAgeAndGender();
      }

      return detections.map((det) => {
        const age = Math.round(det.age);
        const { x, y, width, height } = det.detection.box;
        return {
          box: { x, y, width, height },
          age,
          gender: det.gender,
          genderProbability: det.genderProbability,
          shouldMask: age <= ageThreshold,
        };
      });
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
