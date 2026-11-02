import React from 'react';
import { ShieldCheck, Cpu, HardDrive, Lock } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface TrustBannerProps {
  isModelLoaded: boolean;
  isModelLoading: boolean;
  isFFmpegLoaded: boolean;
  isFFmpegLoading: boolean;
}

export const TrustBanner: React.FC<TrustBannerProps> = ({
  isModelLoaded,
  isModelLoading,
  isFFmpegLoaded,
  isFFmpegLoading,
}) => {
  const { t } = useI18n();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/40 p-4 md:p-6 shadow-xl backdrop-blur-md">
      <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
                {t('trust.title')}
              </h2>
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                {t('trust.badge')}
              </span>
            </div>
            <p className="mt-1 text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {t('trust.description')}
            </p>
          </div>
        </div>

        {/* Engine status pills */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs border border-slate-700/60">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-slate-300 font-medium">{t('trust.aiEngine')}</span>
            {isModelLoaded ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('trust.readyWebgl')}
              </span>
            ) : isModelLoading ? (
              <span className="text-amber-400 font-medium">{t('trust.loading')}</span>
            ) : (
              <span className="text-slate-400">{t('trust.waiting')}</span>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs border border-slate-700/60">
            <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">{t('trust.ffmpegEngine')}</span>
            {isFFmpegLoaded ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('trust.ready')}
              </span>
            ) : isFFmpegLoading ? (
              <span className="text-amber-400 font-medium">{t('trust.loading')}</span>
            ) : (
              <span className="text-slate-400">{t('trust.onDemand')}</span>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 px-2">
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span>{t('trust.isolationActive')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
