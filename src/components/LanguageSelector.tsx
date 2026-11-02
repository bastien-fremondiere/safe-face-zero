import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { SupportedLanguage } from '../i18n/types';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, availableLanguages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = availableLanguages.find((l) => l.code === language) || availableLanguages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 px-2.5 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700/80 transition-all cursor-pointer shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Changer de langue / Change language"
      >
        <span className="text-sm leading-none">{currentLang.flag}</span>
        <span className="hidden sm:inline uppercase font-bold tracking-wider text-[11px] text-slate-300">
          {currentLang.code}
        </span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 origin-top-right rounded-xl border border-slate-700/80 bg-slate-900/95 py-1.5 shadow-2xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1 flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-blue-400" />
            <span>Langue / Language</span>
          </div>
          {availableLanguages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
