/**
 * Pure podcast-script → HTML renderers (extracted from App.tsx).
 */
import type { VoiceSettings } from '../types';

export interface PodcastHtmlOptions {
  script: string;
  voiceSettings: VoiceSettings;
  audioBase64: string | null;
  audioNoticeHtml?: string; // pre-built sticky notice block (e.g. ⚠️ banner)
  audioPlayerHtml?: string; // pre-built sticky audio player block
}

/** Builds per-line color-coded HTML for a podcast script. */
export function buildScriptLinesHtml(script: string, voiceSettings: VoiceSettings): string {
  const lines = script.split('\n');
  let htmlOutput = '<div style="max-width: 800px; margin: 0 auto;">';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let style = 'padding: 16px; margin-bottom: 16px; border-radius: 12px; color: #e2e8f0; line-height: 1.6; font-size: 16px;';

    if (trimmed.includes(`**${voiceSettings.hostLabel}:**`) || trimmed.startsWith('**Host:**') || trimmed.startsWith(`${voiceSettings.hostLabel}:`) || trimmed.startsWith('Host:')) {
      style += ' background-color: rgba(168, 85, 247, 0.1); border-left: 4px solid #a855f7; box-shadow: 0 2px 10px rgba(168, 85, 247, 0.05);';
    } else if (trimmed.includes(`**${voiceSettings.expertLabel}:**`) || trimmed.startsWith('**Expert:**') || trimmed.startsWith(`${voiceSettings.expertLabel}:`) || trimmed.startsWith('Expert:')) {
      style += ' background-color: rgba(6, 182, 212, 0.1); border-left: 4px solid #06b6d4; box-shadow: 0 2px 10px rgba(6, 182, 212, 0.05);';
    } else if (trimmed.includes(`**${voiceSettings.guestLabel}:**`) || trimmed.startsWith('**Guest:**') || trimmed.startsWith(`${voiceSettings.guestLabel}:`) || trimmed.startsWith('Guest:')) {
      style += ' background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.05);';
    } else {
      style += ' background-color: rgba(30, 41, 59, 0.5); border-left: 4px solid #475569;';
    }

    const content = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; font-weight: 700;">$1</strong>');
    htmlOutput += `<div style="${style}">${content}</div>`;
  });

  htmlOutput += '</div>';
  return htmlOutput;
}

export function buildAudioPlayerHtml(audioBase64: string | null): string {
  if (!audioBase64) return '';
  return `
                <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #333; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <h3 style="color: #fff; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Audio Overview</h3>
                    <audio controls style="width: 100%;" src="data:audio/wav;base64,${audioBase64}"></audio>
                </div>`;
}

export function buildAudioNoticeHtml(audioNote: string | null): string {
  if (!audioNote) return '';
  return `
                <div style="background: #1f2937; border: 1px solid #f59e0b; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #fbbf24; font-size: 18px;">⚠️</span>
                        <p style="color: #fbbf24; margin: 0; font-size: 13px; line-height: 1.5;">${audioNote}</p>
                    </div>
                </div>`;
}

export function buildPodcastDocumentHtml({
  script,
  voiceSettings,
  audioBase64,
  audioNoticeHtml,
  audioPlayerHtml,
}: PodcastHtmlOptions): string {
  const linesHtml = buildScriptLinesHtml(script, voiceSettings);
  const player = audioPlayerHtml !== undefined ? audioPlayerHtml : buildAudioPlayerHtml(audioBase64);
  const notice = audioNoticeHtml !== undefined ? audioNoticeHtml : buildAudioNoticeHtml(null);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Podcast Script</title><style>body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px 20px; background-color: #0f172a; color: #e2e8f0; } ::selection { background: rgba(168, 85, 247, 0.3); }</style></head><body>${notice}${player}${linesHtml}</body></html>`;
}

/** Short HTML preview for generation failures (quota vs error). */
export function buildErrorHtml(msg: string): string {
  const isQuota = /quota|429|resource_exhausted/i.test(msg);
  const safeMsg = msg
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Generation Notice</title>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #0b0f17; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { max-width: 560px; width: 100%; background: #141a26; border: 1px solid ${isQuota ? '#f59e0b55' : '#ef444455'}; border-radius: 14px; padding: 22px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: 3px 8px; border-radius: 6px; background: ${isQuota ? '#f59e0b22' : '#ef444422'}; color: ${isQuota ? '#fbbf24' : '#f87171'}; margin-bottom: 10px; }
    h2 { margin: 0 0 8px; font-size: 17px; color: #f8fafc; }
    p { margin: 0 0 12px; font-size: 13px; line-height: 1.55; color: #cbd5e1; }
    ul { margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.65; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isQuota ? 'API Quota Limit' : 'Generation Error'}</div>
    <h2>${isQuota ? 'Gemini API Quota Exceeded (429)' : 'Could Not Generate Tool Output'}</h2>
    <p>${safeMsg}</p>
    <ul>
      <li>Open <b>Settings → AI Engine</b> and switch to <b>MAGGI</b> (FreeLLMAPI key pool), <b>Ollama</b>, or <b>Custom AI</b>.</li>
      <li>Or wait a minute and retry, or select a billing-enabled API key in <b>Settings → Secrets</b>.</li>
    </ul>
  </div>
</body>
</html>`;
}
