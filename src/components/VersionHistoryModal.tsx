import React, { useState } from 'react';
import { History, RotateCcw, Trash2, Plus, Clock, FileText, Check, X, Eye, ChevronRight } from 'lucide-react';
import { Screenplay, ScriptVersion } from '../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: Screenplay;
  onRestoreVersion: (version: ScriptVersion) => void;
  onSaveNewVersion: (label: string, description: string) => void;
  onDeleteVersion?: (versionId: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  script,
  onRestoreVersion,
  onSaveNewVersion,
  onDeleteVersion,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const versions: ScriptVersion[] = script.versions && script.versions.length > 0 
    ? script.versions 
    : [
        {
          id: `ver_init_${script.id}`,
          versionNumber: 1,
          versionLabel: 'Version 1',
          description: 'Original Generated Script',
          createdAt: script.createdAt || new Date().toISOString(),
          scenes: script.scenes,
          title: script.title,
          storyOutline: script.storyOutline,
        }
      ];

  const activeSelectedVersion = versions.find(v => v.id === selectedVersionId) || versions[versions.length - 1];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onSaveNewVersion(newLabel.trim(), newDescription.trim() || 'Manual checkpoint');
    setNewLabel('');
    setNewDescription('');
    setIsCreatingNew(false);
  };

  const handleRestore = (ver: ScriptVersion) => {
    onRestoreVersion(ver);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] glass rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] flex-shrink-0">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white serif-title">Script Version History</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                "{script.title}" • {versions.length} Version{versions.length === 1 ? '' : 's'} recorded
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {!isCreatingNew && (
              <button
                onClick={() => {
                  setNewLabel(`Version ${versions.length + 1}`);
                  setIsCreatingNew(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-bold transition-all shadow-md shadow-[#F59E0B]/20 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save New Version</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Create New Version Form */}
        {isCreatingNew && (
          <form onSubmit={handleCreateSubmit} className="p-5 bg-white/5 border-b border-white/10 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">Save Current State as New Version</span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Version Label (e.g. Version 2 - Climax Rewritten)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
                className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-[#F59E0B]"
              />
              <input
                type="text"
                placeholder="Description of changes (e.g. Added dialogue tension in Scene 2)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold text-xs"
              >
                Save Version Snapshot
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Two Column (Version List & Version Preview) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
          
          {/* Version List */}
          <div className="p-4 space-y-2 overflow-y-auto max-h-[500px]">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-2 block mb-2">
              Timeline Snapshots
            </span>
            {versions.map((ver, idx) => {
              const isSelected = activeSelectedVersion?.id === ver.id;
              const isLatest = idx === versions.length - 1;

              return (
                <div
                  key={ver.id || idx}
                  onClick={() => setSelectedVersionId(ver.id)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#F59E0B]/10 border-[#F59E0B] shadow-md'
                      : 'bg-white/5 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                      {ver.versionLabel || `Version ${ver.versionNumber || idx + 1}`}
                      {isLatest && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                          Current
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(ver.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                    {ver.description || 'No description'}
                  </p>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>{ver.scenes?.length || 0} Scenes</span>
                    <span>{new Date(ver.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Version Preview & Restore Actions */}
          <div className="col-span-2 p-6 flex flex-col justify-between overflow-y-auto max-h-[500px] space-y-4">
            {activeSelectedVersion ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h3 className="text-base font-bold text-white serif-title">
                        {activeSelectedVersion.versionLabel || `Version ${activeSelectedVersion.versionNumber}`}
                      </h3>
                      <p className="text-xs text-[#F59E0B]">{activeSelectedVersion.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {onDeleteVersion && versions.length > 1 && (
                        <button
                          onClick={() => onDeleteVersion(activeSelectedVersion.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors"
                          title="Delete Version"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRestore(activeSelectedVersion)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-bold transition-all shadow-md shadow-[#F59E0B]/20"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore This Version</span>
                      </button>
                    </div>
                  </div>

                  {/* Scene Preview Cards */}
                  <div className="space-y-3 pr-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                      Snapshot Content ({activeSelectedVersion.scenes?.length || 0} Scenes)
                    </span>

                    {activeSelectedVersion.scenes?.map((sc, sIdx) => (
                      <div key={sc.id || sIdx} className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs space-y-2">
                        <div className="font-bold text-[#F59E0B] uppercase">
                          {sIdx + 1}. {sc.heading}
                        </div>
                        <div className="space-y-1.5 pl-2 border-l border-white/10 text-slate-300">
                          {sc.elements.slice(0, 4).map((el, eIdx) => (
                            <div key={el.id || eIdx} className="line-clamp-2">
                              {el.type === 'character' ? (
                                <strong className="text-white">{el.content}: </strong>
                              ) : el.type === 'dialogue' ? (
                                <span className="text-[#F59E0B]/90 italic">"{el.content}"</span>
                              ) : (
                                <span>{el.content}</span>
                              )}
                            </div>
                          ))}
                          {sc.elements.length > 4 && (
                            <div className="text-[10px] text-slate-500 italic">
                              + {sc.elements.length - 4} more elements in this scene
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-[11px] text-slate-500 italic flex items-center justify-between">
                  <span>* Restoring a version safely loads this snapshot into the screenplay editor without deleting other versions.</span>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-xs text-slate-500">
                Select a version from the timeline to preview.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
