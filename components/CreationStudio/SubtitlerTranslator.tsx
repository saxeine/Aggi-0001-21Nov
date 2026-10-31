import React, { useState, useRef } from 'react';
import { Video, Languages, Loader2, Download, Copy, Play } from 'lucide-react';
import { themeStyles } from '../../constants/creativeStudioTheme';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface SubtitlerTranslatorProps {
  onBack?: () => void;
  localTheme: string;
}

export const SubtitlerTranslator: React.FC<SubtitlerTranslatorProps> = ({ onBack, localTheme }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoBase64, setVideoBase64] = useState<string>('');
  const [languages, setLanguages] = useState<string>('English, Spanish, French');
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtitles, setSubtitles] = useState<{ language: string; srt: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const st = themeStyles[localTheme as keyof typeof themeStyles] || themeStyles.charcoal;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setVideoBase64(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessVideo = async () => {
    if (!videoBase64 || !languages.trim()) return;
    setIsProcessing(true);
    setSubtitles([]);
    try {
      const mediaItem: MediaItem = {
        id: 'upload-video',
        name: videoFile?.name || 'video',
        mimeType: videoFile?.type || 'video/mp4',
        data: videoBase64,
        type: 'video'
      };

      const langList = languages.split(',').map(l => l.trim()).filter(l => l);

      const prompt = `You are a professional video subtitler. Extract the spoken audio from this video and generate exact subtitles in standard SRT format. 
Please provide the translation in the following languages: ${langList.join(', ')}.

Format your response EXACTLY as a JSON array of objects. Each object must have a "language" key and an "srt" key containing the complete SRT format string. Do not include markdown codeblocks like \`\`\`json, just return the raw JSON array.`;

      const response = await generateUnifiedAIResponse(prompt, [mediaItem]);
      
      let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        setSubtitles(parsed);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to process video subtitles. Make sure the video is supported and the response is valid JSON.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSRT = (language: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subtitles_${language.toLowerCase()}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in relative z-10 w-full">
      <div className={`p-4 sm:p-8 flex-1 overflow-y-auto ${st.bgApp}`}>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center space-x-4 mb-8">
            <div className={`p-3 rounded-xl ${st.cardBg} border ${st.border}`}>
              <Languages className={`w-6 h-6 ${st.text}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${st.text}`}>Subtitler & Translator</h1>
              <p className={st.textDim}>Extract audio from video and instantly translate it into multiple standard SRT subtitle files.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className={`block text-sm font-medium ${st.text}`}>Upload Video File</label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${st.border} hover:bg-black/20`}
              >
                {videoFile ? (
                   <div className="text-center">
                     <Video className={`w-12 h-12 mx-auto mb-2 ${st.textActive}`} />
                     <p className={`font-medium ${st.text}`}>{videoFile.name}</p>
                     <p className={`text-xs ${st.textDim}`}>Click to replace video</p>
                   </div>
                ) : (
                   <div className={`text-center ${st.textDim}`}>
                     <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                     <p>Click to upload a video</p>
                     <p className="text-xs">Supports MP4, WebM (max size dependent on API)</p>
                   </div>
                )}
                <input 
                  type="file" 
                  accept="video/mp4,video/webm"
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
              </div>

              <label className={`block text-sm font-medium ${st.text} mt-4`}>Target Languages (comma separated)</label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="e.g. English, Spanish, Japanese"
                className={`w-full bg-black/40 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${st.border} ${st.text} ${st.focusRing}`}
              />
              
              <button
                onClick={handleProcessVideo}
                disabled={!videoFile || !languages.trim() || isProcessing}
                className={`w-full py-3 rounded-xl flex items-center justify-center space-x-2 transition-all mt-4 ${isProcessing || !videoFile || !languages.trim() ? 'opacity-50 cursor-not-allowed' : st.btnActive}`}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                <span>{isProcessing ? 'Extracting & Translating...' : 'Generate SRT Subtitles'}</span>
              </button>
            </div>

            <div className="space-y-4">
              <label className={`block text-sm font-medium ${st.text}`}>Generated SRT Files</label>
              <div className={`w-full h-[500px] bg-black/40 border rounded-xl p-4 overflow-y-auto ${st.border} custom-scrollbar`}>
                {subtitles.length === 0 ? (
                  <div className={`h-full flex flex-col items-center justify-center ${st.textDim} text-center p-8`}>
                    <Languages className="w-12 h-12 mb-4 opacity-20" />
                    <p>Generated subtitles will appear here. You can preview and download them individually.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {subtitles.map((sub, idx) => (
                      <div key={idx} className={`rounded-xl border overflow-hidden ${st.cardBg} ${st.border}`}>
                        <div className={`px-4 py-3 border-b flex items-center justify-between bg-black/20 ${st.border}`}>
                          <h4 className={`font-semibold ${st.text}`}>{sub.language} Subtitles</h4>
                          <div className="flex items-center space-x-2">
                             <button 
                               onClick={() => navigator.clipboard.writeText(sub.srt)}
                               className={`p-1.5 rounded-lg border hover:bg-black/20 transition-colors ${st.border} ${st.text}`}
                               title="Copy SRT"
                             >
                               <Copy className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => downloadSRT(sub.language, sub.srt)}
                               className={`p-1.5 rounded-lg border hover:bg-black/20 transition-colors ${st.border} ${st.text}`}
                               title="Download SRT File"
                             >
                               <Download className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                        <pre className={`p-4 text-xs font-mono overflow-y-auto max-h-64 ${st.textDim} custom-scrollbar`}>
                          {sub.srt}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
