# Publishing MAGGI to a new GitHub repo

The sandbox's GitHub token can push to existing repos but **cannot create new
ones** (`403 Resource not accessible by integration` on both `gh repo create`
and `POST /user/repos`). Everything else is ready: a full commit exists in a
git bundle at the repository root.

- Bundle: `maggi-repo.bundle` (1.5 MB, complete history, branch `main`)
- Commit: `9b52c44` — *MAGGI: grounded RAG engine with FreeLLMAPI brain*
- Contains: all app code + MAGGI, excluding `node_modules`, `dist`, `.env`
- Visibility chose: **private** · Name chose: **MAGGI**

---

## Option A — create it in the GitHub UI, then push (fastest)

1. Open <https://github.com/new>
2. Owner `saxeine` · Repository name `MAGGI` · **Private**
3. **Do not** initialise with README/.gitignore/license (we already have commits)
4. Click *Create repository*, then run:

```bash
cd /tmp
git clone /path/to/maggi-repo.bundle MAGGI
cd MAGGI
git remote set-url origin https://github.com/saxeine/MAGGI.git
git push -u origin main
```

If you don't have the bundle handy, unpack it first:

```bash
git clone maggi-repo.bundle MAGGI
cd MAGGI
git remote set-url origin https://github.com/saxeine/MAGGI.git
git push -u origin main
```

## Option B — one-liner if your own token has `createRepository`

```bash
cd /tmp/maggi-repo
gh repo create saxeine/MAGGI --private \
  --description "Aggi media aggregator with MAGGI — a grounded RAG engine using FreeLLMAPI as its brain." \
  --source=. --remote=origin --push
```

## Option C — from the existing repo's pushed branch

The same commit is already on the old repo:

```bash
gh repo create saxeine/MAGGI --private --source=/home/user/Aggi-0001-01Nov --push
# then, in the new repo, drop the old remote:  git remote remove origin
```

---

## Note on credentials before you flip it public

`firebase-applet-config.json` contains a Firebase **web** API key
(`AIzaSy…`). Firebase web keys are designed to be public — they identify the
project, and Firestore security rules (see `firestore.rules`) are what actually
protect data. Still, if you ever make this public, restrict that key by HTTP
referrer in Google Cloud Console, or move the config to an env var.

Real secrets (`GEMINI_API_KEY`, `FREELLMAPI_API_KEY`, …) are read from the
environment only — see `.env.example`. No `.env` file is committed.
