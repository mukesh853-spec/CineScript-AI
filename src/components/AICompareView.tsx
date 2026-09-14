import React, { useState } from 'react';
import { Award, CheckCircle2, Sparkles, Film, ArrowRight, RotateCcw, ChevronRight, BarChart3, HelpCircle } from 'lucide-react';
import { GenerationResult, Screenplay } from '../types';
import { StoryOutlineCard } from './StoryOutlineCard';

interface AICompareViewProps {
  generationResult: GenerationResult;
  onSelectVersion: (version: Screenplay) => void;
  onRegenerate: () => void;
}

export const AICompareView: React.FC<AICompareViewProps> = ({
  generationResult,
  onSelectVersion,
  onRegenerate,
}) => {
  const [activeTab, setActiveTab] = useState<'compare' | 'preview_a' | 'preview_b'>('compare');
  const { detectedLanguage, title, versionA, versionB, evaluation } = generationResult;

  const isRecommendedA = evaluation.recommendation === 'Version A';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Title & Detected Language Banner */}
      <div className="glass rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
              Language Detected: {detectedLanguage}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
              2 Versions Generated
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-white serif-title tracking-tight">{title}</h2>
        </div>

        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Regenerate Both</span>
        </button>
      </div>

      {/* AI Recommendation Spotlight Card */}
      <div className="glass rounded-3xl border border-[#F59E0B]/50 p-6 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#F59E0B] font-bold text-xs tracking-[0.2em] uppercase">
            <Award className="w-5 h-5 text-[#F59E0B] animate-pulse" />
            <span>AI Evaluation Recommendation</span>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#F59E0B] text-black shadow-md">
            RECOMMENDED: {evaluation.recommendation}
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed">
          {evaluation.reasoning}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="font-bold text-[#F59E0B] block mb-1">Version A Focus:</span>
            <p className="text-slate-300">{evaluation.summaryA}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="font-bold text-[#F59E0B] block mb-1">Version B Focus:</span>
            <p className="text-slate-300">{evaluation.summaryB}</p>
          </div>
        </div>
      </div>

      {/* Optional Story Outline Section */}
      {(generationResult.storyOutline || versionA.storyOutline) && (
        <StoryOutlineCard
          outline={generationResult.storyOutline || versionA.storyOutline}
          detectedLanguage={detectedLanguage}
        />
      )}

      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row rounded-2xl sm:rounded-full bg-white/5 p-1 border border-white/10 text-xs font-bold gap-1 sm:gap-0">
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl sm:rounded-full transition-all text-center ${
            activeTab === 'compare' ? 'bg-[#F59E0B] text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Side-by-Side Comparison
        </button>
        <button
          onClick={() => setActiveTab('preview_a')}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl sm:rounded-full transition-all text-center ${
            activeTab === 'preview_a' ? 'bg-[#F59E0B] text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Read Version A ({versionA.scenes.length} Sc)
        </button>
        <button
          onClick={() => setActiveTab('preview_b')}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl sm:rounded-full transition-all text-center ${
            activeTab === 'preview_b' ? 'bg-[#F59E0B] text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Read Version B ({versionB.scenes.length} Sc)
        </button>
      </div>

      {/* COMPARISON TAB CONTENT */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          
          {/* Dual Action Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* VERSION A CARD */}
            <div className={`glass rounded-3xl p-6 border transition-all space-y-4 flex flex-col justify-between ${
              isRecommendedA
                ? 'border-[#F59E0B] shadow-xl shadow-[#F59E0B]/10'
                : 'border-white/10 hover:border-white/20'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                    VERSION A
                  </span>
                  {isRecommendedA && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F59E0B] text-black flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Choice
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-white serif-title">{versionA.creativeAngle}</h3>
                
                <div className="p-3.5 rounded-2xl bg-white/5 text-xs text-slate-300 space-y-1.5 border border-white/10">
                  <p><span className="text-slate-500 font-semibold">Scene Count:</span> {versionA.scenes.length} Scenes</p>
                  <p><span className="text-slate-500 font-semibold">Opening Heading:</span> {versionA.scenes[0]?.heading || 'INT. SCENE - DAY'}</p>
                  <p className="line-clamp-3"><span className="text-slate-500 font-semibold">Opening Beat:</span> {versionA.scenes[0]?.elements?.find(e => e.type === 'action')?.content}</p>
                </div>
              </div>

              <button
                onClick={() => onSelectVersion(versionA)}
                className="w-full py-3 rounded-full bg-[#F59E0B] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#d98a08] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#F59E0B]/10"
              >
                <span>CHOOSE VERSION A & EDIT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* VERSION B CARD */}
            <div className={`glass rounded-3xl p-6 border transition-all space-y-4 flex flex-col justify-between ${
              !isRecommendedA
                ? 'border-[#F59E0B] shadow-xl shadow-[#F59E0B]/10'
                : 'border-white/10 hover:border-white/20'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                    VERSION B
                  </span>
                  {!isRecommendedA && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F59E0B] text-black flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Choice
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-white serif-title">{versionB.creativeAngle}</h3>
                
                <div className="p-3.5 rounded-2xl bg-white/5 text-xs text-slate-300 space-y-1.5 border border-white/10">
                  <p><span className="text-slate-500 font-semibold">Scene Count:</span> {versionB.scenes.length} Scenes</p>
                  <p><span className="text-slate-500 font-semibold">Opening Heading:</span> {versionB.scenes[0]?.heading || 'EXT. SCENE - NIGHT'}</p>
                  <p className="line-clamp-3"><span className="text-slate-500 font-semibold">Opening Beat:</span> {versionB.scenes[0]?.elements?.find(e => e.type === 'action')?.content}</p>
                </div>
              </div>

              <button
                onClick={() => onSelectVersion(versionB)}
                className="w-full py-3 rounded-full bg-[#F59E0B] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#d98a08] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#F59E0B]/10"
              >
                <span>CHOOSE VERSION B & EDIT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* 10 Criteria Evaluation Grid */}
          <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
            <h4 className="text-xs font-semibold text-[#F59E0B] uppercase tracking-[0.2em] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#F59E0B]" />
              <span>Deep AI Screenplay Criteria Matrix (10 Metrics)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {evaluation.criteria.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center font-semibold text-slate-200">
                    <span>{item.name}</span>
                    <span className="text-[11px] text-slate-400">
                      A: <strong className="text-[#F59E0B]">{item.scoreA}/10</strong> | B: <strong className="text-rose-400">{item.scoreB}/10</strong>
                    </span>
                  </div>

                  {/* Dual Bar Visualizer */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-16">Version A</span>
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#F59E0B] rounded-full"
                          style={{ width: `${(item.scoreA / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-16">Version B</span>
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${(item.scoreB / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* PREVIEW VERSION A TAB */}
      {activeTab === 'preview_a' && (
        <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white serif-title">Version A Draft</h3>
            <button
              onClick={() => onSelectVersion(versionA)}
              className="px-4 py-2 rounded-full bg-[#F59E0B] text-black text-xs font-bold hover:bg-[#d98a08]"
            >
              Select & Edit Version A
            </button>
          </div>
          <QuickScriptPreview scenes={versionA.scenes} />
        </div>
      )}

      {/* PREVIEW VERSION B TAB */}
      {activeTab === 'preview_b' && (
        <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white serif-title">Version B Draft</h3>
            <button
              onClick={() => onSelectVersion(versionB)}
              className="px-4 py-2 rounded-full bg-[#F59E0B] text-black text-xs font-bold hover:bg-[#d98a08]"
            >
              Select & Edit Version B
            </button>
          </div>
          <QuickScriptPreview scenes={versionB.scenes} />
        </div>
      )}

    </div>
  );
};

const QuickScriptPreview: React.FC<{ scenes: any[] }> = ({ scenes }) => {
  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-xs space-y-5 sm:space-y-6 max-h-[500px] overflow-y-auto leading-relaxed">
      {scenes.map((scene, sIdx) => (
        <div key={sIdx} className="space-y-2 border-b border-zinc-900 pb-4">
          <div className="font-bold text-[#F59E0B] uppercase tracking-wide break-words">
            {sIdx + 1}. {scene.heading}
          </div>
          {scene.elements.map((elem: any, eIdx: number) => {
            if (elem.type === 'action') {
              return <p key={eIdx} className="text-zinc-300 break-words leading-relaxed">{elem.content}</p>;
            } else if (elem.type === 'character') {
              return <div key={eIdx} className="text-center font-bold text-zinc-100 uppercase mt-2">{elem.content}</div>;
            } else if (elem.type === 'parenthetical') {
              return <div key={eIdx} className="text-center italic text-zinc-400">{elem.content}</div>;
            } else if (elem.type === 'dialogue') {
              return <div key={eIdx} className="w-full sm:w-[80%] mx-auto text-amber-100 text-center sm:text-left break-words px-2 sm:px-0">{elem.content}</div>;
            } else if (elem.type === 'transition') {
              return <div key={eIdx} className="text-right font-bold text-zinc-400 uppercase">{elem.content}</div>;
            }
            return <p key={eIdx} className="text-zinc-400 break-words">{elem.content}</p>;
          })}
        </div>
      ))}
    </div>
  );
};
