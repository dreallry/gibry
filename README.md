# DigiPus

A digital library web application for borrowing books, reading tracking, and a member community. Members browse the catalog, borrow physical copies with QR scanning or digital copies with availability windows, earn points and achievements, and take part in clubs, events, and challenges. Staff manage the catalog, loans, and memberships from an admin panel. Fine payments use Midtrans in sandbox mode.

Deployed as a Vercel (Hobby) serverless app with Firebase Spark: Authentication and Realtime Database, no Cloud Functions and no Firebase Storage.

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

Requirements: Node.js 22 (>= 22.12), a Firebase project with Email/Password or Google sign-in enabled, and the Google service account JSON when you want member actions to work locally.

```powershell
npm ci
copy .env.example .env
# fill .env with your Firebase web config and server credentials
```

Run both processes, each in its own terminal:

```powershell
npm run dev:api      # local API server on 127.0.0.1:3000
npm run dev          # Vite dev server on http://localhost:5173
```

Vite proxies `/api` to the local API. The catalog loads without server credentials; borrowing, points, profile edits, and admin actions require a configured API. An unconfigured browser Firebase config shows a setup message instead of a blank page.

## Environment Variables

Copy `.env.example` to `.env` and fill the values. On Vercel, set them for Production and Preview; changing any `VITE_` variable requires a rebuild.

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_MIDTRANS_CLIENT_KEY` | Midtrans sandbox client key (browser) |
| `VITE_MIDTRANS_IS_PRODUCTION` | `false` for sandbox |
| `VITE_API_BASE_URL` | Leave empty when frontend and API share a domain |
| `FIREBASE_DATABASE_URL` | Same database URL, for the server-side SDK |
| `FIREBASE_SERVICE_ACCOUNT` | Full service-account JSON with the private key, server only |
| `FIREBASE_STORAGE_BUCKET` | Storage bucket ID, server only |
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

Target setup: Vercel Hobby for hosting and the serverless API, Firebase Spark for Auth and Realtime Database. No Cloud Functions deployment and no Firebase Storage (Storage requires the Blaze plan), so there is no billing.

1. In Firebase Console, enable Email/Password and/or Google authentication, and add the Vercel domain to Authentication > Settings > Authorized domains.
2. Set every environment variable from the table above on Vercel for Production and Preview.
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
