import React, { useState, useMemo } from 'react';
import { CastMember, VoiceSettings } from '../types';

interface CastLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  castLibrary: CastMember[];
  voiceSettings: VoiceSettings;
  onAssignRole: (role: 'host' | 'expert' | 'guest', member: CastMember) => void;
  onResetVoiceSettings: () => void;
  onAdd: (member: Omit<CastMember, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<CastMember>) => void;
  onDelete: (id: string) => void;
}

const availableVoices = [
  { name: 'Kore', label: 'Kore' },
  { name: 'Puck', label: 'Puck' },
  { name: 'Charon', label: 'Charon' },
  { name: 'Fenrir', label: 'Fenrir' },
  { name: 'Zephyr', label: 'Zephyr' },
];

const CastLibraryModal: React.FC<CastLibraryModalProps> = ({
  isOpen,
  onClose,
  castLibrary,
  voiceSettings,
  onAssignRole,
  onResetVoiceSettings,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'system'>('all');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female' | 'Neutral'>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingMember, setEditingMember] = useState<CastMember | null>(null);

  // Add/Edit Form State
  const [newName, setNewName] = useState('');
  const [newVoice, setNewVoice] = useState(availableVoices[0].name);
  const [newBio, setNewBio] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newGender, setNewGender] = useState<'Male' | 'Female' | 'Neutral'>('Female');

  const filteredCastMembers = useMemo(() => {
    let filtered = castLibrary;
    if (activeTab === 'user') filtered = castLibrary.filter(cm => cm.category === 'user');
    if (activeTab === 'system') filtered = castLibrary.filter(cm => cm.category === 'system');

    if (genderFilter !== 'All') {
      filtered = filtered.filter(cm => (cm.gender || 'Female') === genderFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(cm =>
        cm.name.toLowerCase().includes(q) ||
        cm.bio.toLowerCase().includes(q) ||
        cm.voice.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [castLibrary, activeTab, genderFilter, search]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newVoice.trim() && newBio.trim()) {
      onAdd({
        name: newName.trim(),
        voice: newVoice.trim(),
        bio: newBio.trim(),
        avatar: newAvatar.trim() || undefined,
        category: 'user',
        gender: newGender
      });
      setNewName('');
      setNewVoice(availableVoices[0].name);
      setNewBio('');
      setNewAvatar('');
      setNewGender('Female');
      setViewMode('list');
      setActiveTab('user');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember && newName.trim() && newVoice.trim() && newBio.trim()) {
      onUpdate(editingMember.id, {
        name: newName.trim(),
        voice: newVoice.trim(),
        bio: newBio.trim(),
        avatar: newAvatar.trim() || undefined,
        gender: newGender
      });
      setEditingMember(null);
      setNewName('');
      setNewVoice(availableVoices[0].name);
      setNewBio('');
      setNewAvatar('');
      setNewGender('Female');
      setViewMode('list');
    }
  };

  const startEdit = (member: CastMember) => {
    setEditingMember(member);
    setNewName(member.name);
    setNewVoice(member.voice);
    setNewBio(member.bio);
    setNewAvatar(member.avatar || '');
    setNewGender(member.gender || 'Female');
    setViewMode('edit');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(castLibrary, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cast_library.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const currentHost = castLibrary.find(cm => cm.id === voiceSettings.hostMemberId);
  const currentExpert = castLibrary.find(cm => cm.id === voiceSettings.expertMemberId);
  const currentGuest = castLibrary.find(cm => cm.id === voiceSettings.guestMemberId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-app-card border border-app-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pulse-fast-once">

        {/* Header */}
        <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-panel">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-app-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.149-1.268.432-1.828M14 10a6 6 0 01-6 6H6a6 6 0 01-6-6V7a3 3 0 013-3h7a3 3 0 013 3v3zm-4 0a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            <h3 className="text-lg font-bold text-app-text">Cast Library</h3>
          </div>
          <div className="flex items-center gap-4">
            {(voiceSettings.hostMemberId || voiceSettings.expertMemberId || voiceSettings.guestMemberId) && (
              <button 
                onClick={onResetVoiceSettings}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest border border-red-500/30 px-2 py-1 rounded bg-red-500/10 transition-all"
              >
                Reset All
              </button>
            )}
            <button onClick={onClose} className="text-app-muted hover:text-app-text p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === 'list' ? (
            <>
              {/* Toolbar */}
              <div className="p-3 border-b border-app-border flex gap-2 items-center flex-wrap bg-app-bg/50">
                <div className="flex bg-app-panel rounded-lg p-1 border border-app-border">
                  <button onClick={() => setActiveTab('all')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'all' ? 'bg-app-text text-app-bg' : 'text-app-muted hover:text-app-text'}`}>All</button>
                  <button onClick={() => setActiveTab('system')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'system' ? 'bg-app-text text-app-bg' : 'text-app-muted hover:text-app-text'}`}>System</button>
                  <button onClick={() => setActiveTab('user')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'user' ? 'bg-app-text text-app-bg' : 'text-app-muted hover:text-app-text'}`}>My Cast</button>
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search cast members..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-app-input border border-app-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-app-text focus:outline-none focus:border-app-text"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-app-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => setViewMode('add')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New
                </button>
              </div>

              {/* Gender Filter Row */}
              <div className="px-3 py-2 border-b border-app-border bg-app-panel/30 flex items-center gap-2">
                <span className="text-[10px] font-bold text-app-dim uppercase tracking-wider">Voice Gender:</span>
                <div className="flex bg-app-bg rounded-md p-0.5 border border-app-border">
                  {(['All', 'Female', 'Male', 'Neutral'] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setGenderFilter(gender)}
                      className={`px-3 py-0.5 text-[10px] font-bold rounded transition-all flex items-center gap-1 ${
                        genderFilter === gender
                          ? 'bg-app-text text-app-bg'
                          : 'text-app-dim hover:text-app-text'
                      }`}
                    >
                      {gender === 'Female' && '♀'}
                      {gender === 'Male' && '♂'}
                      {gender === 'Neutral' && '⚪'}
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredCastMembers.length === 0 && (
                  <div className="text-center text-app-dim mt-10">No cast members found.</div>
                )}
                {filteredCastMembers.map(member => (
                  <div key={member.id} className="bg-app-panel border border-app-border rounded-lg p-3 hover:border-app-text/50 transition-colors group flex justify-between items-start gap-3">
                    <div className="flex-shrink-0 relative">
                      <img
                        src={member.avatar || `https://picsum.photos/seed/${member.name}/60/60`}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover border border-app-border"
                        referrerPolicy="no-referrer"
                      />
                      {voiceSettings.hostMemberId === member.id && (
                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[7px] font-bold px-1 rounded-full shadow-sm border border-app-panel uppercase">Host</div>
                      )}
                      {voiceSettings.expertMemberId === member.id && (
                        <div className="absolute -bottom-1 -right-1 bg-green-600 text-white text-[7px] font-bold px-1 rounded-full shadow-sm border border-app-panel uppercase">Expert</div>
                      )}
                      {voiceSettings.guestMemberId === member.id && (
                        <div className="absolute -bottom-1 -left-1 bg-amber-600 text-white text-[7px] font-bold px-1 rounded-full shadow-sm border border-app-panel uppercase">Guest</div>
                      )}
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => startEdit(member)}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-app-text">{member.name}</span>
                        {member.category === 'user' && <span className="text-[10px] bg-blue-900 text-blue-200 px-1.5 rounded border border-blue-700">User</span>}
                        <span className="text-[10px] bg-app-bg text-app-dim px-1.5 rounded border border-app-border capitalize">{member.voice}</span>
                        
                        {/* Gender badges */}
                        {(member.gender === 'Female' || !member.gender) && (
                          <span className="text-[9px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/20 font-bold flex items-center gap-0.5">
                            ♀ Female
                          </span>
                        )}
                        {member.gender === 'Male' && (
                          <span className="text-[9px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/20 font-bold flex items-center gap-0.5">
                            ♂ Male
                          </span>
                        )}
                        {member.gender === 'Neutral' && (
                          <span className="text-[9px] bg-zinc-500/10 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-500/20 font-bold flex items-center gap-0.5">
                            ⚪ Neutral
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-app-muted line-clamp-2">{member.bio}</p>
                    </div>
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onAssignRole('host', member)}
                        className={`px-2 py-1 text-[10px] rounded font-bold uppercase tracking-wider transition-all ${voiceSettings.hostMemberId === member.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-app-bg text-app-dim hover:text-app-text border border-app-border'}`}
                        title={voiceSettings.hostMemberId === member.id ? "Unassign Host" : "Assign as Host"}
                      >
                        Host {voiceSettings.hostMemberId === member.id && '✓'}
                      </button>
                      <button
                        onClick={() => onAssignRole('expert', member)}
                        className={`px-2 py-1 text-[10px] rounded font-bold uppercase tracking-wider transition-all ${voiceSettings.expertMemberId === member.id ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-app-bg text-app-dim hover:text-app-text border border-app-border'}`}
                        title={voiceSettings.expertMemberId === member.id ? "Unassign Expert" : "Assign as Expert"}
                      >
                        Expert {voiceSettings.expertMemberId === member.id && '✓'}
                      </button>
                      <button
                        onClick={() => onAssignRole('guest', member)}
                        className={`px-2 py-1 text-[10px] rounded font-bold uppercase tracking-wider transition-all ${voiceSettings.guestMemberId === member.id ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-app-bg text-app-dim hover:text-app-text border border-app-border'}`}
                        title={voiceSettings.guestMemberId === member.id ? "Unassign Guest" : "Assign as Guest"}
                      >
                        Guest {voiceSettings.guestMemberId === member.id && '✓'}
                      </button>
                      
                      {(voiceSettings.hostMemberId === member.id || voiceSettings.expertMemberId === member.id || voiceSettings.guestMemberId === member.id) && (
                        <button
                          onClick={() => {
                            if (voiceSettings.hostMemberId === member.id) onAssignRole('host', member);
                            if (voiceSettings.expertMemberId === member.id) onAssignRole('expert', member);
                            if (voiceSettings.guestMemberId === member.id) onAssignRole('guest', member);
                          }}
                          className="px-2 py-1 text-[10px] rounded font-bold uppercase tracking-wider bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all"
                        >
                          Unselect
                        </button>
                      )}

                      {member.category === 'user' && (
                        <button onClick={() => onDelete(member.id)} className="text-app-dim hover:text-red-400 p-1 self-end" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Add/Edit Form
            <form onSubmit={viewMode === 'add' ? handleAddSubmit : handleEditSubmit} className="flex-1 flex flex-col p-6 gap-4">
              <h4 className="text-sm font-bold text-app-text uppercase tracking-wider">{viewMode === 'add' ? 'Create New Cast Member' : 'Edit Cast Member'}</h4>
              <div>
                <label className="block text-xs text-app-dim mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Dr. AI Expert"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-app-dim mb-1">Voice</label>
                <select
                  value={newVoice}
                  onChange={e => setNewVoice(e.target.value)}
                  className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-blue-500"
                  required
                >
                  {availableVoices.map(v => (
                    <option key={v.name} value={v.name}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-app-dim mb-1">Gender</label>
                <div className="flex gap-4 p-2 bg-app-bg border border-app-border rounded">
                  {(['Female', 'Male', 'Neutral'] as const).map((gender) => (
                    <label key={gender} className="flex items-center gap-2 cursor-pointer text-xs text-app-text font-medium select-none">
                      <input
                        type="radio"
                        name="newGender"
                        value={gender}
                        checked={newGender === gender}
                        onChange={() => setNewGender(gender)}
                        className="text-purple-500 bg-app-bg border-app-border focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        {gender === 'Female' && <span className="text-pink-400 font-bold">♀ Female</span>}
                        {gender === 'Male' && <span className="text-sky-400 font-bold">♂ Male</span>}
                        {gender === 'Neutral' && <span className="text-zinc-400 font-bold">⚪ Neutral</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-app-dim mb-1">Bio / Vibe</label>
                <textarea
                  value={newBio}
                  onChange={e => setNewBio(e.target.value)}
                  className="w-full h-24 bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Describe personality, expertise, or role..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-app-dim mb-1">Avatar URL (Optional)</label>
                <input
                  type="text"
                  value={newAvatar}
                  onChange={e => setNewAvatar(e.target.value)}
                  className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-blue-500"
                  placeholder="https://picsum.photos/seed/avatar/60/60"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
                <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold">{viewMode === 'add' ? 'Add Member' : 'Save Changes'}</button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {viewMode === 'list' && (
          <div className="p-3 bg-app-panel border-t border-app-border flex justify-between items-center">
            <button onClick={handleExport} className="text-xs text-app-dim hover:text-app-text flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export JSON
            </button>
            <div className="text-[10px] text-app-dim">{castLibrary.length} members</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CastLibraryModal;
