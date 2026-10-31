import type { MediaOption } from '../types';

export interface SessionLike {
  mediaItems?: Array<{
    id: string;
    name: string;
    mimeType: string;
    data: string;
    type: string;
  }>;
}

export function mediaItemUrl(item: { mimeType?: string; data: string }): string {
  const data = item.data || '';
  if (data.startsWith('data:') || data.startsWith('blob:') || /^https?:\/\//.test(data)) {
    return data;
  }
  const mime = item.mimeType || 'image/jpeg';
  return `data:${mime};base64,${data}`;
}

export function collectMediaOptions(session: SessionLike | null | undefined): {
  images: MediaOption[];
  audio: MediaOption[];
} {
  const images: MediaOption[] = [];
  const audio: MediaOption[] = [];
  const items = session?.mediaItems || [];
  items.forEach((item) => {
    const isImage = item.type === 'image' || item.mimeType?.startsWith('image/');
    const isAudio = item.type === 'audio' || item.mimeType?.startsWith('audio/');
    if (isImage) {
      images.push({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType || 'image/jpeg',
        url: mediaItemUrl(item),
      });
    } else if (isAudio) {
      audio.push({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType || 'audio/mpeg',
        url: mediaItemUrl(item),
      });
    }
  });
  return { images, audio };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function slugify(input: string): string {
  return (
    (input || 'anicomposer')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'anicomposer'
  );
}

/** Rough byte size of a data URL payload, used for storage warnings. */
export function dataUrlBytes(dataUrl: string | null | undefined): number {
  if (!dataUrl) return 0;
  return Math.round((dataUrl.length * 3) / 4);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Convert a remote URL into a data URL so exports stay canvas-safe. */
export async function urlToDataUrl(url: string): Promise<{ url: string; warning?: string }> {
  if (url.startsWith('data:')) return { url };
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return { url: await fileToDataUrl(new File([blob], 'remote', { type: blob.type || 'image/png' })) };
  } catch (error) {
    return {
      url,
      warning:
        'Remote URL could not be embedded (CORS). The preview works, but exports may fail for this plate.',
    };
  }
}
