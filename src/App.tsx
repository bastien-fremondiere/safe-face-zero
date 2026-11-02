import React, { useState } from 'react';
import { Shield, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useMediaProcessor } from './hooks/useMediaProcessor';
import { TrustBanner } from './components/TrustBanner';
import { DropZone } from './components/DropZone';
import { SettingsPanel } from './components/SettingsPanel';
import { MediaQueue } from './components/MediaQueue';
import { PreviewModal } from './components/PreviewModal';
import { QueueItem } from './types';

export const App: React.FC = () => {
  const {
    queue,
    settings,
    isProcessing,
    activeItemId,
    isModelLoaded,
    isModelLoading,
    modelError,
    isFFmpegLoaded,
    isFFmpegLoading,
    updateSettings,
    addFilesToQueue,
    removeFromQueue,
    clearQueue,
    processItem,
    processAll,
    exportAllAsZip,
  } = useMediaProcessor();

  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20 text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">SafeFace Zero</h1>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Anonymisation locale d'images et vidéos conforme RGPD • Zero-Server
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 font-medium">
              <Lock className="h-3.5 w-3.5" />
              <span>Chiffrement client pur</span>
            </div>

            <a
              href="https://github.com/bastien-fremondiere/safe-face-zero"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors border border-slate-700"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Model error banner if any */}
        {modelError && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold">Notice IA Face-API:</p>
              <p>{modelError}</p>
            </div>
          </div>
        )}

        {/* RGPD & Zero-Server Trust Banner */}
        <TrustBanner
          isModelLoaded={isModelLoaded}
          isModelLoading={isModelLoading}
          isFFmpegLoaded={isFFmpegLoaded}
          isFFmpegLoading={isFFmpegLoading}
        />

        {/* 2-Column Application Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Ingestion & File Queue */}
          <div className="lg:col-span-7 space-y-6">
            <DropZone onFilesAdded={addFilesToQueue} disabled={isProcessing} />

            <MediaQueue
              queue={queue}
              isProcessing={isProcessing}
              activeItemId={activeItemId}
              onProcessItem={processItem}
              onProcessAll={processAll}
              onRemoveItem={removeFromQueue}
              onClearQueue={clearQueue}
              onExportZip={exportAllAsZip}
              onOpenPreview={setPreviewItem}
            />
          </div>

          {/* Right Column (5 cols): Anonymization Settings Panel */}
          <div className="lg:col-span-5 sticky top-24">
            <SettingsPanel settings={settings} onUpdate={updateSettings} />
          </div>
        </div>
      </main>

      {/* Modal for preview and side-by-side comparison */}
      <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800 bg-slate-950/90 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>
              SafeFace Zero — Architecture WebAssembly 100% statique & Inférence client (vladmandic/face-api + FFmpeg.wasm).
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>Conformité RGPD Art. 25 & 32</span>
            <span>•</span>
            <a
              href="https://github.com/bastien-fremondiere/safe-face-zero"
              className="text-slate-400 hover:text-white transition-colors underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Code Source Open-Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
