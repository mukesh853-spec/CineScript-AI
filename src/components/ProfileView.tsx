import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Mail,
  Phone,
  LogOut,
  CheckCircle,
} from 'lucide-react';
import { User, Screenplay } from '../types';
import { updateProfileName } from '../services/storage';

interface ProfileViewProps {
  user: User | null;
  savedScripts: Screenplay[];
  onOpenAuth: () => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  savedScripts,
  onOpenAuth,
  onLogout,
  onUpdateUser,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-8 glass rounded-3xl border border-white/10 text-center space-y-4 shadow-xl">
        <UserIcon className="w-12 h-12 text-slate-500 mx-auto" />

        <h3 className="text-lg font-semibold text-white serif-title">
          Not Signed In
        </h3>

        <p className="text-xs text-slate-400">
          Sign in to sync your saved screenplays across sessions.
        </p>

        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-bold"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const tamilCount = savedScripts.filter(
    s => s.detectedLanguage?.toLowerCase() === 'tamil'
  ).length;

  const tanglishCount = savedScripts.filter(
    s => s.detectedLanguage?.toLowerCase() === 'tanglish'
  ).length;

  const englishCount = savedScripts.filter(
    s => s.detectedLanguage?.toLowerCase() === 'english'
  ).length;

  const handleSaveName = async () => {
    try {
      setIsSavingName(true);

      const result = await updateProfileName(newName);

      onUpdateUser(result.user);
      setIsEditingName(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to update name.'
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setNewName(user.name);
    setIsEditingName(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">

      {/* Profile Header */}
      <div className="p-6 glass rounded-3xl border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">

        <div className="flex items-center gap-4">

          {/* Profile Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#EF4444] text-black font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-[#F59E0B]/20">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div>

            {/* Name + Authenticated */}
            <div className="flex items-center gap-2 flex-wrap">

              {!isEditingName ? (
                <>
                  <h2 className="text-xl font-semibold text-white serif-title">
                    {user.name}
                  </h2>

                  <button
                    onClick={() => {
                      setNewName(user.name);
                      setIsEditingName(true);
                    }}
                    className="px-3 py-1 rounded-full bg-white/10 hover:bg-[#F59E0B]/20 text-slate-300 hover:text-[#F59E0B] text-[10px] font-semibold border border-white/10 transition-colors"
                  >
                    Edit Name
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">

                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSavingName) {
                        handleSaveName();
                      }

                      if (e.key === 'Escape' && !isSavingName) {
                        handleCancelEdit();
                      }
                    }}
                    autoFocus
                    className="w-48 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs outline-none focus:border-[#F59E0B]"
                    placeholder="Enter your name"
                  />

                  <button
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="px-3 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#d98a08] text-black text-xs font-bold disabled:opacity-50"
                  >
                    {isSavingName ? 'Saving...' : 'Save'}
                  </button>

                  <button
                    onClick={handleCancelEdit}
                    disabled={isSavingName}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>

                </div>
              )}

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Authenticated
              </span>

            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              {user.email || user.phone || 'Director Account'}
            </p>

            <p className="text-[10px] text-slate-500 font-mono mt-1">
              ID: {user.id}
            </p>

          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>

      </div>

      {/* Account Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="p-5 glass rounded-3xl border border-white/10 space-y-1">
          <span className="text-xs font-medium text-slate-400">
            Total Saved Scripts
          </span>

          <div className="text-2xl font-semibold text-white serif-title">
            {savedScripts.length}
          </div>

          <p className="text-[10px] text-slate-500">
            Stored in your personal library
          </p>
        </div>

        <div className="p-5 glass rounded-3xl border border-white/10 space-y-1">
          <span className="text-xs font-medium text-slate-400">
            Tanglish & Tamil Scripts
          </span>

          <div className="text-2xl font-semibold text-[#F59E0B] serif-title">
            {tamilCount + tanglishCount}
          </div>

          <p className="text-[10px] text-slate-500">
            Tamil ({tamilCount}) • Tanglish ({tanglishCount})
          </p>
        </div>

        <div className="p-5 glass rounded-3xl border border-white/10 space-y-1">
          <span className="text-xs font-medium text-slate-400">
            English Screenplays
          </span>

          <div className="text-2xl font-semibold text-white serif-title">
            {englishCount}
          </div>

          <p className="text-[10px] text-slate-500">
            Standard Hollywood format
          </p>
        </div>

      </div>

      {/* Account Info Card */}
      <div className="p-6 glass rounded-3xl border border-white/10 space-y-4">

        <h3 className="text-xs font-semibold text-[#F59E0B] uppercase tracking-[0.2em] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#F59E0B]" />
          <span>Security & Data Isolation</span>
        </h3>

        <p className="text-xs text-slate-300 leading-relaxed">
          Your account data and saved screenplays are private to your user ID (
          {user.id}
          ). No other user can access or view your generated scripts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">

          {user.email && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#F59E0B]" />

              <div>
                <span className="text-slate-500 font-medium block text-[10px]">
                  Email Address
                </span>

                <span className="text-slate-200 font-bold">
                  {user.email}
                </span>
              </div>
            </div>
          )}

          {user.phone && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#F59E0B]" />

              <div>
                <span className="text-slate-500 font-medium block text-[10px]">
                  Phone Number
                </span>

                <span className="text-slate-200 font-bold">
                  {user.phone}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};