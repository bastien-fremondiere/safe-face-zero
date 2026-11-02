import React, { useState, useRef } from 'react';
import { UploadCloud, Image, Film, Archive, Sparkles } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesAdded, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
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
      e.target.value = ''; // reset so same file can be selected again
    }
  };

  // Helper to load a demo sample face
  const handleLoadSample = async () => {
    try {
      // Create a sample canvas face for instant zero-server testing
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 640;
      sampleCanvas.height = 480;
      const ctx = sampleCanvas.getContext('2d');
      if (ctx) {
        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, 640, 480);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);

        // Draw an avatar with face elements
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(320, 240, 110, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(280, 210, 14, 0, Math.PI * 2);
        ctx.arc(360, 210, 14, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(320, 250, 50, 0.15 * Math.PI, 0.85 * Math.PI, false);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#1e293b';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 20px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Image de test générée localement', 320, 420);
      }

      sampleCanvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], 'demo_sample_test.png', { type: 'image/png' });
          onFilesAdded([sampleFile]);
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 md:p-12 transition-all duration-300 text-center
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
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-transform duration-300 group-hover:scale-110">
          <UploadCloud className="h-10 w-10 animate-pulse" />
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Glissez-déposez vos fichiers ici
        </h3>
        <p className="mt-2 text-sm text-slate-400 max-w-md">
          ou cliquez pour parcourir vos dossiers. Traitement simultané de photos, vidéos et archives volumineuses.
        </p>

        {/* Format indicators */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700/60">
            <Image className="h-4 w-4 text-emerald-400" />
            <span>Images (JPG, PNG, WEBP, AVIF)</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700/60">
            <Film className="h-4 w-4 text-indigo-400" />
            <span>Vidéos (MP4, MKV, AVI, MOV, WEBM)</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700/60">
            <Archive className="h-4 w-4 text-amber-400" />
            <span>Archives (.ZIP auto-décompressé)</span>
          </div>
        </div>

        {/* Sample button */}
        <div className="mt-5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline px-3 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Tester avec un échantillon généré
          </button>
        </div>
      </div>
    </div>
  );
};
