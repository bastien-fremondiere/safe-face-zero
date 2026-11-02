import React, { useState, useEffect } from 'react';
import { X, Download, SplitSquareHorizontal, CheckCircle2, Shield, Eye } from 'lucide-react';
import fileSaver from 'file-saver';
import { QueueItem } from '../types';

const saveAs = (fileSaver as unknown as { saveAs?: typeof fileSaver }).saveAs || fileSaver;

interface PreviewModalProps {
  item: QueueItem | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ item, onClose }) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'anonymized-only'>('side-by-side');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

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

  if (!item || !item.resultUrl) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white truncate max-w-sm sm:max-w-md">
                Aperçu : {item.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Traitement local réussi
                </span>
                {item.facesMasked !== undefined && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <Shield className="h-3 w-3" />
                      {item.facesMasked} visage(s) masqué(s)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <button
              type="button"
              onClick={() =>
                setViewMode((prev) => (prev === 'side-by-side' ? 'anonymized-only' : 'side-by-side'))
              }
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors"
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
              {viewMode === 'side-by-side' ? 'Vue Anonymisée seule' : 'Vue Comparaison (Avant/Après)'}
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 shadow-md shadow-emerald-600/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[380px]">
              {/* Original */}
              <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <div className="px-3 py-2 bg-slate-850 border-b border-slate-800 text-xs font-semibold text-slate-400 flex justify-between items-center">
                  <span>ORIGINAL (NON-MODIFIÉ)</span>
                  <span className="text-[10px] text-slate-500">Média source</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-3 bg-black/40 min-h-[280px]">
                  {item.type === 'video' ? (
                    originalUrl ? (
                      <video
                        src={originalUrl}
                        controls
                        className="max-h-[50vh] max-w-full rounded-lg object-contain shadow-md"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">Vidéo originale...</span>
                    )
                  ) : (
                    originalUrl && (
                      <img
                        src={originalUrl}
                        alt="Original"
                        className="max-h-[50vh] max-w-full rounded-lg object-contain shadow-md"
                      />
                    )
                  )}
                </div>
              </div>

              {/* Anonymized */}
              <div className="flex flex-col rounded-xl border border-blue-500/30 bg-slate-900/60 overflow-hidden shadow-lg shadow-blue-500/5">
                <div className="px-3 py-2 bg-blue-950/40 border-b border-blue-500/20 text-xs font-semibold text-blue-300 flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                    ANONYMISÉ (CONFORME RGPD)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">100% LOCAL</span>
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
                      src={item.resultUrl}
                      alt="Anonymisé"
                      className="max-h-[50vh] max-w-full rounded-lg object-contain shadow-md"
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Single Large Anonymized View */
            <div className="flex flex-col items-center justify-center h-full min-h-[420px] rounded-xl border border-blue-500/30 bg-slate-900/60 p-4">
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
                  src={item.resultUrl}
                  alt="Anonymisé"
                  className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-2xl"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
