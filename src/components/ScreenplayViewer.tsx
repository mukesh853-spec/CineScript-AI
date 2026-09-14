import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Download, Save, Edit3, Sparkles, Plus, Trash2, RotateCcw, 
  Layers, Check, Eye, Wand2, ArrowLeft, Volume2, ShieldAlert, Heart,
  Flame, HelpCircle, Copy, Share2, Undo, Redo, History, Printer,
  AlertCircle, RefreshCw, ChevronRight, Play, BookOpen
} from 'lucide-react';
import { Screenplay, ScreenplayScene, ScreenplayElement, ElementType, ScriptVersion } from '../types';
import { downloadScreenplayPDF } from '../services/pdfGenerator';
import { aiRewriteScript } from '../services/api';
import { VersionHistoryModal } from './VersionHistoryModal';
import { AiComparisonModal } from './AiComparisonModal';
import { DialogueEditorModal } from './DialogueEditorModal';
import { SceneActionMenu } from './SceneActionMenu';
import { StoryOutlineCard } from './StoryOutlineCard';

interface ScreenplayViewerProps {
  script: Screenplay;
  onUpdateScript: (updated: Screenplay) => void;
  onSaveToLibrary: (script: Screenplay, asNewVersion?: boolean) => void;
  onBackToCompare?: () => void;
}

export const ScreenplayViewer: React.FC<ScreenplayViewerProps> = ({
  script,
  onUpdateScript,
  onSaveToLibrary,
  onBackToCompare,
}) => {
  // View Modes: 'editor' | 'reader' | 'a4_preview'
  const [viewMode, setViewMode] = useState<'editor' | 'reader' | 'a4_preview'>('editor');
  
  // Selected / Active Scene
  const [selectedSceneIdx, setSelectedSceneIdx] = useState<number | null>(0);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);

  // Inline element editing
  const [editingElemId, setEditingElemId] = useState<string | null>(null);
  const [elemContentDraft, setElemContentDraft] = useState('');

  // Dialogue Studio Modal state
  const [activeDialogueElem, setActiveDialogueElem] = useState<{
    elem: ScreenplayElement;
    characterName: string;
    sceneIdx: number;
    sceneHeading: string;
  } | null>(null);
  const [isDialogueAiLoading, setIsDialogueAiLoading] = useState(false);

  // AI Comparison / Before-After Modal state
  const [comparisonData, setComparisonData] = useState<{
    originalScenes: ScreenplayScene[];
    proposedScenes: ScreenplayScene[];
    targetSceneIndex?: number | null;
    changeSummary: string;
  } | null>(null);

  // Version History Modal state
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Auto-Save & Save Status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // AI Operation States & Error handling
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState<{ message: string; retryFn?: () => void } | null>(null);

  // Undo / Redo History Stack
  const [historyStack, setHistoryStack] = useState<ScreenplayScene[][]>([script.scenes]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isInternalUpdate = useRef(false);

  // Push to undo stack when scenes change
  const pushToHistory = (newScenes: ScreenplayScene[]) => {
    isInternalUpdate.current = true;
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(newScenes);
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);
    setSaveStatus('unsaved');
  };

  // Undo Action
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevScenes = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      isInternalUpdate.current = true;
      onUpdateScript({
        ...script,
        scenes: prevScenes,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus('unsaved');
    }
  };

  // Redo Action
  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextScenes = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      isInternalUpdate.current = true;
      onUpdateScript({
        ...script,
        scenes: nextScenes,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus('unsaved');
    }
  };

  // Keyboard Shortcuts for Undo / Redo (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyStack]);

  // Debounced auto-save to localStorage
  useEffect(() => {
    if (saveStatus === 'unsaved') {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(`cinescript_autosave_${script.id}`, JSON.stringify(script));
          setSaveStatus('saved');
        } catch (e) {
          setSaveStatus('saved');
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [script, saveStatus]);

  // Calculate approximate page count (~55 lines/page or ~2.5 scenes/page)
  const calculateEstimatedPages = () => {
    let totalLines = 0;
    script.scenes.forEach(sc => {
      totalLines += 3; // Scene header + spacing
      sc.elements.forEach(el => {
        const lineCount = Math.max(1, Math.ceil(el.content.length / 60));
        totalLines += lineCount + 1;
      });
    });
    return Math.max(1, Math.ceil(totalLines / 45));
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadScreenplayPDF(script);
      setSaveSuccessMsg('PDF exported successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err: any) {
      setAiErrorMessage({ message: 'PDF Generation Notice: ' + (err?.message || 'Could not export PDF') });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Save to Library
  const handleSave = (asNewVersion = false) => {
    onSaveToLibrary(script, asNewVersion);
    setSaveStatus('saved');
    setSaveSuccessMsg(asNewVersion ? 'Saved as new version in Library!' : 'Saved to Library!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Save new Version snapshot
  const handleSaveNewVersionSnapshot = (label: string, description: string) => {
    const newVer: ScriptVersion = {
      id: `ver_${Date.now()}`,
      versionNumber: (script.versions?.length || 0) + 1,
      versionLabel: label,
      description: description,
      createdAt: new Date().toISOString(),
      scenes: JSON.parse(JSON.stringify(script.scenes)),
      title: script.title,
      storyOutline: script.storyOutline,
    };
    const updatedVersions = [...(script.versions || []), newVer];
    onUpdateScript({
      ...script,
      versions: updatedVersions,
      updatedAt: new Date().toISOString(),
    });
    setSaveSuccessMsg(`Saved snapshot "${label}"!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Restore older version
  const handleRestoreVersion = (ver: ScriptVersion) => {
    pushToHistory(ver.scenes);
    onUpdateScript({
      ...script,
      title: ver.title || script.title,
      scenes: JSON.parse(JSON.stringify(ver.scenes)),
      storyOutline: ver.storyOutline || script.storyOutline,
      updatedAt: new Date().toISOString(),
    });
    setSaveSuccessMsg(`Restored ${ver.versionLabel}!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Delete version snapshot
  const handleDeleteVersion = (versionId: string) => {
    if (!script.versions) return;
    const updated = script.versions.filter(v => v.id !== versionId);
    onUpdateScript({
      ...script,
      versions: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Direct Inline Edit Save
  const saveElementEdit = (sceneIdx: number, elemId: string) => {
    const newScenes = JSON.parse(JSON.stringify(script.scenes));
    const targetElem = newScenes[sceneIdx].elements.find((e: ScreenplayElement) => e.id === elemId);
    if (targetElem) {
      targetElem.content = elemContentDraft;
    }
    pushToHistory(newScenes);
    onUpdateScript({
      ...script,
      scenes: newScenes,
      updatedAt: new Date().toISOString(),
    });
    setEditingElemId(null);
  };

  // Delete Element
  const handleDeleteElement = (sceneIdx: number, elemId: string) => {
    const newScenes = JSON.parse(JSON.stringify(script.scenes));
    newScenes[sceneIdx].elements = newScenes[sceneIdx].elements.filter((e: ScreenplayElement) => e.id !== elemId);
    pushToHistory(newScenes);
    onUpdateScript({
      ...script,
      scenes: newScenes,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add Element to Scene
  const handleAddElement = (sceneIdx: number, type: ElementType) => {
    const newScenes = JSON.parse(JSON.stringify(script.scenes));
    const isTamil = script.detectedLanguage === 'Tamil';
    const newElem: ScreenplayElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      content: type === 'character' 
        ? (isTamil ? 'புதிய கதாபாத்திரம்' : 'CHARACTER NAME') 
        : type === 'dialogue' 
        ? (isTamil ? 'வசனம் உள்ளிடவும்...' : 'Enter dialogue here...') 
        : (isTamil ? 'காட்சி விவரம்...' : 'Action description...'),
    };
    newScenes[sceneIdx].elements.push(newElem);
    pushToHistory(newScenes);
    onUpdateScript({
      ...script,
      scenes: newScenes,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete Scene
  const handleDeleteScene = (sceneIdx: number) => {
    if (script.scenes.length <= 1) {
      setAiErrorMessage({ message: 'Screenplay must contain at least one scene.' });
      setTimeout(() => setAiErrorMessage(null), 3000);
      return;
    }
    const newScenes = script.scenes.filter((_, idx) => idx !== sceneIdx);
    pushToHistory(newScenes);
    onUpdateScript({
      ...script,
      scenes: newScenes,
      updatedAt: new Date().toISOString(),
    });
    setSelectedSceneIdx(0);
  };

  // Add New Scene at end manually
  const handleAddSceneManual = () => {
    const newSceneNumber = script.scenes.length + 1;
    const isTamil = script.detectedLanguage === 'Tamil';
    const newScene: ScreenplayScene = {
      id: `scene_${Date.now()}`,
      sceneNumber: newSceneNumber,
      heading: isTamil ? `உள். புதிய இடம் – பகல்` : `INT. NEW LOCATION - DAY`,
      location: isTamil ? 'புதிய இடம்' : 'NEW LOCATION',
      time: isTamil ? 'பகல்' : 'DAY',
      elements: [
        {
          id: `elem_${Date.now()}_1`,
          type: 'action',
          content: isTamil ? 'காட்சியின் அமைப்பை விவரிக்கவும்.' : 'Describe the scene setting and characters.',
        },
      ],
    };
    const newScenes = [...script.scenes, newScene];
    pushToHistory(newScenes);
    onUpdateScript({
      ...script,
      scenes: newScenes,
      updatedAt: new Date().toISOString(),
    });
    setSelectedSceneIdx(script.scenes.length);
  };

  // Execute AI Operations (Scene Rewrite, Regenerate, Continue Scene, Continue Script)
  const executeAiOperation = async (
    actionType: string,
    targetSceneIndex?: number | null,
    instruction?: string
  ) => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiErrorMessage(null);
    setAiStatusMessage(
      actionType === 'regenerate_scene'
        ? `Regenerating Scene #${(targetSceneIndex ?? 0) + 1} with continuity...`
        : actionType === 'continue_scene'
        ? `Continuing Scene #${(targetSceneIndex ?? 0) + 1} from current ending...`
        : actionType === 'continue_script'
        ? `Analyzing screenplay and writing next 1–2 scenes...`
        : `Applying AI transformation: ${actionType.replace(/_/g, ' ')}...`
    );

    try {
      const result = await aiRewriteScript({
        actionType,
        currentScreenplay: script,
        targetSceneIndex: targetSceneIndex !== undefined && targetSceneIndex !== null ? targetSceneIndex : undefined,
        instruction,
      });

      if (actionType === 'continue_script') {
        let finalProposedScenes: ScreenplayScene[];
        if (result.newScenes && Array.isArray(result.newScenes) && result.newScenes.length > 0) {
          const highestNum = script.scenes.reduce((max, s) => Math.max(max, Number(s.sceneNumber) || 0), script.scenes.length);
          const renumberedNew = result.newScenes.map((s, idx) => ({
            ...s,
            sceneNumber: highestNum + idx + 1,
          }));
          finalProposedScenes = [...script.scenes, ...renumberedNew];
        } else if (result.updatedScenes && result.updatedScenes.length > script.scenes.length) {
          finalProposedScenes = result.updatedScenes;
        } else if (result.updatedScenes && result.updatedScenes.length > 0) {
          const highestNum = script.scenes.reduce((max, s) => Math.max(max, Number(s.sceneNumber) || 0), script.scenes.length);
          const renumberedNew = result.updatedScenes.map((s: ScreenplayScene, idx: number) => ({
            ...s,
            sceneNumber: highestNum + idx + 1,
          }));
          finalProposedScenes = [...script.scenes, ...renumberedNew];
        } else {
          throw new Error('No continuation scenes generated.');
        }

        const newScenesCount = finalProposedScenes.length - script.scenes.length;
        setComparisonData({
          originalScenes: script.scenes,
          proposedScenes: finalProposedScenes,
          targetSceneIndex: undefined,
          changeSummary:
            result.changeSummary ||
            `Appended ${newScenesCount} new scene(s) (Scene ${script.scenes.length + 1}${
              newScenesCount > 1 ? ` & ${script.scenes.length + 2}` : ''
            }) continuing from the script ending.`,
        });
      } else {
        if (result.updatedScenes && result.updatedScenes.length > 0) {
          setComparisonData({
            originalScenes: script.scenes,
            proposedScenes: result.updatedScenes,
            targetSceneIndex: targetSceneIndex,
            changeSummary: result.changeSummary || 'AI transformation ready for review.',
          });
        } else {
          throw new Error('No updated scenes received.');
        }
      }
    } catch (err: any) {
      console.error('AI Operation Error:', err);
      setAiErrorMessage({
        message:
          actionType === 'continue_script'
            ? 'Unable to continue the screenplay. Please try again.'
            : 'Unable to update this section. Please try again.',
        retryFn: () => executeAiOperation(actionType, targetSceneIndex, instruction),
      });
    } finally {
      setIsAiLoading(false);
      setAiStatusMessage('');
    }
  };

  // Accept AI Comparison
  const handleAcceptComparison = () => {
    if (!comparisonData) return;
    pushToHistory(comparisonData.proposedScenes);
    onUpdateScript({
      ...script,
      scenes: comparisonData.proposedScenes,
      updatedAt: new Date().toISOString(),
    });
    setComparisonData(null);
    setSaveSuccessMsg('AI transformation applied successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Reject AI Comparison
  const handleRejectComparison = () => {
    setComparisonData(null);
    setSaveSuccessMsg('Kept original script.');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  // Run AI Dialogue Action
  const handleRunAiDialogueAction = async (actionType: string, instruction?: string): Promise<string | null> => {
    if (!activeDialogueElem) return null;
    setIsDialogueAiLoading(true);
    try {
      const result = await aiRewriteScript({
        actionType,
        currentScreenplay: script,
        targetSceneIndex: activeDialogueElem.sceneIdx,
        instruction: `Modify dialogue: "${activeDialogueElem.elem.content}". Character: ${activeDialogueElem.characterName}. Instruction: ${instruction || actionType}`,
      });

      if (result.updatedScenes && result.updatedScenes[activeDialogueElem.sceneIdx]) {
        const updatedScene = result.updatedScenes[activeDialogueElem.sceneIdx];
        const updatedElem = updatedScene.elements.find((el: any) => el.id === activeDialogueElem.elem.id) ||
                            updatedScene.elements.find((el: any) => el.type === 'dialogue');
        if (updatedElem) {
          return updatedElem.content;
        }
      }
      return null;
    } catch (err: any) {
      throw err;
    } finally {
      setIsDialogueAiLoading(false);
    }
  };

  // Save Dialogue Edit from Studio Modal
  const handleSaveDialogueFromModal = (newContent: string) => {
    if (!activeDialogueElem) return;
    const newScenes = JSON.parse(JSON.stringify(script.scenes));
    const targetScene = newScenes[activeDialogueElem.sceneIdx];
    const targetElem = targetScene.elements.find((el: ScreenplayElement) => el.id === activeDialogueElem.elem.id);
    if (targetElem) {
      targetElem.content = newContent;
      pushToHistory(newScenes);
      onUpdateScript({
        ...script,
        scenes: newScenes,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in">
      
      {/* Script Header Toolbar */}
      <div className="glass rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4">
        
        {/* Top Meta Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                {script.detectedLanguage || 'Tamil'}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                {script.genre || 'Thriller'} • {script.tone || 'Suspenseful'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {script.scenes.length} Scenes • Pages: ~{calculateEstimatedPages()}
              </span>

              {/* Status Indicator */}
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all ${
                saveStatus === 'saving'
                  ? 'bg-amber-500/20 text-amber-300'
                  : saveStatus === 'saved'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  saveStatus === 'saving' ? 'bg-amber-400 animate-ping' : saveStatus === 'saved' ? 'bg-emerald-400' : 'bg-rose-400'
                }`} />
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Unsaved Changes'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white serif-title tracking-tight">
              {script.title}
            </h1>
            <p className="text-xs text-slate-400 italic">"{script.oneLineConcept}"</p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Undo / Redo */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 rounded-full hover:bg-white/10 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= historyStack.length - 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 rounded-full hover:bg-white/10 transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Version History Button */}
            <button
              type="button"
              onClick={() => setIsVersionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-all border border-white/10"
              title="Script Version History"
            >
              <History className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Versions ({script.versions?.length || 1})</span>
            </button>

            {onBackToCompare && (
              <button
                type="button"
                onClick={onBackToCompare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compare</span>
              </button>
            )}

            {/* Save Button */}
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-100 text-xs font-bold transition-all"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-extrabold shadow-md shadow-[#F59E0B]/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingPdf ? 'Exporting...' : 'A4 PDF'}</span>
            </button>

          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'editor'
                  ? 'bg-[#F59E0B] text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Script Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('reader')}
              className={`px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'reader'
                  ? 'bg-[#F59E0B] text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Screenplay View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('a4_preview')}
              className={`px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'a4_preview'
                  ? 'bg-[#F59E0B] text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>A4 Page Preview</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Click any dialogue to open Dialogue Studio
          </span>
        </div>

      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Error Notification Banner with Retry */}
      {aiErrorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{aiErrorMessage.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {aiErrorMessage.retryFn && (
              <button
                type="button"
                onClick={aiErrorMessage.retryFn}
                className="px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 font-bold"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiErrorMessage(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading Banner */}
      {isAiLoading && (
        <div className="p-3.5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-bold flex items-center justify-center gap-2.5 animate-pulse">
          <div className="w-4 h-4 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
          <span>{aiStatusMessage || 'Processing screenplay with story continuity...'}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. A4 PAGE PREVIEW MODE                                  */}
      {/* ========================================================= */}
      {viewMode === 'a4_preview' ? (
        <div className="space-y-8 flex flex-col items-center">
          <div className="text-center text-xs text-slate-400 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            A4 Print Layout Preview • 12pt Standard Screenplay Monospace • 1 Inch Margins
          </div>

          {/* Realistic A4 Page Sheet */}
          <div className="w-full max-w-[794px] min-h-[1123px] bg-white text-black p-[20mm_20mm_20mm_25mm] rounded-md shadow-2xl screenplay-font text-[12pt] leading-[1.45] space-y-6 box-border">
            
            {/* Title block */}
            <div className="text-center border-b-2 border-black pb-4 space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-widest text-black">{script.title}</h1>
              <p className="text-xs italic text-gray-700">Written by CineScript AI • {script.versionName || 'Original Draft'}</p>
              <div className="text-[10pt] text-gray-600 flex justify-between border-t border-dashed border-gray-300 pt-2 mt-2">
                <span><strong>GENRE:</strong> {(script.genre || 'Thriller').toUpperCase()}</span>
                <span><strong>LANGUAGE:</strong> {(script.detectedLanguage || 'Tamil').toUpperCase()}</span>
                <span><strong>PAGES:</strong> ~{calculateEstimatedPages()}</span>
              </div>
            </div>

            {/* Scenes */}
            {script.scenes.map((scene, sIdx) => (
              <div key={scene.id || sIdx} className="space-y-3 pt-4 border-t border-gray-200 first:border-0 first:pt-0">
                
                {/* Heading */}
                <div className="font-bold uppercase bg-gray-100 p-1 pl-2 border-l-4 border-black text-[12pt] text-black">
                  {sIdx + 1}. {scene.heading}
                </div>

                {/* Elements */}
                <div className="space-y-2.5">
                  {scene.elements.map((elem) => {
                    if (elem.type === 'scene_heading') {
                      return <div key={elem.id} className="font-bold uppercase mt-3 text-black">{elem.content}</div>;
                    }
                    if (elem.type === 'action') {
                      return <div key={elem.id} className="text-left leading-relaxed text-gray-900">{elem.content}</div>;
                    }
                    if (elem.type === 'character') {
                      return (
                        <div key={elem.id} className="text-center font-bold uppercase mt-4 mb-0.5 tracking-wider text-black">
                          {elem.content}
                        </div>
                      );
                    }
                    if (elem.type === 'parenthetical') {
                      return (
                        <div key={elem.id} className="text-center italic text-[10.5pt] mb-0.5 text-gray-600">
                          {elem.content.startsWith('(') ? elem.content : `(${elem.content})`}
                        </div>
                      );
                    }
                    if (elem.type === 'dialogue') {
                      return (
                        <div key={elem.id} className="w-[68%] mx-auto text-left pl-3 mb-3 text-black leading-relaxed">
                          {elem.content}
                        </div>
                      );
                    }
                    if (elem.type === 'transition') {
                      return (
                        <div key={elem.id} className="text-right font-bold uppercase my-3 text-gray-800">
                          {elem.content}
                        </div>
                      );
                    }
                    return <div key={elem.id} className="italic text-gray-600">{elem.content}</div>;
                  })}
                </div>

              </div>
            ))}

            <div className="text-center pt-8 border-t border-gray-300 text-[9pt] text-gray-500">
              Page 1 of {calculateEstimatedPages()} • CineScript AI Production
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. SCRIPT EDITOR & SCREENPLAY VIEWER MODES                */
        /* ========================================================= */
        <div className="script-page p-6 sm:p-10 rounded-3xl space-y-8 screenplay-font text-slate-100 text-sm leading-relaxed border border-white/10 shadow-2xl">
          
          {/* Header Title Block */}
          <div className="text-center space-y-2 border-b border-white/10 pb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-widest text-[#F59E0B] serif-title">
              {script.title}
            </h2>
            <p className="text-xs text-slate-400 italic">
              Original Story by Director • Screenplay Developed with CineScript AI
            </p>
            <div className="text-[11px] text-slate-500 flex justify-center gap-4 pt-1">
              <span>LANGUAGE: <strong className="text-slate-300">{script.detectedLanguage}</strong></span>
              <span>GENRE: <strong className="text-slate-300">{script.genre}</strong></span>
              <span>SCENES: <strong className="text-slate-300">{script.scenes.length}</strong></span>
            </div>
          </div>

          {/* Optional Story Outline Section */}
          {script.storyOutline && (
            <StoryOutlineCard
              outline={script.storyOutline}
              detectedLanguage={script.detectedLanguage}
            />
          )}

          {/* Scenes Loop */}
          {script.scenes.map((scene, sceneIdx) => {
            const isSelected = selectedSceneIdx === sceneIdx;
            const isEditingThisScene = editingSceneId === scene.id;

            return (
              <div
                key={scene.id || sceneIdx}
                onClick={() => setSelectedSceneIdx(sceneIdx)}
                className={`p-5 sm:p-7 rounded-3xl transition-all relative group space-y-4 ${
                  isSelected
                    ? 'bg-white/5 border border-[#F59E0B]/80 shadow-2xl shadow-[#F59E0B]/5'
                    : 'bg-black/30 border border-white/5 hover:border-white/15'
                }`}
              >
                {/* Scene Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold">
                      SCENE {sceneIdx + 1}
                    </span>
                    <h3 className="font-bold text-white text-sm sm:text-base uppercase tracking-wide">
                      {scene.heading}
                    </h3>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {scene.elements.length} elements
                  </span>
                </div>

                {/* Scene Action Menu & AI Tools */}
                {viewMode === 'editor' && (
                  <SceneActionMenu
                    sceneIdx={sceneIdx}
                    sceneHeading={scene.heading}
                    isEditingScene={isEditingThisScene}
                    onToggleEditScene={() => setEditingSceneId(isEditingThisScene ? null : scene.id)}
                    onRegenerateScene={() => executeAiOperation('regenerate_scene', sceneIdx)}
                    onContinueScene={() => executeAiOperation('continue_scene', sceneIdx)}
                    onDeleteScene={() => handleDeleteScene(sceneIdx)}
                    onRunSceneAiAction={(actionType, customInstruction) =>
                      executeAiOperation(actionType, sceneIdx, customInstruction)
                    }
                    isAiLoading={isAiLoading}
                    onAddElement={(type) => handleAddElement(sceneIdx, type)}
                  />
                )}

                {/* Scene Elements */}
                <div className="space-y-3 pt-2">
                  {scene.elements.map((elem, eIdx) => {
                    const isEditingThisElem = editingElemId === elem.id;

                    // Direct element text editor
                    if (isEditingThisElem) {
                      return (
                        <div key={elem.id} className="p-4 rounded-2xl bg-black/60 border border-[#F59E0B] space-y-2 animate-fade-in">
                          <textarea
                            rows={3}
                            value={elemContentDraft}
                            onChange={(e) => setElemContentDraft(e.target.value)}
                            className="w-full p-3 rounded-xl bg-black/80 border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-[#F59E0B]"
                          />
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setEditingElemId(null)}
                              className="px-3 py-1 rounded-full bg-white/10 text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveElementEdit(sceneIdx, elem.id)}
                              className="px-4 py-1 rounded-full bg-[#F59E0B] text-black font-bold"
                            >
                              Save Edit
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Element Rendering: Scene Heading
                    if (elem.type === 'scene_heading') {
                      return (
                        <div key={elem.id} className="font-bold text-slate-100 uppercase mt-4 mb-2">
                          {elem.content}
                        </div>
                      );
                    }

                    // Element Rendering: Action Line
                    if (elem.type === 'action') {
                      return (
                        <div key={elem.id} className="text-slate-300 leading-relaxed group/item flex justify-between items-start gap-2">
                          <span>{elem.content}</span>
                          {viewMode === 'editor' && (
                            <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingElemId(elem.id);
                                  setElemContentDraft(elem.content);
                                }}
                                className="p-1 text-slate-400 hover:text-[#F59E0B]"
                                title="Edit Action"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteElement(sceneIdx, elem.id)}
                                className="p-1 text-slate-400 hover:text-rose-400"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Element Rendering: Character Name
                    if (elem.type === 'character') {
                      return (
                        <div key={elem.id} className="text-center font-bold text-slate-100 uppercase tracking-widest mt-5 group/item flex justify-center items-center gap-2">
                          <span>{elem.content}</span>
                          {viewMode === 'editor' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingElemId(elem.id);
                                setElemContentDraft(elem.content);
                              }}
                              className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 hover:text-[#F59E0B]"
                              title="Edit Character Name"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    }

                    // Element Rendering: Parenthetical
                    if (elem.type === 'parenthetical') {
                      return (
                        <div key={elem.id} className="text-center italic text-slate-400 text-xs group/item flex justify-center items-center gap-2">
                          <span>{elem.content}</span>
                          {viewMode === 'editor' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingElemId(elem.id);
                                setElemContentDraft(elem.content);
                              }}
                              className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 hover:text-[#F59E0B]"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    }

                    // Element Rendering: Dialogue Line (With Dialogue Studio Trigger)
                    if (elem.type === 'dialogue') {
                      // Find corresponding character name from preceding elements
                      let characterName = 'CHARACTER';
                      for (let i = eIdx - 1; i >= 0; i--) {
                        if (scene.elements[i].type === 'character') {
                          characterName = scene.elements[i].content;
                          break;
                        }
                      }

                      return (
                        <div
                          key={elem.id}
                          className="w-[85%] sm:w-[70%] mx-auto text-[#F59E0B]/95 bg-[#F59E0B]/5 hover:bg-[#F59E0B]/10 p-3 rounded-2xl border-l-4 border-[#F59E0B] group/item flex justify-between items-start gap-2 transition-all cursor-pointer"
                          onClick={() => {
                            if (viewMode === 'editor') {
                              setActiveDialogueElem({
                                elem,
                                characterName,
                                sceneIdx,
                                sceneHeading: scene.heading,
                              });
                            }
                          }}
                        >
                          <span className="leading-relaxed font-medium">"{elem.content}"</span>
                          
                          {viewMode === 'editor' && (
                            <div className="flex items-center gap-1 opacity-60 group-hover/item:opacity-100">
                              <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B]">
                                Dialogue Studio
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteElement(sceneIdx, elem.id);
                                }}
                                className="p-1 text-slate-500 hover:text-rose-400"
                                title="Delete Dialogue"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Element Rendering: Transition
                    if (elem.type === 'transition') {
                      return (
                        <div key={elem.id} className="text-right font-bold text-slate-400 uppercase mt-4 mb-2">
                          {elem.content}
                        </div>
                      );
                    }

                    return (
                      <div key={elem.id} className="text-slate-400 italic">
                        {elem.content}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}

          {/* ========================================================= */}
          {/* SCRIPT FOOTER: CONTINUE SCRIPT BUTTON                     */}
          {/* ========================================================= */}
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4">
            
            <button
              type="button"
              disabled={isAiLoading}
              onClick={() => executeAiOperation('continue_script')}
              className="px-6 py-3 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-[#F59E0B]/20 transition-all disabled:opacity-50"
              title="Add 1-2 new continuous scenes from the current script ending"
            >
              <Sparkles className="w-4 h-4" />
              <span>CONTINUE SCRIPT (+1-2 Scenes)</span>
            </button>

            {viewMode === 'editor' && (
              <button
                type="button"
                onClick={handleAddSceneManual}
                className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs flex items-center gap-2 border border-white/10 transition-all"
              >
                <Plus className="w-4 h-4 text-[#F59E0B]" />
                <span>Add Blank Scene</span>
              </button>
            )}

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS & OVERLAYS                                         */}
      {/* ========================================================= */}
      
      {/* 1. Version History Modal */}
      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        script={script}
        onRestoreVersion={handleRestoreVersion}
        onSaveNewVersion={handleSaveNewVersionSnapshot}
        onDeleteVersion={handleDeleteVersion}
      />

      {/* 2. Before / After AI Comparison Modal */}
      {comparisonData && (
        <AiComparisonModal
          isOpen={!!comparisonData}
          onClose={handleRejectComparison}
          originalScenes={comparisonData.originalScenes}
          proposedScenes={comparisonData.proposedScenes}
          targetSceneIndex={comparisonData.targetSceneIndex}
          changeSummary={comparisonData.changeSummary}
          onAccept={handleAcceptComparison}
          onReject={handleRejectComparison}
        />
      )}

      {/* 3. Dialogue Studio Modal */}
      {activeDialogueElem && (
        <DialogueEditorModal
          isOpen={!!activeDialogueElem}
          onClose={() => setActiveDialogueElem(null)}
          characterName={activeDialogueElem.characterName}
          element={activeDialogueElem.elem}
          sceneHeading={activeDialogueElem.sceneHeading}
          onSaveManualEdit={handleSaveDialogueFromModal}
          onRunAiDialogueAction={handleRunAiDialogueAction}
          isAiLoading={isDialogueAiLoading}
        />
      )}

    </div>
  );
};
