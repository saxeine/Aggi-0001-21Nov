/**
 * Pure podcast-gating logic shared by the creator (and unit-tested).
 *
 * Semantics (from the single report dialog spec):
 *  - No podcast is produced before the cast is configured or the user presses "Use Default".
 *  - Format is picked LAST, after the cast gate is satisfied.
 *  - If more than one speaker is configured and report is pressed, only the
 *    speaker in position one (host) is used.
 *
 * A format whose required speakers are NOT configured honestly falls back to a
 * host-only report (it cannot conjure unconfigured speakers).
 */

export type PodcastFormatId = 'podcast_1' | 'podcast_2' | 'podcast_3';
export type PodcastRole = 'host' | 'expert' | 'guest';

export const ALL_ROLES: PodcastRole[] = ['host', 'expert', 'guest'];

/** Speakers required by a format. Solo needs only the host. */
export function requiredRolesFor(format: PodcastFormatId): PodcastRole[] {
  if (format === 'podcast_2') return ['host', 'expert'];
  if (format === 'podcast_3') return ['host', 'expert', 'guest'];
  return ['host'];
}

export interface PodcastGateInput {
  touchedRoles: PodcastRole[];
  activeFormat: PodcastFormatId | null;
  contentReady: boolean;
  isLoading: boolean;
}

export interface PodcastGateResult {
  /** Host configured (or "Use Default" pressed). */
  hostConfigured: boolean;
  /** More than one speaker configured. */
  multipleConfigured: boolean;
  /** Configured roles (subset of ALL_ROLES). */
  configuredRoles: PodcastRole[];
  /** Required roles minus configured roles. */
  missingRoles: PodcastRole[];
  /** Only position one (host) will be used. */
  hostOnly: boolean;
  /** Speaker count for audio/script generation. */
  speakerCount: 1 | 2 | 3;
  /** Generate is allowed. */
  canGenerate: boolean;
  /** Why generate is disabled / what step is missing. */
  gateHint: 'configure' | 'pickFormat' | 'content' | '';
}

export function computePodcastGate({ touchedRoles, activeFormat, contentReady, isLoading }: PodcastGateInput): PodcastGateResult {
  const configuredRoles = ALL_ROLES.filter(r => touchedRoles.includes(r));
  const hostConfigured = touchedRoles.includes('host');
  const multipleConfigured = configuredRoles.length > 1;

  const requiredRoles = activeFormat ? requiredRolesFor(activeFormat) : ['host'] as PodcastRole[];
  const missingRoles = requiredRoles.filter(r => !configuredRoles.includes(r));
  const hostOnly = multipleConfigured || missingRoles.length > 0;

  const canGenerate = hostConfigured && activeFormat !== null && contentReady && !isLoading;

  const gateHint = !hostConfigured
    ? 'configure'
    : !activeFormat
      ? 'pickFormat'
      : !contentReady
        ? 'content'
        : '';

  const baseCount = activeFormat === 'podcast_2' ? 2 : activeFormat === 'podcast_3' ? 3 : 1;

  return {
    hostConfigured,
    multipleConfigured,
    configuredRoles,
    missingRoles,
    hostOnly,
    speakerCount: hostOnly ? 1 : baseCount as 1 | 2 | 3,
    canGenerate,
    gateHint,
  };
}
