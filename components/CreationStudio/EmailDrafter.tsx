import React, { useState } from 'react';
import { Mail, Copy, Check, Download, Save, RefreshCw, Send, Sparkles, AlertCircle, Eye, User, FileText } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface EmailDrafterProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface EmailResult {
  subject: string;
  body: string;
  alternatives: string[];
}

export const EmailDrafter: React.FC<EmailDrafterProps> = ({ session, onSaveArtifact }) => {
  const [recipient, setRecipient] = useState('Executive / Executive Team');
  const [senderPersona, setSenderPersona] = useState('Professional & Concise');
  const [tone, setTone] = useState('Persuasive & Professional');
  const [objective, setObjective] = useState('');
  const [includeCta, setIncludeCta] = useState(true);
  const [useSessionData, setUseSessionData] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedText, setCopiedText] = useState<'subject' | 'body' | 'full' | null>(null);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      const prompt = `Act as an expert Communications Director and Professional Copywriter.
Draft a highly polished email pitch, briefing, or message based on the provided ${selectedItems.length > 0 ? 'source materials' : 'specifications'}.

EMAIL SPECIFICATIONS:
- Recipient Profile: ${recipient}
- Sender Persona Style: ${senderPersona}
- Conversational Tone: ${tone}
- Email Objective/Context: ${objective || 'Synthesize core insights from sources into a clear overview.'}
- Include Call-to-Action (CTA): ${includeCta ? 'Yes, formulate a single high-impact call to action' : 'No'}

OUTPUT FORMAT REQUIREMENTS:
You MUST output the email data as a structured JSON object wrapped inside a codeblock.
The object must follow this strict TypeScript structure:
{
  "subject": "Clear, high-conversion subject line with active verb",
  "body": "The email draft. Use professional spacing, bulleted structure if relevant, greeting, and sign-off. Use brackets like [Your Name] or [Insert Date] for custom input placeholders.",
  "alternatives": [
    "Alternative Subject Line 1 (Curiosity-driven)",
    "Alternative Subject Line 2 (Direct & Short)",
    "Alternative Subject Line 3 (Benefit-driven)"
  ]
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Extract JSON
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\{([\s\S]*?)\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsedData = JSON.parse(jsonString.trim());

      if (parsedData && parsedData.subject && parsedData.body) {
        setResult(parsedData);
      } else {
        throw new Error("Parsed data was not structured correctly.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to compile email drafts in a structured format. Please write more details in the objective or try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, type: 'subject' | 'body' | 'full') => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    
    let text = `SUBJECT: ${result.subject}\n\n`;
    text += `BODY:\n${result.body}\n\n`;
    text += `=========================================\n`;
    text += `ALTERNATIVE SUBJECTS:\n`;
    result.alternatives.forEach((alt, idx) => {
      text += `- ${alt}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-draft-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToSession = () => {
    if (!result || !onSaveArtifact) return;

    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Email Draft</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 2rem; }
        .email-composer { background: #111827; border: 1px solid #374151; border-radius: 12px; overflow: hidden; }
        .composer-header { background: #1f2937; padding: 1rem; border-bottom: 1px solid #374151; }
        .composer-body { padding: 1.5rem; line-height: 1.6; }
        h1 { font-size: 1.75rem; color: #06b6d4; font-weight: 800; margin-bottom: 1.5rem; }
    </style>
</head>
<body>
    <div class="max-w-3xl mx-auto">
        <h1>📨 Email Drafter Output</h1>
        
        <div class="email-composer shadow-2xl">
            <div class="composer-header space-y-2 text-sm text-gray-300">
                <div><span class="text-gray-500 font-semibold">Recipient:</span> ${recipient}</div>
                <div><span class="text-gray-500 font-semibold">Tone:</span> ${tone}</div>
                <div class="border-t border-gray-700/55 pt-2"><span class="text-gray-400 font-bold">Subject:</span> ${result.subject}</div>
            </div>
            
            <div class="composer-body text-gray-200 whitespace-pre-wrap">${result.body}</div>
        </div>

        <div class="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <h3 class="text-sm font-bold text-gray-400 mb-2">Subject Alternatives</h3>
            <ul class="list-disc pl-5 text-xs text-gray-300 space-y-1.5">
                ${result.alternatives.map(alt => `<li>${alt}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));
    
    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `Email: ${result.subject.slice(0, 25)}`,
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
          <h2 className="text-2xl font-bold flex items-center gap-2 text-cyan-400">
            <Mail className="w-6 h-6" /> Email Drafter
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Formulate high-impact professional, friendly, or sales emails backed directly by your source context.
          </p>
        </div>
        
        <div className="flex gap-2">
          {result && (
            <>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download TXT
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved to Session!' : 'Save Email Draft'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Input Configuration */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Dispatch Blueprint
            </h3>

            {/* Source items count */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim space-y-2">
              <div className="flex items-center justify-between">
                <strong>Knowledge base:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-cyan-500 bg-app-input border-app-border rounded focus:ring-cyan-500 focus:ring-2"
                />
              </div>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Using' : 'Ignoring'} ${selectedItemsCount} selected reference(s) from active session.`
                  : '⚠️ No source materials selected. Drafting general placeholder email.'}
              </p>
            </div>

            {/* Recipient Profile */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Target Recipient</label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-cyan-500"
              >
                <option value="Executive / Board of Directors">Executive / Board of Directors (Formal, ROI-focused)</option>
                <option value="Cold Sales Prospect">Cold Outreach Lead (Short, Hook-driven, Value-first)</option>
                <option value="Internal Engineering/Product Team">Internal Product/Engineering Team (Technical, Practical)</option>
                <option value="Casual Subscriber / Community member">Casual Community / Newsletter Member (Warm, Accessible)</option>
                <option value="Aggressive Venture capitalist / VC">SaaS Venture Capitalist / VC Pitch (Aggressive, Huge TAM)</option>
              </select>
            </div>

            {/* Sender Style */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Sender Style / Persona</label>
              <select
                value={senderPersona}
                onChange={(e) => setSenderPersona(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-cyan-500"
              >
                <option value="Professional & Concise">Professional & Highly Concise</option>
                <option value="Thought Leader & Visionary">Thought Leader / Expert Educator</option>
                <option value="Friendly Project Coordinator">Collaborative Team Coordinator</option>
                <option value="Witty & Bold Copywriter">Creative & Playful Copywriter</option>
              </select>
            </div>

            {/* Email Tone */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Communication Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-cyan-500"
              >
                <option value="Persuasive & Professional">Persuasive, authoritative & value-first</option>
                <option value="Direct, Urgent & Bulleted">Urgent, action-oriented & direct</option>
                <option value="Friendly, Warm & Conversational">Friendly, personal & conversational</option>
                <option value="Diplomatic & Accountable">Diplomatic, structural & troubleshooting</option>
              </select>
            </div>

            {/* Email Objective */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Email Goal / Call-To-Action context</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                placeholder="e.g. Schedule a 10-minute demo, or explain why we are changing our API rate limits based on sources..."
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* CTA Option */}
            <div className="flex items-center justify-between bg-app-bg p-3 rounded border border-app-border">
              <span className="text-xs text-app-text">Assertive Call to Action (CTA)</span>
              <button
                type="button"
                onClick={() => setIncludeCta(!includeCta)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  includeCta ? 'bg-cyan-500' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    includeCta ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Run Button */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-850/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Formulating Draft...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate Email Drafts
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Preview Workbench */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[450px]">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
                <Mail className="w-5 h-5 text-cyan-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Drafting Communications...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Combining selected source materials and framing them with the chosen professional persona.
              </p>
            </div>
          )}

          {error && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-red-500/40 mb-3" />
              <p className="text-sm font-bold text-red-400">Compilation Error</p>
              <p className="text-xs text-app-dim max-w-md mt-1 mb-4">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-app-bg border border-app-border rounded text-xs font-semibold hover:bg-app-input text-app-text"
              >
                Retry
              </button>
            </div>
          )}

          {!isProcessing && !error && !result && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center text-app-dim">
              <Mail className="w-12 h-12 text-cyan-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Email Interactive Composer</p>
              <p className="text-xs max-w-sm mt-1">
                Customize the recipe on the left and click Generate to spawn your subject line alternative matrices and email mock-ups.
              </p>
            </div>
          )}

          {!isProcessing && result && (
            <div className="flex-1 space-y-6">
              {/* Email Mockup */}
              <div className="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-xl">
                {/* Header Mockup */}
                <div className="bg-app-bg p-4 border-b border-app-border space-y-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-app-dim w-12">To:</span>
                    <span className="font-semibold bg-app-input px-2 py-0.5 rounded border border-app-border text-app-text">
                      {recipient.split('(')[0]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-app-border/40 pt-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-app-dim w-12 font-bold text-cyan-400">Subject:</span>
                      <span className="font-semibold text-app-text text-sm truncate">{result.subject}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(result.subject, 'subject')}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 shrink-0 ml-4 font-semibold"
                    >
                      {copiedText === 'subject' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      Copy Subject
                    </button>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-6 text-sm text-app-text whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto font-sans">
                  {result.body}
                </div>

                {/* Copy Bar */}
                <div className="p-3 bg-app-bg border-t border-app-border flex justify-end gap-2">
                  <button
                    onClick={() => handleCopy(result.body, 'body')}
                    className="px-3 py-1.5 bg-app-card border border-app-border rounded text-xs font-semibold hover:bg-app-input text-app-text flex items-center gap-1"
                  >
                    {copiedText === 'body' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Body Text
                  </button>
                  <button
                    onClick={() => handleCopy(`Subject: ${result.subject}\n\n${result.body}`, 'full')}
                    className="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded text-xs font-bold hover:bg-cyan-600 hover:text-white flex items-center gap-1"
                  >
                    {copiedText === 'full' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Entire Email
                  </button>
                </div>
              </div>

              {/* Subject Alternative list */}
              {result.alternatives && result.alternatives.length > 0 && (
                <div className="p-4 bg-app-card border border-app-border rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Alternative Subject Line Angles
                  </h4>
                  <div className="space-y-2">
                    {result.alternatives.map((alt, index) => (
                      <div key={index} className="flex justify-between items-center p-2.5 bg-app-bg rounded border border-app-border hover:border-cyan-500/30 transition-all text-xs">
                        <span className="text-app-text italic">{alt}</span>
                        <button
                          onClick={() => {
                            setResult({ ...result, subject: alt });
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 ml-2"
                        >
                          <RefreshCw className="w-3 h-3" /> Use this
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
