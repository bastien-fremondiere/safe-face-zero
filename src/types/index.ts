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
  selectedEmoji: string | null; // e.g. '😎', '🎃', 'random' or null
  faceLogoUrl: string | null;
  faceLogoImage: HTMLImageElement | null;
  watermarkEnabled: boolean;
  watermarkUrl: string | null;
  watermarkImage: HTMLImageElement | null;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number; // 10 to 100, default 80
  watermarkScale: number; // 5 to 30, default 15
  // Video processing & optimization
  videoEcoMode: boolean; // Anti-freeze & Anti-OOM mode
  videoMaxResolution: '480p' | '720p' | '1080p' | 'original'; // Resolution mode (original preserves native video quality)
  videoFps: number; // 0 = original source cadence (no fps limit), or explicit fps 6..60
  videoFrameSkip: boolean; // Alternating face detection with tracking to cut AI load by 50%
  videoTracking: boolean; // Temporal face tracking across frames to eliminate flickering
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
  trackId?: number;
  assignedEmoji?: string;
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
