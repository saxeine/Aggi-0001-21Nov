import { describe, it, expect } from 'vitest';
import {
  computePodcastGate,
  requiredRolesFor,
  type PodcastRole,
  type PodcastFormatId,
} from '../utils/podcastGating';

describe('requiredRolesFor', () => {
  it('Solo needs only the host', () => {
    expect(requiredRolesFor('podcast_1')).toEqual(['host']);
  });
  it('Duo needs host and expert', () => {
    expect(requiredRolesFor('podcast_2')).toEqual(['host', 'expert']);
  });
  it('Roundtable needs host, expert and guest', () => {
    expect(requiredRolesFor('podcast_3')).toEqual(['host', 'expert', 'guest']);
  });
});

describe('computePodcastGate', () => {
  it('blocks generation until the host is configured', () => {
    const gate = computePodcastGate({
      touchedRoles: [],
      activeFormat: 'podcast_1',
      contentReady: true,
      isLoading: false,
    });
    expect(gate.hostConfigured).toBe(false);
    expect(gate.canGenerate).toBe(false);
    expect(gate.gateHint).toBe('configure');
  });

  it('blocks generation until a format is picked', () => {
    const gate = computePodcastGate({
      touchedRoles: ['host'],
      activeFormat: null,
      contentReady: true,
      isLoading: false,
    });
    expect(gate.canGenerate).toBe(false);
    expect(gate.gateHint).toBe('pickFormat');
  });

  it('blocks generation until content is ready', () => {
    const gate = computePodcastGate({
      touchedRoles: ['host'],
      activeFormat: 'podcast_1',
      contentReady: false,
      isLoading: false,
    });
    expect(gate.canGenerate).toBe(false);
    expect(gate.gateHint).toBe('content');
  });

  it('blocks generation while loading', () => {
    const gate = computePodcastGate({
      touchedRoles: ['host'],
      activeFormat: 'podcast_1',
      contentReady: true,
      isLoading: true,
    });
    expect(gate.canGenerate).toBe(false);
    expect(gate.gateHint).toBe('');
  });

  it('allows generation when gated correctly', () => {
    const gate = computePodcastGate({
      touchedRoles: ['host'],
      activeFormat: 'podcast_1',
      contentReady: true,
      isLoading: false,
    });
    expect(gate.canGenerate).toBe(true);
    expect(gate.hostOnly).toBe(false);
    expect(gate.speakerCount).toBe(1);
    expect(gate.gateHint).toBe('');
  });

  it('uses ONLY the host (position one) when more than one speaker is configured, even for Duo/Roundtable', () => {
    for (const format of ['podcast_1', 'podcast_2', 'podcast_3'] as PodcastFormatId[]) {
      const gate = computePodcastGate({
        touchedRoles: ['host', 'expert'],
        activeFormat: format,
        contentReady: true,
        isLoading: false,
      });
      expect(gate.multipleConfigured).toBe(true);
      expect(gate.hostOnly).toBe(true);
      expect(gate.speakerCount).toBe(1);
      expect(gate.canGenerate).toBe(true);
    }
  });

  it('is host-only when a format needs a speaker that is not configured', () => {
    const gate = computePodcastGate({
      touchedRoles: ['host'] as PodcastRole[],
      activeFormat: 'podcast_2',
      contentReady: true,
      isLoading: false,
    });
    expect(gate.missingRoles).toEqual(['expert']);
    expect(gate.hostOnly).toBe(true);
    expect(gate.speakerCount).toBe(1);
    expect(gate.canGenerate).toBe(true);
  });

  it('honours Duo only when host+expert are configured and only host is configured *for the report* — otherwise host-only', () => {
    // Two speakers configured -> report is host-only per spec.
    const duo = computePodcastGate({
      touchedRoles: ['host', 'expert'],
      activeFormat: 'podcast_2',
      contentReady: true,
      isLoading: false,
    });
    expect(duo.hostOnly).toBe(true);
    expect(duo.speakerCount).toBe(1);
  });

  it('handles no roles configured', () => {
    const gate = computePodcastGate({
      touchedRoles: [],
      activeFormat: null,
      contentReady: false,
      isLoading: false,
    });
    expect(gate.hostConfigured).toBe(false);
    expect(gate.canGenerate).toBe(false);
    expect(gate.configuredRoles).toEqual([]);
  });
});
