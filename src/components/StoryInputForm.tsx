import React, { useState } from 'react';
import { Sparkles, Languages, Settings2, HelpCircle, Film, ArrowRight, Layers, Clapperboard, X, Zap } from 'lucide-react';
import { Character, LanguageMode, StorySettings, GenerationMode } from '../types';
import { CharacterManager } from './CharacterManager';
import { LanguageSelector } from './LanguageSelector';

interface StoryInputFormProps {
  title: string;
  setTitle: (val: string) => void;
  concept: string;
  setConcept: (val: string) => void;
  languageMode: LanguageMode;
  setLanguageMode: (val: LanguageMode) => void;
  characters: Character[];
  setCharacters: (chars: Character[]) => void;
  settings: StorySettings;
  setSettings: React.Dispatch<React.SetStateAction<StorySettings>>;
  onGenerate: () => void;
  isLoading: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export const StoryInputForm: React.FC<StoryInputFormProps> = ({
  title,
  setTitle,
  concept,
  setConcept,
  languageMode,
  setLanguageMode,
  characters,
  setCharacters,
  settings,
  setSettings,
  onGenerate,
  isLoading,
  error,
  onClearError,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('Understanding Story...');

  const isFastMode = (settings.generationMode || 'fast') === 'fast';

  // Progressive loading states during generation
  React.useEffect(() => {
    if (!isLoading) {
      setLoadingStage('Understanding Story...');
      return;
    }

    const stages = isFastMode
      ? [
          'Understanding Story & Human Dynamics...',
          'Developing Characters & Natural Dialogue...',
          'Writing Master Screenplay...',
          'Formatting Cinematic Output...',
        ]
      : [
          'Understanding Story & Theme...',
          'Developing Characters & Conflict...',
          'Writing Screenplays (Version A & B)...',
          'Evaluating Scripts & Matrix...',
        ];

    let current = 0;
    setLoadingStage(stages[0]);

    const interval = setInterval(() => {
      current = (current + 1) % stages.length;
      setLoadingStage(stages[current]);
    }, 1400);

    return () => clearInterval(interval);
  }, [isLoading, isFastMode]);

  // Preset prompts from requirements
  const samplePrompts = [
    {
      label: 'Tanglish Story Seed',
      text: 'Rendu pasanga oru room la irukanga, Jinesh IT company la work panran, Naren reels paakuran. Ghost kooda pesura game pathu 11 PM try panranga. Comedy ah start aagi thriller ah maaruthu, last la ghost Jinesh kulla punthuruthu cut.',
      lang: 'tanglish' as LanguageMode,
    },
    {
      label: 'Tamil Unicode',
      text: 'ஒரு போலீஸ் அதிகாரி தன் சகோதரனே ஒரு கொலை வழக்கின் பின்னால் இருப்பதை கண்டுபிடிக்கிறான்.',
      lang: 'tamil' as LanguageMode,
    },
    {
      label: 'English',
      text: 'A skeptical software engineer and his playful roommate accidentally summon an entity through a viral late-night game.',
      lang: 'english' as LanguageMode,
    },
  ];

  const genres = [
    'Action', 'Crime', 'Thriller', 'Mystery', 'Romance', 
    'Comedy', 'Horror', 'Drama', 'Sci-Fi', 'Fantasy', 
    'Psychological', 'Family', 'Experimental'
  ];

  const tones = [
    'Dark', 'Emotional', 'Realistic', 'Commercial', 'Suspenseful', 
    'Funny', 'Serious', 'Gritty', 'Cinematic'
  ];

  const lengths = [
    'Short Scene', '3 Scenes', '5 Scenes', '10 Scenes', 'Feature-style'
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Hero Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-semibold">
          <Clapperboard className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Multilingual AI Screenplay Generation Engine</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-semibold text-white tracking-tight serif-title">
          Turn Your Concept Into A Screenplay
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Enter your story idea in any language — Tamil, English, or Tanglish. CineScript AI understands your natural idea, develops rich characters and dialogue, and generates a formatted screenplay in your selected language.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="glass rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 shadow-2xl">
        
        {/* Movie Title Input */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#F59E0B] font-semibold flex items-center gap-2">
              <Film className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
              <span>Movie Title</span>
            </label>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Tamil • English • Tanglish • Mixed</span>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter movie title..."
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 transition-all text-sm font-medium"
          />
        </div>

        {/* Story / One-Line Idea Input Box */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#F59E0B] font-semibold flex items-center gap-2">
              <Film className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
              <span>Story / One-Line Idea</span>
            </label>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Tamil • English • Tanglish • Mixed</span>
          </div>

          <textarea
            rows={4}
            value={concept}
            onChange={(e) => {
              setConcept(e.target.value);
              if (error && onClearError) onClearError();
            }}
            placeholder="Describe your movie idea in any language — Tamil, English, or Tanglish (e.g., rendu pasanga room la irukanga, reels paathu ghost game try panranga... or ஒரு போலீஸ் அதிகாரி தனது நண்பனை தேடி ஒரு பழைய கட்டிடத்திற்குள் செல்கிறான்...)"
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 transition-all resize-none text-sm leading-relaxed"
          />

          {/* Prompt Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Try Sample:</span>
            {samplePrompts.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setConcept(sample.text);
                  setLanguageMode(sample.lang);
                  if (error && onClearError) onClearError();
                }}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] sm:text-xs font-medium transition-colors text-left max-w-full sm:max-w-[280px] truncate"
              >
                <span className="text-[#F59E0B] font-bold mr-1">[{sample.label}]</span>
                <span>{sample.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generation Mode Selector */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#F59E0B] font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
              <span>Generation Speed & Mode</span>
            </label>
            <span className="text-[10px] text-slate-400">Fast 1-shot script or dual directorial comparison</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, generationMode: 'fast' })}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                isFastMode
                  ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B] shadow-sm ring-1 ring-[#F59E0B]/30'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <div className={`p-2 rounded-lg flex-shrink-0 ${isFastMode ? 'bg-[#F59E0B] text-black' : 'bg-white/10 text-slate-400'}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5 flex-wrap">
                  <span>Single Script — Fast</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-semibold uppercase">Default</span>
                </div>
                <div className="text-[11px] text-slate-400 font-normal mt-0.5 leading-relaxed">
                  Ultra-fast generation with complete scene structure and natural dialogue.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, generationMode: 'compare' })}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                !isFastMode
                  ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B] shadow-sm ring-1 ring-[#F59E0B]/30'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <div className={`p-2 rounded-lg flex-shrink-0 ${!isFastMode ? 'bg-[#F59E0B] text-black' : 'bg-white/10 text-slate-400'}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs">Two Scripts — Compare</div>
                <div className="text-[11px] text-slate-400 font-normal mt-0.5 leading-relaxed">
                  Dual directorial cuts (Version A vs B) with 10-point AI evaluation matrix.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#F59E0B] font-semibold flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
              <span>Target Screenplay Output Language</span>
            </label>
            <span className="text-[10px] text-slate-400">
              Input in any language • Screenplay formats to selection
            </span>
          </div>

          <LanguageSelector
            value={languageMode}
            onChange={(newLang) => setLanguageMode(newLang)}
          />
        </div>

        {/* Character Manager */}
        <div className="pt-2 border-t border-white/10">
          <CharacterManager characters={characters} onChange={setCharacters} />
        </div>

        {/* Optional Story Settings Accordion */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-between w-full py-2 text-xs font-bold text-slate-300 hover:text-[#F59E0B] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#F59E0B]">Optional Settings (Genre, Tone, Length)</span>
            </div>
            <span className="text-[11px] text-[#F59E0B] font-normal">
              {showSettings ? 'Hide Options ▲' : 'Show Options ▼'}
            </span>
          </button>

          {showSettings && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              
              {/* Genre */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Genre</label>
                <select
                  value={settings.genre}
                  onChange={(e) => setSettings({ ...settings, genre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 focus:border-[#F59E0B] focus:outline-none"
                >
                  {genres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Tone</label>
                <select
                  value={settings.tone}
                  onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 focus:border-[#F59E0B] focus:outline-none"
                >
                  {tones.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Length */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Approximate Length</label>
                <select
                  value={settings.length}
                  onChange={(e) => setSettings({ ...settings, length: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 focus:border-[#F59E0B] focus:outline-none"
                >
                  {lengths.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="font-bold text-rose-400">Notice:</span>
              <span>{error}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onGenerate}
                className="px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-[11px] transition-colors whitespace-nowrap uppercase tracking-wider"
              >
                RETRY
              </button>
              {onClearError && (
                <button
                  type="button"
                  onClick={onClearError}
                  title="Clear notice"
                  className="p-1 rounded-full hover:bg-rose-500/20 text-rose-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="pt-4 border-t border-white/10">
          <button
            type="button"
            disabled={isLoading || !concept.trim()}
            onClick={onGenerate}
            className={`w-full py-4 rounded-full font-bold text-xs tracking-[0.15em] uppercase transition-all duration-200 flex items-center justify-center gap-3 shadow-xl ${
              isLoading
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 cursor-wait'
                : !concept.trim()
                ? 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
                : error
                ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/20 active:scale-[0.99]'
                : 'bg-[#F59E0B] text-black hover:bg-[#d98a08] shadow-[#F59E0B]/20 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
                <span className="animate-pulse">{loadingStage}</span>
              </>
            ) : error ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>RETRY SCRIPT GENERATION</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : isFastMode ? (
              <>
                <Zap className="w-4 h-4" />
                <span>GENERATE SCREENPLAY (FAST MODE)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>GENERATE SCREENPLAY (VERSION A & VERSION B)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};
