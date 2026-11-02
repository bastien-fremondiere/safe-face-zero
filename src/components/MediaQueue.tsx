import React from 'react';
import {
  FileText,
  Image,
  Film,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Download,
  Trash2,
  Eye,
  Play,
  Archive,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import fileSaver from 'file-saver';
import { QueueItem } from '../types';

const saveAs = (fileSaver as unknown as { saveAs?: typeof fileSaver }).saveAs || fileSaver;

interface MediaQueueProps {
  queue: QueueItem[];
  isProcessing: boolean;
  activeItemId: string | null;
  onProcessItem: (id: string) => void;
  onProcessAll: () => void;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onExportZip: () => void;
  onOpenPreview: (item: QueueItem) => void;
  onCancelProcessing?: () => void;
}

export const MediaQueue: React.FC<MediaQueueProps> = ({
  queue,
  isProcessing,
  activeItemId,
  onProcessItem,
  onProcessAll,
  onRemoveItem,
  onClearQueue,
  onExportZip,
  onOpenPreview,
  onCancelProcessing,
}) => {
  if (queue.length === 0) {
    return null;
  }

  const completedCount = queue.filter((i) => i.status === 'done').length;
  const hasCompletedItems = completedCount > 0;
  const pendingCount = queue.filter((i) => i.status !== 'done').length;

  const handleDownloadItem = (item: QueueItem) => {
    if (!item.resultBlob) return;
    const extIndex = item.name.lastIndexOf('.');
    let base = item.name;
    let ext = '';
    if (extIndex !== -1) {
      base = item.name.substring(0, extIndex);
      ext = item.name.substring(extIndex);
    }
    const outName = `${base}_anonymized${ext}`;
    saveAs(item.resultBlob, outName);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 shadow-xl backdrop-blur-sm">
      {/* Header with global actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            File d'attente ({queue.length} fichier{queue.length > 1 ? 's' : ''})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {completedCount} traité{completedCount > 1 ? 's' : ''} sur {queue.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isProcessing && onCancelProcessing && (
            <button
              type="button"
              onClick={onCancelProcessing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 font-semibold text-xs px-3 py-2.5 transition-colors cursor-pointer"
              title="Arrêter immédiatement le traitement"
            >
              <XCircle className="h-4 w-4 text-red-400" />
              Arrêter
            </button>
          )}

          {pendingCount > 0 && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onProcessAll}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white font-semibold text-xs px-4 py-2.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Tout anonymiser ({pendingCount})
                </>
              )}
            </button>
          )}

          {hasCompletedItems && (
            <button
              type="button"
              onClick={onExportZip}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Archive className="h-4 w-4" />
              Tout exporter en .zip
            </button>
          )}

          <button
            type="button"
            disabled={isProcessing}
            onClick={onClearQueue}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-3 py-2.5 transition-colors cursor-pointer"
            title="Vider la liste"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Vider
          </button>
        </div>
      </div>

      {/* Queue items list */}
      <div className="mt-4 space-y-3">
        {queue.map((item) => {
          const isCurrentActive = activeItemId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition-all ${
                isCurrentActive
                  ? 'border-blue-500/80 bg-blue-950/20 shadow-md shadow-blue-500/10'
                  : item.status === 'done'
                  ? 'border-emerald-500/30 bg-slate-800/40'
                  : item.status === 'error'
                  ? 'border-red-500/40 bg-red-950/20'
                  : 'border-slate-800 bg-slate-850/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Media type icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                      item.type === 'video'
                        ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {item.type === 'video' ? (
                      <Film className="h-5 w-5" />
                    ) : (
                      <Image className="h-5 w-5" />
                    )}
                  </div>

                  {/* File info */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate max-w-xs md:max-w-md">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span>{formatSize(item.size)}</span>
                      <span>•</span>
                      <span className="uppercase">{item.type}</span>
                      {item.dimensions && (
                        <>
                          <span>•</span>
                          <span>
                            {item.dimensions.width}x{item.dimensions.height}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status badge & Actions */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {/* Status Indicator */}
                  {item.status === 'idle' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-700">
                      <Clock className="h-3.5 w-3.5" />
                      En attente
                    </span>
                  )}

                  {item.status === 'processing' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/30">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {item.progress}%
                    </span>
                  )}

                  {item.status === 'done' && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Succès
                      </span>
                      {item.facesMasked !== undefined && (
                        <span className="hidden md:inline-flex rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700">
                          {item.facesMasked} visage{item.facesMasked > 1 ? 's' : ''} masqué{item.facesMasked > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {item.status === 'error' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-500/30">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Erreur
                    </span>
                  )}

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5">
                    {item.status === 'idle' && !isProcessing && (
                      <button
                        type="button"
                        onClick={() => onProcessItem(item.id)}
                        className="rounded-lg bg-blue-600/80 hover:bg-blue-600 p-2 text-white transition-colors cursor-pointer"
                        title="Anonymiser ce fichier"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </button>
                    )}

                    {item.status === 'done' && (
                      <>
                        {item.type !== 'zip' && (
                          <button
                            type="button"
                            onClick={() => onOpenPreview(item)}
                            className="rounded-lg bg-slate-800 hover:bg-blue-900/60 hover:text-blue-300 p-2 text-slate-200 transition-colors cursor-pointer border border-slate-700"
                            title="Aperçu Comparatif (Slider Avant/Après)"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownloadItem(item)}
                          className="rounded-lg bg-emerald-600/80 hover:bg-emerald-600 p-2 text-white transition-colors cursor-pointer"
                          title="Télécharger"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}

                    {!isProcessing && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="rounded-lg bg-slate-800 hover:bg-red-950/80 hover:text-red-400 p-2 text-slate-400 transition-colors cursor-pointer"
                        title="Retirer de la liste"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar and details */}
              {item.status === 'processing' && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{item.progressMessage || 'Traitement...'}</span>
                    <span className="font-mono text-blue-400 font-semibold">{item.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {item.status === 'error' && item.error && (
                <div className="mt-2 text-xs text-red-400 font-mono bg-red-950/40 p-2 rounded-lg border border-red-900/50">
                  {item.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
