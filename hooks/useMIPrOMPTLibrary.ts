import { useState, useEffect } from 'react';
import { MIPrOMPTItem } from '../types';

const STORAGE_KEY = 'mIPrOMPT_library_data';

export const useMIPrOMPTLibrary = () => {
  const [miprompts, setMiprompts] = useState<MIPrOMPTItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMiprompts(parsed);
      } catch (e) {
        console.error("Failed to load mIPrOMPT library", e);
      }
    } else {
        const seedPrompts: MIPrOMPTItem[] = [
           { id: 'seed_1', name: '001-prB-Menubar', type: 'prB', content: 'Build an interactive 5-label menubar with smooth hover animations using React and Tailwind CSS. The labels should be: Home, Planner, Recipes, Inventory, Settings. Include an active state indicator.', isFavorite: true, createdAt: Date.now() },
           { id: 'seed_2', name: '002-prB-Foodplanner', type: 'prB', content: 'Create a comprehensive weekly food planner component. It should include a 7-day grid showing Breakfast, Lunch, and Dinner. Add drag-and-drop support for meals, and a sidebar with a shopping list summary. Use React and Tailwind CSS.', isFavorite: true, createdAt: Date.now() }
        ];
        saveLibrary(seedPrompts);
    }
  }, []);

  const saveLibrary = (items: MIPrOMPTItem[]) => {
    setMiprompts(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const addMIPrOMPT = (type: 'prB' | 'ctB' | 'txS', content: string, contextName: string = '') => {
    // Generate sequential naming: 001-prB-
    const typeItems = miprompts.filter(i => i.type === type);
    const nextNum = typeItems.length + 1;
    const numStr = nextNum.toString().padStart(3, '0');
    
    // Cleanup contextName
    const cleanContext = contextName ? contextName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_').substring(0, 30) : '';
    const name = `${numStr}-${type}-${cleanContext}`;
    
    const newItem: MIPrOMPTItem = {
      id: "mip_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name,
      type,
      content,
      isFavorite: false,
      createdAt: Date.now()
    };
    
    saveLibrary([...miprompts, newItem]);
    return newItem;
  };

  const updateMIPrOMPT = (id: string, updates: Partial<MIPrOMPTItem>) => {
    const updated = miprompts.map(p => p.id === id ? { ...p, ...updates } : p);
    saveLibrary(updated);
  };

  const deleteMIPrOMPT = (id: string) => {
    const filtered = miprompts.filter(p => p.id !== id);
    saveLibrary(filtered);
  };

  const importCSV = (csvText: string) => {
      try {
          const lines = csvText.split('\n');
          if (lines.length < 2) throw new Error("File empty or missing headers");
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          const newItems: MIPrOMPTItem[] = [];
          for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              // Proper CSV parsing is complex, but for simplicity assuming commas aren't inside the unescaped content or using a basic split 
              // A better approach is matching regex if needed, but basic approach:
              const match = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
              if (!match) continue;
              
              const row = match.map(val => val.replace(/^"|"$/g, '').trim());
              
              if (row.length >= 3) {
                  newItems.push({
                      id: "mip_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                      name: row[0] || 'Imported',
                      type: (row[1] === 'ctB' ? 'ctB' : row[1] === 'txS' ? 'txS' : 'prB') as MIPrOMPTItem['type'],
                      content: row[2] || '',
                      isFavorite: row[3] === 'true',
                      createdAt: Date.now()
                  });
              }
          }
          if (newItems.length) {
              saveLibrary([...miprompts, ...newItems]);
          }
      } catch (e) {
          console.error("Error importing CSV", e);
          alert("Failed to import CSV: " + (e as Error).message);
      }
  };

  return { miprompts, addMIPrOMPT, updateMIPrOMPT, deleteMIPrOMPT, importCSV };
};
