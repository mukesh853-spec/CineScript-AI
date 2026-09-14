import React from 'react';
import { Sparkles, Check, X, ArrowRight, Layers, FileText, PlusCircle } from 'lucide-react';
import { ScreenplayScene } from '../types';

interface AiComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalScenes: ScreenplayScene[];
  proposedScenes: ScreenplayScene[];
  targetSceneIndex?: number | null;
  changeSummary: string;
  onAccept: () => void;
  onReject: () => void;
}

export const AiComparisonModal: React.FC<AiComparisonModalProps> = ({
  isOpen,
  onClose,
  originalScenes,
  proposedScenes,
  targetSceneIndex,
  changeSummary,
  onAccept,
  onReject,
}) => {
  if (!isOpen) return null;

  // If a specific scene was modified, show that scene; otherwise show all
  const isTargetedScene = targetSceneIndex !== undefined && targetSceneIndex !== null && targetSceneIndex >= 0;
  const isContinuation = !isTargetedScene && proposedScenes.length > originalScenes.length;
  const newScenesAddedCount = isContinuation ? proposedScenes.length - originalScenes.length : 0;

  const originalDisplayScenes = isTargetedScene && originalScenes[targetSceneIndex]
    ? [originalScenes[targetSceneIndex]]
    : originalScenes;

  const proposedDisplayScenes = isTargetedScene && proposedScenes[targetSceneIndex]
    ? [proposedScenes[targetSceneIndex]]
    : proposedScenes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-5xl max-h-[90vh] glass rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white serif-title">
                  {isContinuation ? 'Review Screenplay Continuation' : 'Review AI Transformation'}
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B]">
                  {isContinuation
                    ? `${originalScenes.length} Scenes → ${proposedScenes.length} Scenes (+${newScenesAddedCount})`
                    : 'Before vs After'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {changeSummary || 'Compare the original script with the AI enhanced version before applying changes.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-all"
            >
              <X className="w-4 h-4" />
              <span>Keep Original (Reject)</span>
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-extrabold transition-all shadow-lg shadow-[#F59E0B]/20"
            >
              <Check className="w-4 h-4" />
              <span>Keep New Version (Accept)</span>
            </button>
          </div>
        </div>

        {/* Comparison Body: Side by Side */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
          
          {/* Left Column: Original */}
          <div className="p-6 overflow-y-auto max-h-[550px] space-y-4 bg-black/30">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Original Screenplay
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-medium">
                {originalDisplayScenes.length} Scene{originalDisplayScenes.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-4 screenplay-font text-xs">
              {originalDisplayScenes.map((sc, sIdx) => (
                <div key={sc.id || sIdx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <div className="font-bold text-slate-300 uppercase tracking-wide border-b border-white/10 pb-1 flex items-center justify-between">
                    <span>{sc.heading}</span>
                    <span className="text-[9px] font-mono text-slate-500">Scene #{sc.sceneNumber || sIdx + 1}</span>
                  </div>
                  <div className="space-y-2 text-slate-400">
                    {sc.elements.map((el, eIdx) => {
                      if (el.type === 'character') {
                        return <div key={el.id || eIdx} className="text-center font-bold text-slate-200 uppercase mt-2">{el.content}</div>;
                      }
                      if (el.type === 'parenthetical') {
                        return <div key={el.id || eIdx} className="text-center italic text-slate-500 text-[11px]">{el.content}</div>;
                      }
                      if (el.type === 'dialogue') {
                        return (
                          <div key={el.id || eIdx} className="w-[85%] mx-auto text-slate-300 bg-white/5 p-2 rounded-lg border-l-2 border-slate-500">
                            {el.content}
                          </div>
                        );
                      }
                      if (el.type === 'transition') {
                        return <div key={el.id || eIdx} className="text-right uppercase font-bold text-slate-500">{el.content}</div>;
                      }
                      return <div key={el.id || eIdx} className="leading-relaxed">{el.content}</div>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: AI Proposed Version */}
          <div className="p-6 overflow-y-auto max-h-[550px] space-y-4 bg-[#F59E0B]/5">
            <div className="flex items-center justify-between pb-2 border-b border-[#F59E0B]/20">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#F59E0B] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isContinuation ? 'Updated Screenplay with Continuation' : 'AI Proposed Transformation'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold">
                {proposedDisplayScenes.length} Scene{proposedDisplayScenes.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-4 screenplay-font text-xs">
              {proposedDisplayScenes.map((sc, sIdx) => {
                const isBrandNewScene = isContinuation && sIdx >= originalScenes.length;

                return (
                  <div
                    key={sc.id || sIdx}
                    className={`p-4 rounded-2xl space-y-3 shadow-lg transition-all ${
                      isBrandNewScene
                        ? 'bg-[#F59E0B]/10 border-2 border-[#F59E0B] shadow-[#F59E0B]/10 ring-2 ring-[#F59E0B]/20 animate-fade-in'
                        : 'bg-black/40 border border-white/10'
                    }`}
                  >
                    <div className="font-bold text-slate-200 uppercase tracking-wide border-b border-white/10 pb-1 flex items-center justify-between">
                      <span className={isBrandNewScene ? 'text-[#F59E0B] font-extrabold' : 'text-slate-200'}>
                        {sc.heading}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-slate-400">Scene #{sc.sceneNumber || sIdx + 1}</span>
                        {isBrandNewScene ? (
                          <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#F59E0B] text-black shadow-sm">
                            + New Scene
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-400">
                            Preserved
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-slate-200">
                      {sc.elements.map((el, eIdx) => {
                        if (el.type === 'character') {
                          return <div key={el.id || eIdx} className="text-center font-bold text-white uppercase mt-2">{el.content}</div>;
                        }
                        if (el.type === 'parenthetical') {
                          return <div key={el.id || eIdx} className="text-center italic text-slate-400 text-[11px]">{el.content}</div>;
                        }
                        if (el.type === 'dialogue') {
                          return (
                            <div
                              key={el.id || eIdx}
                              className={`w-[85%] mx-auto p-2.5 rounded-xl border-l-2 ${
                                isBrandNewScene
                                  ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]'
                                  : 'text-slate-200 bg-white/5 border-slate-400'
                              }`}
                            >
                              {el.content}
                            </div>
                          );
                        }
                        if (el.type === 'transition') {
                          return <div key={el.id || eIdx} className="text-right uppercase font-bold text-slate-400">{el.content}</div>;
                        }
                        return <div key={el.id || eIdx} className="leading-relaxed text-slate-100">{el.content}</div>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>* Accepting applies this enhancement to your screenplay and records it in your history stack.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold transition-colors"
            >
              Discard Changes
            </button>
            <button
              onClick={onAccept}
              className="px-5 py-2 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black font-extrabold transition-all shadow-md shadow-[#F59E0B]/20"
            >
              Apply Transformation
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
