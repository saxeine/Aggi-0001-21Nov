import {
  GitHubApiError,
  MAX_FILE_BYTES,
  PublishFile,
  probeRepo,
  shouldSkipPath,
} from './githubPublish';

/**
 * repoMerger.ts
 * -----------------------------------------------------------------------------
 * Engine behind the "Repo Merger" view: read the file trees of TWO GitHub
 * repositories, let the user pick features/files from each, resolve path
 * conflicts, and produce the combined file list that is then pushed into a
 * single NEW named repository with the Git Data API (via publishFiles from
 * githubPublish.ts).
 *
 * Everything runs in the browser; the token is only ever sent to
 * api.github.com.
 */

const API_BASE = 'https://api.github.com';

/* -------------------------------------------------------------------------- */
/*                              http helper                                   */
/* -------------------------------------------------------------------------- */

async function gh<T>(
  token: string,
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      'Could not reach api.github.com from this browser. Check your connection, or a browser extension / proxy blocking GitHub requests.'
    );
  }

  const raw = await response.text();
  let data: any = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && (data.message as string)) || response.statusText;
    throw new GitHubApiError(response.status, message, data?.documentation_url);
  }
  return data as T;
}

/* -------------------------------------------------------------------------- */
/*                              reading a repo                                */
/* -------------------------------------------------------------------------- */

export interface TreeEntry {
  path: string;
  sha: string;
  size: number;
  type: 'blob' | 'tree';
}

export interface RepoSnapshot {
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
  branch: string;
  defaultBranch: string;
  isPrivate: boolean;
  description?: string;
  entries: TreeEntry[];
}

async function fetchTreeDeep(
  token: string,
  owner: string,
  repo: string,
  treeSha: string,
  prefix: string,
  out: TreeEntry[]
): Promise<void> {
  const data = await gh<any>(
    token,
    `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`
  );
  const subtrees: { sha: string; path: string }[] = [];
  for (const item of data?.tree || []) {
    const path: string = prefix ? `${prefix}/${item.path}` : item.path;
    if (item.type === 'tree') {
      if (data.truncated) {
        // Truncated response: walk this subtree explicitly to get every file.
        subtrees.push({ sha: item.sha, path });
      } else {
        out.push({ path, sha: item.sha, size: 0, type: 'tree' });
      }
    } else if (item.type === 'blob') {
      out.push({ path, sha: item.sha, size: item.size || 0, type: 'blob' });
    }
    // type === 'commit' is a submodule — skipped on purpose.
  }
  for (const st of subtrees) {
    await fetchTreeDeep(token, owner, repo, st.sha, st.path, out);
  }
}

/** Resolve a repo (+optional branch) and return its full recursive file tree. */
export async function fetchRepoSnapshot(
  token: string,
  owner: string,
  repo: string,
  branch?: string
): Promise<RepoSnapshot> {
  const info = await probeRepo(token, owner, repo);
  if (!info.exists) {
    throw new GitHubApiError(
      404,
      `Repository ${owner}/${repo} was not found (or the token cannot see it). Check the spelling and the token's access.`
    );
  }

  const meta = await gh<any>(token, `/repos/${owner}/${repo}`);
  const refName = branch || info.defaultBranch;

  let commitSha: string;
  try {
    const ref = await gh<any>(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(refName)}`
    );
    commitSha = ref?.object?.sha;
    if (!commitSha) throw new GitHubApiError(404, `Branch ${refName} has no commit.`);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 409) {
      throw new GitHubApiError(
        409,
        `Repository ${owner}/${repo} is empty — there is nothing to merge from it yet.`
      );
    }
    if (error instanceof GitHubApiError && error.status === 404) {
      throw new GitHubApiError(
        404,
        `Branch "${refName}" was not found in ${owner}/${repo}. Default branch is "${info.defaultBranch}".`
      );
    }
    throw error;
  }

  const commit = await gh<any>(token, `/repos/${owner}/${repo}/git/commits/${commitSha}`);
  const entries: TreeEntry[] = [];
  await fetchTreeDeep(token, owner, repo, commit?.tree?.sha, '', entries);

  return {
    owner,
    repo,
    fullName: meta?.full_name || `${owner}/${repo}`,
    htmlUrl: meta?.html_url || `https://github.com/${owner}/${repo}`,
    branch: refName,
    defaultBranch: info.defaultBranch,
    isPrivate: Boolean(meta?.private ?? info.isPrivate),
    description: meta?.description || undefined,
    entries,
  };
}

/* -------------------------------------------------------------------------- */
/*                            downloading files                               */
/* -------------------------------------------------------------------------- */

export interface SkippedFile {
  path: string;
  reason: string;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Download the content of the wanted blobs and return them keyed by path.
 * Files that are ignored or too large are reported in `skipped` instead.
 */
export async function fetchRepoFiles(
  token: string,
  owner: string,
  repo: string,
  wanted: TreeEntry[],
  onProgress?: (done: number, total: number, path: string) => void
): Promise<{ files: Map<string, PublishFile>; skipped: SkippedFile[] }> {
  const files = new Map<string, PublishFile>();
  const skipped: SkippedFile[] = [];
  const blobs = wanted.filter((e) => e.type === 'blob');
  const total = blobs.length;
  let done = 0;
  let cursor = 0;

  const runners = Array.from({ length: Math.min(6, Math.max(total, 1)) }, async () => {
    while (cursor < blobs.length) {
      const entry = blobs[cursor++];
      const skipReason =
        shouldSkipPath(entry.path, false) ||
        (entry.size > MAX_FILE_BYTES ? `larger than ${Math.round(MAX_FILE_BYTES / 1048576)} MB` : null);
      if (skipReason) {
        skipped.push({ path: entry.path, reason: skipReason });
      } else {
        try {
          const blob = await gh<any>(token, `/repos/${owner}/${repo}/git/blobs/${entry.sha}`);
          if (blob?.encoding !== 'base64' || typeof blob?.content !== 'string') {
            skipped.push({ path: entry.path, reason: 'unexpected blob encoding' });
          } else {
            files.set(entry.path, { path: entry.path, bytes: base64ToBytes(blob.content) });
          }
        } catch (error) {
          skipped.push({
            path: entry.path,
            reason: error instanceof Error ? error.message : 'download failed',
          });
        }
      }
      done += 1;
      onProgress?.(done, total, entry.path);
    }
  });
  await Promise.all(runners);

  return { files, skipped };
}

/* -------------------------------------------------------------------------- */
/*                            merge plan (pure)                               */
/* -------------------------------------------------------------------------- */

export type ConflictResolution = 'both' | 'a' | 'b' | 'skip';

export interface ConflictInfo {
  path: string;
  aSha: string;
  bSha: string;
}

/** Paths that exist in BOTH repos with different content. */
export function detectConflicts(a: TreeEntry[], b: TreeEntry[]): ConflictInfo[] {
  const mapA = new Map(a.filter((e) => e.type === 'blob').map((e) => [e.path, e]));
  const mapB = new Map(b.filter((e) => e.type === 'blob').map((e) => [e.path, e]));
  const conflicts: ConflictInfo[] = [];
  for (const [path, ea] of mapA) {
    const eb = mapB.get(path);
    if (eb && eb.sha !== ea.sha) {
      conflicts.push({ path, aSha: ea.sha, bSha: eb.sha });
    }
  }
  conflicts.sort((x, y) => x.path.localeCompare(y.path));
  return conflicts;
}

export interface PlannedItem {
  /** Path the file will have in the new repository. */
  path: string;
  /** Which source repo the content comes from. */
  source: 'A' | 'B';
  /** Path of the file inside the source repo. */
  sourcePath: string;
  conflict?: ConflictInfo;
}

export interface MergePlan {
  items: PlannedItem[];
  conflicts: ConflictInfo[];
  /** Conflicting paths where BOTH sides were selected (i.e. need a resolution). */
  activeConflicts: string[];
}

/** Sanitize a repo name so it can be used as a top-level folder name. */
export function folderNameForRepo(repoName: string): string {
  return repoName.replace(/[^A-Za-z0-9_.-]/g, '-') || 'repo';
}

/**
 * Compute the final file list for the new repository.
 *
 * - Files selected in only one repo keep their original path.
 * - Files with identical content in both repos are included once.
 * - Conflicting paths (same path, different content, selected on both sides)
 *   are resolved per `resolutions`:
 *     'both' → A lands at `<repoA>/<path>`, B at `<repoB>/<path>` (default)
 *     'a'    → only A's version, at the original path
 *     'b'    → only B's version, at the original path
 *     'skip' → dropped entirely
 */
export function planMerge(
  a: TreeEntry[],
  b: TreeEntry[],
  selectedA: ReadonlySet<string>,
  selectedB: ReadonlySet<string>,
  resolutions: Record<string, ConflictResolution>,
  repoAName: string,
  repoBName: string
): MergePlan {
  const blobsA = new Map(a.filter((e) => e.type === 'blob').map((e) => [e.path, e]));
  const blobsB = new Map(b.filter((e) => e.type === 'blob').map((e) => [e.path, e]));
  const conflicts = detectConflicts(a, b);
  const conflictByPath = new Map(conflicts.map((c) => [c.path, c]));

  const items: PlannedItem[] = [];
  const used = new Set<string>();
  const activeConflicts: string[] = [];

  const push = (path: string, source: 'A' | 'B', sourcePath: string, conflict?: ConflictInfo) => {
    if (used.has(path)) return; // safety: never emit the same target path twice
    used.add(path);
    items.push({ path, source, sourcePath, conflict });
  };

  for (const p of selectedA) {
    const ea = blobsA.get(p);
    if (!ea) continue;
    const eb = blobsB.get(p);
    const bothSelected = Boolean(eb && selectedB.has(p));
    if (bothSelected && eb!.sha !== ea.sha) {
      activeConflicts.push(p);
      const r = resolutions[p] ?? 'both';
      if (r === 'skip' || r === 'b') continue;
      push(r === 'both' ? `${repoAName}/${p}` : p, 'A', p, conflictByPath.get(p));
    } else {
      push(p, 'A', p);
    }
  }

  for (const p of selectedB) {
    const eb = blobsB.get(p);
    if (!eb) continue;
    const ea = blobsA.get(p);
    const bothSelected = Boolean(ea && selectedA.has(p));
    if (bothSelected) {
      if (ea!.sha === eb.sha) continue; // identical content — already added from A
      const r = resolutions[p] ?? 'both';
      if (r === 'skip' || r === 'a') continue;
      push(r === 'both' ? `${repoBName}/${p}` : p, 'B', p, conflictByPath.get(p));
    } else {
      push(p, 'B', p);
    }
  }

  items.sort((x, y) => x.path.localeCompare(y.path));
  return { items, conflicts, activeConflicts };
}

/* -------------------------------------------------------------------------- */
/*                              orgs (targets)                                */
/* -------------------------------------------------------------------------- */

export async function fetchUserOrgs(token: string): Promise<string[]> {
  try {
    const data = await gh<any[]>(token, '/user/orgs?per_page=100');
    return Array.isArray(data) ? data.map((o: any) => o.login).filter(Boolean) : [];
  } catch {
    return []; // orgs are a nicety — never fatal
  }
}
