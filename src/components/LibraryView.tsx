import React, { useState } from 'react';
import { 
  BookOpen, Download, Trash2, Edit2, Play, Search, Film, Calendar, 
  Layers, Sparkles, History, ArrowUpDown, Clock, FileText, X, Check,
  AlertTriangle, Edit3
} from 'lucide-react';
import { Screenplay, ScriptVersion } from '../types';
import { downloadScreenplayPDF } from '../services/pdfGenerator';
import { VersionHistoryModal } from './VersionHistoryModal';

interface LibraryViewProps {
  scripts: Screenplay[];
  onOpenScript: (script: Screenplay) => void;
  onDeleteScript: (scriptId: string) => void;
  onRenameScript: (scriptId: string, newTitle: string) => void;
  onNewScript: () => void;
  onUpdateScript?: (script: Screenplay) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  scripts,
  onOpenScript,
  onDeleteScript,
  onRenameScript,
  onNewScript,
  onUpdateScript,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'az' | 'scenes'>('updated');

  // Rename Modal State
  const [renamingScript, setRenamingScript] = useState<Screenplay | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');

  // Delete Confirmation Modal State
  const [deletingScript, setDeletingScript] = useState<Screenplay | null>(null);

  // Version History Modal State
  const [activeVersionScript, setActiveVersionScript] = useState<Screenplay | null>(null);

  // Filter & Search Logic
  const filteredScripts = scripts.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.title.toLowerCase().includes(term) ||
      (s.oneLineConcept && s.oneLineConcept.toLowerCase().includes(term)) ||
      (s.genre && s.genre.toLowerCase().includes(term)) ||
      (s.detectedLanguage && s.detectedLanguage.toLowerCase().includes(term));
    const matchesLang =
      filterLang === 'all' || s.detectedLanguage?.toLowerCase() === filterLang.toLowerCase();
    return matchesSearch && matchesLang;
  });

  // Sorting Logic
  const sortedScripts = [...filteredScripts].sort((a, b) => {
    if (sortBy === 'updated') {
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    }
    if (sortBy === 'created') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'az') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'scenes') {
      return (b.scenes?.length || 0) - (a.scenes?.length || 0);
    }
    return 0;
  });

  // Start Rename
  const handleOpenRename = (s: Screenplay) => {
    setRenamingScript(s);
    setNewTitleInput(s.title);
  };

  // Submit Rename
  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingScript && newTitleInput.trim()) {
      onRenameScript(renamingScript.id, newTitleInput.trim());
      setRenamingScript(null);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (deletingScript) {
      onDeleteScript(deletingScript.id);
      setDeletingScript(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in">
      
      {/* Library Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 glass rounded-3xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-xl sm:text-2xl font-bold text-white serif-title">Screenplay Vault</h2>
          </div>
          <p className="text-xs text-slate-400">
            {scripts.length} Saved Screenplay{scripts.length === 1 ? '' : 's'} in your catalog
          </p>
        </div>

        <button
          onClick={onNewScript}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-extrabold transition-all shadow-lg shadow-[#F59E0B]/20 whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Screenplay</span>
        </button>
      </div>

      {/* Filter, Search & Sort Controls */}
      {scripts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Movie Title, Genre, Language or Concept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          {/* Language Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-[#F59E0B]"
            >
              <option value="all" className="bg-[#0A0A0B] text-slate-100">All Languages</option>
              <option value="tamil" className="bg-[#0A0A0B] text-slate-100">Tamil</option>
              <option value="tanglish" className="bg-[#0A0A0B] text-slate-100">Tanglish</option>
              <option value="english" className="bg-[#0A0A0B] text-slate-100">English</option>
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-[#F59E0B]"
            >
              <option value="updated" className="bg-[#0A0A0B] text-slate-100">Recently Updated</option>
              <option value="created" className="bg-[#0A0A0B] text-slate-100">Recently Created</option>
              <option value="az" className="bg-[#0A0A0B] text-slate-100">A–Z Title</option>
              <option value="scenes" className="bg-[#0A0A0B] text-slate-100">Most Scenes</option>
            </select>
          </div>

        </div>
      )}

      {/* Empty State */}
      {scripts.length === 0 ? (
        <div className="p-12 glass rounded-3xl border border-dashed border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mx-auto">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white serif-title">Your vault is empty</h3>
            <p className="text-xs text-slate-400">Generate a screenplay and save it to manage scenes, versions, and A4 PDF exports.</p>
          </div>
          <button
            onClick={onNewScript}
            className="px-6 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-extrabold transition-all shadow-lg shadow-[#F59E0B]/20"
          >
            Create First Screenplay
          </button>
        </div>
      ) : sortedScripts.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 glass rounded-2xl border border-white/10">
          No screenplays matching your search filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedScripts.map((script) => {
            const sceneCount = script.scenes?.length || 0;
            const approxPages = Math.max(1, Math.ceil(sceneCount * 1.5));
            const versionCount = script.versions?.length || 1;

            return (
              <div
                key={script.id}
                className="p-5 sm:p-6 glass rounded-3xl border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 group shadow-xl hover:shadow-2xl"
              >
                <div className="space-y-3.5">
                  {/* Badges */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 uppercase tracking-wider">
                      {script.detectedLanguage || 'Tamil'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(script.updatedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Title & Concept */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 
                        onClick={() => onOpenScript(script)}
                        className="font-bold text-lg text-white serif-title group-hover:text-[#F59E0B] transition-colors line-clamp-1 cursor-pointer"
                      >
                        {script.title}
                      </h3>
                      <button
                        onClick={() => handleOpenRename(script)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-200 transition-opacity"
                        title="Rename Screenplay"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 italic mt-1 leading-relaxed">
                      "{script.oneLineConcept}"
                    </p>
                  </div>

                  {/* Metadata Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-[10px] p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                    <div>
                      <span className="text-slate-500 font-bold block uppercase">Genre</span>
                      <strong className="text-slate-200 truncate block">{script.genre || 'Thriller'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block uppercase">Length</span>
                      <strong className="text-slate-200 block">{sceneCount} Sc (~{approxPages}p)</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block uppercase">Versions</span>
                      <strong className="text-[#F59E0B] block">{versionCount} Snapshots</strong>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onOpenScript(script)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black font-extrabold transition-all shadow-md shadow-[#F59E0B]/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open Script</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Version History */}
                    <button
                      onClick={() => setActiveVersionScript(script)}
                      className="p-2 text-slate-400 hover:text-[#F59E0B] rounded-full hover:bg-white/10 transition-colors"
                      title="Version History"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Download PDF */}
                    <button
                      onClick={() => downloadScreenplayPDF(script)}
                      className="p-2 text-slate-400 hover:text-[#F59E0B] rounded-full hover:bg-white/10 transition-colors"
                      title="Download A4 PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Safe Delete */}
                    <button
                      onClick={() => setDeletingScript(script)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors"
                      title="Delete Screenplay"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. SAFE DELETE CONFIRMATION MODAL                         */}
      {/* ========================================================= */}
      {deletingScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete this screenplay?</h3>
                <p className="text-xs text-slate-400">"{deletingScript.title}"</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will remove the screenplay and all its recorded version snapshots from your library. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeletingScript(null)}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. RENAME MODAL                                           */}
      {/* ========================================================= */}
      {renamingScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleConfirmRename} className="w-full max-w-md glass rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white serif-title">Rename Screenplay</h3>
              <button
                type="button"
                onClick={() => setRenamingScript(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Movie Title
              </label>
              <input
                type="text"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-slate-100 text-sm font-bold focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * Renaming updates the title across the Library, Script Viewer, and exported PDFs without modifying screenplay content.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRenamingScript(null)}
                className="px-4 py-2 rounded-full bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-bold shadow-md shadow-[#F59E0B]/20"
              >
                Save Title
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. VERSION HISTORY MODAL FROM LIBRARY                     */}
      {/* ========================================================= */}
      {activeVersionScript && (
        <VersionHistoryModal
          isOpen={!!activeVersionScript}
          onClose={() => setActiveVersionScript(null)}
          script={activeVersionScript}
          onRestoreVersion={(version: ScriptVersion) => {
            if (onUpdateScript) {
              const updated = {
                ...activeVersionScript,
                title: version.title || activeVersionScript.title,
                scenes: JSON.parse(JSON.stringify(version.scenes)),
                updatedAt: new Date().toISOString(),
              };
              onUpdateScript(updated);
            }
            onOpenScript(activeVersionScript);
            setActiveVersionScript(null);
          }}
          onSaveNewVersion={(label, description) => {
            if (onUpdateScript) {
              const newVer: ScriptVersion = {
                id: `ver_${Date.now()}`,
                versionNumber: (activeVersionScript.versions?.length || 0) + 1,
                versionLabel: label,
                description: description,
                createdAt: new Date().toISOString(),
                scenes: JSON.parse(JSON.stringify(activeVersionScript.scenes)),
                title: activeVersionScript.title,
              };
              const updated = {
                ...activeVersionScript,
                versions: [...(activeVersionScript.versions || []), newVer],
                updatedAt: new Date().toISOString(),
              };
              onUpdateScript(updated);
              setActiveVersionScript(updated);
            }
          }}
        />
      )}

    </div>
  );
};
