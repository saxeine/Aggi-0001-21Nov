import React, { useState } from 'react';
import { BookOpen, Copy, Check, Download, Save, RefreshCw, Sparkles, AlertCircle, Play, ChevronRight, List, FileText } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface EbookGeneratorProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface ChapterOutline {
  number: number;
  title: string;
  focus: string;
  hasGenerated: boolean;
  content?: string;
}

interface EbookResult {
  title: string;
  introduction: string;
  chapters: ChapterOutline[];
}

export const EbookGenerator: React.FC<EbookGeneratorProps> = ({ session, onSaveArtifact }) => {
  const [bookTitle, setBookTitle] = useState('The Next Tech Horizon');
  const [targetAudience, setTargetAudience] = useState('Business executives and technology enthusiasts');
  const [tone, setTone] = useState('Insightful & Narrative-driven');
  const [additionalDirectives, setAdditionalDirectives] = useState('');
  const [useSessionData, setUseSessionData] = useState(false);

  const [isProcessingOutline, setIsProcessingOutline] = useState(false);
  const [isProcessingChapter, setIsProcessingChapter] = useState(false);
  const [ebookData, setEbookData] = useState<EbookResult | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate Table of Contents & Outline
  const handleGenerateOutline = async () => {
    setIsProcessingOutline(true);
    setError(null);
    setEbookData(null);
    setActiveChapterIdx(null);
    setSaved(false);

    try {
      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      const prompt = `Act as an expert E-Book Publisher, Strategist, and Author.
Evaluate the provided ${selectedItems.length > 0 ? 'source materials' : 'specifications'} and structure a comprehensive 3-5 chapter E-Book outline.

E-BOOK SPECIFICATIONS:
- Proposed Title: ${bookTitle}
- Target Audience: ${targetAudience}
- Tone & Narrative Style: ${tone}
- Additional Directives: ${additionalDirectives || 'Organize the content logically based on trends and depth.'}

OUTPUT FORMAT REQUIREMENTS:
You MUST output the E-Book draft outline as a structured JSON object wrapped inside a codeblock.
The object must follow this strict TypeScript structure:
{
  "title": "A highly catchy, professionally refined title for the E-Book",
  "introduction": "An engaging, narrative introduction (1-2 paragraphs) setting the scene for the reader based on the sources.",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter 1 Title (punchy & informative)",
      "focus": "Brief 1-sentence description of what this chapter covers and what insights from sources will be parsed here.",
      "hasGenerated": false
    },
    {
      "number": 2,
      "title": "Chapter 2 Title",
      "focus": "Description...",
      "hasGenerated": false
    }
  ]
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Extract JSON
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\{([\s\S]*?)\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsedData = JSON.parse(jsonString.trim());

      if (parsedData && parsedData.title && parsedData.chapters) {
        setEbookData(parsedData);
      } else {
        throw new Error("Parsed outline did not match requested JSON schema.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to draft E-Book outline structure. Please clarify your requirements and try again.");
    } finally {
      setIsProcessingOutline(false);
    }
  };

  // Generate content for a specific chapter
  const handleWriteChapter = async (chapterIdx: number) => {
    if (!ebookData) return;

    setIsProcessingChapter(true);
    setError(null);

    try {
      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      const targetChapter = ebookData.chapters[chapterIdx];

      const prompt = `Act as a senior writer. Write a comprehensive, highly detailed chapter for our E-Book.
This chapter will be read as part of a published book, so it should have deep insights, rich paragraphs, structured subheadings, and engaging examples based on our ${selectedItems.length > 0 ? 'source materials' : 'specifications'}.

E-BOOK CONTEXT:
- E-Book Title: ${ebookData.title}
- Target Audience: ${targetAudience}
- Tone & Narrative Style: ${tone}

SPECIFIC CHAPTER OBJECTIVES:
- Chapter Number: ${targetChapter.number}
- Chapter Title: ${targetChapter.title}
- Chapter Focus / Context: ${targetChapter.focus}

OUTPUT REQUIREMENT:
Write the complete chapter in beautiful Markdown format (using subheadings, lists, bold accents, blockquotes, etc.). Make it comprehensive (at least 3-4 structured sections). Do not output JSON. Just output pure, beautiful Markdown starting directly with the chapter number and title.`;

      const chapterContent = await generateUnifiedAIResponse(prompt, selectedItems);

      // Update chapters array
      const updatedChapters = [...ebookData.chapters];
      updatedChapters[chapterIdx] = {
        ...targetChapter,
        hasGenerated: true,
        content: chapterContent
      };

      setEbookData({
        ...ebookData,
        chapters: updatedChapters
      });
      setActiveChapterIdx(chapterIdx);
    } catch (e) {
      console.error(e);
      setError("Failed to compile Chapter content. Please try again!");
    } finally {
      setIsProcessingChapter(false);
    }
  };

  const handleCopyCompleteMarkdown = () => {
    if (!ebookData) return;

    let text = `# ${ebookData.title}\n\n`;
    text += `### A Comprehensive Guide for ${targetAudience}\n`;
    text += `**Narrative Tone**: ${tone}\n\n`;
    text += `=========================================\n\n`;
    text += `## Introduction\n\n${ebookData.introduction}\n\n`;
    text += `=========================================\n\n`;

    ebookData.chapters.forEach(ch => {
      text += `## Chapter ${ch.number}: ${ch.title}\n\n`;
      if (ch.hasGenerated && ch.content) {
        text += `${ch.content}\n\n`;
      } else {
        text += `*Chapter not yet compiled. Outline focus: ${ch.focus}*\n\n`;
      }
      text += `=========================================\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!ebookData) return;

    let text = `# ${ebookData.title}\n\n`;
    text += `* Target Audience: ${targetAudience}\n`;
    text += `* Tone Style: ${tone}\n\n`;
    text += `## Introduction\n\n${ebookData.introduction}\n\n`;

    ebookData.chapters.forEach(ch => {
      text += `## Chapter ${ch.number}: ${ch.title}\n\n`;
      if (ch.hasGenerated && ch.content) {
        text += `${ch.content}\n\n`;
      } else {
        text += `*Focus Outline: ${ch.focus}*\n\n`;
      }
    });

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ebookData.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToSession = () => {
    if (!ebookData || !onSaveArtifact) return;

    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${ebookData.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 3rem 2rem; }
        .ebook-container { max-width: 50rem; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 3rem; }
        h1 { font-size: 2.5rem; font-weight: 900; line-height: 1.2; color: #a5b4fc; margin-bottom: 0.5rem; text-align: center; }
        .introduction { font-size: 1.125rem; line-height: 1.7; color: #d1d5db; border-left: 4px solid #6366f1; padding-left: 1.5rem; margin-top: 2rem; margin-bottom: 3rem; }
        .chapter-title { font-size: 1.75rem; font-weight: 800; color: #818cf8; margin-top: 3rem; margin-bottom: 1.5rem; border-bottom: 1px solid #1f2937; padding-bottom: 0.5rem; }
        .chapter-content { line-height: 1.8; color: #e5e7eb; font-size: 1rem; }
        .chapter-content p { margin-bottom: 1.5rem; }
    </style>
</head>
<body>
    <div class="ebook-container shadow-2xl">
        <h1>📔 ${ebookData.title}</h1>
        <p class="text-center text-sm text-indigo-400 tracking-wider uppercase font-semibold">A Master Compilation</p>
        
        <div class="introduction">${ebookData.introduction}</div>

        <div class="space-y-12">
            ${ebookData.chapters.map(ch => `
            <div>
                <h2 class="chapter-title">Chapter ${ch.number}: ${ch.title}</h2>
                <div class="chapter-content whitespace-pre-wrap">${ch.hasGenerated && ch.content ? ch.content : `<em>Chapter focus: ${ch.focus} (Content pending compilation)</em>`}</div>
            </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));

    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `E-Book: ${ebookData.title.slice(0, 20)}`,
      mimeType: 'text/html',
      type: 'html',
      data: base64Data
    };

    onSaveArtifact(newArtifact);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedItemsCount = session?.mediaItems?.filter((item: MediaItem) =>
    session?.selectedMediaIds?.includes(item.id)
  )?.length || 0;

  return (
    <div className="flex flex-col h-full bg-app-bg text-app-text">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2 border-b border-app-border pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-indigo-400">
            <BookOpen className="w-6 h-6" /> Ebook Generator
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Build comprehensive, chapter-based narrative eBooks and analytical strategic summaries backed directly by your sources.
          </p>
        </div>

        <div className="flex gap-2">
          {ebookData && (
            <>
              <button
                onClick={handleCopyCompleteMarkdown}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Complete Book' : 'Copy Complete Book'}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download MD
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save EBook'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">

        {/* Configuration Setup */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Blueprint Creator
            </h3>

            {/* Knowledge base status */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim space-y-2">
              <div className="flex items-center justify-between">
                <strong>Knowledge base:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-500 bg-app-input border-app-border rounded focus:ring-indigo-500 focus:ring-2"
                />
              </div>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Using' : 'Ignoring'} ${selectedItemsCount} selected reference(s) from active session.`
                  : '⚠️ No reference files selected. Creative flow will rely on general synthesis.'}
              </p>
            </div>

            {/* Title proposed */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Proposed EBook Title</label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-indigo-500"
                placeholder="The Next Tech Horizon"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Target Reader Profile</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-indigo-500"
                placeholder="Product managers, executives..."
              />
            </div>

            {/* Narrative Tone style */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Writing Narrative Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-indigo-500"
              >
                <option value="Insightful & Narrative-driven">📖 Insightful, engaging & narrative-driven</option>
                <option value="Highly Analytical & Academic">🎓 Structured, academic & analytical</option>
                <option value="Casual, Punchy & Case-study centric">⚡ Casual, case-study centric & punchy</option>
                <option value="Direct Technical documentation style">📟 Direct technical developer specification</option>
              </select>
            </div>

            {/* Custom Directives */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Custom Content Focus (Optional)</label>
              <textarea
                value={additionalDirectives}
                onChange={(e) => setAdditionalDirectives(e.target.value)}
                rows={3}
                placeholder="Specify standard concepts or chapter bounds to enforce..."
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Execute Outline Generator */}
            <button
              onClick={handleGenerateOutline}
              disabled={isProcessingOutline}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isProcessingOutline ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Book Outline...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate Book Outline
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Chapter Sandbox */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[450px]">
          {isProcessingOutline && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                <BookOpen className="w-5 h-5 text-indigo-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Formulating Structural Outline...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Evaluating source files and establishing logical narrative flow and strategic introductions.
              </p>
            </div>
          )}

          {error && !isProcessingOutline && !isProcessingChapter && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-red-500/40 mb-3" />
              <p className="text-sm font-bold text-red-400">Operation Failed</p>
              <p className="text-xs text-app-dim max-w-md mt-1 mb-4">{error}</p>
              <button
                onClick={handleGenerateOutline}
                className="px-4 py-2 bg-app-bg border border-app-border rounded text-xs font-semibold hover:bg-app-input text-app-text"
              >
                Retry
              </button>
            </div>
          )}

          {!isProcessingOutline && !error && !ebookData && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center text-app-dim">
              <BookOpen className="w-12 h-12 text-indigo-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Multi-Chapter EBook Workspace</p>
              <p className="text-xs max-w-sm mt-1">
                Configure your proposed eBook concept and click Generate Outline to establish an interactive, chapter-by-chapter workbench.
              </p>
            </div>
          )}

          {!isProcessingOutline && ebookData && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
              
              {/* Left Outline Rail */}
              <div className="md:col-span-5 space-y-3">
                <div className="p-3 bg-app-card border border-app-border rounded-lg text-xs">
                  <h4 className="font-bold text-indigo-400 text-sm mb-1">{ebookData.title}</h4>
                  <p className="text-app-dim leading-relaxed line-clamp-3">{ebookData.introduction}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-app-dim">Table of Chapters</span>
                  {ebookData.chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveChapterIdx(idx)}
                      className={`w-full p-3 border rounded-xl text-left transition-all text-xs flex items-center justify-between group ${
                        activeChapterIdx === idx
                          ? 'bg-indigo-600/10 border-indigo-500 text-app-text'
                          : 'bg-app-card border-app-border hover:border-indigo-500/40 text-app-dim'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                          ch.hasGenerated 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-app-bg border border-app-border text-app-dim'
                        }`}>
                          {ch.number}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-bold truncate text-app-text">{ch.title}</h5>
                          <p className="text-[10px] text-app-dim truncate">{ch.focus}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Active Chapter Workbench */}
              <div className="md:col-span-7 flex flex-col h-full bg-app-card border border-app-border rounded-xl overflow-hidden min-h-[350px]">
                {activeChapterIdx === null ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-app-dim">
                    <List className="w-10 h-10 text-indigo-500/20 mb-2" />
                    <p className="text-xs font-semibold text-app-text">Select Chapter</p>
                    <p className="text-[11px] max-w-xs mt-0.5">Click any chapter in the outline to configure, generate, or view its contents.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col h-full justify-between">
                    {/* Chapter Header */}
                    <div className="p-4 bg-app-bg border-b border-app-border flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-indigo-400">Chapter {ebookData.chapters[activeChapterIdx].number}</span>
                        <h4 className="font-bold text-sm text-app-text truncate">{ebookData.chapters[activeChapterIdx].title}</h4>
                      </div>

                      {!ebookData.chapters[activeChapterIdx].hasGenerated && (
                        <button
                          onClick={() => handleWriteChapter(activeChapterIdx)}
                          disabled={isProcessingChapter}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850/40 text-white rounded text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          {isProcessingChapter ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Writing...
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              Compile Chapter
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Chapter Body / Content */}
                    <div className="flex-1 p-5 overflow-y-auto max-h-[40vh] text-xs leading-relaxed text-app-text">
                      {isProcessingChapter ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-3">
                          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                          <p className="text-[11px] text-app-dim">Expanding narrative outline into full structural prose...</p>
                        </div>
                      ) : ebookData.chapters[activeChapterIdx].hasGenerated && ebookData.chapters[activeChapterIdx].content ? (
                        <div className="whitespace-pre-wrap font-sans">
                          {ebookData.chapters[activeChapterIdx].content}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-app-dim space-y-2">
                          <FileText className="w-10 h-10 text-app-border" />
                          <p className="text-xs font-semibold text-app-text">Chapter Pending compilation</p>
                          <p className="text-[11px] max-w-xs leading-relaxed">
                            Focus: "{ebookData.chapters[activeChapterIdx].focus}"
                          </p>
                          <button
                            onClick={() => handleWriteChapter(activeChapterIdx)}
                            className="mt-2 px-3 py-1.5 bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 rounded text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                          >
                            Compile Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
