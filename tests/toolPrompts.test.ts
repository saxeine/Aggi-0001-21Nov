import { describe, it, expect } from 'vitest';
import { buildToolPrompt } from '../utils/toolPrompts';
import type { VoiceSettings } from '../types';

const voice: VoiceSettings = {
  host: 'Kore',
  hostLabel: 'Host Bot',
  hostBio: 'A friendly host.',
  hostAvatar: 'h',
  hostMemberId: 'h',
  expert: 'Zephyr',
  expertLabel: 'Expert Bot',
  expertBio: 'An expert voice.',
  expertAvatar: 'e',
  expertMemberId: 'e',
  guest: 'Puck',
  guestLabel: 'Guest Bot',
  guestBio: 'A curious guest.',
  guestAvatar: 'g',
  guestMemberId: 'g',
  length: 'Medium (3-5 min)',
  language: 'English',
};

describe('buildToolPrompt', () => {
  it('default text_summarizer prompt mentions summarizing and HTML', () => {
    const { prompt, isPodcast } = buildToolPrompt('text_summarizer', {}, voice);
    expect(isPodcast).toBe(false);
    expect(prompt).toContain('comprehensive summary');
    expect(prompt).toContain('HTML');
  });

  it('text_summarizer translate uses the requested language', () => {
    const { prompt } = buildToolPrompt('text_summarizer', { action: 'translate', lang: 'Swedish' }, voice);
    expect(prompt).toContain('Translate the provided text into Swedish');
  });

  it('podcast_1 prompt is single-host (no expert/guest)', () => {
    const { prompt, isPodcast } = buildToolPrompt('podcast_1', {}, voice);
    expect(isPodcast).toBe(true);
    expect(prompt).toContain('Single-Host Podcast');
    expect(prompt).toContain('Host Bot');
    expect(prompt).not.toContain('Expert Bot');
    expect(prompt).not.toContain('Guest Bot');
  });

  it('podcast_2 prompt includes host and expert, not guest', () => {
    const { prompt, isPodcast } = buildToolPrompt('podcast_2', {}, voice);
    expect(isPodcast).toBe(true);
    expect(prompt).toContain('2-person Podcast');
    expect(prompt).toContain('Host Bot');
    expect(prompt).toContain('Expert Bot');
    expect(prompt).not.toContain('Guest Bot');
  });

  it('podcast_3 prompt includes all three speakers', () => {
    const { prompt } = buildToolPrompt('podcast_3', {}, voice);
    expect(prompt).toContain('Roundtable');
    expect(prompt).toContain('Host Bot');
    expect(prompt).toContain('Expert Bot');
    expect(prompt).toContain('Guest Bot');
  });

  it('hostOnly overrides any podcast format to single-host regardless of the format', () => {
    for (const format of ['podcast_1', 'podcast_2', 'podcast_3']) {
      const { prompt, isPodcast } = buildToolPrompt(format, { hostOnly: true }, voice);
      expect(isPodcast).toBe(true);
      expect(prompt).toContain('Single-Host Podcast');
      expect(prompt).not.toContain('Expert Bot');
      expect(prompt).not.toContain('Guest Bot');
    }
  });

  it('uses payload.length override when provided for quick-regenerate length changes', () => {
    const { prompt } = buildToolPrompt('podcast_2', { length: 'Long (Deep Dive)' }, voice);
    expect(prompt).toContain('Long (Deep Dive)');
    const { prompt: hostOnlyPrompt } = buildToolPrompt('podcast_2', { hostOnly: true, length: 'Short (1-2 min)' }, voice);
    expect(hostOnlyPrompt).toContain('Single-Host Podcast');
    expect(hostOnlyPrompt).toContain('Short (1-2 min)');
  });

  it('podcast prompts end with a raw-markdown instruction', () => {
    const { prompt } = buildToolPrompt('podcast_1', {}, voice);
    expect(prompt).toContain('Return ONLY the raw Markdown');
    expect(prompt).toContain('LANGUAGE: English');
  });

  it('non-podcast prompts end with the raw-HTML instruction', () => {
    const { prompt, isPodcast } = buildToolPrompt('faq', {}, voice);
    expect(isPodcast).toBe(false);
    expect(prompt).toContain('Return ONLY the raw HTML');
  });

  it('prompt_builder embeds additional configuration params', () => {
    const { prompt } = buildToolPrompt('prompt_builder', { productType: 'SaaS', niche: 'AI' }, voice);
    expect(prompt).toContain('Product Type: SaaS');
    expect(prompt).toContain('Niche/Topic: AI');
  });

  it('content_builder embeds instruction in the prompt', () => {
    const { prompt } = buildToolPrompt('content_builder', { instruction: 'Make it dark' }, voice);
    expect(prompt).toContain('USER SPECIFIC INSTRUCTIONS:\nMake it dark');
  });

  it('unknown tool falls back to the generic instruction', () => {
    const { prompt } = buildToolPrompt('nonexistent_tool', {}, voice);
    expect(prompt).toContain('Analyze the content');
  });
});
