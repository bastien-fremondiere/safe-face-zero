import React, { useState, useRef } from 'react';
import { UploadCloud, Image, Film, Archive, Sparkles, User, Users, Video } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesAdded, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesAdded(filesArray);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesAdded(filesArray);
      e.target.value = '';
    }
  };

  // Helper to load sample files from public/samples/
  const handleLoadSampleFile = async (
    sampleName: string,
    fileName: string,
    mimeType: string
  ) => {
    if (disabled || isLoadingSample) return;
    setIsLoadingSample(true);
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
      const url = `${baseUrl}samples/${sampleName}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${sampleName}`);
      }
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: mimeType });
      onFilesAdded([file]);
    } catch (err) {
      console.warn('Could not load public sample, generating synthetic sample:', err);
      // Fallback synthetic sample
      handleGenerateSyntheticSample();
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Helper to generate a sample canvas face for instant zero-server testing
  const handleGenerateSyntheticSample = () => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 640;
    sampleCanvas.height = 480;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(320, 240, 110, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(280, 210, 14, 0, Math.PI * 2);
      ctx.arc(360, 210, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(320, 250, 50, 0.15 * Math.PI, 0.85 * Math.PI, false);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#1e293b';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Échantillon de test synthétique', 320, 420);
    }

    sampleCanvas.toBlob((blob) => {
      if (blob) {
        const sampleFile = new File([blob], 'demo_sample_test.png', { type: 'image/png' });
        onFilesAdded([sampleFile]);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Universal Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 md:p-10 transition-all duration-300 text-center
          ${
            isDragOver
              ? 'border-blue-400 bg-blue-500/10 scale-[1.01] shadow-2xl shadow-blue-500/20'
              : 'border-slate-700/80 bg-slate-900/50 hover:border-blue-500/50 hover:bg-slate-900/80'
          }
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.zip,.mkv,.avi,.mov,.mp4,.webm,.flv,.ts"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          {/* Animated icon container */}
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-transform duration-300 group-hover:scale-110">
            <UploadCloud className="h-8 w-8 animate-pulse" />
          </div>

          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
            Glissez-déposez vos fichiers ici
          </h3>
          <p className="mt-1.5 text-xs text-slate-400 max-w-md">
            ou cliquez pour parcourir vos dossiers. Traitement simultané d'images, vidéos et archives ZIP.
          </p>

          {/* Format indicators */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-slate-700/60">
              <Image className="h-3.5 w-3.5 text-emerald-400" />
              <span>Images (JPG, PNG, WEBP, AVIF)</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-slate-700/60">
              <Film className="h-3.5 w-3.5 text-indigo-400" />
              <span>Vidéos (MP4, MKV, AVI, MOV, WEBM)</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-slate-700/60">
              <Archive className="h-3.5 w-3.5 text-amber-400" />
              <span>Archives (.ZIP auto-extrait)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Samples Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-md backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Tester immédiatement avec nos jeux de démonstration :</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled || isLoadingSample}
              onClick={() => handleLoadSampleFile('sample-portrait.jpg', 'portrait_ado_test.jpg', 'image/jpeg')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-2.5 py-1 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              title="Tester avec un portrait individuel"
            >
              <User className="h-3 w-3 text-blue-400" />
              Photo Portrait
            </button>

            <button
              type="button"
              disabled={disabled || isLoadingSample}
              onClick={() => handleLoadSampleFile('sample-group.jpg', 'groupe_enfants_test.jpg', 'image/jpeg')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-2.5 py-1 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              title="Tester avec une photo de groupe d'enfants"
            >
              <Users className="h-3 w-3 text-emerald-400" />
              Photo Groupe
            </button>

            <button
              type="button"
              disabled={disabled || isLoadingSample}
              onClick={() => handleLoadSampleFile('sample-face-walking.webm', 'video_visages_test.webm', 'video/webm')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-500/40 disabled:opacity-50 px-2.5 py-1 text-xs font-semibold text-indigo-200 transition-colors"
              title="Tester avec un clip vidéo"
            >
              <Video className="h-3 w-3 text-indigo-400" />
              Clip Vidéo (WebM/MP4)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
