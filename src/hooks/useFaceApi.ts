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

        // Load TinyFaceDetector and AgeGenderNet
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);

        if (isMounted) {
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

      // Fast TinyFaceDetector options
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.35,
      });

      const detections = await faceapi
        .detectAllFaces(input, detectorOptions)
        .withAgeAndGender();

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
