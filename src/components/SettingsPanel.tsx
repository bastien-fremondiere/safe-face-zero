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
  Smile,
} from 'lucide-react';
import { AnonymizationSettings, WatermarkPosition } from '../types';
import { loadImage } from '../utils/canvasMasker';
import { detectDeviceProfile } from '../utils/performance';
import { EmojiPickerMenu } from './EmojiPickerMenu';
import { useI18n } from '../i18n/I18nContext';

interface SettingsPanelProps {
  settings: AnonymizationSettings;
  onUpdate: (partial: Partial<AnonymizationSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate }) => {
  const { t } = useI18n();
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
          {t('settings.title')}
        </h3>
      </div>

      <div className="mt-6 space-y-6">
        {/* 1. SEUIL D'ÂGE IA */}
        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              {t('settings.ageThresholdTitle')}
            </label>
            <span className="rounded-md bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-300 border border-blue-500/30">
              {settings.ageThreshold >= 99 ? t('settings.ageAll') : t('settings.ageYears', { age: settings.ageThreshold })}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            {t('settings.ageSubtitle')}
          </p>

          <div className="mt-4 flex items-center gap-4">
            <span className="text-xs text-slate-500 font-mono">{t('settings.ageMin')}</span>
            <input
              type="range"
              min="3"
              max="99"
              step="1"
              value={settings.ageThreshold}
              onChange={(e) => onUpdate({ ageThreshold: Number(e.target.value) })}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-slate-500 font-mono">{t('settings.ageMax')}</span>
          </div>

          {/* Quick preset buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: t('settings.presetToddlers'), value: 10 },
              { label: t('settings.presetTeens'), value: 16 },
              { label: t('settings.presetMinors'), value: 18 },
              { label: t('settings.presetAll'), value: 99 },
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
            {t('settings.maskModeTitle')}
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
              <span className="text-xs font-bold">{t('settings.modeBlur')}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{t('settings.modeBlurDesc')}</span>
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
              <span className="text-xs font-bold">{t('settings.modeLogo')}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{t('settings.modeLogoDesc')}</span>
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
              <span className="text-xs font-bold">{t('settings.modeHybrid')}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{t('settings.modeHybridDesc')}</span>
            </button>
          </div>

          {/* Sub-settings depending on mode */}
          {(settings.maskMode === 'blur' || settings.maskMode === 'hybrid') && (
            <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-semibold">{t('settings.blurIntensity')}</span>
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
                      ? t('settings.blurLight')
                      : settings.blurRadius <= 35
                      ? t('settings.blurStandard')
                      : settings.blurRadius <= 60
                      ? t('settings.blurStrong')
                      : t('settings.blurIntense')}
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
                  title={t('settings.blurDecrease')}
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
                  title={t('settings.blurIncrease')}
                >
                  +
                </button>
              </div>

              {/* Quick preset buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { label: t('settings.presetLight'), val: 15 },
                  { label: t('settings.presetStandard'), val: 30 },
                  { label: t('settings.presetStrong'), val: 50 },
                  { label: t('settings.presetIntense'), val: 75 },
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
            <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-200 font-semibold flex items-center gap-1.5">
                  <Smile className="h-4 w-4 text-amber-400" />
                  {t('settings.stickerOrEmojiTitle')}
                </span>

                {/* Switch between Emoji and Custom Image */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (!settings.selectedEmoji) onUpdate({ selectedEmoji: '😎' });
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      settings.selectedEmoji
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎭 {t('settings.tabEmoji')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ selectedEmoji: null })}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      !settings.selectedEmoji
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🖼️ {t('settings.tabCustomLogo')}
                  </button>
                </div>
              </div>

              {settings.selectedEmoji ? (
                /* Selectable & Searchable Emoji Menu */
                <EmojiPickerMenu
                  selectedEmoji={settings.selectedEmoji}
                  onSelectEmoji={(emoji) => onUpdate({ selectedEmoji: emoji })}
                  isHybrid={settings.maskMode === 'hybrid'}
                />
              ) : (
                /* Custom Image Logo Upload */
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
                        title={t('settings.stickerDelete')}
                        className="absolute inset-0 bg-red-600/80 text-white opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-lg border border-dashed border-slate-600 bg-slate-800/40 flex items-center justify-center text-slate-500 text-xs text-center p-1">
                      {t('settings.stickerDefault')}
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
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    {settings.faceLogoUrl ? t('settings.stickerReplace') : t('settings.stickerUpload')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. MARGE DE SÉCURITÉ DU VISAGE (PADDING) */}
        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-emerald-400" />
              {t('settings.paddingTitle')}
            </label>
            <span className="font-mono text-xs font-bold text-emerald-400">
              +{settings.facePadding} %
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            {t('settings.paddingSubtitle')}
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
              {t('settings.watermarkTitle')}
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
                  {t('settings.watermarkImage')}
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
                        title={t('settings.watermarkDelete')}
                        className="absolute inset-0 bg-red-600/80 text-white opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-8 rounded bg-slate-800 px-2 flex items-center text-[10px] text-slate-400 border border-slate-700">
                      {t('settings.watermarkDefault')}
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
                    {settings.watermarkUrl ? t('settings.watermarkModify') : t('settings.watermarkUpload')}
                  </button>
                </div>
              </div>

              {/* Watermark Position */}
              <div>
                <span className="text-xs text-slate-300 font-medium block mb-2">
                  {t('settings.watermarkPosition')}
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: 'top-left', label: t('settings.posTopLeft') },
                      { id: 'top-right', label: t('settings.posTopRight') },
                      { id: 'center', label: t('settings.posCenter') },
                      { id: 'bottom-left', label: t('settings.posBottomLeft') },
                      { id: 'bottom-right', label: t('settings.posBottomRight') },
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
                    <span className="text-slate-300 font-medium">{t('settings.watermarkOpacity')}</span>
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
                    <span className="text-slate-300 font-medium">{t('settings.watermarkScale')}</span>
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
                {t('settings.videoOptimTitle')}
              </label>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900 border border-slate-700 text-slate-300">
              {deviceProfile.isMobile ? (
                <>
                  <Smartphone className="h-3 w-3 text-emerald-400" />
                  <span>{t('settings.mobileCores', { cores: deviceProfile.cores })}</span>
                </>
              ) : (
                <>
                  <Cpu className="h-3 w-3 text-blue-400" />
                  <span>{t('settings.desktopCores', { cores: deviceProfile.cores, ram: deviceProfile.memoryGb })}</span>
                </>
              )}
            </div>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            {t('settings.videoOptimSubtitle')}
          </p>

          <div className="mt-4 space-y-4">
            {/* Mode Éco Toggle */}
            <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  {t('settings.ecoModeTitle')}
                  {settings.videoEcoMode && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      {t('settings.ecoModeActive')}
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-400">
                  {t('settings.ecoModeDesc')}
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
                <span className="text-slate-300 font-medium">{t('settings.maxResolution')}</span>
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
                    {res} {res === '480p' ? t('settings.resLight') : res === '720p' ? t('settings.resBalanced') : t('settings.resHd')}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Skip / AI Acceleration */}
            <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-3 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">
                  {t('settings.frameSkipTitle')}
                </span>
                <p className="text-[11px] text-slate-400">
                  {t('settings.frameSkipDesc')}
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
                <span className="text-slate-300 font-medium">{t('settings.fpsTitle')}</span>
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
                <span>{t('settings.fpsUltraLight')}</span>
                <span>{t('settings.fpsStandard')}</span>
                <span>{t('settings.fpsFluid')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
