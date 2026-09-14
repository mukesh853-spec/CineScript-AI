import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { AuthModal } from './components/AuthModal';
import { StoryInputForm } from './components/StoryInputForm';
import { AICompareView } from './components/AICompareView';
import { ScreenplayViewer } from './components/ScreenplayViewer';
import { LibraryView } from './components/LibraryView';
import { ProfileView } from './components/ProfileView';
import { Clapperboard } from 'lucide-react';
import { 
  User, Screenplay, Character, LanguageMode, StorySettings, GenerationResult 
} from './types';
import { 
  getCurrentUser, logoutUser, getSavedScripts, saveScriptToLibrary, 
  deleteScriptFromLibrary, renameScriptInLibrary 
} from './services/storage';
import { generateScreenplay } from './services/api';

export default function App() {
  // Navigation & User session
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'profile'>('home');
  const [intendedDestination, setIntendedDestination] = useState<string>('home');
  const [currentUser, setUserState] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [savedScripts, setSavedScripts] = useState<Screenplay[]>([]);

  // Generation Form State
  const [movieTitle, setMovieTitle] = useState('');
  const [concept, setConcept] = useState('');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('auto');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [settings, setSettings] = useState<StorySettings>({
    genre: 'Thriller',
    tone: 'Cinematic',
    length: '3 Scenes',
    generationMode: 'fast',
    languageMode: 'auto',
  });

  // Flow State
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [selectedScript, setSelectedScript] = useState<Screenplay | null>(null);

  // Initialize Auth & Storage
  useEffect(() => {
    // Check URL hash for direct navigation intent (e.g. #library, #profile)
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash === 'library' || hash === 'profile' || hash === 'home') {
      setIntendedDestination(hash);
    }

    const user = getCurrentUser();
    if (user && user.id) {
      setUserState(user);
      setSavedScripts(getSavedScripts(user.id));
      if (hash === 'library' || hash === 'profile') {
        setActiveTab(hash);
      }
    } else {
      setUserState(null);
      setSavedScripts([]);
    }
    setIsAuthChecking(false);
  }, []);

  const handleAuthSuccess = (user: User) => {
    setUserState(user);
    setSavedScripts(getSavedScripts(user.id));
    setIsAuthModalOpen(false);
    if (intendedDestination === 'library' || intendedDestination === 'profile') {
      setActiveTab(intendedDestination as 'library' | 'profile');
    } else {
      setActiveTab('home');
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUserState(null);
    setSavedScripts([]);
    setSelectedScript(null);
    setGenerationResult(null);
    setActiveTab('home');
    setIntendedDestination('home');
  };

  // Generate Script Handler
  const handleGenerateScript = async () => {
    if (isLoading || !concept.trim() || !currentUser) return;
    setIsLoading(true);
    setGenerationError(null);
    try {
      const isFast = (settings.generationMode || 'fast') === 'fast';
      const result = await generateScreenplay({
        title: movieTitle.trim() || undefined,
        concept: concept.trim(),
        languageMode,
        characters,
        genre: settings.genre,
        tone: settings.tone,
        length: settings.length,
        generationMode: settings.generationMode || 'fast',
      });

      setGenerationResult(result);

      if (isFast && result.versionA) {
        const fullScript: Screenplay = {
          ...result.versionA,
          id: `script_${Date.now()}`,
          userId: currentUser.id,
          title: movieTitle.trim() || result.title || result.versionA.title || 'Untitled Screenplay',
          oneLineConcept: concept,
          detectedLanguage: result.detectedLanguage || 'Tanglish',
          storyOutline: result.storyOutline || result.versionA.storyOutline,
          characters,
          genre: settings.genre,
          tone: settings.tone,
          length: settings.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSelectedScript(fullScript);
      } else {
        setSelectedScript(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[CineScript Generation Error]:', err);
      setGenerationError(err?.message || 'Script generation failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Select Version from Compare View
  const handleSelectVersion = (version: Screenplay) => {
    if (!currentUser) return;
    const fullScript: Screenplay = {
      ...version,
      id: `script_${Date.now()}`,
      userId: currentUser.id,
      title: movieTitle.trim() || generationResult?.title || version.title || 'Untitled Screenplay',
      oneLineConcept: concept,
      detectedLanguage: generationResult?.detectedLanguage || 'Tamil',
      storyOutline: version.storyOutline || generationResult?.storyOutline,
      characters,
      genre: settings.genre,
      tone: settings.tone,
      length: settings.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedScript(fullScript);
  };

  // Save Script to Library (Strictly user-isolated)
  const handleSaveToLibrary = (scriptToSave: Screenplay, asNewVersion = false) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    
    let targetScript = scriptToSave;
    if (asNewVersion) {
      targetScript = {
        ...scriptToSave,
        id: `script_${Date.now()}`,
        userId: currentUser.id,
        versionName: `${scriptToSave.versionName || 'Version'} (Copy)`,
      };
    } else {
      targetScript = {
        ...scriptToSave,
        userId: currentUser.id,
      };
    }

    const updatedList = saveScriptToLibrary(currentUser.id, targetScript);
    setSavedScripts(updatedList);
    setSelectedScript(targetScript);
  };

  // Library Handlers
  const handleOpenScriptFromLibrary = (script: Screenplay) => {
    if (!currentUser || script.userId !== currentUser.id) return;
    setSelectedScript(script);
    setActiveTab('home');
  };

  const handleDeleteScriptFromLibrary = (scriptId: string) => {
    if (!currentUser) return;
    const updated = deleteScriptFromLibrary(currentUser.id, scriptId);
    setSavedScripts(updated);
    if (selectedScript?.id === scriptId) {
      setSelectedScript(null);
    }
  };

  const handleRenameScriptInLibrary = (scriptId: string, newTitle: string) => {
    if (!currentUser) return;
    const updated = renameScriptInLibrary(currentUser.id, scriptId, newTitle);
    setSavedScripts(updated);
    if (selectedScript?.id === scriptId) {
      setSelectedScript({ ...selectedScript, title: newTitle });
    }
  };

  // New Script Reset
  const handleResetNewScript = () => {
    setGenerationResult(null);
    setSelectedScript(null);
    setMovieTitle('');
    setConcept('');
    setActiveTab('home');
  };

  // 1. Initial Authentication Loading State (Prevents Protected Content Flashing)
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#E2E8F0] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-16 h-16 bg-gradient-to-tr from-[#F59E0B] via-[#EF4444] to-[#F59E0B] rounded-2xl flex items-center justify-center text-black shadow-2xl shadow-[#F59E0B]/30 animate-pulse">
          <Clapperboard className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-mono font-bold text-white tracking-wider">
            CineScript <span className="text-[#F59E0B]">AI</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  // 2. Protected Route Guard: If No Authenticated User, Render Login & Create Account Landing
  if (!currentUser) {
    return (
      <AuthView
        onAuthSuccess={handleAuthSuccess}
        intendedDestination={intendedDestination}
      />
    );
  }

  // 3. Authenticated Screenplay Studio Experience
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E2E8F0] font-sans selection:bg-[#F59E0B]/30 flex flex-col">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        savedScriptsCount={savedScripts.length}
        onNewScript={handleResetNewScript}
      />

      {/* Main Container */}
      <main className="flex-1 py-4 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        
        {/* TAB 1: HOME / GENERATOR & VIEWER */}
        {activeTab === 'home' && (
          <div>
            {selectedScript ? (
              // Active Screenplay Viewer & Editor
              <ScreenplayViewer
                script={selectedScript}
                onUpdateScript={setSelectedScript}
                onSaveToLibrary={handleSaveToLibrary}
                onBackToCompare={generationResult ? () => setSelectedScript(null) : undefined}
              />
            ) : generationResult ? (
              // AI Comparison View (Version A vs Version B)
              <AICompareView
                generationResult={generationResult}
                onSelectVersion={handleSelectVersion}
                onRegenerate={handleGenerateScript}
              />
            ) : (
              // Main Story Input Form
              <StoryInputForm
                title={movieTitle}
                setTitle={setMovieTitle}
                concept={concept}
                setConcept={setConcept}
                languageMode={languageMode}
                setLanguageMode={setLanguageMode}
                characters={characters}
                setCharacters={setCharacters}
                settings={settings}
                setSettings={setSettings}
                onGenerate={handleGenerateScript}
                isLoading={isLoading}
                error={generationError}
                onClearError={() => setGenerationError(null)}
              />
            )}
          </div>
        )}

        {/* TAB 2: LIBRARY VIEW */}
        {activeTab === 'library' && (
          <LibraryView
            scripts={savedScripts}
            onOpenScript={handleOpenScriptFromLibrary}
            onDeleteScript={handleDeleteScriptFromLibrary}
            onRenameScript={handleRenameScriptInLibrary}
            onNewScript={handleResetNewScript}
            onUpdateScript={(updatedScript) => {
              if (!currentUser) return;
              const updatedList = saveScriptToLibrary(currentUser.id, updatedScript);
              setSavedScripts(updatedList);
              if (selectedScript?.id === updatedScript.id) {
                setSelectedScript(updatedScript);
              }
            }}
          />
        )}

        {/* TAB 3: ACCOUNT & PROFILE VIEW */}
        {activeTab === 'profile' && (
  <ProfileView
    user={currentUser}
    savedScripts={savedScripts}
    onOpenAuth={() => setIsAuthModalOpen(true)}
    onLogout={handleLogout}
    onUpdateUser={setUserState}
  />
)}

      </main>

      {/* Authentication Modal (for re-auth or profile edits if requested) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

    </div>
  );
}
