# Click 2 GitHub (Creative Studio tool)

Publishes a ZIP archive — or a whole folder — into a GitHub repository as **one commit**,
entirely from the browser.

- **Tool id:** `github_publisher`
- **UI:** `components/CreationStudio/GitHubPublisherTool.tsx`
- **Engine:** `services/githubPublish.ts`

## Flow

1. Pick a `.zip` (drop it or use *Choose ZIP*) or a folder (*Choose folder* / drag a folder).
   `jszip` reads the archive locally; the archive's single top-level folder is stripped so the
   files land at the repository root, or under the optional *Subfolder*.
2. Enter `owner/repo` (a full GitHub URL works too), branch, commit message.
3. Paste a token:
   - fine-grained PAT with **Contents: Read and write** on the target repo, or
   - classic PAT with the `repo` scope.
   The token is kept in memory only, unless *Remember on this device* is checked
   (then `localStorage['click2github.settings.v1']`).
   It is only ever sent to `api.github.com`.
4. *Verify* resolves the token identity, the repository and the target branch.
5. *Publish* then runs the Git Data API:
   `POST /git/blobs` (base64, concurrency 5) → `POST /git/trees` (with `base_tree`) →
   `POST /git/commits` → `PATCH /git/refs/heads/<branch>`.
   A missing branch is created from the default branch; an empty repo gets its first commit.
   Optionally the repository itself is created (`POST /user/repos` or `/orgs/{owner}/repos`).

Every publish is a single commit, so it can be reverted from GitHub. Existing files that are not
in the archive are left untouched.

## Filters and limits

| Skipped | |
| --- | --- |
| always | `.git/`, `node_modules/`, `.DS_Store`, `Thumbs.db`, `__MACOSX/`, `.arena/` |
| unless *Include build folders* | `dist/`, `build/`, `out/`, `.next/`, `.nuxt/`, `.cache/`, `coverage/`, `__pycache__/` |
| safety | files > 40 MB, archives > 900 MB, more than 3,000 files |
