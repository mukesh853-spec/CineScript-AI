import React, { useState } from 'react';
import { Compass, ChevronDown, ChevronRight, Sparkles, Layers } from 'lucide-react';
import { StoryOutline } from '../types';

interface StoryOutlineCardProps {
  outline?: StoryOutline;
  detectedLanguage?: string;
  className?: string;
  defaultExpanded?: boolean;
}

export const StoryOutlineCard: React.FC<StoryOutlineCardProps> = ({
  outline,
  detectedLanguage = 'English',
  className = '',
  defaultExpanded = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  if (!outline || (!outline.beginning && !outline.conflict && !outline.escalation && !outline.climax && !outline.ending)) {
    return null;
  }

  const isTamil = detectedLanguage === 'Tamil';

  return (
    <div className={`rounded-2xl border border-white/10 glass overflow-hidden transition-all duration-300 ${className}`}>
      {/* Toggle Button Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.07] text-left transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] flex-shrink-0 group-hover:scale-105 transition-transform">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {isTamil ? 'கதை கட்டமைப்பு (Story Outline)' : 'Story Outline'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] font-semibold">
              5 Beats
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-white transition-colors">
          <span className="text-[11px] font-medium hidden sm:inline">
            {isOpen ? (isTamil ? 'மறை' : 'Hide Outline') : (isTamil ? 'பார்க்க' : 'View Story Outline')}
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-[#F59E0B]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#F59E0B]" />
          )}
        </div>
      </button>

      {/* Collapsible Content Area */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-white/10 space-y-3 bg-black/40 animate-fade-in text-xs leading-relaxed">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#F59E0B]">
              STORY OUTLINE & DRAMATIC PROGRESSION
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Beginning → Conflict → Escalation → Climax → Ending
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* 1. Beginning */}
            {outline.beginning && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-400/90 block">
                  {isTamil ? '1. தொடக்கம் (Beginning):' : 'Beginning:'}
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">{outline.beginning}</p>
              </div>
            )}

            {/* 2. Conflict */}
            {outline.conflict && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-400/90 block">
                  {isTamil ? '2. முரண் / பிரச்சனை (Conflict):' : 'Conflict:'}
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">{outline.conflict}</p>
              </div>
            )}

            {/* 3. Escalation */}
            {outline.escalation && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-400/90 block">
                  {isTamil ? '3. பதற்றம் / தீவிரம் (Escalation):' : 'Escalation:'}
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">{outline.escalation}</p>
              </div>
            )}

            {/* 4. Climax */}
            {outline.climax && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-400/90 block">
                  {isTamil ? '4. உச்சக்கட்டம் (Climax):' : 'Climax:'}
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">{outline.climax}</p>
              </div>
            )}

            {/* 5. Ending */}
            {outline.ending && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-400/90 block">
                  {isTamil ? '5. முடிவு (Ending):' : 'Ending:'}
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">{outline.ending}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
