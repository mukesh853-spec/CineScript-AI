import React, { useState } from 'react';
import { Plus, Trash2, Edit2, UserCheck, Shield, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Character } from '../types';

interface CharacterManagerProps {
  characters: Character[];
  onChange: (characters: Character[]) => void;
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({ characters, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for all 9 fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [role, setRole] = useState('');
  const [personality, setPersonality] = useState('');
  const [description, setDescription] = useState('');
  const [relationship, setRelationship] = useState('');
  const [goal, setGoal] = useState('');
  const [conflict, setConflict] = useState('');

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setAge('28');
    setGender('Male');
    setRole('');
    setPersonality('');
    setDescription('');
    setRelationship('');
    setGoal('');
    setConflict('');
    setIsModalOpen(true);
  };

  const openEditModal = (char: Character) => {
    setEditingId(char.id);
    setName(char.name);
    setAge(char.age);
    setGender(char.gender);
    setRole(char.role);
    setPersonality(char.personality);
    setDescription(char.description);
    setRelationship(char.relationship);
    setGoal(char.goal);
    setConflict(char.conflict);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newChar: Character = {
      id: editingId || `char_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      age: age.trim() || '25',
      gender: gender || 'Male',
      role: role.trim() || 'Protagonist',
      personality: personality.trim() || 'Determined, sharp',
      description: description.trim() || 'Main character',
      relationship: relationship.trim() || 'Central figure',
      goal: goal.trim() || 'Uncover the truth',
      conflict: conflict.trim() || 'Personal and external obstacles',
    };

    if (editingId) {
      onChange(characters.map(c => (c.id === editingId ? newChar : c)));
    } else {
      onChange([...characters, newChar]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    onChange(characters.filter(c => c.id !== id));
  };

  const loadPreset = (presetType: 'cop' | 'brother' | 'villain') => {
    if (presetType === 'cop') {
      setName('Sathieesh');
      setAge('28');
      setGender('Male');
      setRole('Honest Police Officer');
      setPersonality('Brave, emotional, highly intelligent');
      setDescription('A disciplined cop who relies on logic and instinct.');
      setRelationship('Older brother to Vignesh');
      setGoal('Find his missing brother and solve serial crime cases');
      setConflict('Discovers his own brother might be the mastermind behind the murder');
    } else if (presetType === 'brother') {
      setName('Vignesh');
      setAge('24');
      setGender('Male');
      setRole('Software Engineer / Suspect');
      setPersonality('Quiet, secretive, deeply troubled');
      setDescription('Clever young programmer with dark secret history.');
      setRelationship('Younger brother to Sathieesh');
      setGoal('Protect his family at any cost while hiding the past');
      setConflict('Trapped between criminal forces and his cop brother');
    } else if (presetType === 'villain') {
      setName('Karthik');
      setAge('35');
      setGender('Male');
      setRole('Shadow Syndicate Leader');
      setPersonality('Ruthless, manipulative, calm');
      setDescription('Ex-military officer turned crime syndicate strategist.');
      setRelationship('Rival of Police Department');
      setGoal('Control the underworld without leaving evidence');
      setConflict('Hunted by Sathieesh while controlling Vignesh');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#F59E0B] font-semibold">Character Cast ({characters.length})</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Authoritative character profiles injected directly into screenplay generation
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F59E0B] text-black text-xs font-bold hover:bg-[#d98a08] transition-colors shadow-md shadow-[#F59E0B]/10"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Character</span>
        </button>
      </div>

      {/* Character Cards List */}
      {characters.length === 0 ? (
        <div className="p-4 rounded-2xl border border-dashed border-white/10 bg-white/5 text-center">
          <p className="text-xs text-slate-400">
            No custom characters added yet. Click "+ Add Character" or use quick presets below.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => { openAddModal(); loadPreset('cop'); }}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-medium"
            >
              + Quick Cop (Sathieesh)
            </button>
            <button
              type="button"
              onClick={() => { openAddModal(); loadPreset('brother'); }}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-medium"
            >
              + Quick Brother (Vignesh)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {characters.map((char) => {
            const isExpanded = expandedCardId === char.id;
            return (
              <div
                key={char.id}
                className="glass rounded-2xl p-4 hover:border-white/20 transition-all text-xs space-y-2 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center font-bold text-xs text-white border border-white/10">
                      {char.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{char.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({char.age}, {char.gender})</span>
                      </h4>
                      <p className="text-[11px] text-[#F59E0B] font-medium">{char.role || 'Character'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(char)}
                      className="p-1 text-slate-400 hover:text-[#F59E0B] rounded-lg hover:bg-white/10 transition-colors"
                      title="Edit Character"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(char.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/10 transition-colors"
                      title="Delete Character"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : char.id)}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/10"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-2">
                  <span className="text-slate-500 font-medium">Goal:</span> {char.goal}
                </p>

                {isExpanded && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5 text-[11px] text-slate-300">
                    <p><span className="text-slate-500 font-medium">Personality:</span> {char.personality}</p>
                    <p><span className="text-slate-500 font-medium">Relationship:</span> {char.relationship}</p>
                    <p><span className="text-slate-500 font-medium">Conflict:</span> {char.conflict}</p>
                    <p><span className="text-slate-500 font-medium">Description:</span> {char.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CHARACTER EDIT / ADD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass rounded-3xl p-4 sm:p-6 text-slate-100 shadow-2xl my-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 pr-8">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                <span className="serif-title text-lg sm:text-xl">{editingId ? 'Edit Character Profile' : 'Add New Character'}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Accepts Tamil (தமிழ்), English, Tanglish, or mixed language descriptions</p>
            </div>

            {/* Quick Presets Bar */}
            <div className="mb-4 p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-medium">Presets:</span>
              <button
                type="button"
                onClick={() => loadPreset('cop')}
                className="px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30 border border-[#F59E0B]/30 font-semibold"
              >
                Lead Cop
              </button>
              <button
                type="button"
                onClick={() => loadPreset('brother')}
                className="px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30 border border-[#F59E0B]/30 font-semibold"
              >
                Suspect Brother
              </button>
              <button
                type="button"
                onClick={() => loadPreset('villain')}
                className="px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30 border border-[#F59E0B]/30 font-semibold"
              >
                Antagonist
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-slate-300 font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sathieesh / ஜினேஷ்"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Age</label>
                    <input
                      type="text"
                      placeholder="28"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 focus:outline-none focus:border-[#F59E0B]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Role / Profession</label>
                  <input
                    type="text"
                    placeholder="e.g. Hero / போலீஸ் அதிகாரி"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Personality Traits</label>
                  <input
                    type="text"
                    placeholder="e.g. Calm, practical / அமைதியானவன்"
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Relationships</label>
                <input
                  type="text"
                  placeholder="e.g. Brother to Vignesh / நரேனின் நண்பன்"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Character Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Uncover truth / தம்பியை காப்பாற்றுவது / Win the game"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Character Conflict</label>
                <input
                  type="text"
                  placeholder="e.g. Ghost-la nambikkai illa / பேய்களை நம்பாதவன் ஆனால் நேரில் சந்திக்கிறான்"
                  value={conflict}
                  onChange={(e) => setConflict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe character details, appearance, or background in any language..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#F59E0B] text-black font-bold text-xs hover:bg-[#d98a08] shadow-md shadow-[#F59E0B]/20"
                >
                  Save Character
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
