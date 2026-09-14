import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Languages, Search, Check, ChevronDown, Sparkles, Globe, X, Command } from 'lucide-react';
import { LanguageMode, LANGUAGE_OPTIONS, LanguageOption } from '../types';

interface LanguageSelectorProps {
  value: LanguageMode;
  onChange: (val: LanguageMode) => void;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Selected Option Object
  const currentOption = useMemo(() => {
    return LANGUAGE_OPTIONS.find((opt) => opt.id === value) || {
      id: value,
      label: typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : 'Auto Detect',
      category: 'auto' as const,
    };
  }, [value]);

  // Filtered Options based on Search Query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return LANGUAGE_OPTIONS;
    const query = searchQuery.toLowerCase().trim();
    return LANGUAGE_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.nativeLabel && opt.nativeLabel.toLowerCase().includes(query)) ||
        (opt.description && opt.description.toLowerCase().includes(query)) ||
        opt.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Grouped filtered options
  const indianLangs = useMemo(
    () => filteredOptions.filter((opt) => opt.category === 'indian'),
    [filteredOptions]
  );
  const internationalLangs = useMemo(
    () => filteredOptions.filter((opt) => opt.category === 'international'),
    [filteredOptions]
  );
  const specialLangs = useMemo(
    () => filteredOptions.filter((opt) => opt.category === 'special'),
    [filteredOptions]
  );
  const autoLangs = useMemo(
    () => filteredOptions.filter((opt) => opt.category === 'auto'),
    [filteredOptions]
  );

  // Popular Quick-Picks
  const quickPicks: { id: LanguageMode; label: string; badge?: string }[] = [
    { id: 'auto', label: 'Auto Detect' },
    { id: 'tamil', label: 'Tamil', badge: 'தமிழ்' },
    { id: 'tanglish', label: 'Tanglish' },
    { id: 'english', label: 'English' },
    { id: 'hindi', label: 'Hindi', badge: 'हिन्दी' },
    { id: 'telugu', label: 'Telugu', badge: 'తెలుగు' },
    { id: 'malayalam', label: 'Malayalam', badge: 'മലയാളം' },
    { id: 'kannada', label: 'Kannada', badge: 'ಕನ್ನಡ' },
  ];

  const handleSelect = (langId: LanguageMode) => {
    onChange(langId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`space-y-3 ${className}`} ref={dropdownRef}>
      {/* Quick Picks / Favorite Language Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1 flex-shrink-0 pr-1">
          <Sparkles className="w-3 h-3 text-[#F59E0B]" />
          Quick:
        </span>
        {quickPicks.map((pick) => {
          const isSelected = value === pick.id;
          return (
            <button
              key={pick.id}
              type="button"
              onClick={() => onChange(pick.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                isSelected
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50 shadow-sm'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <span>{pick.label}</span>
              {pick.badge && (
                <span className="text-[9px] opacity-75 font-normal">({pick.badge})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Dropdown Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
            isOpen
              ? 'bg-[#F59E0B]/10 border-[#F59E0B]/50 shadow-lg ring-2 ring-[#F59E0B]/20'
              : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] flex-shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide truncate">
                  {currentOption.label}
                </span>
                {currentOption.nativeLabel && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-medium">
                    {currentOption.nativeLabel}
                  </span>
                )}
                {currentOption.id === 'tanglish' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                    Special Format
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {currentOption.description || 'Target screenplay output language'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-400 hidden sm:inline font-medium">
              {isOpen ? 'Close' : '35+ Languages'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-[#F59E0B]' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Popover Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[#12141A]/95 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden animate-fade-in max-h-[420px] flex flex-col">
            
            {/* Search Bar Header */}
            <div className="p-3 border-b border-white/10 bg-white/[0.02]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search language (e.g., Tamil, Hindi, Telugu, Spanish, Japanese, Tanglish)..."
                  className="w-full pl-9.5 pr-8 py-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]/50 focus:ring-1 focus:ring-[#F59E0B]/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Language List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs max-h-[340px]">
              
              {/* No results */}
              {filteredOptions.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No languages found matching "{searchQuery}"
                </div>
              )}

              {/* 1. Auto Detect */}
              {autoLangs.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#F59E0B]">
                    Smart Auto
                  </div>
                  {autoLangs.map((opt) => (
                    <LanguageItem
                      key={opt.id}
                      option={opt}
                      isSelected={value === opt.id}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}

              {/* 2. Indian Languages */}
              {indianLangs.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Indian Languages</span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {indianLangs.length} available
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {indianLangs.map((opt) => (
                      <LanguageItem
                        key={opt.id}
                        option={opt}
                        isSelected={value === opt.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 3. International Languages */}
              {internationalLangs.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>International Languages</span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {internationalLangs.length} available
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {internationalLangs.map((opt) => (
                      <LanguageItem
                        key={opt.id}
                        option={opt}
                        isSelected={value === opt.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Special Writing Style */}
              {specialLangs.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                    Special Writing Style
                  </div>
                  {specialLangs.map((opt) => (
                    <LanguageItem
                      key={opt.id}
                      option={opt}
                      isSelected={value === opt.id}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom info footer */}
            <div className="px-3 py-2 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[10px] text-slate-400">
              <span>Input can be in any language; screenplay will format to selection</span>
              <span className="font-mono text-slate-500">35 Languages</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface LanguageItemProps {
  option: LanguageOption;
  isSelected: boolean;
  onSelect: (id: LanguageMode) => void;
}

const LanguageItem: React.FC<LanguageItemProps> = ({ option, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={`w-full px-3 py-2 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
        isSelected
          ? 'bg-[#F59E0B]/20 text-[#F59E0B] font-bold border border-[#F59E0B]/40'
          : 'bg-white/[0.02] text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold truncate">{option.label}</span>
          {option.nativeLabel && (
            <span className="text-[10px] text-slate-400 font-normal">
              ({option.nativeLabel})
            </span>
          )}
        </div>
        {option.description && (
          <div className="text-[10px] text-slate-500 font-normal truncate">
            {option.description}
          </div>
        )}
      </div>

      {isSelected && (
        <div className="w-4 h-4 rounded-full bg-[#F59E0B] text-black flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </div>
      )}
    </button>
  );
};
