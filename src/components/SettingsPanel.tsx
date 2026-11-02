import React, { useRef } from 'react';
import {
  Sliders,
  Shield,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Stamp,
  Maximize2,
  Trash2,
  Cpu,
  Smartphone,
  Zap,
} from 'lucide-react';
import { AnonymizationSettings, WatermarkPosition } from '../types';
import { loadImage } from '../utils/canvasMasker';
import { detectDeviceProfile } from '../utils/performance';

interface SettingsPanelProps {
  settings: AnonymizationSettings;
  onUpdate: (partial: Partial<AnonymizationSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const deviceProfile = detectDeviceProfile();

  // Handle Face Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      onUpdate({
        faceLogoUrl: url,
        faceLogoImage: img,
      });
    } catch {
      console.error("Erreur de chargement du logo d'anonymisation");
    }
  };

  const handleRemoveLogo = () => {
    if (settings.faceLogoUrl) URL.revokeObjectURL(settings.faceLogoUrl);
    onUpdate({ faceLogoUrl: null, faceLogoImage: null });
  };

  // Handle Watermark Upload
  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      onUpdate({
        watermarkUrl: url,
        watermarkImage: img,
      });
    } catch {
      console.error('Erreur de chargement du watermark');
    }
  };

  const handleRemoveWatermark = () => {
    if (settings.watermarkUrl) URL.revokeObjectURL(settings.watermarkUrl);
    onUpdate({ watermarkUrl: null, watermarkImage: null });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
        <Sliders className="h-5 w-5 text-blue-400" />
        <h3 className="text-lg font-bold text-white tracking-wide">
          Paramètres & Règles d'Anonymisation
        </h3>
      </div>

      <div className="mt-6 space-y-6">
        {/* 1. SEUIL D'ÂGE IA */}
        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              Seuil d'âge IA (Protection des mineurs)
            </label>
            <span className="rounded-md bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-300 border border-blue-500/30">
              ≤ {settings.ageThreshold} ans
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Seuls les visages estimés inférieurs ou égaux à cet âge seront masqués.
          </p>

          <div className="mt-4 flex items-center gap-4">
            <span className="text-xs text-slate-500 font-mono">3 ans</span>
            <input
              type="range"
              min="3"
              max="25"
              step="1"
              value={settings.ageThreshold}
              onChange={(e) => onUpdate({ ageThreshold: Number(e.target.value) })}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-slate-500 font-mono">25 ans</span>
          </div>

          {/* Quick preset buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: 'Petite enfance (≤ 10 ans)', value: 10 },
              { label: 'Adolescents (≤ 16 ans)', value: 16 },
              { label: 'Tous mineurs (≤ 18 ans)', value: 18 },
              { label: 'Tous visages (≤ 25 ans)', value: 25 },
            ].map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onUpdate({ ageThreshold: preset.value })}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  settings.ageThreshold === preset.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. MODE DE MASQUAGE */}
        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/50">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <EyeOff className="h-4 w-4 text-indigo-400" />
            Mode de masquage des visages
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mode Blur */}
            <button
              type="button"
              onClick={() => onUpdate({ maskMode: 'blur' })}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                settings.maskMode === 'blur'
                  ? 'border-blue-500 bg-blue-500/15 text-white shadow-lg shadow-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <EyeOff className="h-5 w-5 mb-1.5 text-blue-400" />
              <span className="text-xs font-bold">1. Flou Gaussien</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Effouage haute densité</span>
            </button>

            {/* Mode Logo */}
            <button
              type="button"
              onClick={() => onUpdate({ maskMode: 'logo' })}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                settings.maskMode === 'logo'
                  ? 'border-blue-500 bg-blue-500/15 text-white shadow-lg shadow-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="h-5 w-5 mb-1.5 text-indigo-400" />
              <span className="text-xs font-bold">2. Logo / Sticker</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Incrustation personnalisée</span>
            </button>

            {/* Mode Hybrid */}
            <button
              type="button"
              onClick={() => onUpdate({ maskMode: 'hybrid' })}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                settings.maskMode === 'hybrid'
                  ? 'border-blue-500 bg-blue-500/15 text-white shadow-lg shadow-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <Layers className="h-5 w-5 mb-1.5 text-emerald-400" />
              <span className="text-xs font-bold">3. Hybride</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Flou + Sticker centré</span>
            </button>
          </div>

          {/* Sub-settings depending on mode */}
          {(settings.maskMode === 'blur' || settings.maskMode === 'hybrid') && (
            <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-semibold">Intensité du flou gaussien :</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      settings.blurRadius <= 15
                        ? 'text-sky-400 bg-sky-500/10 border-sky-500/30'
                        : settings.blurRadius <= 35
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                        : settings.blurRadius <= 60
                        ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                        : 'text-purple-400 bg-purple-500/10 border-purple-500/30'
                    }`}
                  >
                    {settings.blurRadius <= 15
                      ? 'Léger'
                      : settings.blurRadius <= 35
                      ? 'Standard RGPD'
                      : settings.blurRadius <= 60
                      ? 'Fort'
                      : 'Intense (Opaque)'}
                  </span>
                </div>
                <span className="font-mono text-xs text-blue-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {settings.blurRadius} px
                </span>
              </div>

              {/* Slider with - and + precision buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onUpdate({ blurRadius: Math.max(5, settings.blurRadius - 5) })}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-colors cursor-pointer"
                  title="Diminuer le flou (-5px)"
                >
                  -
                </button>
                <div className="relative flex-1 flex items-center">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={settings.blurRadius}
                    onChange={(e) => onUpdate({ blurRadius: Number(e.target.value) })}
                    className="w-full h-2 bg-gradient-to-r from-blue-900/40 via-blue-600/50 to-indigo-500/80 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onUpdate({ blurRadius: Math.min(100, settings.blurRadius + 5) })}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-colors cursor-pointer"
                  title="Augmenter le flou (+5px)"
                >
                  +
                </button>
              </div>

              {/* Quick preset buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { label: 'Léger', val: 15 },
                  { label: 'Standard', val: 30 },
                  { label: 'Fort', val: 50 },
                  { label: 'Intense', val: 75 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => onUpdate({ blurRadius: preset.val })}
                    className={`py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                      settings.blurRadius === preset.val
                        ? 'bg-blue-600/30 border-blue-500 text-white font-semibold shadow-sm shadow-blue-500/20'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {preset.val}px ({preset.label})
                  </button>
                ))}
              </div>
            </div>
          )}

          {(settings.maskMode === 'logo' || settings.maskMode === 'hybrid') && (
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <span className="text-xs text-slate-300 font-medium block mb-2">
                Sticker / Logo de masquage de visage:
              </span>
              <div className="flex items-center gap-3">
                {settings.faceLogoUrl ? (
                  <div className="relative h-12 w-12 rounded-lg border border-slate-600 overflow-hidden bg-slate-950 flex items-center justify-center">
                    <img
                      src={settings.faceLogoUrl}
                      alt="Sticker visage"
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      title="Supprimer le sticker"
                      className="absolute inset-0 bg-red-600/80 text-white opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg border border-dashed border-slate-600 bg-slate-800/40 flex items-center justify-center text-slate-500 text-xs text-center p-1">
                    Bouclier Défaut
                  </div>
                )}

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-600 transition-colors"
                >
                  {settings.faceLogoUrl ? 'Remplacer l’image' : 'Importer un logo/sticker (PNG/SVG)'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. MARGE DE SÉCURITÉ DU VISAGE (PADDING) */}
        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-emerald-400" />
              Marge de sécurité du visage (Padding)
            </label>
            <span className="font-mono text-xs font-bold text-emerald-400">
              +{settings.facePadding} %
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Étend la boîte de flou au-delà des yeux/menton pour englober le front, la chevelure et les oreilles.
          </p>

          <div className="mt-3 flex items-center gap-4">
            <span className="text-xs text-slate-500 font-mono">0%</span>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={settings.facePadding}
              onChange={(e) => onUpdate({ facePadding: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs text-slate-500 font-mono">50%</span>
          </div>
        </div>

        {/* 4. MARQUAGE GLOBAL (WATERMARK) */}
        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Stamp className="h-4 w-4 text-amber-400" />
              Filigrane Global (Watermark)
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.watermarkEnabled}
                onChange={(e) => onUpdate({ watermarkEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.watermarkEnabled && (
            <div className="mt-4 space-y-4 pt-3 border-t border-slate-700/50">
              {/* Logo Watermark Upload */}
              <div>
                <span className="text-xs text-slate-300 font-medium block mb-2">
                  Image du filigrane:
                </span>
                <div className="flex items-center gap-3">
                  {settings.watermarkUrl ? (
                    <div className="relative h-10 w-24 rounded-lg border border-slate-600 overflow-hidden bg-slate-950 flex items-center justify-center p-1">
                      <img
                        src={settings.watermarkUrl}
                        alt="Watermark"
                        className="h-full w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveWatermark}
                        title="Supprimer le filigrane"
                        className="absolute inset-0 bg-red-600/80 text-white opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-8 rounded bg-slate-800 px-2 flex items-center text-[10px] text-slate-400 border border-slate-700">
                      Badge "SafeFace Zero" (par défaut)
                    </div>
                  )}

                  <input
                    ref={watermarkInputRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    onChange={handleWatermarkUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => watermarkInputRef.current?.click()}
                    className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    {settings.watermarkUrl ? 'Modifier' : 'Importer image'}
                  </button>
                </div>
              </div>

              {/* Watermark Position */}
              <div>
                <span className="text-xs text-slate-300 font-medium block mb-2">
                  Position sur le média:
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: 'top-left', label: 'Haut Gauche' },
                      { id: 'top-right', label: 'Haut Droite' },
                      { id: 'center', label: 'Centre' },
                      { id: 'bottom-left', label: 'Bas Gauche' },
                      { id: 'bottom-right', label: 'Bas Droite' },
                    ] as { id: WatermarkPosition; label: string }[]
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => onUpdate({ watermarkPosition: pos.id })}
                      className={`rounded-lg py-1.5 px-2 text-[11px] font-medium transition-colors ${
                        settings.watermarkPosition === pos.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity & Scale sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-300 font-medium">Opacité:</span>
                    <span className="font-mono text-blue-400 font-semibold">
                      {settings.watermarkOpacity} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.watermarkOpacity}
                    onChange={(e) => onUpdate({ watermarkOpacity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-300 font-medium">Échelle relative:</span>
                    <span className="font-mono text-blue-400 font-semibold">
                      {settings.watermarkScale} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={settings.watermarkScale}
                    onChange={(e) => onUpdate({ watermarkScale: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. OPTIMISATIONS VIDÉO & PERFORMANCES (Mobile & PC Modestes) */}
        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <label className="text-sm font-semibold text-slate-200">
                Optimisations Vidéo & Anti-OOM
              </label>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900 border border-slate-700 text-slate-300">
              {deviceProfile.isMobile ? (
                <>
                  <Smartphone className="h-3 w-3 text-emerald-400" />
                  <span>Mobile ({deviceProfile.cores} cœurs)</span>
                </>
              ) : (
                <>
                  <Cpu className="h-3 w-3 text-blue-400" />
                  <span>{deviceProfile.cores} cœurs • {deviceProfile.memoryGb} Go RAM</span>
                </>
              )}
            </div>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Évite les dépassements de mémoire vive (OOM) et les blocages du navigateur sur smartphone et ordinateurs portables.
          </p>

          <div className="mt-4 space-y-4">
            {/* Mode Éco Toggle */}
            <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  Mode Éco & Basse Consommation
                  {settings.videoEcoMode && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      Actif
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-400">
                  Résolution 480p, encodage ultra-rapide et pauses anti-freeze (recommandé).
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.videoEcoMode}
                onChange={(e) => onUpdate({ videoEcoMode: e.target.checked })}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Max Resolution Selector */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Résolution max du traitement :</span>
                <span className="font-mono text-blue-400 font-semibold">{settings.videoMaxResolution}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['480p', '720p', '1080p'] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => onUpdate({ videoMaxResolution: res })}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition-all border ${
                      settings.videoMaxResolution === res
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {res} {res === '480p' ? '(Léger)' : res === '720p' ? '(Équilibré)' : '(HD)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Skip / AI Acceleration */}
            <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">
                  Accélération IA (Interpolation 1 frame / 2)
                </span>
                <p className="text-[11px] text-slate-400">
                  Divise par deux la charge WebGL en suivant les visages entre les frames.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.videoFrameSkip}
                onChange={(e) => onUpdate({ videoFrameSkip: e.target.checked })}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Video FPS Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">Cadence d'analyse vidéo :</span>
                <span className="font-mono text-blue-400 font-semibold">{settings.videoFps} fps</span>
              </div>
              <input
                type="range"
                min="6"
                max="15"
                step="1"
                value={settings.videoFps}
                onChange={(e) => onUpdate({ videoFps: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>6 fps (Ultra-léger)</span>
                <span>8 fps (Standard)</span>
                <span>15 fps (Fluide)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
