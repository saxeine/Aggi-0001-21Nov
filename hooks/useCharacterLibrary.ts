import { useState, useEffect } from 'react';
import { CharacterPrompt } from '../types';

const STORAGE_KEY = 'gemini_media_aggregator_character_library';

const DEFAULT_CHARACTERS: CharacterPrompt[] = [
  {
    id: 'char-1',
    title: 'Objective Journalist',
    content: 'Maintains a neutral, balanced tone. Focuses on facts and evidence. Avoids emotional language or taking sides.',
    tone: 'Neutral',
    perspective: 'Fact-based',
    bias: 'None',
    category: 'system'
  },
  {
    id: 'char-2',
    title: 'Enthusiastic Tech Evangelist',
    content: 'Highly optimistic about technology. Focuses on potential and innovation. Uses energetic and forward-looking language.',
    tone: 'Energetic',
    perspective: 'Optimistic',
    bias: 'Pro-Innovation',
    category: 'system'
  },
  {
    id: 'char-3',
    title: 'Skeptical Critic',
    content: 'Questions assumptions and looks for potential downsides. Focuses on risks, ethical concerns, and limitations.',
    tone: 'Skeptical',
    perspective: 'Critical',
    bias: 'Cautionary',
    category: 'system'
  },
  {
    id: 'char-4',
    title: 'Empathetic Storyteller',
    content: 'Focuses on the human element. Uses emotional language and personal anecdotes to connect with the audience.',
    tone: 'Warm',
    perspective: 'Human-centric',
    bias: 'Emotional',
    category: 'system'
  }
];

export const useCharacterLibrary = () => {
  const [characters, setCharacters] = useState<CharacterPrompt[]>(DEFAULT_CHARACTERS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const userChars = parsed.filter((c: CharacterPrompt) => c.category === 'user');
        setCharacters([...DEFAULT_CHARACTERS, ...userChars]);
      } catch (e) {
        console.error("Failed to load character library", e);
      }
    }
  }, []);

  const saveToStorage = (newChars: CharacterPrompt[]) => {
    const userChars = newChars.filter(c => c.category === 'user');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userChars));
  };

  const addCharacter = (char: Omit<CharacterPrompt, 'id' | 'category'>) => {
    const newChar: CharacterPrompt = {
      ...char,
      id: `char-usr-${Date.now()}`,
      category: 'user'
    };
    const updated = [...characters, newChar];
    setCharacters(updated);
    saveToStorage(updated);
  };

  const updateCharacter = (id: string, updates: Partial<CharacterPrompt>) => {
    const updated = characters.map(c => c.id === id ? { ...c, ...updates } : c);
    setCharacters(updated);
    saveToStorage(updated);
  };

  const deleteCharacter = (id: string) => {
    const updated = characters.filter(c => c.id !== id);
    setCharacters(updated);
    saveToStorage(updated);
  };

  return {
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter
  };
};
