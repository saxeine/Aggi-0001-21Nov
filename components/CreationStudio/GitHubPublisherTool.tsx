import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  UploadCloud,
  FolderUp,
  FileArchive,
  KeyRound,
  GitBranch,
  GitCommitHorizontal,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Rocket,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  FolderTree,
} from 'lucide-react';
import {
  BranchInfo,
  FileSet,
  PublishProgress,
  PublishResult,
  RepoInfo,
  TokenInfo,
  collectFromFolder,
  collectFromZip,
  describeGitHubError,
  parseRepoSpec,
  probeBranch,
  probeRepo,
  probeToken,
  publishFiles,
} from '../../services/githubPublish';

const STORAGE_KEY = 'click2github.settings.v1';

interface StoredSettings {
  repoSpec?: string;
  branch?: string;
  basePath?: string;
  message?: string;
  token?: string;
  rememberToken?: boolean;
  includeBuildOutput?: boolean;
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredSettings;
  } catch {
    return {};
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function GitHubMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function StepBadge({ step }: { step: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-bg text-xs font-bold text-emerald-400">
      {step}
    </span>
  );
}

const inputClass =
  'w-full rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text placeholder:text-app-dim/60 focus:border-emerald-500 focus:outline-none transition-colors';
const cardClass = 'rounded-2xl border border-app-border bg-app-card p-5';

export const GitHubPublisherTool: React.FC = () => {
  const stored = useMemo(loadSettings, []);

  const [fileSet, setFileSet] = useState<FileSet | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>('');
  const [sourceKind, setSourceKind] = useState<'zip' | 'folder' | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [includeBuildOutput, setIncludeBuildOutput] = useState(Boolean(stored.includeBuildOutput));
  const [dragActive, setDragActive] = useState(false);

  const [token, setToken] = useState(stored.rememberToken ? stored.token || '' : '');
  const [rememberToken, setRememberToken] = useState(Boolean(stored.rememberToken));
  const [showToken, setShowToken] = useState(false);

  const [repoSpec, setRepoSpec] = useState(stored.repoSpec || '');
  const [branch, setBranch] = useState(stored.branch || 'main');
  const [basePath, setBasePath] = useState(stored.basePath || '');
  const [message, setMessage] = useState(
    stored.message || 'Publish from Aggi Creative Studio · Click 2 GitHub'
  );
  const [createRepo, setCreateRepo] = useState(false);
  const [isPrivateRepo, setIsPrivateRepo] = useState(true);

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState<PublishProgress | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const [showAllFiles, setShowAllFiles] = useState(false);
  const [fileFilter, setFileFilter] = useState('');

  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  // Keeps the original selection so filter toggles can re-run extraction.
  const sourceRef = useRef<{ kind: 'zip'; file: File } | { kind: 'folder'; files: FileList } | null>(null);

  /* ------------------------------ persistence ----------------------------- */

  useEffect(() => {
    const payload: StoredSettings = {
      repoSpec,
      branch,
      basePath,
      message,
      includeBuildOutput,
      rememberToken,
      token: rememberToken ? token : '',
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage may be unavailable — settings just won't persist */
    }
  }, [repoSpec, branch, basePath, message, includeBuildOutput, rememberToken, token]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [log]);

  const parsedSpec = useMemo(() => parseRepoSpec(repoSpec), [repoSpec]);

  /* -------------------------------- sources ------------------------------- */

  const ingest = async (add: () => Promise<FileSet>, label: string, kind: 'zip' | 'folder') => {
    setIsReading(true);
    setError(null);
    setResult(null);
    setLog([]);
    try {
      const set = await add();
      setFileSet(set);
      setSourceLabel(label);
      setSourceKind(kind);
      if (set.files.length === 0) {
        setError(
          'No publishable files were found. Everything in that selection was filtered out — try enabling "Include build folders".'
        );
      }
    } catch (readError) {
      setError(
        readError instanceof Error
          ? `Could not read that source: ${readError.message}`
          : 'Could not read that source.'
      );
      setFileSet(null);
    } finally {
      setIsReading(false);
    }
  };

  const handleZip = (file: File) => {
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      setError('That file is not a ZIP archive. Use "Choose folder" for loose files.');
      return;
    }
    sourceRef.current = { kind: 'zip', file };
    void ingest(() => collectFromZip(file, includeBuildOutput), file.name, 'zip');
  };

  const handleFolder = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const first = (files[0] as any).webkitRelativePath as string | undefined;
    const rootName = first ? first.split('/')[0] : `${files.length} files`;
    sourceRef.current = { kind: 'folder', files };
    void ingest(() => collectFromFolder(files, includeBuildOutput), rootName, 'folder');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files;
    if (!dropped || dropped.length === 0) return;
    const zip = Array.from(dropped).find((file) => /\.zip$/i.test(file.name));
    if (zip) {
      handleZip(zip);
      return;
    }
    handleFolder(dropped);
  };

  const clearSource = () => {
    sourceRef.current = null;
    setFileSet(null);
    setSourceLabel('');
    setSourceKind(null);
    setFileFilter('');
    setShowAllFiles(false);
    if (zipInputRef.current) zipInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  /* ------------------------------- checking ------------------------------- */

  const handleCheck = async () => {
    setError(null);
    setResult(null);
    if (!token.trim()) {
      setError('Add a GitHub access token first.');
      return;
    }
    if (!parsedSpec) {
      setError('Enter a repository as owner/repo, or paste the GitHub URL.');
      return;
    }

    setIsChecking(true);
    try {
      const me = await probeToken(token.trim());
      setTokenInfo(me);
      const repoDetails = await probeRepo(token.trim(), parsedSpec.owner, parsedSpec.repo);
      setRepoInfo(repoDetails);
      if (repoDetails.exists) {
        const targetBranch = branch.trim() || repoDetails.defaultBranch;
        const bInfo = await probeBranch(
          token.trim(),
          parsedSpec.owner,
          parsedSpec.repo,
          targetBranch,
          repoDetails.defaultBranch
        );
        setBranchInfo(bInfo);
      } else {
        setBranchInfo(null);
      }
    } catch (checkError) {
      setError(describeGitHubError(checkError));
      setTokenInfo(null);
      setRepoInfo(null);
      setBranchInfo(null);
    } finally {
      setIsChecking(false);
    }
  };

  /* ------------------------------- publish -------------------------------- */

  const handlePublish = async () => {
    setError(null);
    setResult(null);
    setLog([]);

    if (!fileSet || fileSet.files.length === 0) {
      setError('Choose a ZIP archive or folder to publish.');
      return;
    }
    if (!token.trim()) {
      setError('Add a GitHub access token with Contents: Read and write.');
      return;
    }
    if (!parsedSpec) {
      setError('Enter the destination as owner/repo, or paste the GitHub URL.');
      return;
    }

    setIsPublishing(true);
    setProgress({ phase: 'auth', done: 0, total: fileSet.files.length, message: 'Starting…' });

    try {
      const published = await publishFiles({ files: fileSet.files }, {
        token: token.trim(),
        owner: parsedSpec.owner,
        repo: parsedSpec.repo,
        branch: branch.trim(),
        message,
        basePath,
        createRepoIfMissing: createRepo,
        isPrivate: isPrivateRepo,
        onProgress: (event) => {
          setProgress(event);
          setLog((prev) => {
            const next = [...prev, event.message];
            return next.slice(-200);
          });
        },
      });
      setResult(published);
      setBranchInfo({ exists: true, sha: published.commitSha });
    } catch (publishError) {
      setError(describeGitHubError(publishError));
      setLog((prev) => [...prev, `✖ ${describeGitHubError(publishError)}`]);
    } finally {
      setIsPublishing(false);
    }
  };

  /* -------------------------------- derived ------------------------------- */

  const visibleFiles = useMemo(() => {
    if (!fileSet) return [];
    const needle = fileFilter.trim().toLowerCase();
    const filtered = needle
      ? fileSet.files.filter((file) => file.path.toLowerCase().includes(needle))
      : fileSet.files;
    return showAllFiles ? filtered : filtered.slice(0, 40);
  }, [fileSet, fileFilter, showAllFiles]);

  const topLevel = useMemo(() => {
    if (!fileSet) return [];
    const counts = new Map<string, number>();
    for (const file of fileSet.files) {
      const root = file.path.includes('/') ? file.path.split('/')[0] + '/' : file.path;
      counts.set(root, (counts.get(root) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [fileSet]);

  const progressPercent = progress?.total
    ? Math.min(100, Math.round((progress.done / progress.total) * 100))
    : 0;

  const canPublish =
    Boolean(fileSet && fileSet.files.length > 0 && token.trim() && parsedSpec) && !isPublishing && !isReading;

  return (
    <div className="flex flex-col h-full bg-app-bg text-app-text">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 border-b border-app-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-emerald-400">
            <GitHubMark className="w-6 h-6" />
            Click 2 GitHub
          </h2>
          <p className="mt-1 text-sm text-app-dim">
            Drop a ZIP or folder and commit it straight into a repository — one click, one commit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-app-dim">
          <span className="rounded border border-app-border bg-app-card px-2 py-1">100% client-side</span>
          <span className="rounded border border-app-border bg-app-card px-2 py-1">Git Data API</span>
          <span className="rounded border border-app-border bg-app-card px-2 py-1">Binary safe</span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ----------------------------- left column ---------------------------- */}
        <div className="flex flex-col gap-5">
          {/* Step 1 — source */}
          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-3">
              <StepBadge step={1} />
              <div className="flex-1">
                <h3 className="flex items-center gap-2 text-sm font-bold text-app-text">
                  <FileArchive className="w-4 h-4 text-emerald-400" /> Source archive
                </h3>
                <p className="text-xs text-app-dim">
                  The archive's top-level folder is stripped, so files land at the repository root.
                </p>
              </div>
              {fileSet && (
                <button
                  onClick={clearSource}
                  className="flex items-center gap-1 rounded-lg border border-app-border px-2.5 py-1.5 text-xs text-app-dim transition-colors hover:border-red-500/50 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {!fileSet ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-app-border bg-app-bg hover:border-emerald-500/50'
                }`}
              >
                {isReading ? (
                  <Loader2 className="mb-3 w-8 h-8 animate-spin text-emerald-400" />
                ) : (
                  <UploadCloud className="mb-3 w-8 h-8 text-emerald-400" />
                )}
                <p className="text-sm font-semibold text-app-text">
                  {isReading ? 'Reading archive…' : 'Drop a .zip here, or drop a folder'}
                </p>
                <p className="mt-1 text-xs text-app-dim">
                  Nothing is uploaded anywhere until you press Publish.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => zipInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    <FileArchive className="w-4 h-4" /> Choose ZIP
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-app-border bg-app-card px-3 py-2 text-xs font-semibold text-app-text transition-colors hover:border-emerald-500/40"
                  >
                    <FolderUp className="w-4 h-4" /> Choose folder
                  </button>
                </div>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleZip(file);
                  }}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  // @ts-expect-error non-standard but supported in Chromium/WebKit
                  webkitdirectory=""
                  directory=""
                  className="hidden"
                  onChange={(event) => handleFolder(event.target.files)}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-app-border bg-app-bg p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
                      {sourceKind === 'zip' ? <FileArchive className="w-4 h-4" /> : <FolderTree className="w-4 h-4" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-app-text">{sourceLabel}</p>
                      <p className="text-xs text-app-dim">
                        {fileSet.files.length.toLocaleString()} files · {formatBytes(fileSet.bytes)}
                        {fileSet.skipped.length > 0 && ` · ${fileSet.skipped.length} skipped`}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-app-dim">
                    <input
                      type="checkbox"
                      checked={includeBuildOutput}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setIncludeBuildOutput(next);
                        const source = sourceRef.current;
                        if (!source) return;
                        if (source.kind === 'zip') {
                          void ingest(
                            () => collectFromZip(source.file, next),
                            source.file.name,
                            'zip'
                          );
                        } else {
                          const first = (source.files[0] as any)?.webkitRelativePath as string | undefined;
                          const rootName = first ? first.split('/')[0] : `${source.files.length} files`;
                          void ingest(() => collectFromFolder(source.files, next), rootName, 'folder');
                        }
                      }}
                      className="h-3.5 w-3.5 accent-emerald-500"
                    />
                    Include build folders
                  </label>
                </div>

                {topLevel.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {topLevel.map(([root, count]) => (
                      <span
                        key={root}
                        className="rounded border border-app-border bg-app-card px-2 py-1 font-mono text-[10px] text-app-dim"
                      >
                        {root} <span className="text-app-dim/60">×{count}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <input
                      value={fileFilter}
                      onChange={(event) => setFileFilter(event.target.value)}
                      placeholder="Filter files…"
                      className="w-full max-w-xs rounded-lg border border-app-border bg-app-card px-2.5 py-1.5 text-xs text-app-text placeholder:text-app-dim/60 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={() => setShowAllFiles((prev) => !prev)}
                      className="whitespace-nowrap text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                    >
                      {showAllFiles ? 'Show less' : `Show all (${fileSet.files.length})`}
                    </button>
                  </div>
                  <div className="custom-scrollbar max-h-56 overflow-y-auto rounded-lg border border-app-border bg-app-card/60">
                    <ul className="divide-y divide-app-border/60">
                      {visibleFiles.map((file) => (
                        <li
                          key={file.path}
                          className="flex items-center justify-between gap-3 px-2.5 py-1.5 font-mono text-[11px]"
                        >
                          <span className="truncate text-app-text" title={file.path}>
                            {file.path}
                          </span>
                          <span className="shrink-0 text-app-dim">{formatBytes(file.bytes.byteLength)}</span>
                        </li>
                      ))}
                      {visibleFiles.length === 0 && (
                        <li className="px-3 py-4 text-center text-xs text-app-dim">No files match that filter.</li>
                      )}
                    </ul>
                  </div>
                  {fileSet.skipped.length > 0 && (
                    <p className="mt-2 truncate text-[11px] text-app-dim" title={fileSet.skipped.map((s) => s.path).join('\n')}>
                      Skipped e.g. <span className="font-mono">{fileSet.skipped[0].path}</span> — {fileSet.skipped[0].reason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Step 2 — destination */}
          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-3">
              <StepBadge step={2} />
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-app-text">
                  <GitBranch className="w-4 h-4 text-emerald-400" /> Destination
                </h3>
                <p className="text-xs text-app-dim">Repository, branch and where the files should land.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-app-dim">
                  Repository
                </label>
                <input
                  value={repoSpec}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRepoSpec(value);
                    const parsed = parseRepoSpec(value);
                    if (parsed?.branch) setBranch(parsed.branch);
                  }}
                  placeholder="owner/repo or https://github.com/owner/repo"
                  className={inputClass}
                />
                {repoSpec && !parsedSpec && (
                  <p className="mt-1 text-[11px] text-amber-400">Use owner/repo, or paste the repository URL.</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-app-dim">
                    Branch
                  </label>
                  <input
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                    placeholder="main"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-app-dim">
                    Subfolder (optional)
                  </label>
                  <input
                    value={basePath}
                    onChange={(event) => setBasePath(event.target.value)}
                    placeholder="apps/my-site"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-app-dim">
                  Commit message
                </label>
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-app-border bg-app-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-xs text-app-dim">
                  <input
                    type="checkbox"
                    checked={createRepo}
                    onChange={(event) => setCreateRepo(event.target.checked)}
                    className="h-3.5 w-3.5 accent-emerald-500"
                  />
                  Create the repository if it does not exist
                </label>
                {createRepo && (
                  <label className="flex items-center gap-2 text-xs text-app-dim">
                    <input
                      type="checkbox"
                      checked={isPrivateRepo}
                      onChange={(event) => setIsPrivateRepo(event.target.checked)}
                      className="h-3.5 w-3.5 accent-emerald-500"
                    />
                    Private
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* Step 3 — token */}
          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-3">
              <StepBadge step={3} />
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-app-text">
                  <KeyRound className="w-4 h-4 text-emerald-400" /> Access token
                </h3>
                <p className="text-xs text-app-dim">
                  Fine-grained token with <span className="font-mono">Contents: Read and write</span>, or a classic
                  token with the <span className="font-mono">repo</span> scope.
                </p>
              </div>
            </div>

            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="github_pat_… or ghp_…"
                  autoComplete="off"
                  spellCheck={false}
                  className={`${inputClass} pr-10 font-mono`}
                />
                <button
                  onClick={() => setShowToken((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-app-dim hover:text-app-text"
                  title={showToken ? 'Hide token' : 'Show token'}
                  type="button"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleCheck}
                disabled={isChecking || !token.trim() || !parsedSpec}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-app-border bg-app-bg px-3 text-xs font-semibold text-app-text transition-colors hover:border-emerald-500/50 disabled:opacity-40"
              >
                {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Verify
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-app-dim">
                <input
                  type="checkbox"
                  checked={rememberToken}
                  onChange={(event) => setRememberToken(event.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-500"
                />
                Remember on this device (localStorage)
              </label>
              <span className="flex items-center gap-1 text-[11px] text-app-dim">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sent only to api.github.com
              </span>
            </div>

            {(tokenInfo || repoInfo) && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
                {tokenInfo && (
                  <p className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Signed in as <span className="font-mono">@{tokenInfo.login}</span>
                    {tokenInfo.scopes.length > 0 && (
                      <span className="text-app-dim">· scopes: {tokenInfo.scopes.join(', ')}</span>
                    )}
                  </p>
                )}
                {repoInfo && (
                  <p className={repoInfo.exists ? 'text-app-text' : 'text-amber-400'}>
                    {repoInfo.exists ? (
                      <>
                        <span className="font-mono">{repoInfo.fullName}</span> · default branch{' '}
                        <span className="font-mono">{repoInfo.defaultBranch}</span>
                        {branchInfo?.exists && (
                          <>
                            {' '}· target branch has{' '}
                            <span className="font-mono">{branchInfo.fileCount ?? '…'}</span> files
                          </>
                        )}
                        {branchInfo && !branchInfo.exists && ' · target branch will be created'}
                        {!repoInfo.canPush && ' · token may not have push access'}
                      </>
                    ) : (
                      <>Repository not found — {createRepo ? 'it will be created on publish.' : 'enable creation below to publish.'}</>
                    )}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ---------------------------- right column ---------------------------- */}
        <div className="flex flex-col gap-5">
          <section className={`${cardClass} lg:sticky lg:top-0`}>
            <div className="mb-4 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-app-text">Publish</h3>
            </div>

            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-app-dim">Files</dt>
                <dd className="font-mono text-app-text">{fileSet?.files.length.toLocaleString() ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-app-dim">Payload</dt>
                <dd className="font-mono text-app-text">{fileSet ? formatBytes(fileSet.bytes) : '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-app-dim">Target</dt>
                <dd className="truncate font-mono text-app-text">
                  {parsedSpec ? `${parsedSpec.owner}/${parsedSpec.repo}@${branch || 'main'}` : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-app-dim">Path</dt>
                <dd className="truncate font-mono text-app-text">/{basePath.replace(/^\/+|\/+$/g, '') || ''}</dd>
              </div>
            </dl>

            <button
              onClick={handlePublish}
              disabled={!canPublish}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCommitHorizontal className="w-4 h-4" />}
              {isPublishing ? 'Publishing…' : compiledLabel(fileSet?.files.length ?? 0)}
            </button>

            {(isPublishing || progress) && (
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-border">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 truncate text-[11px] text-app-dim">{progress?.message || 'Waiting…'}</p>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                <p className="flex items-center gap-2 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Published {result.files} files
                  {result.createdRepo && ' · repository created'}
                </p>
                <p className="text-app-text">
                  <span className="font-mono">
                    {result.owner}/{result.repo}@{result.branch}
                  </span>{' '}
                  · commit <span className="font-mono">{result.commitSha.slice(0, 7)}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={result.commitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2.5 py-1.5 font-semibold text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open commit
                  </a>
                  <a
                    href={`https://github.com/${result.owner}/${result.repo}/tree/${result.branch}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-app-border px-2.5 py-1.5 text-app-text hover:border-emerald-500/40"
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Branch
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(result.commitUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {
                        /* clipboard may be blocked */
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg border border-app-border px-2.5 py-1.5 text-app-text hover:border-emerald-500/40"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy URL'}
                  </button>
                </div>
              </div>
            )}

            {log.length > 0 && (
              <div className="custom-scrollbar mt-4 max-h-52 overflow-y-auto rounded-xl border border-app-border bg-app-bg p-2.5">
                <ul className="space-y-1 font-mono text-[10.5px] leading-relaxed text-app-dim">
                  {log.map((line, index) => (
                    <li key={index} className="truncate" title={line}>
                      <span className="text-emerald-500">›</span> {line}
                    </li>
                  ))}
                </ul>
                <div ref={logEndRef} />
              </div>
            )}
          </section>

          <section className={`${cardClass} text-xs text-app-dim`}>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-app-text">
              <Info className="w-4 h-4 text-app-dim" /> What gets skipped
            </h4>
            <ul className="space-y-1">
              <li>• <span className="font-mono">.git/</span>, <span className="font-mono">node_modules/</span>, <span className="font-mono">.DS_Store</span>, <span className="font-mono">__MACOSX/</span></li>
              <li>• Build folders (<span className="font-mono">dist/</span>, <span className="font-mono">build/</span>, <span className="font-mono">.next/</span>) unless enabled</li>
              <li>• Files over 40 MB, archives over 900 MB, more than 3,000 files</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              Existing files in the branch are kept; any path in the archive with the same name is overwritten by the
              new commit. Every publish is a single commit, so it can be reverted from GitHub.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

function compiledLabel(fileCount: number): string {
  if (fileCount === 0) return 'Select files first';
  return `Publish ${fileCount} file${fileCount === 1 ? '' : 's'} to GitHub`;
}

export default GitHubPublisherTool;
