# DigiPus

A digital library web application for borrowing books, reading tracking, and a member community. Members browse the catalog, borrow physical copies with QR scanning or digital copies with availability windows, earn points and achievements, and take part in clubs, events, and challenges. Staff manage the catalog, loans, and memberships from an admin panel. Fine payments use Midtrans in sandbox mode.

The configured deployment target is Vercel with Firebase Authentication and Realtime Database. The active application does not require Firebase Cloud Functions or Firebase Storage. This is a React/Node.js application, not a PHP or MySQL application; XAMPP is not required even if the repository is stored inside `htdocs`.

## Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Contributing and Licensing](#contributing-and-licensing)

## Features

**Catalog and loans**

- Book catalog with covers, search, and category filtering
- Multi-book borrowing, single return, and loan history tracking
- Digital loans with an availability window (`availableAfter`) and reservations
- QR code scanning for attendance and library visits
- Digital PDF access through provider links attached to loans, kept out of the public catalog

**Reading and gamification**

- Reading dashboard with per-book progress and statistics
- Reading notes per borrowed book
- Points wallet, XP levels, daily streak claims, quests, and achievements
- Deterministic achievement keys so retries never duplicate data
- Leaderboard and rewards redemption (points spent through the API)

**Community**

- Friends, likes, and pokes with real-time presence (`onDisconnect` registered before status writes)
- Direct messages and book club chat
- Club membership counts derived from membership data, no trigger counters
- Events with attendance check-in
- Public profile pages with compressed avatars (JPEG 160x160, max 24,576 character data URLs)

**Staff**

- Admin panel for catalog editing, user management, loan management, and announcements
- Account deletion and membership reset flows guarded server-side
- Safe-deletion rules: staff accounts and accounts with active loans, fines, or transactions are retained
- Daily maintenance cron for loan cleanup, payment reconciliation, and retry of failed jobs

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Routing | React Router 7 |
| UI | Radix primitives, Lucide and HugeIcons, Framer Motion, Recharts, Sonner |
| Backend API | Vercel serverless function (Node 22), single endpoint `api/[...path].js` |
| Database | Firebase Realtime Database with `firebase-admin` 14 on the server |
| Auth | Firebase Authentication (Email/Password and Google) |
| Payments | Midtrans Snap, sandbox mode for fines |
| Hosting | Vercel (region `sin1`) with a daily cron job |

## Architecture

The browser talks to one serverless endpoint. Handlers are whitelisted, and each check runs server-side: ID token validity, email verification, role, ownership, request size, and rate limits. Money, role, and loan-limit changes only happen on the server.

```
Browser (React SPA)
   |
   |  HTTPS, /api/<endpoint>
   v
Vercel serverless  api/[...path].js        one function, Node 22, 60s
   |
   |  require('../functions/server/…')
   v
functions/server/*.cjs                    whitelisted endpoint handlers
   |                                        http, payments, circulation, points,
   |                                        accounts, social, operations,
   |                                        projections, maintenance, catalog,
   |                                        errors, member-actions, public-profiles
   v
Firebase Auth + Realtime Database         protected by database.rules.json
```

Data access is separated per feature in `src/lib/`. `firestore.ts` is a compatibility facade over Realtime Database, kept so feature modules keep a stable interface. `functions/src/index.ts` is a legacy Firebase Functions adapter, outside the active deploy target.

Security-relevant details:

- Browser Firebase values (`VITE_*`) are public project identifiers, safe to ship in client code
- Server credentials (`FIREBASE_*`, `MIDTRANS_SERVER_KEY`, `CRON_SECRET`) exist only in server environment variables
- The service account private key is passed as JSON in `FIREBASE_SERVICE_ACCOUNT` and never shipped to the browser
- The PDF URL is excluded from the public catalog and synced privately on loan creation
- The maintenance cron endpoint requires the `CRON_SECRET`

## Project Structure

```
api/[...path].js            Vercel serverless entry, endpoint whitelist
functions/server/           API business modules (.cjs)
functions/src/              legacy Firebase Functions adapter (unused in deploys)
src/                        React SPA
  Application.tsx, App.tsx  shell and routes
  pages/                    page components per route
  components/               shared UI components
  lib/                      per-feature data access and domain logic
  hooks/                    shared hooks
  contexts/                 auth and admin-view contexts
scripts/                    local API dev server, data migration
tests/                      unit (.test.cjs) and integration tests
public/                     static assets, cover art, avatar frames
firebase.json, vercel.json  hosting and deployment config
database.rules.json         Realtime Database rules
firestore.rules, storage.rules, firestore.indexes.json   legacy references
```

## Getting Started

Requirements:

- Node.js 22.12 or later within the Node.js 22 release line, as specified by `package.json`, and npm.
- A Firebase project with Realtime Database and Email/Password and/or Google authentication enabled.
- Server-side Firebase credentials for authenticated member and staff actions.
- A Midtrans sandbox account only if you want to test fine payments.

Clone and install (PowerShell on Windows):

```powershell
git clone https://github.com/dreallry/gibry.git
cd gibry
npm ci
copy .env.example .env
# fill .env with your Firebase web config and server credentials
```

Run both processes, each in its own terminal:

```powershell
npm run dev:api      # local API server on 127.0.0.1:3000
npm run dev          # Vite dev server on http://localhost:5173
```

Vite proxies `/api` to the local API. Public catalog access requires a valid browser Firebase configuration, deployed database rules, and catalog data, but not server credentials. Borrowing, points, profile edits, and admin actions require a configured API. An unconfigured browser Firebase config shows a setup message instead of a blank page. A newly created database starts empty; this repository does not include a production database export or user records.

## Environment Variables

Copy `.env.example` to `.env` and fill the values. On Vercel, set them for Production and Preview; changing any `VITE_` variable requires a rebuild.

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_MIDTRANS_CLIENT_KEY` | Midtrans sandbox client key (browser) |
| `VITE_MIDTRANS_IS_PRODUCTION` | `false` for sandbox |
| `VITE_API_BASE_URL` | Leave empty when frontend and API share a domain |
| `FIREBASE_DATABASE_URL` | Same database URL, for the server-side SDK |
| `FIREBASE_SERVICE_ACCOUNT` | Full service-account JSON with the private key, server only |
| `MIDTRANS_SERVER_KEY` | Midtrans sandbox server key, server only |
| `MIDTRANS_IS_PRODUCTION` | `false` for sandbox |
| `FRONTEND_ORIGIN` | Primary frontend origin for CORS |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins |
| `CRON_SECRET` | Random secret (32+ hex chars) authorizing the maintenance cron |

Vercel domains (`VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`) are accepted automatically; add custom domains to `ALLOWED_ORIGINS`.

Generate the cron secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Generate the service-account JSON in Firebase Console > Project settings > Service accounts > Generate new private key. Store it only in `FIREBASE_SERVICE_ACCOUNT`, never in `VITE_` variables, code, or Git.

For local `.env` files, keep `FIREBASE_SERVICE_ACCOUNT` on one line as valid JSON. Preserve escaped `\n` sequences inside the private key. On Vercel, paste the JSON as the environment-variable value without a surrounding shell assignment. Alternatively, the server supports `GOOGLE_APPLICATION_CREDENTIALS` pointing to an untracked credential file outside the repository. Use a separate development Firebase project rather than production credentials.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with `/api` proxy |
| `npm run dev:api` | Local API server on 127.0.0.1:3000 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests with `node --test` |
| `npm run test:integration` | Emulator-backed integration tests, sequential |
| `npm run build` | Type-check project references, then Vite production build to `dist` |
| `npm run preview` | Preview the production build |
| `npm run migrate:data` | Migrate a legacy database catalog, points, loans (see below) |

## Testing

Unit tests run without external services:

```powershell
npm test
```

Integration tests need Java and the Firebase CLI. Start the emulators first:

```powershell
firebase emulators:start --only "database,auth" --project demo-digipus
```

Then run with the emulator hosts set:

```powershell
$env:FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9018'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9098'
npm run test:integration
```

The tests only accept the loopback `demo-digipus` emulator, delete emulator fixtures between runs, and never touch the production project or a real payment gateway. `permission_denied` failures in access-rejection tests are expected outcomes.

## Deployment

Target setup: Vercel for hosting and the serverless API, Firebase for Authentication and Realtime Database. The active deployment excludes the legacy Firebase Functions adapter and does not use Firebase Storage. Check provider quotas, current plan eligibility, and payment fees before deploying; this configuration is not a guarantee of zero cost.

1. In Firebase Console, enable Email/Password and/or Google authentication, and add the Vercel domain to Authentication > Settings > Authorized domains.
2. Set every environment variable from the table above on Vercel for Production and Preview.
   Create the Realtime Database and deploy its rules with `firebase deploy --only database --project YOUR_PROJECT_ID`. Review the rules against your data model before exposing the application. Do not rely on the repository's existing Firebase project alias for your own deployment.
3. Push the repository and import it in Vercel, or deploy with the Vercel CLI. `vercel.json` already configures the Vite framework, the `dist` output, one Node 22 function with a 60-second limit, the `sin1` region, and a daily cron at 01:00 UTC hitting `/api/maintenance`.
4. For a demo payment flow, set the Midtrans sandbox key pair and point the Midtrans notification URL at `https://<your-domain>.vercel.app/api/midtrans-webhook`. Midtrans is used for fine payments only; all books borrow free of charge.
5. Test on the Vercel Preview deployment before promoting to Production.

Alternatively, deploy the static `dist` folder to Firebase Hosting using the `hosting` target in `firebase.json`; member actions still need the server API, which is not provided by that free-tier hosting.

### Migrating an existing database

```powershell
npm run migrate:data -- --project=PROJECT_ID --points=reviewed
```

The script refuses to write without `--apply`. `reviewed` keeps previously reviewed point balances; use `reset` only when balances may be discarded. Inspect the results on a staging copy first. After resolving conflicts, with a database backup taken and writes paused:

```powershell
npm run migrate:data -- --project=PROJECT_ID --points=reviewed --maintenance --apply
firebase deploy --only database --project PROJECT_ID
```

The migration prepares the catalog, public profiles, the points ledger, loan keys, and digital availability timestamps. The project owner registers the first admin account; browser registration always creates a regular member.

## Security Notes

- `.env` is git-ignored. Never commit secrets and never prefix a server key with `VITE_`, which exposes it in the client build.
- Verify nothing sensitive is tracked before committing: `git status` should never list `.env`, `*.log`, or any `*service-account*.json` file.
- All privilege, ownership, and money operations are enforced server-side in `api/[...path].js`; the client is untrusted.
- The Realtime Database rules are stored in `database.rules.json` and deploy with `firebase deploy --only database`.
- Request bodies are size-limited per endpoint, and endpoints that need a recently verified session (account deletion, membership resets) demand fresh authentication.

### Publishing safely

The ignore rules exclude local environment files, common private-key and service-account filenames, dependencies, build artifacts, deployment metadata, logs, database dumps, backups, uploads, and local school-work exports. `.env.example` contains configuration names and placeholders, not credentials.

Before publishing a change:

```powershell
git status --short
git diff --cached --stat
git diff --cached
# If Gitleaks is installed, scan both history and the staged content:
gitleaks git . --redact
git diff --cached --no-ext-diff | gitleaks stdin --redact
```

For a staged-content scan in PowerShell, use `git diff --cached --no-ext-diff | gitleaks stdin --redact`. Review file names and binary assets manually as well. Automated scans reduce risk but cannot prove that a repository contains no sensitive or copyrighted material. `.gitignore` does not remove files already committed. If a real secret was ever committed, revoke or rotate it immediately and review all affected branches and history before pushing.

Firebase browser configuration and the Midtrans client key are intentionally browser-visible; they are not substitutes for database rules, server authorization, provider restrictions, or abuse controls. Never use a real server credential as a sample value.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Firebase configuration message at startup | Fill the required `VITE_FIREBASE_*` variables and restart Vite. Rebuild after changing browser variables in a deployment. |
| Empty catalog | Confirm the intended database URL, database rules, and catalog data. A fresh project has no imported books. |
| API connection error locally | Start `npm run dev:api` alongside Vite; verify port 3000 is available. |
| API reports missing server configuration | Set `FIREBASE_DATABASE_URL` and valid server credentials. Never expose them through a `VITE_` variable. |
| Request rejected because of its origin | Add the exact browser origin, including protocol and port, to `ALLOWED_ORIGINS`. |
| Member action rejected | Check sign-in, email verification, membership state, and role. Sensitive account actions can require a fresh login. |
| Midtrans checkout or notification fails | Use matching sandbox keys, keep both production flags `false`, and configure the publicly reachable webhook URL. |
| Integration tests cannot connect | Start the local Auth and Database emulators and set the loopback host variables shown above. |
| Static deployment loads but actions fail | Static hosting and `npm run preview` do not provide the server API. Deploy/configure the API separately. |

## Contributing and Licensing

Keep changes focused, use `.env.example` for configuration names only, and run unit tests, type checking, linting, and a production build before submitting changes. Run emulator-backed integration tests when modifying database rules or backend behavior. Do not include personal data, database exports, credentials, or generated files in pull requests.

No license file is included in this repository. Do not assume permission to redistribute the application or its bundled artwork and book-cover images; obtain the relevant permissions before reuse or public distribution.
