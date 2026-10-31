import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  FolderTree,
  GitBranch,
  KeyRound,
  Link2,
  ListChecks,
  Loader2,
  Lock,
  Globe,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  describeGitHubError,
  MAX_FILES,
  parseRepoSpec,
  probeRepo,
  probeToken,
  publishFiles,
  PublishResult,
  TokenInfo,
} from '../services/githubPublish';
import {
  ConflictInfo,
  ConflictResolution,
  detectConflicts,
  fetchRepoFiles,
  fetchRepoSnapshot,
  fetchUserOrgs,
  folderNameForRepo,
  planMerge,
  RepoSnapshot,
  SkippedFile,
  TreeEntry,
} from '../services/repoMerger';

/**
 * RepoMergerView
 * -----------------------------------------------------------------------------
 * "Repo Merger" — pick TWO GitHub repositories, choose the features/files to
 * take from each, resolve path conflicts, then create a single NEW named
 * repository containing the combination (one commit, via the Git Data API).
 */

const STORAGE_KEY = 'repomerger.settings.v1';

const inputCls =
  'w-full bg-app-input border border-app-border rounded-lg px-3 py-2 text-sm text-app-text placeholder-app-dim focus:outline-none focus:ring-2 focus:ring-app-text/40 focus:border-transparent transition-all';
const btnPrimary =
  'px-4 py-2 rounded-lg bg-app-text text-app-bg font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 whitespace-nowrap';
const btnGhost =
  'px-3 py-2 rounded-lg bg-app-card border border-app-border text-app-text hover:border-app-text/50 text-sm transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-app-dim mb-1.5';

/* -------------------------------------------------------------------------- */
/*                              tree model                                    */
/* -------------------------------------------------------------------------- */

interface TreeNode {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number;
  sha?: string;
  children: TreeNode[];
}

function buildTree(entries: TreeEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();
  const blobs = entries
    .filter((e) => e.type === 'blob')
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path));
  for (const blob of blobs) {
    const segs = blob.path.split('/');
    let siblings = root;
    let prefix = '';
    for (let i = 0; i < segs.length - 1; i++) {
      prefix = prefix ? `${prefix}/${segs[i]}` : segs[i];
      let dir = dirMap.get(prefix);
      if (!dir) {
        dir = { name: segs[i], path: prefix, type: 'dir', size: 0, children: [] };
        dirMap.set(prefix, dir);
        siblings.push(dir);
      }
      siblings = dir.children;
    }
    siblings.push({
      name: segs[segs.length - 1],
      path: blob.path,
      type: 'file',
      size: blob.size,
      sha: blob.sha,
      children: [],
    });
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((x, y) =>
      x.type === y.type ? x.name.localeCompare(y.name) : x.type === 'dir' ? -1 : 1
    );
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(root);
  return root;
}

function collectFilePaths(node: TreeNode): string[] {
  if (node.type === 'file') return [node.path];
  return node.children.flatMap(collectFilePaths);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

const REPO_NAME_RE = /^[A-Za-z0-9_.-]+$/;

/* -------------------------------------------------------------------------- */
/*                              side state                                    */
/* -------------------------------------------------------------------------- */

interface SideState {
  input: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  snapshot?: RepoSnapshot;
  selected: Set<string>;
  expanded: Set<string>;
  filter: string;
}

const emptySide = (): SideState => ({
  input: '',
  status: 'idle',
  selected: new Set(),
  expanded: new Set(),
  filter: '',
});

/* -------------------------------------------------------------------------- */
/*                              sub components                                */
/* -------------------------------------------------------------------------- */

const StepCard: React.FC<{
  step: number;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ step, title, subtitle, right, children }) => (
  <section className="bg-app-panel border border-app-border rounded-xl p-5 shadow-lg">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-app-text text-app-bg flex items-center justify-center text-sm font-bold shrink-0">
          {step}
        </div>
        <div>
          <h2 className="font-bold text-app-text text-base leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-app-dim mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
    {children}
  </section>
);

const TreeRow: React.FC<{
  node: TreeNode;
  depth: number;
  selected: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  conflictPaths: ReadonlySet<string>;
  resolutions: Record<string, ConflictResolution>;
  onResolution: (path: string, r: ConflictResolution) => void;
  onToggleNode: (node: TreeNode) => void;
  onToggleExpand: (path: string) => void;
  repoAName: string;
  repoBName: string;
  side: 'A' | 'B';
}> = ({
  node,
  depth,
  selected,
  expanded,
  conflictPaths,
  resolutions,
  onResolution,
  onToggleNode,
  onToggleExpand,
  repoAName,
  repoBName,
  side,
}) => {
  const filePaths = useMemo(() => collectFilePaths(node), [node]);
  const selectedCount = filePaths.filter((p) => selected.has(p)).length;
  const checked = filePaths.length > 0 && selectedCount === filePaths.length;
  const some = selectedCount > 0 && !checked;
  const isOpen = expanded.has(node.path);
  const isConflict = node.type === 'file' && conflictPaths.has(node.path);

  const checkbox = (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = some;
      }}
      checked={checked}
      onChange={() => onToggleNode(node)}
      className="w-4 h-4 accent-current shrink-0 cursor-pointer"
    />
  );

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 pr-2 rounded hover:bg-app-card/60 ${
          isConflict ? 'bg-amber-500/10' : ''
        }`}
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {node.type === 'dir' ? (
          <button
            onClick={() => onToggleExpand(node.path)}
            className="text-app-dim hover:text-app-text shrink-0"
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="text-app-text">{checkbox}</span>
        {node.type === 'dir' ? (
          <FolderOpen className={`w-4 h-4 shrink-0 ${checked ? 'text-app-text' : 'text-app-dim'}`} />
        ) : (
          <FileText className={`w-4 h-4 shrink-0 ${checked ? 'text-app-text' : 'text-app-dim'}`} />
        )}
        <span
          className={`text-sm truncate cursor-pointer select-none ${
            checked ? 'text-app-text' : 'text-app-muted'
          } ${node.type === 'dir' ? 'font-semibold' : ''}`}
          onClick={() => onToggleNode(node)}
          title={node.path}
        >
          {node.name}
          {node.type === 'dir' && (
            <span className="text-app-dim font-normal ml-2 text-xs">
              {selectedCount}/{filePaths.length}
            </span>
          )}
        </span>
        {isConflict && (
          <span className="flex items-center gap-1 text-amber-500 text-xs shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" /> conflict
          </span>
        )}
        <span className="ml-auto text-xs text-app-dim shrink-0">
          {node.type === 'file' ? formatBytes(node.size) : `${filePaths.length} files`}
        </span>
      </div>

      {isConflict && (
        <div style={{ paddingLeft: depth * 16 + 28 }} className="pb-1">
          <select
            value={resolutions[node.path] ?? 'both'}
            onChange={(e) => onResolution(node.path, e.target.value as ConflictResolution)}
            className="bg-app-input border border-amber-500/50 text-amber-400 text-xs rounded px-2 py-1 focus:outline-none"
            title={`Both: ${side === 'A' ? repoAName : repoBName}/${node.path} + the other side keeps ${node.path}`}
          >
            <option value="both">Keep both (rename this one to {side === 'A' ? repoAName : repoBName}/…)</option>
            <option value="a">Keep repository A only</option>
            <option value="b">Keep repository B only</option>
            <option value="skip">Skip this file</option>
          </select>
        </div>
      )}

      {node.type === 'dir' && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selected={selected}
              expanded={expanded}
              conflictPaths={conflictPaths}
              resolutions={resolutions}
              onResolution={onResolution}
              onToggleNode={onToggleNode}
              onToggleExpand={onToggleExpand}
              repoAName={repoAName}
              repoBName={repoBName}
              side={side}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              repo panel                                    */
/* -------------------------------------------------------------------------- */

const RepoPanel: React.FC<{
  label: string;
  accent: string;
  state: SideState;
  onInput: (v: string) => void;
  onLoad: () => void;
  onFilter: (v: string) => void;
  onToggleNode: (node: TreeNode) => void;
  onToggleExpand: (path: string) => void;
  onTogglePath: (path: string) => void;
  onSelectAll: (select: boolean) => void;
  conflictPaths: ReadonlySet<string>;
  resolutions: Record<string, ConflictResolution>;
  onResolution: (path: string, r: ConflictResolution) => void;
  repoAName: string;
  repoBName: string;
  side: 'A' | 'B';
  tokenReady: boolean;
}> = ({
  label,
  accent,
  state,
  onInput,
  onLoad,
  onFilter,
  onToggleNode,
  onToggleExpand,
  onTogglePath,
  onSelectAll,
  conflictPaths,
  resolutions,
  onResolution,
  repoAName,
  repoBName,
  side,
  tokenReady,
}) => {
  const snap = state.snapshot;
  const tree = useMemo(() => (snap ? buildTree(snap.entries) : []), [snap]);
  const blobs = useMemo(() => (snap ? snap.entries.filter((e) => e.type === 'blob') : []), [snap]);
  const selectedCount = blobs.filter((b) => state.selected.has(b.path)).length;
  const totalSize = blobs.reduce((acc, b) => acc + b.size, 0);

  const filter = state.filter.trim().toLowerCase();
  const filteredBlobs = useMemo(
    () => (filter ? blobs.filter((b) => b.path.toLowerCase().includes(filter)) : []),
    [blobs, filter]
  );

  return (
    <div className="bg-app-card/50 border border-app-border rounded-xl p-4 flex flex-col min-h-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: accent }}
        >
          {label}
        </span>
        <h3 className="font-bold text-sm text-app-text">Repository {label}</h3>
        {snap && (
          <span className="ml-auto text-xs text-app-dim">
            {selectedCount}/{blobs.length} files · {formatBytes(
              blobs.filter((b) => state.selected.has(b.path)).reduce((a, b) => a + b.size, 0)
            )}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-app-dim" />
          <input
            value={state.input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLoad()}
            placeholder="owner/repo  or  https://github.com/owner/repo[/tree/branch]"
            className={`${inputCls} pl-9`}
            disabled={state.status === 'loading'}
          />
        </div>
        <button onClick={onLoad} disabled={state.status === 'loading' || !tokenReady} className={btnPrimary}>
          {state.status === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {state.status === 'ready' ? 'Reload' : 'Load'}
        </button>
      </div>

      {state.status === 'error' && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      {snap && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <a
              href={snap.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-semibold text-app-text hover:underline"
            >
              {snap.fullName} <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-app-input border border-app-border text-app-muted">
              <GitBranch className="w-3 h-3" /> {snap.branch}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-app-input border border-app-border text-app-muted">
              {snap.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {snap.isPrivate ? 'Private' : 'Public'}
            </span>
            <span className="text-app-dim">
              {blobs.length} files · {formatBytes(totalSize)}
            </span>
          </div>
          {snap.description && (
            <p className="mt-1.5 text-xs text-app-muted line-clamp-2">{snap.description}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-app-dim" />
              <input
                value={state.filter}
                onChange={(e) => onFilter(e.target.value)}
                placeholder="Filter files…"
                className={`${inputCls} pl-8 py-1.5 text-xs`}
              />
            </div>
            <button onClick={() => onSelectAll(true)} className={btnGhost} title="Select every file">
              <ListChecks className="w-4 h-4" /> All
            </button>
            <button onClick={() => onSelectAll(false)} className={btnGhost} title="Clear the selection">
              None
            </button>
          </div>

          <div className="mt-2 flex-1 overflow-y-auto max-h-[420px] pr-1 border-t border-app-border pt-2">
            {filter ? (
              filteredBlobs.length === 0 ? (
                <p className="text-xs text-app-dim p-2">No files match “{state.filter}”.</p>
              ) : (
                filteredBlobs.map((b) => (
                  <div
                    key={b.path}
                    className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-app-card/60 ${
                      conflictPaths.has(b.path) ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.selected.has(b.path)}
                      onChange={() => onTogglePath(b.path)}
                      className="w-4 h-4 accent-current cursor-pointer"
                    />
                    <FileText className="w-4 h-4 text-app-dim shrink-0" />
                    <span className="text-xs text-app-muted truncate" title={b.path}>
                      {b.path}
                    </span>
                    {conflictPaths.has(b.path) && (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="ml-auto text-xs text-app-dim shrink-0">{formatBytes(b.size)}</span>
                  </div>
                ))
              )
            ) : tree.length === 0 ? (
              <p className="text-xs text-app-dim p-2">This repository has no files on this branch.</p>
            ) : (
              tree.map((node) => (
                <TreeRow
                  key={node.path}
                  node={node}
                  depth={0}
                  selected={state.selected}
                  expanded={state.expanded}
                  conflictPaths={conflictPaths}
                  resolutions={resolutions}
                  onResolution={onResolution}
                  onToggleNode={onToggleNode}
                  onToggleExpand={onToggleExpand}
                  repoAName={repoAName}
                  repoBName={repoBName}
                  side={side}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              main view                                     */
/* -------------------------------------------------------------------------- */

const RepoMergerView: React.FC<{ onBack?: () => void; embedded?: boolean }> = ({ onBack, embedded }) => {
  // auth
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [remember, setRemember] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<string[]>([]);

  // sources
  const [sideA, setSideA] = useState<SideState>(emptySide());
  const [sideB, setSideB] = useState<SideState>(emptySide());

  // conflicts
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});

  // destination repo
  const [destOwner, setDestOwner] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('');
  const [nameStatus, setNameStatus] = useState<'idle' | 'checking' | 'ok' | 'exists' | 'invalid'>('idle');
  const [repoExists, setRepoExists] = useState(false);

  // run state
  type Phase = 'idle' | 'downloading' | 'publishing' | 'done';
  const [phase, setPhase] = useState<Phase>('idle');
  const [dlProgress, setDlProgress] = useState({ done: 0, total: 0, message: '' });
  const [pubProgress, setPubProgress] = useState({ done: 0, total: 0, message: '' });
  const [result, setResult] = useState<PublishResult | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);

  // restore remembered token
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token) {
          setToken(parsed.token);
          setRemember(true);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (remember && token.trim()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.trim() }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [token, remember]);

  const updateSide = (key: 'A' | 'B', fn: (s: SideState) => SideState) => {
    if (key === 'A') setSideA(fn);
    else setSideB(fn);
  };

  const verifyToken = async () => {
    const t = token.trim();
    if (!t) {
      setAuthError('Paste a GitHub personal access token first.');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const info = await probeToken(t);
      setTokenInfo(info);
      setDestOwner((cur) => cur || info.login);
      fetchUserOrgs(t).then(setOrgs);
    } catch (e) {
      setTokenInfo(null);
      setAuthError(describeGitHubError(e));
    } finally {
      setAuthBusy(false);
    }
  };

  const loadSide = async (key: 'A' | 'B') => {
    const st = key === 'A' ? sideA : sideB;
    const t = token.trim();
    if (!t) {
      updateSide(key, (s) => ({ ...s, status: 'error', error: 'Verify a token in step 1 first.' }));
      return;
    }
    const parsed = parseRepoSpec(st.input);
    if (!parsed) {
      updateSide(key, (s) => ({
        ...s,
        status: 'error',
        error: 'Enter the repo as owner/repo or paste a full github.com URL.',
      }));
      return;
    }
    updateSide(key, (s) => ({ ...s, status: 'loading', error: undefined }));
    try {
      const snap = await fetchRepoSnapshot(t, parsed.owner, parsed.repo, parsed.branch);
      updateSide(key, (s) => ({
        ...s,
        status: 'ready',
        snapshot: snap,
        selected: new Set(snap.entries.filter((e) => e.type === 'blob').map((e) => e.path)),
        expanded: new Set(
          snap.entries
            .filter((e) => e.type === 'tree')
            .map((e) => e.path)
            .filter((p) => !p.includes('/'))
        ),
        error: undefined,
      }));
      setResolutions((r) => ({ ...r })); // touch so plan recomputes
    } catch (e) {
      updateSide(key, (s) => ({ ...s, status: 'error', error: describeGitHubError(e) }));
    }
  };

  const togglePaths = (key: 'A' | 'B', paths: string[], select: boolean) =>
    updateSide(key, (s) => {
      const selected = new Set(s.selected);
      for (const p of paths) {
        if (select) selected.add(p);
        else selected.delete(p);
      }
      return { ...s, selected };
    });

  const togglePath = (key: 'A' | 'B', path: string) =>
    updateSide(key, (s) => {
      const selected = new Set(s.selected);
      if (selected.has(path)) selected.delete(path);
      else selected.add(path);
      return { ...s, selected };
    });

  const toggleNode = (key: 'A' | 'B', node: TreeNode) => {
    const st = key === 'A' ? sideA : sideB;
    const paths = collectFilePaths(node);
    const all = paths.every((p) => st.selected.has(p));
    togglePaths(key, paths, !all);
  };

  const toggleExpand = (key: 'A' | 'B', path: string) =>
    updateSide(key, (s) => {
      const expanded = new Set(s.expanded);
      if (expanded.has(path)) expanded.delete(path);
      else expanded.add(path);
      return { ...s, expanded };
    });

  const setResolution = (path: string, r: ConflictResolution) =>
    setResolutions((prev) => ({ ...prev, [path]: r }));

  const setAllResolutions = (r: ConflictResolution) =>
    setResolutions((prev) => {
      const next = { ...prev };
      for (const c of conflicts) next[c.path] = r;
      return next;
    });

  /* ---------------------------- derived state ---------------------------- */

  const conflicts: ConflictInfo[] = useMemo(() => {
    if (sideA.snapshot && sideB.snapshot) return detectConflicts(sideA.snapshot.entries, sideB.snapshot.entries);
    return [];
  }, [sideA.snapshot, sideB.snapshot]);

  const conflictPaths = useMemo(() => new Set(conflicts.map((c) => c.path)), [conflicts]);

  const repoAName = sideA.snapshot ? folderNameForRepo(sideA.snapshot.repo) : 'repo-a';
  const repoBName = sideB.snapshot ? folderNameForRepo(sideB.snapshot.repo) : 'repo-b';

  const plan = useMemo(() => {
    if (!sideA.snapshot || !sideB.snapshot) return null;
    return planMerge(
      sideA.snapshot.entries,
      sideB.snapshot.entries,
      sideA.selected,
      sideB.selected,
      resolutions,
      repoAName,
      repoBName
    );
  }, [sideA, sideB, resolutions, repoAName, repoBName]);

  const bothReady = sideA.status === 'ready' && sideB.status === 'ready';

  const estimatedBytes = useMemo(() => {
    if (!plan || !sideA.snapshot || !sideB.snapshot) return 0;
    const sizeOf = (snap: RepoSnapshot) => {
      const m = new Map(snap.entries.filter((e) => e.type === 'blob').map((e) => [e.path, e.size]));
      return m;
    };
    const mapA = sizeOf(sideA.snapshot);
    const mapB = sizeOf(sideB.snapshot);
    return plan.items.reduce((acc, it) => {
      const size = it.source === 'A' ? mapA.get(it.sourcePath) : mapB.get(it.sourcePath);
      return acc + (size || 0);
    }, 0);
  }, [plan, sideA.snapshot, sideB.snapshot]);

  const suggestedName = useMemo(() => {
    if (sideA.snapshot && sideB.snapshot) {
      const s = `${sideA.snapshot.repo}-plus-${sideB.snapshot.repo}`.slice(0, 90);
      return s.replace(/[^A-Za-z0-9_.-]/g, '-');
    }
    return '';
  }, [sideA.snapshot, sideB.snapshot]);

  // check the destination name (debounced)
  useEffect(() => {
    const name = newRepoName.trim();
    if (!name) {
      setNameStatus('idle');
      setRepoExists(false);
      return;
    }
    if (!REPO_NAME_RE.test(name) || name.length > 100 || name.startsWith('.') || name.endsWith('.')) {
      setNameStatus('invalid');
      return;
    }
    if (!token.trim() || !destOwner) return;
    setNameStatus('checking');
    const handle = setTimeout(async () => {
      try {
        const info = await probeRepo(token.trim(), destOwner, name);
        setRepoExists(info.exists);
        setNameStatus(info.exists ? 'exists' : 'ok');
      } catch {
        setNameStatus('idle');
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [newRepoName, destOwner, token]);

  /* ------------------------------ combine -------------------------------- */

  const handleCombine = async () => {
    setFatalError(null);
    setResult(null);
    setRunLog([]);
    const t = token.trim();
    const name = newRepoName.trim();
    if (!t) return setFatalError('Verify a GitHub token in step 1 first.');
    if (!sideA.snapshot || !sideB.snapshot) return setFatalError('Load both repositories first.');
    if (!REPO_NAME_RE.test(name)) return setFatalError('Give the new repository a valid name (letters, digits, -, _, .).');
    if (!plan || plan.items.length === 0) return setFatalError('Nothing selected — pick at least one file from either repository.');
    if (plan.items.length > MAX_FILES) return setFatalError(`Too many files selected (${plan.items.length} > ${MAX_FILES}). Narrow the selection.`);

    try {
      // ---- 1. download the planned files from both source repos ----------
      setPhase('downloading');
      const shaOf = (snap: RepoSnapshot) =>
        new Map(snap.entries.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));
      const mapA = shaOf(sideA.snapshot);
      const mapB = shaOf(sideB.snapshot);

      const wantedA: TreeEntry[] = plan.items
        .filter((i) => i.source === 'A')
        .map((i) => ({ path: i.sourcePath, sha: mapA.get(i.sourcePath)!, size: 0, type: 'blob' as const }));
      const wantedB: TreeEntry[] = plan.items
        .filter((i) => i.source === 'B')
        .map((i) => ({ path: i.sourcePath, sha: mapB.get(i.sourcePath)!, size: 0, type: 'blob' as const }));

      const totalDl = wantedA.length + wantedB.length;
      let dlDone = 0;
      const skipped: SkippedFile[] = [];
      const progress = (path: string) => {
        dlDone += 1;
        setDlProgress({ done: dlDone, total: totalDl, message: path });
      };

      setRunLog([`Downloading ${totalDl} files from ${sideA.snapshot.fullName} and ${sideB.snapshot.fullName}…`]);
      const resA = await fetchRepoFiles(t, sideA.snapshot.owner, sideA.snapshot.repo, wantedA, (d, tot, p) => {
        void d; void tot;
        progress(p);
      });
      const resB = await fetchRepoFiles(t, sideB.snapshot.owner, sideB.snapshot.repo, wantedB, (d, tot, p) => {
        void d; void tot;
        progress(p);
      });
      skipped.push(...resA.skipped, ...resB.skipped);

      const bytesByPath = new Map<string, Uint8Array>();
      for (const [path, file] of resA.files) bytesByPath.set(`A:${path}`, file.bytes);
      for (const [path, file] of resB.files) bytesByPath.set(`B:${path}`, file.bytes);

      const files = plan.items
        .map((it) => {
          const bytes = bytesByPath.get(`${it.source}:${it.sourcePath}`);
          return bytes ? { path: it.path, bytes } : null;
        })
        .filter((f): f is { path: string; bytes: Uint8Array } => Boolean(f));

      if (files.length === 0) throw new Error('Every selected file was skipped (too large or ignored). Adjust the selection.');
      if (skipped.length > 0) {
        setRunLog((log) => [...log, `Skipped ${skipped.length} file(s): ${skipped.slice(0, 5).map((s) => s.path).join(', ')}${skipped.length > 5 ? '…' : ''}`]);
      }

      // ---- 2. create the new repo + one commit with the combined tree ----
      setPhase('publishing');
      setPubProgress({ done: 0, total: files.length, message: 'Preparing…' });
      const res = await publishFiles(
        { files },
        {
          token: t,
          owner: destOwner,
          repo: name,
          branch: branch.trim() || 'main',
          message:
            commitMessage.trim() ||
            `Merge ${sideA.snapshot.fullName} + ${sideB.snapshot.fullName} into ${destOwner}/${name}`,
          createRepoIfMissing: !repoExists,
          isPrivate,
          onProgress: (e) =>
            setPubProgress({ done: e.done, total: e.total, message: `${e.phase}: ${e.message}` }),
        }
      );
      setRunLog((log) => [...log, `Done — ${res.files} files committed to ${res.branch}.`]);
      setResult(res);
      setPhase('done');
    } catch (e) {
      setFatalError(describeGitHubError(e));
      setPhase('idle');
    }
  };

  const busy = phase === 'downloading' || phase === 'publishing';
  const overall =
    phase === 'downloading' && dlProgress.total > 0
      ? 0.4 * (dlProgress.done / dlProgress.total)
      : phase === 'publishing' && pubProgress.total > 0
        ? 0.4 + 0.6 * (pubProgress.done / pubProgress.total)
        : phase === 'done'
          ? 1
          : 0;

  const copyResultLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`https://github.com/${result.owner}/${result.repo}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const nameBadge = () => {
    switch (nameStatus) {
      case 'checking':
        return <span className="flex items-center gap-1 text-xs text-app-dim"><Loader2 className="w-3.5 h-3.5 animate-spin" /> checking…</span>;
      case 'ok':
        return <span className="flex items-center gap-1 text-xs text-green-500"><Check className="w-3.5 h-3.5" /> available</span>;
      case 'exists':
        return <span className="flex items-center gap-1 text-xs text-amber-500"><AlertTriangle className="w-3.5 h-3.5" /> exists — the merge commit will be added to it</span>;
      case 'invalid':
        return <span className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle className="w-3.5 h-3.5" /> invalid name</span>;
      default:
        return null;
    }
  };

  /* -------------------------------- render ------------------------------- */

  const header = (
        <header className="flex items-center gap-3">
          {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-app-panel border border-app-border hover:border-app-text/50 text-app-dim hover:text-app-text transition"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-app-panel border border-app-border flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-app-text" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Repo Merger</h1>
            <p className="text-xs text-app-dim">
              Combine features &amp; resources from two GitHub repositories into a single new named repository.
            </p>
          </div>
        </header>
  );

  const body = (
    <>
        {/* step 1 — auth + sources */}
        <StepCard
          step={1}
          title="Access token"
          subtitle="Fine-grained PAT with Contents: Read on both source repos and Read+Write on the new one — or a classic PAT with the repo scope. Sent only to api.github.com."
        >
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-app-dim" />
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyToken()}
                placeholder="ghp_… or github_pat_…"
                className={`${inputCls} pl-9 pr-10`}
              />
              <button
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-app-dim hover:text-app-text"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={verifyToken} disabled={authBusy || !token.trim()} className={btnPrimary}>
              {authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Verify token
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-app-muted cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-current"
              />
              Remember on this device (localStorage)
            </label>
            {tokenInfo && (
              <span className="flex items-center gap-1.5 text-xs text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                Signed in as <span className="font-semibold">{tokenInfo.login}</span>
                {tokenInfo.scopes.length > 0 && (
                  <span className="text-app-dim">({tokenInfo.scopes.join(', ')})</span>
                )}
              </span>
            )}
            {authError && (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="w-4 h-4" /> {authError}
              </span>
            )}
          </div>
        </StepCard>

        {/* step 2 — the two repositories */}
        <StepCard
          step={2}
          title="Pick the two repositories"
          subtitle="Each is read with the Git Data API. After loading, tick the features/files you want from each side — everything is selected by default."
          right={
            bothReady && conflicts.length > 0 ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {conflicts.length} conflicting path{conflicts.length === 1 ? '' : 's'}
              </span>
            ) : undefined
          }
        >
          <div className="grid md:grid-cols-2 gap-4">
            <RepoPanel
              label="A"
              accent="#22c55e"
              state={sideA}
              tokenReady={Boolean(tokenInfo)}
              onInput={(v) => updateSide('A', (s) => ({ ...s, input: v }))}
              onLoad={() => loadSide('A')}
              onFilter={(v) => updateSide('A', (s) => ({ ...s, filter: v }))}
              onToggleNode={(n) => toggleNode('A', n)}
              onToggleExpand={(p) => toggleExpand('A', p)}
              onTogglePath={(p) => togglePath('A', p)}
              onSelectAll={(sel) =>
                sideA.snapshot &&
                togglePaths('A', sideA.snapshot.entries.filter((e) => e.type === 'blob').map((e) => e.path), sel)
              }
              conflictPaths={conflictPaths}
              resolutions={resolutions}
              onResolution={setResolution}
              repoAName={repoAName}
              repoBName={repoBName}
              side="A"
            />
            <RepoPanel
              label="B"
              accent="#3b82f6"
              state={sideB}
              tokenReady={Boolean(tokenInfo)}
              onInput={(v) => updateSide('B', (s) => ({ ...s, input: v }))}
              onLoad={() => loadSide('B')}
              onFilter={(v) => updateSide('B', (s) => ({ ...s, filter: v }))}
              onToggleNode={(n) => toggleNode('B', n)}
              onToggleExpand={(p) => toggleExpand('B', p)}
              onTogglePath={(p) => togglePath('B', p)}
              onSelectAll={(sel) =>
                sideB.snapshot &&
                togglePaths('B', sideB.snapshot.entries.filter((e) => e.type === 'blob').map((e) => e.path), sel)
              }
              conflictPaths={conflictPaths}
              resolutions={resolutions}
              onResolution={setResolution}
              repoAName={repoAName}
              repoBName={repoBName}
              side="B"
            />
          </div>

          {bothReady && conflicts.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-amber-400">
                {conflicts.length} path(s) exist in both repos with different content. Resolve all:
              </span>
              {(
                [
                  ['both', `Keep both (${repoAName}/… + ${repoBName}/…)`],
                  ['a', 'A wins'],
                  ['b', 'B wins'],
                  ['skip', 'Skip all'],
                ] as [ConflictResolution, string][]
              ).map(([value, text]) => (
                <button
                  key={value}
                  onClick={() => setAllResolutions(value)}
                  className="px-2.5 py-1 rounded-md bg-app-input border border-amber-500/40 text-amber-400 hover:border-amber-400 transition"
                >
                  {text}
                </button>
              ))}
              <span className="text-app-dim ml-auto">…or pick per file above.</span>
            </div>
          )}
        </StepCard>

        {/* step 3 — destination */}
        <StepCard
          step={3}
          title="Name the new repository & combine"
          subtitle="The selected files are pushed as a single commit into a brand-new repository (or into the existing one, if the name is taken)."
          right={
            plan && bothReady ? (
              <span className="text-xs text-app-dim bg-app-input border border-app-border rounded-full px-3 py-1 whitespace-nowrap">
                {plan.items.length} file{plan.items.length === 1 ? '' : 's'} · {formatBytes(estimatedBytes)}
                {plan.activeConflicts.length > 0 && ` · ${plan.activeConflicts.length} conflict${plan.activeConflicts.length === 1 ? '' : 's'}`}
              </span>
            ) : undefined
          }
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>New repository name</label>
              <div className="flex items-center gap-2">
                <input
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder={suggestedName || 'my-combined-repo'}
                  className={inputCls}
                />
                {nameBadge()}
              </div>
            </div>
            <div>
              <label className={labelCls}>Destination (owner)</label>
              <select
                value={destOwner}
                onChange={(e) => setDestOwner(e.target.value)}
                className={inputCls}
                disabled={!tokenInfo}
              >
                {!tokenInfo && <option value="">Verify token first…</option>}
                {tokenInfo && <option value={tokenInfo.login}>{tokenInfo.login} (you)</option>}
                {orgs.map((org) => (
                  <option key={org} value={org}>
                    {org} (organization)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Visibility</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 transition ${
                    !isPrivate
                      ? 'border-app-text bg-app-text/10 text-app-text font-semibold'
                      : 'border-app-border text-app-dim hover:border-app-text/40'
                  }`}
                >
                  <Globe className="w-4 h-4" /> Public
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 transition ${
                    isPrivate
                      ? 'border-app-text bg-app-text/10 text-app-text font-semibold'
                      : 'border-app-border text-app-dim hover:border-app-text/40'
                  }`}
                >
                  <Lock className="w-4 h-4" /> Private
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Branch</label>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Combined from ${sideA.snapshot?.fullName ?? 'repo A'} + ${sideB.snapshot?.fullName ?? 'repo B'}`}
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Commit message</label>
              <input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Merge repo A + repo B"
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCombine}
              disabled={busy || !tokenInfo || !bothReady || !newRepoName.trim() || nameStatus === 'invalid' || !plan || plan.items.length === 0}
              className={`${btnPrimary} px-5 py-2.5 text-sm`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {repoExists && nameStatus === 'exists'
                ? `Merge into existing ${newRepoName.trim()}`
                : `Create “${newRepoName.trim() || suggestedName || '…'}” & combine`}
            </button>
            {plan && bothReady && (
              <span className="text-xs text-app-dim flex items-center gap-1.5">
                <FolderTree className="w-4 h-4" />
                {plan.items.filter((i) => i.source === 'A').length} from A + {plan.items.filter((i) => i.source === 'B').length} from B
              </span>
            )}
          </div>

          {/* progress */}
          {busy && (
            <div className="mt-4 bg-app-card/60 border border-app-border rounded-lg p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {phase === 'downloading'
                    ? `Downloading files from the source repos… (${dlProgress.done}/${dlProgress.total})`
                    : `Creating repository & commit… ${pubProgress.message}`}
                </span>
                <span className="text-app-dim">{Math.round(overall * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-app-input overflow-hidden">
                <div
                  className="h-full bg-app-text transition-all duration-300"
                  style={{ width: `${Math.max(2, Math.round(overall * 100))}%` }}
                />
              </div>
              {phase === 'downloading' && dlProgress.message && (
                <p className="mt-2 text-xs text-app-dim truncate">{dlProgress.message}</p>
              )}
            </div>
          )}

          {fatalError && (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{fatalError}</span>
            </div>
          )}

          {/* result */}
          {phase === 'done' && result && (
            <div className="mt-4 bg-green-500/10 border border-green-500/40 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-app-text">
                    {result.createdRepo ? 'Repository created and combined!' : 'Combined into the existing repository!'}
                  </p>
                  <p className="text-xs text-app-muted mt-1">
                    {result.files} file{result.files === 1 ? '' : 's'} committed to{' '}
                    <span className="font-semibold text-app-text">
                      {result.owner}/{result.repo}
                    </span>{' '}
                    on branch <span className="font-semibold text-app-text">{result.branch}</span>.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={`https://github.com/${result.owner}/${result.repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`${btnPrimary} px-3 py-1.5 text-xs`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open repository
                    </a>
                    <a
                      href={result.commitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`${btnGhost} px-3 py-1.5 text-xs`}
                    >
                      <GitBranch className="w-3.5 h-3.5" /> View commit
                    </a>
                    <button onClick={copyResultLink} className={`${btnGhost} px-3 py-1.5 text-xs`}>
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy repo link'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {runLog.length > 0 && (
            <div className="mt-3 text-xs text-app-dim space-y-1">
              {runLog.map((line, i) => (
                <p key={i} className="flex items-center gap-2">
                  <Plus className="w-3 h-3 shrink-0" /> {line}
                </p>
              ))}
            </div>
          )}
        </StepCard>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/20 border border-slate-500/40 flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight text-app-text">Repo Merger</h2>
            <p className="text-xs text-app-dim">Combine features &amp; resources from two GitHub repositories into a single new named repository.</p>
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-app-bg text-app-text overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {header}
        {body}
      </div>
    </div>
  );
};

export default RepoMergerView;
