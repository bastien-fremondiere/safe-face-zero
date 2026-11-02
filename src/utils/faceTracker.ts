import { DetectedFace } from '../types';

export interface FaceTrack {
  id: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  predictedBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  velocity: {
    vx: number;
    vy: number;
    vw: number;
    vh: number;
  };
  age: number;
  gender: string;
  genderProbability: number;
  shouldMask: boolean;
  assignedEmoji?: string;
  totalHits: number;
  consecutiveHits: number;
  missedFrames: number;
  consecutiveUnmaskVotes: number;
  consecutiveMaskVotes: number;
}

export interface FaceTrackerOptions {
  fps?: number;
  /**
   * Maximum frames to keep coasting/masking when a face is temporarily missed by AI.
   * Defaults to ~0.45s (e.g. 14 frames at 30fps).
   */
  maxCoastingFrames?: number;
  /**
   * Exponential moving average factor for position/dimension smoothing (0.0 to 1.0).
   * 0.70 gives rapid tracking of fast movements while eliminating high-frequency sensor noise.
   */
  smoothingAlpha?: number;
  /**
   * Minimum similarity threshold to match a detection to an existing track.
   */
  matchThreshold?: number;
}

const FUN_EMOJIS = ['😎', '🎃', '🐱', '🦄', '🐶', '🦊', '🐼', '🤖', '👻', '🌸', '⭐', '🔥', '🎉'];

/**
 * Temporal Face Tracking & Anti-Flicker Algorithm for SafeFace Zero
 *
 * Prevents the "clignotant" (flickering/blinking) effect in video processing:
 * 1. Bipartite association using IoU (Intersection over Union) + centroid distance.
 * 2. Velocity-aware position prediction across frames.
 * 3. Exponential Moving Average (EMA) smoothing to eliminate bounding-box jitter.
 * 4. Temporal coasting (persistence) to keep faces masked across temporary detector dropouts.
 * 5. Age & masking decision hysteresis to prevent thrashing at the age threshold boundary.
 * 6. Persistent emoji assignment across the entire video.
 */
export class FaceTracker {
  private tracks: FaceTrack[] = [];
  private nextTrackId = 1;
  private fps: number;
  private maxCoastingFrames: number;
  private smoothingAlpha: number;
  private matchThreshold: number;

  constructor(options: FaceTrackerOptions = {}) {
    this.fps = options.fps && options.fps > 0 ? options.fps : 30;
    this.maxCoastingFrames =
      options.maxCoastingFrames ?? Math.max(6, Math.round(this.fps * 0.45));
    this.smoothingAlpha = options.smoothingAlpha ?? 0.7;
    this.matchThreshold = options.matchThreshold ?? 0.2;
  }

  public get activeTrackCount(): number {
    return this.tracks.length;
  }

  /**
   * Computes the Intersection over Union (IoU) of two bounding boxes.
   */
  private calculateIoU(
    boxA: { x: number; y: number; width: number; height: number },
    boxB: { x: number; y: number; width: number; height: number }
  ): number {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    if (interArea <= 0) return 0;

    const areaA = boxA.width * boxA.height;
    const areaB = boxB.width * boxB.height;
    return interArea / (areaA + areaB - interArea);
  }

  /**
   * Computes similarity score combining IoU, normalized center distance, and aspect ratio.
   */
  private calculateSimilarity(track: FaceTrack, det: DetectedFace): number {
    const iou = this.calculateIoU(track.predictedBox, det.box);

    const cTrackX = track.predictedBox.x + track.predictedBox.width / 2;
    const cTrackY = track.predictedBox.y + track.predictedBox.height / 2;
    const cDetX = det.box.x + det.box.width / 2;
    const cDetY = det.box.y + det.box.height / 2;

    const maxDim = Math.max(
      track.predictedBox.width,
      track.predictedBox.height,
      det.box.width,
      det.box.height
    );
    const centerDist = Math.hypot(cTrackX - cDetX, cTrackY - cDetY);

    // Dynamic search radius allowing fast camera rotation / pan displacement
    const searchRadius = Math.max(70, maxDim * 2.8);
    const normDist = centerDist / searchRadius;

    const areaTrack = track.predictedBox.width * track.predictedBox.height;
    const areaDet = det.box.width * det.box.height;
    const areaRatio = Math.min(areaTrack, areaDet) / Math.max(1, Math.max(areaTrack, areaDet));

    if (iou >= 0.2) {
      return 0.6 * iou + 0.3 * (1 - Math.min(1, normDist)) + 0.1 * areaRatio;
    }
    if (centerDist < searchRadius && areaRatio > 0.25) {
      return 0.3 * iou + 0.5 * (1 - normDist) + 0.2 * areaRatio;
    }
    return 0;
  }

  /**
   * Process a single video frame.
   *
   * @param detections Raw neural detector outputs for this frame (can be empty on skipped frames).
   * @param frameWidth Width of the video frame canvas.
   * @param frameHeight Height of the video frame canvas.
   * @param ageThreshold Current age threshold for masking.
   * @param isSkippedFrame If true, this frame skipped neural detection; tracks coast forward smoothly.
   * @returns Stable, temporally smoothed faces to be masked on this frame.
   */
  public update(
    detections: DetectedFace[],
    frameWidth: number,
    frameHeight: number,
    ageThreshold = 18,
    isSkippedFrame = false
  ): DetectedFace[] {
    // 1. Predict next position for all existing tracks based on velocity & momentum
    for (const track of this.tracks) {
      const damp = Math.max(0.3, Math.pow(0.85, track.missedFrames));
      const boxW = Math.max(8, Number(track.box.width) || 8);
      const boxH = Math.max(8, Number(track.box.height) || 8);
      const vx = Number.isFinite(track.velocity.vx) ? track.velocity.vx : 0;
      const vy = Number.isFinite(track.velocity.vy) ? track.velocity.vy : 0;
      const vw = Number.isFinite(track.velocity.vw) ? track.velocity.vw : 0;
      const vh = Number.isFinite(track.velocity.vh) ? track.velocity.vh : 0;

      const predX = Math.max(0, Math.min(frameWidth - boxW, (Number(track.box.x) || 0) + vx * damp));
      const predY = Math.max(0, Math.min(frameHeight - boxH, (Number(track.box.y) || 0) + vy * damp));
      const predW = Math.max(8, Math.min(frameWidth, boxW + vw * damp * 0.5));
      const predH = Math.max(8, Math.min(frameHeight, boxH + vh * damp * 0.5));
      track.predictedBox = { x: predX, y: predY, width: predW, height: predH };
    }

    if (isSkippedFrame) {
      // Skipped AI frame: all tracks coast forward with their predicted positions
      for (const track of this.tracks) {
        track.box = { ...track.predictedBox };
        track.missedFrames++;
      }
    } else {
      // 2. Greedy Bipartite Matching between predicted tracks and new detections
      const matchedDetections = new Set<number>();
      const matchedTracks = new Set<number>();

      const candidatePairs: Array<{ tIdx: number; dIdx: number; score: number }> = [];

      for (let tIdx = 0; tIdx < this.tracks.length; tIdx++) {
        const track = this.tracks[tIdx];
        for (let dIdx = 0; dIdx < detections.length; dIdx++) {
          const det = detections[dIdx];
          const score = this.calculateSimilarity(track, det);
          if (score >= this.matchThreshold) {
            candidatePairs.push({ tIdx, dIdx, score });
          }
        }
      }

      // Sort candidate pairs descending by match quality
      candidatePairs.sort((a, b) => b.score - a.score);

      for (const pair of candidatePairs) {
        if (!matchedTracks.has(pair.tIdx) && !matchedDetections.has(pair.dIdx)) {
          matchedTracks.add(pair.tIdx);
          matchedDetections.add(pair.dIdx);

          const track = this.tracks[pair.tIdx];
          const det = detections[pair.dIdx];

          // 3a. Position & Dimension Smoothing via Exponential Moving Average (EMA)
          const alpha = this.smoothingAlpha;
          const newX = alpha * det.box.x + (1 - alpha) * track.predictedBox.x;
          const newY = alpha * det.box.y + (1 - alpha) * track.predictedBox.y;
          const newW = alpha * det.box.width + (1 - alpha) * track.predictedBox.width;
          const newH = alpha * det.box.height + (1 - alpha) * track.predictedBox.height;

          // 3b. Velocity update
          const vx = newX - track.box.x;
          const vy = newY - track.box.y;
          const vw = newW - track.box.width;
          const vh = newH - track.box.height;

          track.velocity = {
            vx: 0.6 * vx + 0.4 * track.velocity.vx,
            vy: 0.6 * vy + 0.4 * track.velocity.vy,
            vw: 0.5 * vw + 0.5 * track.velocity.vw,
            vh: 0.5 * vh + 0.5 * track.velocity.vh,
          };

          track.box = { x: newX, y: newY, width: newW, height: newH };
          track.missedFrames = 0;
          track.totalHits++;
          track.consecutiveHits++;

          // 3c. Age & Gender Smoothing
          track.age = 0.82 * track.age + 0.18 * det.age;
          track.gender = det.gender;
          track.genderProbability =
            0.85 * track.genderProbability + 0.15 * det.genderProbability;

          // 3d. Hysteresis on shouldMask to prevent flickering at age threshold
          if (track.shouldMask) {
            if (det.age >= ageThreshold + 2 && track.age >= ageThreshold + 1) {
              track.consecutiveUnmaskVotes++;
              if (track.consecutiveUnmaskVotes >= 4) {
                track.shouldMask = false;
                track.consecutiveUnmaskVotes = 0;
              }
            } else {
              track.consecutiveUnmaskVotes = 0;
            }
          } else {
            if (det.age <= ageThreshold - 1 && track.age <= ageThreshold) {
              track.consecutiveMaskVotes++;
              if (track.consecutiveMaskVotes >= 3) {
                track.shouldMask = true;
                track.consecutiveMaskVotes = 0;
              }
            } else {
              track.consecutiveMaskVotes = 0;
            }
          }
        }
      }

      // 4. Unmatched active tracks: Coast forward (eliminates "clignotant" dropout)
      for (let tIdx = 0; tIdx < this.tracks.length; tIdx++) {
        if (!matchedTracks.has(tIdx)) {
          const track = this.tracks[tIdx];
          track.missedFrames++;
          track.consecutiveHits = 0;
          track.box = { ...track.predictedBox };
        }
      }

      // 5. Unmatched detections: Initiate new tracks immediately (even if only here for a few frames)
      for (let dIdx = 0; dIdx < detections.length; dIdx++) {
        if (!matchedDetections.has(dIdx)) {
          const det = detections[dIdx];
          const assignedEmoji = det.assignedEmoji || FUN_EMOJIS[(this.nextTrackId * 7) % FUN_EMOJIS.length];

          this.tracks.push({
            id: this.nextTrackId++,
            box: { ...det.box },
            predictedBox: { ...det.box },
            velocity: { vx: 0, vy: 0, vw: 0, vh: 0 },
            age: det.age,
            gender: det.gender,
            genderProbability: det.genderProbability,
            shouldMask: det.shouldMask,
            assignedEmoji,
            totalHits: 1,
            consecutiveHits: 1,
            missedFrames: 0,
            consecutiveUnmaskVotes: 0,
            consecutiveMaskVotes: 0,
          });
        }
      }
    }

    // 6. Evict expired tracks that left the screen or exceeded coasting threshold
    this.tracks = this.tracks.filter((t) => {
      // If the face has rotated completely out of the frame viewport, retire immediately
      if (
        t.box.x + t.box.width <= 0 ||
        t.box.y + t.box.height <= 0 ||
        t.box.x >= frameWidth ||
        t.box.y >= frameHeight
      ) {
        return false;
      }
      // Adaptive coast limit: even a face briefly seen for 1 frame gets at least 5 frames (~160ms) of coasting
      // so fast camera rotation and brief motion blur don't drop the tracking mask abruptly.
      const coastLimit = t.totalHits >= 3 ? this.maxCoastingFrames : Math.max(5, Math.round(this.fps * 0.25));
      return t.missedFrames <= coastLimit;
    });

    // 7. Output stabilized faces
    return this.tracks.map((t) => ({
      box: {
        x: Math.round(Number.isFinite(t.box.x) ? t.box.x : 0),
        y: Math.round(Number.isFinite(t.box.y) ? t.box.y : 0),
        width: Math.max(8, Math.round(Number.isFinite(t.box.width) ? t.box.width : 8)),
        height: Math.max(8, Math.round(Number.isFinite(t.box.height) ? t.box.height : 8)),
      },
      age: Math.round(t.age),
      gender: t.gender,
      genderProbability: t.genderProbability,
      shouldMask: t.shouldMask,
      trackId: t.id,
      assignedEmoji: t.assignedEmoji,
    }));
  }

  /**
   * Clears all internal tracks (e.g. when beginning a new video).
   */
  public reset(): void {
    this.tracks = [];
    this.nextTrackId = 1;
  }
}
