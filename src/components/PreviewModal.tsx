import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  SlidersHorizontal,
  Columns,
  Shield,
  Eye,
  CheckCircle2,
  EyeOff,
  RotateCcw,
  Loader2,
  ZoomIn,
} from 'lucide-react';
import fileSaver from 'file-saver';
import { QueueItem } from '../types';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { ImageLoupe } from './ImageLoupe';
import { useI18n } from '../i18n/I18nContext';

const saveAs = (fileSaver as unknown as { saveAs?: typeof fileSaver }).saveAs || fileSaver;

interface PreviewModalProps {
  item: QueueItem | null;
  onClose: () => void;
  blurRadius?: number;
  onUpdateBlur?: (radius: number) => void;
  onReprocess?: (id: string) => Promise<void> | void;
  isProcessing?: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  item,
  onClose,
  blurRadius,
  onUpdateBlur,
  onReprocess,
  isProcessing = false,
}) => {
  const { t } = useI18n();
  // Default to interactive slider at 50%
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'anonymized-only'>('slider');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(true);

  // Refs for side-by-side & single view image inspection
  const sideOriginalContainerRef = useRef<HTMLDivElement>(null);
  const sideOriginalImgRef = useRef<HTMLImageElement>(null);
  const sideAnonContainerRef = useRef<HTMLDivElement>(null);
  const sideAnonImgRef = useRef<HTMLImageElement>(null);
  const singleViewContainerRef = useRef<HTMLDivElement>(null);
  const singleViewImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (item?.file) {
      const url = URL.createObjectURL(item.file);
      setOriginalUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setOriginalUrl(null);
    }
  }, [item]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item || !item.resultUrl || item.type === 'zip') return null;

  const handleDownload = () => {
    if (!item.resultBlob) return;
    const extIndex = item.name.lastIndexOf('.');
    let base = item.name;
    let ext = '';
    if (extIndex !== -1) {
      base = item.name.substring(0, extIndex);
      ext = item.name.substring(extIndex);
    }
    saveAs(item.resultBlob, `${base}_anonymized${ext}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[94vh] rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {t('preview.title', { name: item.name })}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('preview.success')}
                </span>
                {item.facesMasked !== undefined && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <Shield className="h-3 w-3" />
                      {t('preview.facesMaskedCount', { count: item.facesMasked })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'slider'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t('preview.sliderTitle')}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('preview.slider50')}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'side-by-side'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t('preview.sideBySideTitle')}
              >
                <Columns className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('preview.sideBySide')}</span>
              </button>
            </div>

            {/* Loupe Toggle Button for Photos */}
            {item.type !== 'video' && (
              <button
                type="button"
                onClick={() => setLoupeEnabled(!loupeEnabled)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                  loupeEnabled
                    ? 'bg-blue-600 text-white shadow-sm border-blue-500'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
                title={t('preview.loupeTitle')}
              >
                <ZoomIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('preview.loupe')}</span>
              </button>
            )}

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 shadow-md shadow-emerald-600/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {t('preview.download')}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 flex items-center justify-center">
          {viewMode === 'slider' && originalUrl ? (
            /* UX Friendly Diff Slider */
            <BeforeAfterSlider
              type={item.type === 'video' ? 'video' : 'image'}
              originalUrl={originalUrl}
              anonymizedUrl={item.resultUrl}
              name={item.name}
            />
          ) : viewMode === 'side-by-side' ? (
            /* Side by Side Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full min-h-[380px]">
              {/* Original */}
              <div
                ref={sideOriginalContainerRef}
                className="relative flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden"
              >
                <div className="px-3 py-2 bg-slate-850 border-b border-slate-800 text-xs font-semibold text-slate-400 flex justify-between items-center">
                  <span>{t('preview.beforeOriginal')}</span>
                  <span className="text-[10px] text-slate-500">{t('preview.sourceMedia')}</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-3 bg-black/40 min-h-[280px]">
                  {item.type === 'video' ? (
                    originalUrl && (
                      <video
                        src={originalUrl}
                        controls
                        className="max-h-[50vh] max-w-full rounded-lg object-contain shadow-md"
                      />
                    )
                  ) : (
                    originalUrl && (
                      <img
                        ref={sideOriginalImgRef}
                        src={originalUrl}
                        alt="Original"
                        className="max-h-[50vh] max-w-full rounded-lg object-contain shadow-md"
                      />
                    )
                  )}
                </div>
                {item.type !== 'video' && (
                  <ImageLoupe
                    containerRef={sideOriginalContainerRef}
                    targetImgRef={sideOriginalImgRef}
                    enabled={loupeEnabled}
                    zoom={2.5}
                    size={160}
                  />
                )}
              </div>

              {/* Anonymized */}
              <div
                ref={sideAnonContainerRef}
                className="relative flex flex-col rounded-xl border border-blue-500/30 bg-slate-900/60 overflow-hidden shadow-lg shadow-blue-500/5"
              >
                <div className="px-3 py-2 bg-blue-950/40 border-b border-blue-500/20 text-xs font-semibold text-blue-300 flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                    {t('preview.afterAnonymized')}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">{t('preview.local100')}</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-3 bg-black/40 min-h-[280px]">
                  {item.type === 'video' ? (
                    <video
                      src={item.resultUrl}
                      controls
                      autoPlay
                      loop
                      className="max-h-[50vh] max-w-full rounded-lg object-contain shadow-md"
                    />
                  ) : (
                    <img
                      ref={sideAnonImgRef}
                      src={item.resultUrl}
                      alt="Anonymisé"
                      className="max-h-[50vh] max-w-full rounded-lg object-contain shadow-md"
                    />
                  )}
                </div>
                {item.type !== 'video' && (
                  <ImageLoupe
                    containerRef={sideAnonContainerRef}
                    targetImgRef={sideAnonImgRef}
                    enabled={loupeEnabled}
                    zoom={2.5}
                    size={160}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Single Large View */
            <div
              ref={singleViewContainerRef}
              className="relative flex flex-col items-center justify-center h-full min-h-[420px] rounded-xl border border-blue-500/30 bg-slate-900/60 p-4"
            >
              {item.type === 'video' ? (
                <video
                  src={item.resultUrl}
                  controls
                  autoPlay
                  loop
                  className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-2xl"
                />
              ) : (
                <img
                  ref={singleViewImgRef}
                  src={item.resultUrl}
                  alt="Anonymisé"
                  className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-2xl"
                />
              )}
              {item.type !== 'video' && (
                <ImageLoupe
                  containerRef={singleViewContainerRef}
                  targetImgRef={singleViewImgRef}
                  enabled={loupeEnabled}
                  zoom={2.5}
                  size={160}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Interactive Blurriness Slider & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-800 bg-slate-900/95 text-xs">
          {/* Quick Blurriness Slider */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <span className="text-slate-300 font-semibold shrink-0 flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
              <EyeOff className="h-3.5 w-3.5 text-blue-400" />
              {t('preview.blurLabel')} <span className="font-mono text-blue-400 font-bold">{blurRadius ?? 30} px</span>
            </span>

            {onUpdateBlur && (
              <div className="flex items-center gap-1.5 flex-1 min-w-[140px] sm:w-44">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={blurRadius ?? 30}
                  onChange={(e) => onUpdateBlur(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  title={t('preview.blurSliderTitle')}
                />
              </div>
            )}

            {onReprocess && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onReprocess(item.id)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 disabled:opacity-50 px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                title={t('preview.recalculateTitle')}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{t('preview.calculating')}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3" />
                    <span>{t('preview.recalculate')}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Download className="h-3.5 w-3.5" />
              {t('preview.download')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              {t('preview.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
