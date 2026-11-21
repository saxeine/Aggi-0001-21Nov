/**
 * MAGGI ingest — turns anything the aggregator holds into clean text.
 *
 * Sources supported:
 *  - base64 text / sql / html / document items (existing MediaItem format)
 *  - base64 PDFs            → server-side pdf-parse (text layer aware)
 *  - base64 DOCX            → mammoth raw text (server-side)
 *  - remote URLs / links    → server-side fetch + readability-lite HTML→text
 *  - plain pasted notes
 *
 * Everything funnels into ExtractedText so the chunker has one contract.
 */

import { ExtractedText } from './types';

export interface IngestSource {
  id?: string;
  name: string;
  /** 'text' | 'pdf' | 'link' | 'document' | 'html' | 'sql' | ... */
  type: string;
  mimeType?: string;
  /** base64 payload OR a URL for type === 'link'. */
  data: string;
}

const decodeBase64Utf8 = (b64: string): string => {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
};

/** Very small HTML→text: keeps headings as markdown and drops chrome. */
export const htmlToText = (html: string): { text: string; title?: string } => {
  let working = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : undefined;

  // Preserve headings
  working = working
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl, inner) => {
      return `\n\n${'#'.repeat(Number(lvl))} ${decodeEntities(stripTags(inner)).trim()}\n\n`;
    })
    .replace(/<(li)\b[^>]*>/gi, '\n- ')
    .replace(/<\/(li)>/gi, '')
    .replace(/<(p|div|section|article|br|tr)\b[^>]*>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, '');

  const text = decodeEntities(working)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text, title };
};

const stripTags = (s: string) => s.replace(/<[^>]+>/g, ' ');

const decodeEntities = (s: string): string =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCharCode(parseInt(code, 16)));

/**
 * Extract text from one source. Binary formats that need a real parser are
 * delegated to `/api/maggi/extract` (pdf-parse / mammoth live server-side).
 */
export const extractFromSource = async (source: IngestSource): Promise<ExtractedText> => {
  const type = (source.type || '').toLowerCase();
  const mime = (source.mimeType || '').toLowerCase();
  const warnings: string[] = [];

  // --- URL / link ---
  if (type === 'link' || /^https?:\/\//i.test(source.data)) {
    try {
      const res = await fetch('/api/maggi/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'url', url: source.data, name: source.name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text?.trim()) {
          return { text: data.text, title: data.title || source.name, warnings: data.warnings };
        }
      }
      warnings.push('Server-side fetch failed; stored the URL only.');
    } catch {
      warnings.push('Server-side fetch failed; stored the URL only.');
    }
    // Fallback: index the URL + title so it's at least discoverable.
    return { text: `${source.name}\n${source.data}`, title: source.name, warnings };
  }

  // --- PDF ---
  const isPdf = type === 'pdf' || mime.includes('pdf') || source.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    try {
      const res = await fetch('/api/maggi/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'pdf', data: source.data, name: source.name }),
      });
      const data = await res.json();
      if (res.ok && data.text?.trim()) {
        return { text: data.text, title: source.name, warnings: data.warnings };
      }
      warnings.push(data.error || 'PDF text extraction returned nothing (scanned PDF?).');
    } catch (e) {
      warnings.push(`PDF extraction failed: ${(e as Error).message}`);
    }
    return { text: '', title: source.name, warnings };
  }

  // --- DOCX / office ---
  const isDocx = /\.docx$/i.test(source.name) || mime.includes('officedocument.wordprocessingml');
  if (isDocx) {
    try {
      const res = await fetch('/api/maggi/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'docx', data: source.data, name: source.name }),
      });
      const data = await res.json();
      if (res.ok && data.text?.trim()) return { text: data.text, title: source.name, warnings: data.warnings };
      warnings.push(data.error || 'DOCX extraction returned nothing.');
    } catch (e) {
      warnings.push(`DOCX extraction failed: ${(e as Error).message}`);
    }
    return { text: '', title: source.name, warnings };
  }

  // --- HTML ---
  const looksHtml = type === 'html' || mime.includes('html') || /<\/?(html|body|div|p)\b/i.test(decodeBase64Utf8(source.data).slice(0, 400));
  if (looksHtml) {
    const raw = decodeBase64Utf8(source.data);
    const { text, title } = htmlToText(raw);
    return { text, title: title || source.name, warnings };
  }

  // --- Plain text family ---
  const text = decodeBase64Utf8(source.data) || source.data;
  return { text, title: source.name, warnings };
};
