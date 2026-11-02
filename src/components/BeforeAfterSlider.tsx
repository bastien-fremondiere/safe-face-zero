import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, MoveHorizontal, Shield, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface BeforeAfterSliderProps {
  type: 'image' | 'video';
  originalUrl: string;
  anonymizedUrl: string;
  name: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  type,
  originalUrl,
  anonymizedUrl,
}) => {
  const { t } = useI18n();
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%, default 50%
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Video sync controls
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const anonymizedVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Handle position calculation from mouse / touch
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    const clampedPercentage = Math.min(Math.max((x / width) * 100, 0), 100);
    setSliderPosition(clampedPercentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Synchronize both video playback states
  const togglePlay = () => {
    const v1 = originalVideoRef.current;
    const v2 = anonymizedVideoRef.current;
    if (!v1 || !v2) return;

    if (v1.paused) {
      v1.play();
      v2.play();
      setIsPlaying(true);
    } else {
      v1.pause();
      v2.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    const v1 = originalVideoRef.current;
    const v2 = anonymizedVideoRef.current;
    if (!v1 || !v2) return;
    v1.currentTime = 0;
    v2.currentTime = 0;
    v1.play();
    v2.play();
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    const v1 = originalVideoRef.current;
    const v2 = anonymizedVideoRef.current;
    if (v1 && v2) {
      v1.currentTime = time;
      v2.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Video time update listener
  useEffect(() => {
    if (type !== 'video') return;
    const v1 = originalVideoRef.current;
    if (!v1) return;

    const onTimeUpdate = () => {
      setCurrentTime(v1.currentTime);
      // Keep v2 perfectly synced with v1 if drift occurs
      if (anonymizedVideoRef.current && Math.abs(anonymizedVideoRef.current.currentTime - v1.currentTime) > 0.08) {
        anonymizedVideoRef.current.currentTime = v1.currentTime;
      }
    };

    const onLoadedMetadata = () => {
      setDuration(v1.duration || 0);
    };

    v1.addEventListener('timeupdate', onTimeUpdate);
    v1.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      v1.removeEventListener('timeupdate', onTimeUpdate);
      v1.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [type]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Top interactive slider instruction bar */}
      <div className="w-full flex items-center justify-between pb-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <MoveHorizontal className="h-4 w-4 text-blue-400 animate-pulse" />
          <span>{t('slider.instruction')}</span>
        </div>

        {/* Quick jump presets */}
        <div className="flex items-center gap-1.5">
          {[
            { label: t('slider.original'), pos: 100 },
            { label: t('slider.diff50'), pos: 50 },
            { label: t('slider.anonymized'), pos: 0 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSliderPosition(preset.pos)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                Math.round(sliderPosition) === preset.pos
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Diff Slider Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full overflow-hidden rounded-2xl border-2 border-slate-700 bg-black shadow-2xl cursor-ew-resize min-h-[320px] max-h-[62vh] flex items-center justify-center"
      >
        {/* Layer 1: Bottom (Right side visible) - ANONYMIZED VERSION */}
        <div className="relative w-full h-full flex items-center justify-center">
          {type === 'video' ? (
            <video
              ref={anonymizedVideoRef}
              src={anonymizedUrl}
              autoPlay
              muted
              playsInline
              loop
              className="max-h-[60vh] max-w-full w-auto h-auto object-contain pointer-events-none"
            />
          ) : (
            <img
              src={anonymizedUrl}
              alt="Anonymisé"
              className="max-h-[60vh] max-w-full w-auto h-auto object-contain pointer-events-none"
            />
          )}

          {/* Badge: Après (Anonymisé) */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none">
            <span className="flex items-center gap-1.5 rounded-full bg-blue-950/85 border border-blue-400/40 px-3 py-1 text-xs font-bold text-blue-300 shadow-lg backdrop-blur-md">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              {t('preview.afterAnonymized')}
            </span>
          </div>
        </div>

        {/* Layer 2: Top (Left side visible) - ORIGINAL VERSION, clipped by slider position */}
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
          style={{
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          }}
        >
          {type === 'video' ? (
            <video
              ref={originalVideoRef}
              src={originalUrl}
              autoPlay
              muted
              playsInline
              loop
              className="max-h-[60vh] max-w-full w-auto h-auto object-contain"
            />
          ) : (
            <img
              src={originalUrl}
              alt="Original"
              className="max-h-[60vh] max-w-full w-auto h-auto object-contain"
            />
          )}

          {/* Badge: Avant (Original) */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-900/85 border border-slate-600 px-3 py-1 text-xs font-bold text-slate-300 shadow-lg backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              {t('preview.beforeOriginal')}
            </span>
          </div>
        </div>

        {/* Vertical Divider Bar */}
        <div
          className="absolute top-0 bottom-0 z-20 w-1 bg-white shadow-[0_0_12px_rgba(59,130,246,0.8)] pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Circular Slider Knob */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl border-2 border-blue-500 hover:scale-110 transition-transform">
            <MoveHorizontal className="h-4 w-4 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Synchronized Video Controls (Only if Video) */}
      {type === 'video' && (
        <div className="w-full mt-3 flex items-center gap-3 rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-2.5 shadow-md">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            title={isPlaying ? t('slider.pause') : t('slider.play')}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={t('slider.restart')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <span className="text-xs font-mono text-slate-400 shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}
    </div>
  );
};
