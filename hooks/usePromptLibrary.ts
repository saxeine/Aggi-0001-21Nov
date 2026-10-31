
import { useState, useEffect } from 'react';
import { PromptTemplate } from '../types';

const STORAGE_KEY = 'gemini_media_aggregator_prompts';

const DEFAULT_PROMPTS: PromptTemplate[] = [
  // Insight (Cyan)
  { id: 'sys-i1', category: 'system', tags: ['insight'], title: 'Complete Idea', content: 'Analyze the actual subject matter of the provided content (ignoring any technical metadata) and provide a complete summary of the key ideas.' },
  { id: 'sys-i2', category: 'system', tags: ['insight'], title: 'Advice Takeaway', content: 'Based on the topics discussed in the sources, what practical advice can I take away?' },
  { id: 'sys-i3', category: 'system', tags: ['insight'], title: 'Simple Explanation', content: 'Provide super simple explanations of the core topics found in the content, avoiding jargon and technical API details.' },
  { id: 'sys-i4', category: 'system', tags: ['insight'], title: 'Bullet Points', content: 'Break down the core concepts of the content into clear, concise bullet points.' },
  { id: 'sys-i5', category: 'system', tags: ['insight'], title: 'Deep Questions', content: 'Generate deep, thought-provoking questions based on the actual subject matter of the sources.' },

  // Discovery (Fuchsia)
  { id: 'sys-d1', category: 'system', tags: ['discovery'], title: '5 Smart Questions', content: 'Analyze the main subject matter of the content and generate 5 smart, diverse questions a user might ask about these topics.' },
  { id: 'sys-d2', category: 'system', tags: ['discovery'], title: 'Hidden Connections', content: 'Find hidden connections between the different files or topics provided in the sources.' },
  { id: 'sys-d3', category: 'system', tags: ['discovery'], title: 'Surprising Details', content: 'Identify the most unique or surprising details found within the actual content.' },
  { id: 'sys-d4', category: 'system', tags: ['discovery'], title: 'Missing Info', content: 'What important information or perspective seems to be missing from these sources?' },
  { id: 'sys-d5', category: 'system', tags: ['discovery'], title: 'Critique', content: 'Critique the arguments or information presented in the content: What are the weak points?' },

  // Structure (Amber)
  { id: 'sys-s1', category: 'system', tags: ['structure'], title: 'Chapter Sections', content: 'Break the source content into chapter-wise sections with clear sub-topics.' },
  { id: 'sys-s2', category: 'system', tags: ['structure'], title: 'Story Format', content: 'Explain the core concepts as a narrative story so they are easier to remember.' },
  { id: 'sys-s3', category: 'system', tags: ['structure'], title: 'Cram Sheet', content: 'Create a one-page "cram sheet" summarizing the most critical facts and figures from the content.' },
  { id: 'sys-crypto', category: 'system', tags: ['finance'], title: 'XRP Trading Assistant', content: `Act as an expert cryptocurrency day-trading assistant and technical analyst. Provide a highly granular, intraday technical analysis and scalp-trading blueprint for XRP based on the 4-hour (4H) chart frame. Use a professional, scannable, and practical tone. All monetary values and calculations must be expressed in Swedish Krona (SEK).

Here is the current live data to use for the math:
- Current XRP Price: [Insert Current Price, e.g., 13.51 SEK]
- Target Scalp Profit: [Insert Desired Net Profit, e.g., 756 SEK]
- Current USD/SEK Exchange Rate: [Insert Rate, e.g., 9.45 SEK]

Please format the output exactly into these distinct sections using markdown tables, bullet points, and bold text:

1. **Intraday Overview:** A brief 2-3 sentence summary of the immediate 4H market structure (e.g., consolidation, cooling-off, compression, or breakout).

2. **📊 4-Hour Technical Blueprint:** List the current Market Sentiment, Current Pivot Point, RSI status, and key Moving Averages (EMA/SMA) on the 4H timeframe.

3. **📉 Downside vs. 📈 Upside Scenarios:** Break down "The Bearish Track" (Immediate Support, Max Intraday Drawdown Target) and "The Bullish Track" (Immediate Resistance, Breakout Target) with specific SEK levels.

4. **💡 Intraday Trading Outlook:** Give actionable tactical advice regarding indicators (like MACD crossovers or volume profiles) and specify exactly where high-volume accumulation or heavy selling is likely to occur.

5. **📈 Capital Requirements Matrix (in SEK):** Create a clear markdown table showing the exact upfront capital required to hit the target profit across two different realistic price move targets (e.g., a tight 1-2% move vs. a wider 3-4% move). The table must include these exact columns:
| Target Price Move | XRP Tokens Needed | Total Position Value | Spot (1x Leverage) | 5x Leverage Margin | 10x Leverage Margin | 20x Leverage Margin |

6. **⚠️ The Scalper's Reality Check (In SEK):** Provide bulleted risk warnings covering:
- Exchange Fees: Calculate the approximate round-trip fee cost based on the total position size and state the gross profit needed.
- Liquidation Bounds: State the exact percentage move against the trade that triggers liquidation at 20x leverage.
- Execution Strategy: Explain the impact of the spread and why limit vs. market orders matter for this specific setup.

End the entire response with a single, highly relevant tactical question to guide the user's execution strategy.` },
];

export const usePromptLibrary = () => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>(DEFAULT_PROMPTS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge stored user prompts with current default system prompts to ensure updates to defaults are reflected
        const userPrompts = parsed.filter((p: PromptTemplate) => p.category === 'user');
        setPrompts([...DEFAULT_PROMPTS, ...userPrompts]);
      } catch (e) {
        console.error("Failed to load prompts", e);
      }
    }
  }, []);

  const saveToStorage = (newPrompts: PromptTemplate[]) => {
    // Only save user prompts to local storage to avoid duplicating system prompts if defaults change in code
    const userPrompts = newPrompts.filter(p => p.category === 'user');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPrompts));
  };

  const addPrompt = (title: string, content: string) => {
    const newPrompt: PromptTemplate = {
      id: `usr-${Date.now()}`,
      category: 'user',
      title,
      content,
      tags: ['custom']
    };
    const updated = [...prompts, newPrompt];
    setPrompts(updated);
    saveToStorage(updated);
  };

  const removePrompt = (id: string) => {
    const updated = prompts.filter(p => p.id !== id);
    setPrompts(updated);
    saveToStorage(updated);
  };

  return {
    prompts,
    addPrompt,
    removePrompt
  };
};
