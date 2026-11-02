import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Sparkles, Dices, ChevronDown } from 'lucide-react';
import { EMOJI_CATEGORIES, filterEmojis } from '../utils/emojiList';
import { useI18n } from '../i18n/I18nContext';

interface EmojiPickerMenuProps {
  selectedEmoji: string | null;
  onSelectEmoji: (emoji: string) => void;
  isHybrid?: boolean;
}

export const EmojiPickerMenu: React.FC<EmojiPickerMenuProps> = ({
  selectedEmoji,
  onSelectEmoji,
  isHybrid = true,
}) => {
  const { t, language } = useI18n();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredList = useMemo(() => {
    return filterEmojis(searchTerm, activeCategory);
  }, [searchTerm, activeCategory]);

  const currentDisplayEmoji = selectedEmoji === 'random' ? '🎲' : selectedEmoji || '😎';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 transition-all text-left cursor-pointer group shadow-sm"
      >
        <div className="flex items-center gap-3">
          {/* Mini preview with blur effect background */}
          <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-600 bg-slate-950 flex items-center justify-center shrink-0 shadow-inner">
            {isHybrid && (
              <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-[2px] opacity-75" />
            )}
            <span className="relative text-2xl select-none transform group-hover:scale-110 transition-transform">
              {currentDisplayEmoji}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">
                {selectedEmoji === 'random'
                  ? t('emoji.randomTitle')
                  : t('emoji.selectedTitle', { emoji: currentDisplayEmoji })}
              </span>
              <span className="text-[10px] rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 font-semibold">
                {isHybrid ? t('emoji.hybridBadge') : t('emoji.badge')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('emoji.menuHint')}
            </p>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 group-hover:text-white transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-slate-700 bg-slate-900 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Top: Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('emoji.searchPlaceholder')}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Option: Random Emoji per Face */}
          <div className="mb-2.5">
            <button
              type="button"
              onClick={() => {
                onSelectEmoji('random');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                selectedEmoji === 'random'
                  ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Dices className="h-4 w-4 text-indigo-400" />
                <span>{t('emoji.randomOption')}</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {t('emoji.randomDesc')}
              </span>
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-slate-800 custom-scrollbar text-[11px]">
            {EMOJI_CATEGORIES.map((cat) => {
              const label = language === 'en' ? cat.labelEn : cat.label;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Emojis Grid */}
          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-950/50 rounded-xl border border-slate-800/60 custom-scrollbar">
            {filteredList.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-500">
                {t('emoji.noResults')}
              </div>
            ) : (
              filteredList.map((item) => {
                const isSelected = selectedEmoji === item.emoji;
                return (
                  <button
                    key={item.emoji}
                    type="button"
                    aria-label={item.name}
                    onClick={() => {
                      onSelectEmoji(item.emoji);
                      setIsOpen(false);
                    }}
                    title={item.name}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-blue-600/40 border-2 border-blue-400 scale-105 shadow-md shadow-blue-500/20'
                        : 'hover:bg-slate-800 hover:scale-115 border border-transparent'
                    }`}
                  >
                    {item.emoji}
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Footer Info */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              {t('emoji.hybridNote')}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-medium"
            >
              {t('preview.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
