import React, { useState } from 'react';
import { MessageSquare, Sparkles, Wand2, Check, X, RefreshCw, Volume2, Flame, Heart, Zap, ShieldAlert, Minimize2, Maximize2 } from 'lucide-react';
import { ScreenplayElement } from '../types';

interface DialogueEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  element: ScreenplayElement;
  sceneHeading: string;
  onSaveManualEdit: (newContent: string) => void;
  onRunAiDialogueAction: (actionType: string, instruction?: string) => Promise<string | null>;
  isAiLoading: boolean;
}

export const DialogueEditorModal: React.FC<DialogueEditorModalProps> = ({
  isOpen,
  onClose,
  characterName,
  element,
  sceneHeading,
  onSaveManualEdit,
  onRunAiDialogueAction,
  isAiLoading,
}) => {
  const [contentDraft, setContentDraft] = useState(element.content);
  const [customPrompt, setCustomPrompt] = useState('');
  const [proposedAiContent, setProposedAiContent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyAiPreset = async (presetType: string, customText?: string) => {
    setErrorMessage(null);
    try {
      const result = await onRunAiDialogueAction(presetType, customText || customPrompt);
      if (result) {
        setProposedAiContent(result);
      }
    } catch (err: any) {
      setErrorMessage('Unable to update this dialogue. Please try again.');
    }
  };

  const handleAcceptAiProposed = () => {
    if (proposedAiContent) {
      onSaveManualEdit(proposedAiContent);
      onClose();
    }
  };

  const handleSaveManual = () => {
    onSaveManualEdit(contentDraft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto glass rounded-3xl border border-white/10 shadow-2xl flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Dialogue Studio</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold">
                  {characterName || 'CHARACTER'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">{sceneHeading}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Edit Area */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Direct Manual Editor */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Dialogue Text
            </label>
            <textarea
              rows={3}
              value={contentDraft}
              onChange={(e) => setContentDraft(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-black/50 border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30"
              placeholder="Enter character dialogue..."
            />
          </div>

          {/* AI Quick Transform Presets */}
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Dialogue Enhancers</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleApplyAiPreset('dialogue_natural')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-emerald-300 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span>More Natural</span>
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleApplyAiPreset('dialogue_emotional')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-rose-300 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Heart className="w-3 h-3 text-rose-400" />
                <span>More Emotional</span>
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleApplyAiPreset('dialogue_funny')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-amber-300 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>More Funny</span>
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleApplyAiPreset('dialogue_angry')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-red-300 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Flame className="w-3 h-3 text-red-400" />
                <span>More Angry</span>
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleApplyAiPreset('dialogue_suspenseful')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-purple-300 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ShieldAlert className="w-3 h-3 text-purple-400" />
                <span>Suspenseful</span>
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleApplyAiPreset('dialogue_shorten')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-blue-300 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Minimize2 className="w-3 h-3 text-blue-400" />
                <span>Shorten</span>
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleApplyAiPreset('dialogue_expand')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-indigo-300 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Maximize2 className="w-3 h-3 text-indigo-400" />
                <span>Expand</span>
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleApplyAiPreset('dialogue_rewrite')}
                className="p-2 rounded-xl bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 border border-[#F59E0B]/40 text-[#F59E0B] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                <span>Smart Rewrite</span>
              </button>
            </div>
          </div>

          {/* Custom Instruction Input */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Custom Dialogue Instruction
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. 'Make this sound like two close friends...'"
                className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
              />
              <button
                type="button"
                disabled={isAiLoading || !customPrompt.trim()}
                onClick={() => handleApplyAiPreset('dialogue_custom', customPrompt)}
                className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-bold transition-all disabled:opacity-40 whitespace-nowrap"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isAiLoading && (
            <div className="p-3 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
              <div className="w-3.5 h-3.5 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
              <span>Polishing dialogue with character voice continuity...</span>
            </div>
          )}

          {/* Error Notice with Retry */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => handleApplyAiPreset('dialogue_rewrite')}
                className="px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Proposed AI Suggestion Card */}
          {proposedAiContent && (
            <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Proposed Dialogue</span>
                </span>
                <span className="text-[10px] text-slate-400">Review before applying</span>
              </div>
              <p className="text-sm font-medium text-slate-100 italic bg-black/40 p-3 rounded-xl border border-white/10">
                "{proposedAiContent}"
              </p>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setProposedAiContent(null)}
                  className="px-3 py-1.5 rounded-full bg-white/10 text-slate-400 hover:text-white"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAiProposed}
                  className="px-4 py-1.5 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Suggestion</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveManual}
            className="px-5 py-2 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black font-extrabold shadow-md shadow-[#F59E0B]/20"
          >
            Save Dialogue
          </button>
        </div>

      </div>
    </div>
  );
};
