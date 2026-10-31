# Repo Merger (combine two GitHub repos into one)

Lets the user **access two different GitHub repositories** and **combine their
features/resources into a single new named repository** — entirely from the
browser, in one commit.

- **View:** `components/RepoMergerView.tsx` — an **Office Tools applet** (tool id `repo_merger` in `components/OfficeTools.tsx`; rendered embedded inside the Office Tools active-tool card)
- **Engine:** `services/repoMerger.ts` (reading + merge plan)
- **Push:** reuses `publishFiles` from `services/githubPublish.ts` (Git Data API: blobs → tree → commit → ref)

## Flow

1. **Token** — paste a PAT (fine-grained with *Contents: Read* on both source
   repos and *Contents: Read and write* on the destination, or a classic `repo`-scoped
   token). *Verify* resolves the identity (`GET /user`) and lists the user's orgs.
   The token is kept in memory only unless *Remember on this device* is checked
   (`localStorage['repomerger.settings.v1']`). It is only ever sent to `api.github.com`.
2. **Two repositories** — enter each as `owner/repo`, a full GitHub URL, or an SSH
   URL (parsed by `parseRepoSpec`). *Load* resolves the repo, its default branch
   and its **full recursive git tree** (`/git/trees/{sha}?recursive=1`; truncated
   trees are walked subtree-by-subtree). Submodules (`type: commit`) are skipped.
   All files start selected; top-level folders act as "features" with tri-state
   checkboxes, and a filter box flattens the list.
3. **Conflicts** — paths that exist in both repos with different blob SHAs are
   highlighted in amber and get a per-file resolution:
   - *Keep both* (default): A lands at `<repoA>/<path>`, B at `<repoB>/<path>`
   - *A wins* / *B wins*: original path keeps that side's content
   - *Skip*: dropped
   Identical files (same SHA) are merged silently, once. Bulk "resolve all"
   buttons sit above the panels.
4. **Destination** — name the new repository (validated against GitHub naming
   rules, existence probed live), pick the owner (you or one of your orgs),
   visibility, branch (default `main`), description and commit message.
5. **Combine** — the planned files are downloaded from both sources
   (`/git/blobs/{sha}`, base64, concurrency 6, skipping ignored/oversized files),
   `planMerge` produces the final path list, and `publishFiles` creates the
   repository if needed (`POST /user/repos` or `/orgs/{org}/repos`) and pushes
   the whole combination as **one commit**. If the name is already taken, the
   commit is added to the existing repository/branch instead.

## Limits

| Limit | Value |
| --- | --- |
| files per merge | 3,000 (`MAX_FILES`) |
| per-file size | 40 MB (`MAX_FILE_BYTES`) |
| always skipped | `.git/`, `node_modules/`, `.DS_Store`, `Thumbs.db`, `__MACOSX/`, `.arena/`, build output (`dist/`, `build/`, …) |
| submodules | skipped |

## Result

On success the view links to the new repository and to the exact commit
(`https://github.com/{owner}/{repo}/commit/{sha}`), so the merge can be
reviewed or reverted from GitHub like any other commit.
