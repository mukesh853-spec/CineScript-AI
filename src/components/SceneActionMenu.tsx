import React, { useState } from 'react';
import { 
  Sparkles, Edit3, Wand2, Plus, Trash2, RotateCcw, Heart, Flame,
  ShieldAlert, Laugh, Smile, Gauge, Swords, ChevronDown, ChevronUp, Play
} from 'lucide-react';

interface SceneActionMenuProps {
  sceneIdx: number;
  sceneHeading: string;
  isEditingScene: boolean;
  onToggleEditScene: () => void;
  onRegenerateScene: () => void;
  onContinueScene: () => void;
  onDeleteScene: () => void;
  onRunSceneAiAction: (actionType: string, customInstruction?: string) => void;
  isAiLoading: boolean;
  onAddElement: (type: 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition') => void;
}

export const SceneActionMenu: React.FC<SceneActionMenuProps> = ({
  sceneIdx,
  sceneHeading,
  isEditingScene,
  onToggleEditScene,
  onRegenerateScene,
  onContinueScene,
  onDeleteScene,
  onRunSceneAiAction,
  isAiLoading,
  onAddElement,
}) => {
  const [isOpenAiTools, setIsOpenAiTools] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAiClick = (actionType: string, customText?: string) => {
    onRunSceneAiAction(actionType, customText || customPrompt);
  };

  return (
    <div className="space-y-3">
      {/* Primary Scene Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
        
        {/* Left Side: Scene Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleEditScene}
            className={`px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              isEditingScene
                ? 'bg-[#F59E0B] text-black shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingScene ? 'Done Editing' : 'Edit Scene'}</span>
          </button>

          <button
            type="button"
            disabled={isAiLoading}
            onClick={() => setIsOpenAiTools(!isOpenAiTools)}
            className={`px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              isOpenAiTools
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                : 'bg-white/10 hover:bg-white/20 text-[#F59E0B]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Scene AI Tools</span>
            {isOpenAiTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            type="button"
            disabled={isAiLoading}
            onClick={onRegenerateScene}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Regenerate only this scene while preserving previous & next continuity"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Regenerate Scene</span>
          </button>

          <button
            type="button"
            disabled={isAiLoading}
            onClick={onContinueScene}
            className="px-3 py-1.5 rounded-full bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/30 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Continue only this scene from its exact last moment"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Continue Scene</span>
          </button>
        </div>

        {/* Right Side: Delete Scene */}
        <div>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/50 px-2.5 py-1 rounded-full animate-fade-in">
              <span className="text-[10px] text-rose-300 font-medium">Delete Scene #{sceneIdx + 1}?</span>
              <button
                onClick={onDeleteScene}
                className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px]"
              >
                Yes
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px]"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors"
              title="Delete Scene"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Manual Element Addition Bar (When in edit mode) */}
      {isEditingScene && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-[11px] animate-fade-in">
          <span className="text-slate-500 font-bold px-1">+ Add to Scene:</span>
          <button
            onClick={() => onAddElement('action')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Action Line
          </button>
          <button
            onClick={() => onAddElement('character')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Character Name
          </button>
          <button
            onClick={() => onAddElement('parenthetical')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
          >
            Parenthetical
          </button>
          <button
            onClick={() => onAddElement('dialogue')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#F59E0B]"
          >
            Dialogue
          </button>
          <button
            onClick={() => onAddElement('transition')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"
          >
            Transition
          </button>
        </div>
      )}

      {/* AI Tools Expansion Tray */}
      {isOpenAiTools && (
        <div className="p-4 rounded-2xl bg-black/60 border border-[#F59E0B]/30 space-y-3 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scene AI Presets (Scene #{sceneIdx + 1})</span>
            </span>
            <span className="text-[11px] text-slate-400">Modifies only this scene</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            <button
              disabled={isAiLoading}
              onClick={() => handleAiClick('make_cinematic')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-amber-300 font-semibold flex flex-col items-center justify-center gap-1 text-center disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>More Cinematic</span>
            </button>

            <button
              disabled={isAiLoading}
              onClick={() => handleAiClick('make_emotional')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-rose-300 font-semibold flex flex-col items-center justify-center gap-1 text-center disabled:opacity-50"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>More Emotional</span>
            </button>

            <button
              disabled={isAiLoading}
              onClick={() => handleAiClick('make_suspenseful')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-purple-300 font-semibold flex flex-col items-center justify-center gap-1 text-center disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>More Suspense</span>
            </button>

            <button
              disabled={isAiLoading}
              onClick={() => handleAiClick('make_funny')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-yellow-300 font-semibold flex flex-col items-center justify-center gap-1 text-center disabled:opacity-50"
            >
              <Laugh className="w-3.5 h-3.5 text-yellow-400" />
              <span>More Funny</span>
            </button>

            <button
              disabled={isAiLoading}
              onClick={() => handleAiClick('make_natural')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-emerald-300 font-semibold flex flex-col items-center justify-center gap-1 text-center disabled:opacity-50"
            >
              <Smile className="w-3.5 h-3.5 text-emerald-400" />
              <span>More Natural</span>
            </button>

            <button
              disabled={isAiLoading}
              onClick={() => handleAiClick('increase_conflict')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-red-300 font-semibold flex flex-col items-center justify-center gap-1 text-center disabled:opacity-50"
            >
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>Increase Conflict</span>
            </button>

            <button
              disabled={isAiLoading}
              onClick={() => handleAiClick('improve_pacing')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-blue-300 font-semibold flex flex-col items-center justify-center gap-1 text-center disabled:opacity-50"
            >
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Improve Pacing</span>
            </button>
          </div>

          {/* Custom Instruction Bar */}
          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Custom Scene Instruction e.g. 'Make this scene more tense...'"
              className="flex-1 px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
            />
            <button
              disabled={isAiLoading || !customPrompt.trim()}
              onClick={() => handleAiClick('custom_scene_rewrite', customPrompt)}
              className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold text-xs transition-all disabled:opacity-40 whitespace-nowrap"
            >
              Apply to Scene
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
