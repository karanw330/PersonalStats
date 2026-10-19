# DevPulse

A colorful, static, encrypted engineering-progress dashboard built with **React, TypeScript, Vite, Mantine**, and custom SVG/CSS data visualizations. It uses **GitHub Pages** for hosting and **GitHub Actions** to refresh the encrypted data. There is **no application server, hosted database, or server-side session**.

## Features

- **Overview:** pastel bento tiles, contribution skyline, LeetCode goal orbit, AWS mission rail, revision queue.
- **Competitive coding:** LeetCode solved/difficulty/topic breakdown, calendar mosaic, latest submissions; Codeforces rating history, distinct solved problems, rating distribution.
- **GitHub:** public repositories, activity, merged PRs, optional authenticated contribution calendar.
- **AWS Billing:** seven phases and 34 individual milestones imported from Markdown; editable checkboxes saved encrypted locally.
- **Resume Hub:** PDF drag & drop, in-browser PDF.js text extraction, local encrypted IndexedDB storage, preview, primitive token diff against prior PDF. No cloud upload.
- **Reports:** daily history, seven-snapshot comparisons, export Markdown progress report.
- **Workspace:** strong-passphrase decrypt screen, 15-minute idle lock, light/dark mode, keyboard navigation via `Ctrl + K`, encrypted progress-settings import/export.

## Requirements

- Node.js **22+** and npm.
- A public GitHub repository named `devpulse` (or adjust `VITE_BASE` in the workflow and local build).
- A **long, unique passphrase**, created by you. Do **not** send credentials in chat, include them in Vite environment variables, or commit them.
- GitHub API, Codeforces API, and alfa-leetcode-api require **no separately purchased API subscription** for the public features. GitHub Actions' built-in token is used for GitHub requests; an optional user PAT may improve annual contribution coverage.

## Start locally — PowerShell (Windows)

```powershell
npm install
$secret = Read-Host 'Choose a long, unique DevPulse passphrase' -AsSecureString
$env:DEVPULSE_PASSPHRASE = [System.Net.NetworkCredential]::new('', $secret).Password
npm run init:vault
npm run sync
npm run dev
```

Then visit the local Vite address shown in the terminal and unlock with the **same passphrase**. Your raw AWS milestone document is supplied at `private/billing-milestones.md` in the downloadable project but is **ignored by Git**. `init:vault` encrypts the initial milestones + goal + four DSA revision problems to `private/config.enc.json`.

The hosted alfa API runs on a free instance that can sleep. If one or more APIs fail on first sync, the site still works; unavailable numbers are shown as `—`. Fix the data connection and run `npm run sync` again. After editing the MD file to change the initial statuses, regenerate the vault with `$env:DEVPULSE_FORCE = '1'; npm run init:vault` (this changes the baseline but not existing encrypted browser-local overrides).

When done, optionally clear secrets from your PowerShell environment:

```powershell
Remove-Item Env:DEVPULSE_PASSPHRASE
Remove-Variable secret
```

## Deploy to GitHub Pages

1. **Set a strong, unique password** using the local instructions. Use the *same* password for future refresh runs. Commit the encrypted `private/config.enc.json`, **not** the source milestone Markdown. Do not push the redacted resume sample or the real resume.
2. Create a GitHub repository named **`devpulse`** and push the project. GitHub Free requires a **public repository** for Pages; private docs should **never** be committed in plaintext to that repository. Use `git status` to review staged files, and verify `.gitignore` is respected.
3. In the repo, open **Settings → Secrets and variables → Actions → New repository secret**, add `DEVPULSE_PASSPHRASE` with the exact passphrase you used locally. **Do not send it to anyone.** GitHub's built-in `GITHUB_TOKEN` covers normal public API calls. An optional secret `GH_API_TOKEN` can contain a narrowly scoped GitHub personal access token if necessary for the contribution graph.
4. Open **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
5. Push to `main`, or run **Actions → Refresh and deploy DevPulse → Run workflow**. The workflow installs, fetches API data, encrypts a JSON payload, builds the site, and deploys the `dist` folder to Pages. It also caches the previous **encrypted** data snapshot so daily history can build up.
6. Your website will be `https://karanw330.github.io/devpulse/` if hosted under that GitHub account and repo name.

Workflows also run daily at `03:17 UTC` (~08:47 IST). GitHub can delay or skip scheduled runs; manual dispatch is provided. History caches may expire or be evicted: history is **best-effort**, not permanent archival storage.

### Different repository name or custom domain

`vite.config.ts` defaults to `base: '/devpulse/'`. For a repo named `progress`, use `VITE_BASE=/progress/` for `npm run build`, and set the equivalent environment variable for the Build static site step in Actions. For `yourname.github.io` root or a custom domain, use `VITE_BASE=/`.

## Data privacy & threat model

- GitHub Pages is **public**. A lock screen **without encryption** would not protect JSON files. Instead, all dashboard JSON is encrypted with **AES-256-GCM** using a random 16-byte salt, random 12-byte nonce and PBKDF2-SHA256 (310,000 iterations) *before deployment*. The passphrase is **not embedded** in static site code.
- You must use a strong passphrase, **not a 4–6 digit PIN**: an attacker can download the ciphertext and attempt **offline guesses**. A frontend lock has no rate limiter that can stop offline guessing.
- The encrypted seed `private/config.enc.json` is committed as ciphertext to the public repository. Its security rests on the secret passphrase. **Raw** milestone Markdown lives in a gitignored file, provided in this zip only for initial setup, not committed.
- Resume PDFs are encrypted in the **browser's IndexedDB**, and the plaintext exists in memory temporarily while unlocked. IndexedDB data can be lost when clearing browser data. Export a separate PDF backup yourself.
- Edits to milestones/goals/backlog are **local to your browser** and encrypted in localStorage; use **Settings → Export encrypted changes** to back up or move them to another browser. Changes are not written into the GitHub Actions source seed.
- Encryption does **not** protect you from a malicious website script, compromised build dependency, compromised GitHub account, malware/browser extensions, a weak passphrase, or malicious code published to your Pages domain. Review PRs and dependencies, use 2FA, and limit repository access.
- Public GitHub/LeetCode/Codeforces activity remains public on its original platforms even when you encrypt its *copy* in this dashboard.
- Do not put tokens in `VITE_...` variables. Anything bundled into frontend JS is public. Keep tokens in **GitHub Actions Secrets**, used only when fetching data.

## API integration details

The collector in `scripts/sync.mjs` obtains:

- GitHub REST: `/users/{username}`, `/users/{username}/events/public`, Search merged PRs. GitHub GraphQL contribution calendar is requested when an authentication token is provided.
- LeetCode: [`alfa-leetcode-api`](https://github.com/alfaarghya/alfa-leetcode-api) endpoints `/solved`, `/calendar`, `/skill`, `/submission`, `/contest`.
- Codeforces: official `user.info`, `user.rating`, `user.status` (up to 2,000 submissions for the distinct solved-problem figure).

The collector tolerates individual endpoint failures without fabricating values. When *an entire integration fails*, it reuses the last good encrypted snapshot if available and reports the sync error.

## Useful commands

```bash
npm run init:vault  # import/encrypt the milestone Markdown (first run only)
npm run sync        # API fetch + encrypted dashboard public/data/dashboard.enc.json
npm run dev         # Vite hot reload
npm run build       # typecheck + production build to dist/
npm run preview     # preview production build
npm run selftest    # verify Node encryption/decryption and integrity failure
```

## Repository structure

```text
src/
  App.tsx                  authenticated shell, navigation, session lock
  pages/                   dashboard, coding, GitHub, projects, resume, reports
  components/Visuals.tsx  custom charts and visual primitives
  styles/app.css           bento layout, themes, responsive styling
  lib/                     Web Crypto, PDF.js, local encrypted preferences
scripts/
  init-vault.mjs           milestone import and encrypted private seed
  sync.mjs                 API collector and encrypted data emitter
  vault.mjs                Node crypto matching browser Web Crypto
private/
  billing-milestones.md    raw source; ignored by git
  config.enc.json          encrypted seed; safe to commit with strong passphrase
public/data/
  dashboard.enc.json       encrypted bundle; generated and ignored in source
.github/workflows/deploy.yml
```

## Known limitations

- Milestone completion can be edited in the browser but does not sync across devices without manual encrypted backup transfer.
- The PDF text diff is word-set based, not a layout-aware semantic diff. Scanned PDF pages need OCR (not included).
- This is static-site encryption, not enterprise authentication or zero-trust identity management.
- The current GitHub data model deliberately counts activity and PRs, **not GitHub code submissions as a ranked contest platform does**.
- API responses can change, or external services can rate-limit scheduled requests. Sync errors are visible through freshness indicators, and source normalizers may need updates.
