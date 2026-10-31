import { useState, useEffect } from 'react';
import { CastMember } from '../types';

const STORAGE_KEY = 'gemini_media_aggregator_cast_library';

const DEFAULT_CAST_MEMBERS: CastMember[] = [
  {
    id: 'sys-host-1',
    name: 'Narrator Bot',
    voice: 'Kore',
    bio: 'A clear, authoritative, and friendly voice, perfect for hosting and guiding the listener through complex topics.',
    avatar: 'https://picsum.photos/seed/narrator/60/60',
    category: 'system',
    gender: 'Female',
  },
  {
    id: 'sys-expert-1',
    name: 'Dr. Insight',
    voice: 'Zephyr',
    bio: 'A knowledgeable and articulate voice, ideal for explaining intricate details and offering expert opinions.',
    avatar: 'https://picsum.photos/seed/expert/60/60',
    category: 'system',
    gender: 'Male',
  },
  {
    id: 'sys-guest-1',
    name: 'Curious Listener',
    voice: 'Puck',
    bio: 'An engaging and inquisitive voice, representing the audience and asking clarifying questions.',
    avatar: 'https://picsum.photos/seed/listener/60/60',
    category: 'system',
    gender: 'Male',
  },
  {
    id: 'sys-host-sv-1',
    name: 'Lars (Värd)',
    voice: 'Fenrir',
    bio: 'En karismatisk och erfaren programledare för podcasts på svenska. Tydlig och engagerande stämma.',
    avatar: 'https://picsum.photos/seed/lars/60/60',
    category: 'system',
    gender: 'Male',
  },
  {
    id: 'sys-expert-sv-1',
    name: 'Elena (Expert)',
    voice: 'Zephyr',
    bio: 'En sakkunnig expert som förklarar komplexa ämnen på ett pedagogiskt sätt på svenska. Lugn och saklig.',
    avatar: 'https://picsum.photos/seed/elena/60/60',
    category: 'system',
    gender: 'Female',
  },
  {
    id: 'sys-astrid-sv-1',
    name: 'Astrid (Trend)',
    voice: 'Kore',
    bio: 'En pigg och modern röst, perfekt för att diskutera trender och nya teknologier på ett medryckande sätt.',
    avatar: 'https://picsum.photos/seed/astrid/60/60',
    category: 'system',
    gender: 'Female',
  },
  {
    id: 'sys-oskar-sv-1',
    name: 'Oskar (Affär)',
    voice: 'Puck',
    bio: 'En seriös men varm röst som passar för affärsanalys och djupgående intervjuer.',
    avatar: 'https://picsum.photos/seed/oskar/60/60',
    category: 'system',
    gender: 'Male',
  },
  {
    id: 'sys-freja-sv-1',
    name: 'Freja (Berättare)',
    voice: 'Aoede',
    bio: 'En mjuk och berättande röst som fångar lyssnarens intresse med personliga historier.',
    avatar: 'https://picsum.photos/seed/freja/60/60',
    category: 'system',
    gender: 'Female',
  },
];

export const useCastLibrary = () => {
  const [castMembers, setCastMembers] = useState<CastMember[]>(DEFAULT_CAST_MEMBERS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const userCastMembers = parsed.filter((cm: CastMember) => cm.category === 'user');
        setCastMembers([...DEFAULT_CAST_MEMBERS, ...userCastMembers]);
      } catch (e) {
        console.error("Failed to load cast members", e);
      }
    }
  }, []);

  const saveToStorage = (newCastMembers: CastMember[]) => {
    const userCastMembers = newCastMembers.filter(cm => cm.category === 'user');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userCastMembers));
  };

  const addCastMember = (member: Omit<CastMember, 'id'>) => {
    const newCastMember: CastMember = {
      ...member,
      id: `usr-${Date.now()}`,
      category: 'user',
    };
    const updated = [...castMembers, newCastMember];
    setCastMembers(updated);
    saveToStorage(updated);
  };

  const updateCastMember = (id: string, updates: Partial<CastMember>) => {
    const updated = castMembers.map(cm => 
      cm.id === id ? { ...cm, ...updates } : cm
    );
    setCastMembers(updated);
    saveToStorage(updated);
  };

  const deleteCastMember = (id: string) => {
    const updated = castMembers.filter(cm => cm.id !== id);
    setCastMembers(updated);
    saveToStorage(updated);
  };

  const resetLibrary = () => {
    setCastMembers(DEFAULT_CAST_MEMBERS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    castLibrary: castMembers,
    addCastMember,
    updateCastMember,
    deleteCastMember,
    resetLibrary,
  };
};
