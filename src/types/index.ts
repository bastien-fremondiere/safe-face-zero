export type MediaType = 'image' | 'video' | 'zip';

export type QueueItemStatus = 'idle' | 'processing' | 'done' | 'error';

export type MaskMode = 'blur' | 'logo' | 'hybrid';

export type WatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export interface AnonymizationSettings {
  ageThreshold: number; // 3 to 99 (>=99 means all ages), default 18
  maskMode: MaskMode; // 'blur' | 'logo' | 'hybrid'
  blurRadius: number; // 10 to 60, default 30
  facePadding: number; // 0 to 50 percent, default 15
  faceLogoUrl: string | null;
  faceLogoImage: HTMLImageElement | null;
  watermarkEnabled: boolean;
  watermarkUrl: string | null;
  watermarkImage: HTMLImageElement | null;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number; // 10 to 100, default 80
  watermarkScale: number; // 5 to 30, default 15
  // Video optimization for mobile and low-end hardware
  videoEcoMode: boolean; // Anti-freeze & Anti-OOM mode
  videoMaxResolution: '480p' | '720p' | '1080p'; // Capped resolution for frame processing
  videoFps: number; // 6 to 15 fps (default 8)
  videoFrameSkip: boolean; // Alternating face detection with tracking to cut AI load by 50%
}

export interface DetectedFace {
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  age: number;
  gender: string;
  genderProbability: number;
  shouldMask: boolean;
}

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  type: MediaType;
  size: number;
  status: QueueItemStatus;
  progress: number;
  progressMessage?: string;
  resultBlob?: Blob;
  resultUrl?: string;
  error?: string;
  facesDetected?: number;
  facesMasked?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number;
  thumbnailUrl?: string;
}
