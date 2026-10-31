import JSZip from 'jszip';

/**
 * githubPublish.ts
 * -----------------------------------------------------------------------------
 * Client-side GitHub publisher used by the Creative Studio "Click 2 GitHub" tool.
 *
 * Everything runs in the browser: the ZIP/folder is parsed locally and the files
 * are written to a repository with the GitHub Git Data API (blobs -> tree ->
 * commit -> ref). The access token is never sent anywhere except api.github.com.
 */

const API_BASE = 'https://api.github.com';

export const MAX_FILES = 3000;
export const MAX_FILE_BYTES = 40 * 1024 * 1024; // GitHub rejects blobs > 100 MB
export const MAX_TOTAL_BYTES = 900 * 1024 * 1024;

export interface PublishFile {
  path: string;
  bytes: Uint8Array;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface FileSet {
  files: PublishFile[];
  skipped: SkippedFile[];
  bytes: number;
}

export interface PublishOptions {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  message: string;
  basePath?: string;
  createRepoIfMissing?: boolean;
  isPrivate?: boolean;
  onProgress?: (event: PublishProgress) => void;
}

export interface PublishProgress {
  phase: 'auth' | 'repo' | 'branch' | 'upload' | 'tree' | 'commit' | 'done';
  done: number;
  total: number;
  message: string;
}

export interface PublishResult {
  owner: string;
  repo: string;
  branch: string;
  commitSha: string;
  commitUrl: string;
  files: number;
  createdRepo: boolean;
}

/* -------------------------------------------------------------------------- */
/*                                  errors                                    */
/* -------------------------------------------------------------------------- */

export class GitHubApiError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.detail = detail;
  }
}

export function describeGitHubError(error: unknown): string {
  if (!(error instanceof GitHubApiError)) {
    if (error instanceof Error) return error.message;
    return 'Something went wrong while talking to GitHub.';
  }

  switch (error.status) {
    case 401:
      return 'GitHub rejected the token (401). Create a new fine-grained token with "Contents: Read and write" on the target repository.';
    case 403:
      return `GitHub refused the request (403). ${
        error.message || 'The token probably lacks the Contents (write) permission.'
      }`;
    case 404:
      return 'Repository or branch not found (404). Check the owner/repo spelling — and make sure the token can see the repository if it is private.';
    case 409:
      return 'The repository is empty (409), so there is no branch to append to. Enable "Create the repository if it does not exist" or publish once with an initial file.';
    case 422:
      return `GitHub could not apply that commit (422). ${error.message || 'The file names or branch name may be invalid.'}`;
    case 429:
      return 'GitHub rate limit reached (429). Wait a minute and try again.';
    default:
      return `${error.message} (HTTP ${error.status})`;
  }
}

/* -------------------------------------------------------------------------- */
/*                                http helper                                 */
/* -------------------------------------------------------------------------- */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

async function ghRequest<T>(
  token: string,
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; headers: Headers }> {
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
  } catch (networkError) {
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

  return { data: data as T, headers: response.headers };
}

/* -------------------------------------------------------------------------- */
/*                              token / repo probes                           */
/* -------------------------------------------------------------------------- */

export interface TokenInfo {
  login: string;
  name?: string;
  scopes: string[];
}

export async function probeToken(token: string): Promise<TokenInfo> {
  const { data, headers } = await ghRequest<{ login: string; name?: string }>(token, '/user');
  const scopesHeader = headers.get('x-oauth-scopes') || '';
  return {
    login: data.login,
    name: data.name,
    scopes: scopesHeader
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean),
  };
}

export interface RepoInfo {
  exists: boolean;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  canPush: boolean;
}

export async function probeRepo(
  token: string,
  owner: string,
  repo: string
): Promise<RepoInfo> {
  try {
    const { data } = await ghRequest<any>(token, `/repos/${owner}/${repo}`);
    return {
      exists: true,
      fullName: data.full_name,
      defaultBranch: data.default_branch || 'main',
      isPrivate: Boolean(data.private),
      canPush: Boolean(data.permissions?.push ?? true),
    };
  } catch (error) {
    if (error instanceof GitHubApiError && (error.status === 404 || error.status === 403)) {
      return {
        exists: false,
        fullName: `${owner}/${repo}`,
        defaultBranch: 'main',
        isPrivate: false,
        canPush: false,
      };
    }
    throw error;
  }
}

export interface BranchInfo {
  exists: boolean;
  sha?: string;
  fileCount?: number;
}

export async function probeBranch(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  defaultBranch?: string
): Promise<BranchInfo> {
  const refName = defaultBranch || (await probeRepo(token, owner, repo)).defaultBranch;

  // Unborn / empty repository -> 409 on the ref endpoint.
  try {
    const { data } = await ghRequest<any>(token, `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
    const sha = data?.object?.sha as string | undefined;
    let fileCount: number | undefined;
    if (sha) {
      try {
        const tree = await ghRequest<any>(
          token,
          `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
        );
        if (Array.isArray(tree.data?.tree)) {
          fileCount = tree.data.tree.filter((entry: any) => entry.type === 'blob').length;
        }
      } catch {
        /* file count is a nicety, never fatal */
      }
    }
    return { exists: true, sha, fileCount };
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      // Branch might be missing while the repo still has a default branch.
      try {
        const fallback = await ghRequest<any>(
          token,
          `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(refName)}`
        );
        return { exists: false, sha: fallback.data?.object?.sha };
      } catch {
        return { exists: false };
      }
    }
    if (error instanceof GitHubApiError && error.status === 409) {
      return { exists: false };
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

export function parseRepoSpec(input: string): { owner: string; repo: string; branch?: string } | null {
  const value = input.trim();
  if (!value) return null;

  const sshMatch = value.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  const urlMatch = value.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)(?:\/tree\/([^/\s#?]+))?/i
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/i, ''),
      branch: urlMatch[3],
    };
  }

  const shortMatch = value.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };

  return null;
}

const DEFAULT_IGNORE: RegExp[] = [
  /(^|\/)\.git\//,
  /(^|\/)node_modules\//,
  /(^|\/)\.DS_Store$/,
  /(^|\/)Thumbs\.db$/i,
  /^__MACOSX\//,
  /(^|\/)\.arena\//,
];

const BUILD_IGNORE: RegExp[] = [
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)out\//,
  /(^|\/)\.next\//,
  /(^|\/)\.nuxt\//,
  /(^|\/)\.cache\//,
  /(^|\/)coverage\//,
  /(^|\/)__pycache__\//,
];

export function shouldSkipPath(path: string, includeBuildOutput: boolean): string | null {
  const normalized = path.replace(/^\/+/, '');
  if (!normalized) return 'empty path';
  if (normalized.split('/').some((segment) => segment === '.' || segment === '..')) {
    return 'unsafe path';
  }
  for (const pattern of DEFAULT_IGNORE) {
    if (pattern.test(normalized)) return 'ignored folder or system file';
  }
  if (!includeBuildOutput) {
    for (const pattern of BUILD_IGNORE) {
      if (pattern.test(normalized)) return 'build output (enable "Include build folders")';
    }
  }
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as unknown as number[]);
  }
  return btoa(binary);
}

function stripCommonRoot(paths: string[]): (path: string) => string {
  if (paths.length === 0) return (path) => path;
  const roots = new Set(paths.map((path) => path.split('/')[0]));
  if (roots.size !== 1) return (path) => path;
  const root = [...roots][0];
  const hasNesting = paths.some((path) => path.includes('/'));
  if (!hasNesting) return (path) => path;
  return (path) => path.slice(root.length + 1);
}

/* -------------------------------------------------------------------------- */
/*                             source collection                              */
/* -------------------------------------------------------------------------- */

export async function collectFromZip(
  file: File,
  includeBuildOutput = false
): Promise<FileSet> {
  // Read into an ArrayBuffer first: works with File/Blob uniformly (and keeps
  // the archive out of the JSZip Blob-support detection path).
  const archiveBytes = new Uint8Array(await file.arrayBuffer());
  const zip = await JSZip.loadAsync(archiveBytes);
  const entries: { path: string; entry: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, entry) => {
    if (!entry.dir) entries.push({ path: relativePath.replace(/\\/g, '/'), entry });
  });

  const stripped = stripCommonRoot(entries.map((item) => item.path));
  const files: PublishFile[] = [];
  const skipped: SkippedFile[] = [];
  let bytes = 0;

  for (const item of entries) {
    const path = stripped(item.path);
    const skipReason = shouldSkipPath(path, includeBuildOutput);
    if (skipReason) {
      skipped.push({ path, reason: skipReason });
      continue;
    }
    const data = await item.entry.async('uint8array');
    if (data.byteLength > MAX_FILE_BYTES) {
      skipped.push({ path, reason: 'file larger than 40 MB' });
      continue;
    }
    if (files.length >= MAX_FILES) {
      skipped.push({ path, reason: `more than ${MAX_FILES} files in this archive` });
      continue;
    }
    if (bytes + data.byteLength > MAX_TOTAL_BYTES) {
      skipped.push({ path, reason: 'archive exceeds the 900 MB safety limit' });
      continue;
    }
    bytes += data.byteLength;
    files.push({ path, bytes: data });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, skipped, bytes };
}

export async function collectFromFolder(
  fileList: FileList | File[],
  includeBuildOutput = false
): Promise<FileSet> {
  const all = Array.from(fileList as ArrayLike<File>);
  const withPaths = all
    .map((file) => ({
      file,
      rawPath: ((file as any).webkitRelativePath as string) || file.name,
    }))
    .map((item) => ({ ...item, rawPath: item.rawPath.replace(/\\/g, '/') }));

  const stripped = stripCommonRoot(withPaths.map((item) => item.rawPath));
  const files: PublishFile[] = [];
  const skipped: SkippedFile[] = [];
  let bytes = 0;

  for (const item of withPaths) {
    const path = stripped(item.rawPath);
    const skipReason = shouldSkipPath(path, includeBuildOutput);
    if (skipReason) {
      skipped.push({ path, reason: skipReason });
      continue;
    }
    if (item.file.size > MAX_FILE_BYTES) {
      skipped.push({ path, reason: 'file larger than 40 MB' });
      continue;
    }
    if (files.length >= MAX_FILES) {
      skipped.push({ path, reason: `more than ${MAX_FILES} files` });
      continue;
    }
    if (bytes + item.file.size > MAX_TOTAL_BYTES) {
      skipped.push({ path, reason: 'selection exceeds the 900 MB safety limit' });
      continue;
    }
    const buffer = new Uint8Array(await item.file.arrayBuffer());
    bytes += buffer.byteLength;
    files.push({ path, bytes: buffer });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, skipped, bytes };
}

/* -------------------------------------------------------------------------- */
/*                                  publish                                   */
/* -------------------------------------------------------------------------- */

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function publishFiles(
  fileSet: Pick<FileSet, 'files'>,
  options: PublishOptions
): Promise<PublishResult> {
  const { token, owner, repo, branch, message } = options;
  const emit = (event: PublishProgress) => options.onProgress?.(event);
  const onProgress = (message: string, done = 0, total = fileSet.files.length) =>
    emit({ phase: 'upload', done, total, message });

  const total = fileSet.files.length;
  if (total === 0) {
    throw new Error('Nothing to publish — the file selection is empty once ignored files are removed.');
  }

  // ---- 1. identity -------------------------------------------------------
  onProgress('Checking token…', 0, total);
  const me = await probeToken(token);

  // ---- 2. repository -----------------------------------------------------
  emit({ phase: 'repo', done: 0, total, message: `Looking up ${owner}/${repo}…` });
  let repoInfo = await probeRepo(token, owner, repo);
  let createdRepo = false;

  if (!repoInfo.exists) {
    if (!options.createRepoIfMissing) {
      throw new GitHubApiError(
        404,
        `Repository ${owner}/${repo} was not found. Enable "Create the repository if it does not exist" to create it automatically.`
      );
    }
    emit({ phase: 'repo', done: 0, total, message: `Creating repository ${owner}/${repo}…` });
    const endpoint = owner.toLowerCase() === me.login.toLowerCase() ? '/user/repos' : `/orgs/${owner}/repos`;
    await ghRequest(token, endpoint, {
      method: 'POST',
      body: {
        name: repo,
        private: Boolean(options.isPrivate),
        auto_init: false,
        description: 'Published from Aggi Creative Studio · Click 2 GitHub',
      },
    });
    createdRepo = true;
    repoInfo = { ...repoInfo, exists: true, defaultBranch: 'main' };
  }

  // ---- 3. branch ---------------------------------------------------------
  const targetBranch = branch.trim() || repoInfo.defaultBranch;
  emit({ phase: 'branch', done: 0, total, message: `Resolving branch ${targetBranch}…` });

  let parentSha: string | undefined;
  let baseTreeSha: string | undefined;
  let targetRefExists = false;

  try {
    const ref = await ghRequest<any>(
      token,
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(targetBranch)}`
    );
    parentSha = ref.data?.object?.sha;
    targetRefExists = Boolean(parentSha);
  } catch (error) {
    if (error instanceof GitHubApiError && (error.status === 404 || error.status === 409)) {
      targetRefExists = false;
    } else {
      throw error;
    }
  }

  if (!targetRefExists && targetBranch !== repoInfo.defaultBranch) {
    // New branch: fork it from the repository's default branch so history is kept.
    try {
      const fallback = await ghRequest<any>(
        token,
        `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(repoInfo.defaultBranch)}`
      );
      parentSha = fallback.data?.object?.sha;
    } catch {
      parentSha = undefined;
    }
  }

  if (parentSha) {
    const commit = await ghRequest<any>(token, `/repos/${owner}/${repo}/git/commits/${parentSha}`);
    baseTreeSha = commit.data?.tree?.sha;
  }

  // ---- 4. blobs ----------------------------------------------------------
  let uploaded = 0;
  const blobShas = await mapWithConcurrency(fileSet.files, 5, async (file) => {
    const blob = await ghRequest<{ sha: string }>(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      body: { content: toBase64(file.bytes), encoding: 'base64' },
    });
    uploaded += 1;
    onProgress(`Uploading ${uploaded}/${total} · ${file.path}`, uploaded, total);
    return blob.data.sha;
  });

  // ---- 5. tree -----------------------------------------------------------
  emit({ phase: 'tree', done: total, total, message: 'Building the commit tree…' });
  const prefix = (options.basePath || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  const entries = fileSet.files.map((file, index) => ({
    path: prefix ? `${prefix}/${file.path}` : file.path,
    mode: '100644',
    type: 'blob',
    sha: blobShas[index],
  }));

  const tree = await ghRequest<{ sha: string }>(token, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: {
      ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
      tree: entries,
    },
  });

  // ---- 6. commit ---------------------------------------------------------
  emit({ phase: 'commit', done: total, total, message: 'Creating the commit…' });
  const commitMessage = message.trim() || `Publish ${total} file${total === 1 ? '' : 's'} from Click 2 GitHub`;
  const commit = await ghRequest<{ sha: string; html_url?: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      body: {
        message: commitMessage,
        tree: tree.data.sha,
        parents: parentSha ? [parentSha] : [],
      },
    }
  );

  // ---- 7. move the branch ------------------------------------------------
  emit({ phase: 'commit', done: total, total, message: `Updating branch ${targetBranch}…` });
  if (targetRefExists) {
    await ghRequest(token, `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(targetBranch)}`, {
      method: 'PATCH',
      body: { sha: commit.data.sha, force: false },
    });
  } else {
    // Brand-new branch, or the very first commit in an empty repository.
    await ghRequest(token, `/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/heads/${targetBranch}`, sha: commit.data.sha },
    });
  }

  emit({ phase: 'done', done: total, total, message: 'Published' });

  return {
    owner,
    repo,
    branch: targetBranch,
    commitSha: commit.data.sha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${commit.data.sha}`,
    files: total,
    createdRepo,
  };
}
