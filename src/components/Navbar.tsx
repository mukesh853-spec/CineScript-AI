import React, { useState } from 'react';
import { Film, BookOpen, User as UserIcon, LogOut, LogIn, Sparkles, PlusCircle, Clapperboard, Wand2, Menu, X } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: 'home' | 'library' | 'profile';
  setActiveTab: (tab: 'home' | 'library' | 'profile') => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  savedScriptsCount: number;
  onNewScript?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  savedScriptsCount,
  onNewScript,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'home' | 'library' | 'profile') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0B]/95 border-b border-white/10 backdrop-blur-md text-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none min-w-0"
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-[#F59E0B] via-[#EF4444] to-[#F59E0B] rounded-xl flex-shrink-0 flex items-center justify-center text-black shadow-lg shadow-[#F59E0B]/20 group-hover:scale-105 transition-all duration-200">
            <Clapperboard className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.2]" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-black rounded-full border border-[#F59E0B] flex items-center justify-center shadow-md">
              <Wand2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-[#F59E0B]" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base sm:text-lg tracking-tight text-white font-mono truncate">
                CineScript <span className="text-[#F59E0B]">AI</span>
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wider uppercase hidden sm:block">
              Screenplay Engine • Multilingual AI
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs - Glass Pill style */}
        <nav className="hidden md:flex items-center gap-2 bg-white/5 p-1 rounded-full px-3 sm:px-4 border border-white/10">
          <button
            onClick={() => handleNavClick('home')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'home'
                ? 'bg-[#F59E0B] text-black font-semibold shadow-md shadow-[#F59E0B]/20'
                : 'opacity-60 hover:opacity-100 text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Project</span>
          </button>

          <button
            onClick={() => handleNavClick('library')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all relative flex items-center gap-1.5 ${
              activeTab === 'library'
                ? 'bg-[#F59E0B] text-black font-semibold shadow-md shadow-[#F59E0B]/20'
                : 'opacity-60 hover:opacity-100 text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Library</span>
            {savedScriptsCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 font-bold rounded-full ml-0.5 ${
                activeTab === 'library' ? 'bg-black text-[#F59E0B]' : 'bg-[#F59E0B] text-black'
              }`}>
                {savedScriptsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('profile')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-[#F59E0B] text-black font-semibold shadow-md shadow-[#F59E0B]/20'
                : 'opacity-60 hover:opacity-100 text-slate-300'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Account</span>
          </button>
        </nav>

        {/* Desktop User Account / Auth Actions */}
        <div className="hidden md:flex items-center gap-3">
          {onNewScript && (
            <button
              onClick={onNewScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#F59E0B] text-black hover:bg-[#d98a08] transition-colors shadow-md shadow-[#F59E0B]/10"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Script</span>
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-3 pl-2 border-l border-white/10">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {currentUser.email || currentUser.phone}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-full text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#F59E0B] text-black hover:bg-[#d98a08] transition-colors shadow-lg shadow-[#F59E0B]/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Mobile Action Controls & Menu Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {onNewScript && (
            <button
              onClick={onNewScript}
              className="p-2 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/25 transition-colors"
              title="New Script"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0A0A0B]/98 backdrop-blur-xl px-4 py-4 space-y-3 animate-fade-in shadow-2xl">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleNavClick('home')}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition-all border ${
                activeTab === 'home'
                  ? 'bg-[#F59E0B] text-black border-[#F59E0B] shadow-md'
                  : 'bg-white/5 text-slate-300 border-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Project</span>
            </button>

            <button
              onClick={() => handleNavClick('library')}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition-all relative border ${
                activeTab === 'library'
                  ? 'bg-[#F59E0B] text-black border-[#F59E0B] shadow-md'
                  : 'bg-white/5 text-slate-300 border-white/5'
              }`}
            >
              <div className="relative">
                <BookOpen className="w-4 h-4" />
                {savedScriptsCount > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] px-1 py-0.2 font-bold rounded-full bg-rose-500 text-white leading-none">
                    {savedScriptsCount}
                  </span>
                )}
              </div>
              <span>Vault</span>
            </button>

            <button
              onClick={() => handleNavClick('profile')}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition-all border ${
                activeTab === 'profile'
                  ? 'bg-[#F59E0B] text-black border-[#F59E0B] shadow-md'
                  : 'bg-white/5 text-slate-300 border-white/5'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Account</span>
            </button>
          </div>

          {/* User Status Bar in Mobile Menu */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            {currentUser ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#EF4444] text-black font-extrabold text-xs flex items-center justify-center">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-400">{currentUser.email || currentUser.phone}</div>
                  </div>
                </div>
                <button
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  className="px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onOpenAuth(); setIsMobileMenuOpen(false); }}
                className="w-full py-2.5 rounded-xl bg-[#F59E0B] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F59E0B]/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to CineScript AI</span>
              </button>
            )}
          </div>
        </div>
      )}

    </header>
  );
};
