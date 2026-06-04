# eCourtSolutionUI

React + TypeScript dashboard for the [eCourtSolution](../eCourtSolution) API — a unified query engine for Supreme Court of India, 25 High Courts, and 700+ District Court complexes.

The UI ships **fully functional in mock mode** (no backend required) and switches to the live API by changing a single environment variable. All pages, search flows, and detail panels work out of the box.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Quick start](#quick-start)
3. [Environment variables](#environment-variables)
4. [Project structure](#project-structure)
5. [Development setup](#development-setup)
6. [Available scripts](#available-scripts)
7. [Mock mode vs live API](#mock-mode-vs-live-api)
8. [Code quality](#code-quality)
9. [Debugging guide](#debugging-guide)
10. [Production build](#production-build)
11. [Deployment](#deployment)
12. [API service layer](#api-service-layer)
13. [Design system](#design-system)

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Node.js | 20.x LTS | `node --version` |
| npm | 10.x | `npm --version` |
| Git | Any recent | `git --version` |

The backend (`eCourtSolution`) is **not required** to run the UI in development — mock mode provides realistic data for all pages. You only need the backend running when you switch `VITE_USE_MOCK=false`.

---

## Quick start

```bash
# 1. Clone the repository
git clone <repo-url>
cd eCourtSolutionUI

# 2. Install dependencies
npm install

# 3. Copy the environment template
cp .env.example .env

# 4. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app loads in mock mode — all pages are fully interactive with realistic Indian court data, no backend needed.

---

## Environment variables

All variables are prefixed with `VITE_` so Vite embeds them into the client bundle at build time. Copy `.env.example` to `.env` and edit as needed. **Never commit `.env` to version control.**

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the eCourtSolution backend API |
| `VITE_API_KEY` | `ecourt_dev_secret_key_12345` | API key sent as the `X-API-Key` header on every request |
| `VITE_USE_MOCK` | `true` | Set to `false` to route all requests to the live backend |

### Per-environment files

Vite loads env files in this priority order (higher overrides lower):

```
.env                  # shared defaults — commit this if values are non-sensitive
.env.local            # your local overrides — gitignored, never committed
.env.production       # values baked in when running `npm run build`
.env.production.local # local production overrides — gitignored
```

### Production environment injection

For Docker / Kubernetes deployments the values are baked into the JS bundle at `npm run build` time. Either:

- Set the variables in your CI environment before running the build, **or**
- Use a runtime config injection approach (see [Deployment → Runtime env injection](#runtime-env-injection))

---

## Project structure

```
eCourtSolutionUI/
├── public/                   # Static assets copied verbatim to dist/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── main.tsx              # React root — mounts <App /> into #root
│   ├── App.tsx               # Top-level layout: sidebar + header + page router
│   ├── index.css             # Global CSS design system (variables, utilities, layout)
│   │
│   ├── components/           # Shared UI components used across pages
│   │   ├── Header.tsx        # Top bar: page title, mock toggle, API status badge
│   │   ├── Sidebar.tsx       # Desktop sidebar + mobile drawer + bottom nav bar
│   │   └── Notification.tsx  # Fixed-position toast notification (replaces alert())
│   │
│   ├── hooks/
│   │   └── useToast.ts       # useToast() — returns { message, showToast }
│   │
│   ├── pages/                # One file per top-level navigation section
│   │   ├── Dashboard.tsx     # Operational overview, stat cards, seed job status
│   │   ├── Cases.tsx         # CNR / party / advocate search + order timeline
│   │   ├── Judgments.tsx     # Full-text search over archive + live portal
│   │   ├── CauseLists.tsx    # Daily cause list by court + date
│   │   ├── Directory.tsx     # Court registry + state → district → complex drill-down
│   │   ├── Advocates.tsx     # Advocate profile search + claim modal
│   │   ├── Judges.tsx        # Judge profile search + disposal analytics
│   │   ├── BulkJobs.tsx      # Async bulk ingestion queue + job tracker
│   │   └── AdminPanel.tsx    # CAPTCHA stats, entity resolution board, crawl seeds
│   │
│   └── services/
│       └── api.ts            # API client: TypeScript interfaces + mock data + live fetch
│
├── .env.example              # Environment variable template — copy to .env
├── .gitignore
├── eslint.config.js          # ESLint flat config (TypeScript + React Hooks + React Refresh)
├── index.html                # HTML entry point — Vite injects the JS bundle here
├── package.json
├── package-lock.json         # Lockfile — always commit this
├── tsconfig.json             # Root TypeScript config (references app + node configs)
├── tsconfig.app.json         # App source TypeScript config (strict, ES2023 target)
├── tsconfig.node.json        # Vite config TypeScript config
└── vite.config.ts            # Vite configuration
```

### Navigation model

The app uses **tab-based SPA routing** — there is no URL router (no React Router, no TanStack Router). Page selection is managed by a single `activeTab` string in `App.tsx`. This keeps the bundle small and the architecture simple. URL routing can be added in a future phase if deep-linking is required.

---

## Development setup

### 1. Install dependencies

```bash
npm install
```

This installs all dependencies from `package-lock.json` (exact versions). If `package-lock.json` is missing or corrupted, delete it and `node_modules/` then re-run.

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work immediately for mock-mode development. No edits required unless you are connecting to a live backend.

### 3. Start the dev server

```bash
npm run dev
```

Vite starts at **http://localhost:5173** with:
- **Hot Module Replacement (HMR)** — edits to any `.tsx`, `.ts`, or `.css` file reflect instantly in the browser without a full page reload. React component state is preserved across most edits.
- **Instant TypeScript type errors** — Vite does not type-check during dev (for speed), but `tsc` errors appear in the terminal from a separate process if you run `npm run build` or your IDE.
- **Env var reloading** — changes to `.env` require restarting the dev server (`Ctrl+C` then `npm run dev`).

### 4. Working with mock data

All pages work without the backend. Mock data lives in `src/services/api.ts` in the `MOCK_*` constants. To add more realistic cases, judgments, or advocates for a feature you are building, edit those constants — the mock search functions filter by the same fields as the live API.

---

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR at http://localhost:5173 |
| `npm run build` | Type-check with `tsc` then bundle for production into `dist/` |
| `npm run preview` | Serve the `dist/` build locally at http://localhost:4173 — simulates production |
| `npm run lint` | Run ESLint across all `.ts` and `.tsx` files |

> **Tip:** Always run `npm run preview` after `npm run build` before deploying — the production build behaves slightly differently from the dev server (no HMR, assets are hashed, source maps are stripped).

---

## Mock mode vs live API

### How it works

`src/services/api.ts` exports an `apiConfig` object:

```ts
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  useMock: import.meta.env.VITE_USE_MOCK !== 'false', // true unless explicitly 'false'
  apiKey:  import.meta.env.VITE_API_KEY  ?? 'ecourt_dev_secret_key_12345',
};
```

Every `apiService` method checks `apiConfig.useMock` and branches:
- **Mock path** — returns filtered data from the `MOCK_*` constants with a short simulated delay
- **Live path** — makes a real `fetch()` to `apiConfig.baseUrl` with `X-API-Key` header, unwraps the `{ data, meta, error }` envelope

### Switching to live at runtime

The Header component has a **Mock toggle switch** (top-right of every page). Clicking it:
1. Flips `apiConfig.useMock` in memory
2. Triggers a health check to the configured `VITE_API_URL`
3. Shows an `Online` / `Offline` / `Checking` badge next to the toggle

The toggle is **development convenience only** — in production you should bake the mode into `VITE_USE_MOCK` at build time and remove or hide the toggle.

### Switching to live in `.env`

```bash
# .env
VITE_API_URL=http://localhost:8000   # or your staging/production URL
VITE_API_KEY=your_real_api_key_here
VITE_USE_MOCK=false
```

Restart the dev server after editing `.env`.

### Expected backend response envelope

The live fetch helper expects all responses in this shape (matching `eCourtSolution`'s envelope):

```json
{
  "data": <actual payload>,
  "meta": { "total": 42, "page": 1 },
  "error": null
}
```

If the API ever changes its envelope structure, update the `request<T>()` helper at the bottom of `src/services/api.ts`.

---

## Code quality

### Linting

```bash
npm run lint
```

ESLint is configured in `eslint.config.js` using the flat config format with:
- `@eslint/js` — base JavaScript rules
- `typescript-eslint` — TypeScript-aware rules
- `eslint-plugin-react-hooks` — enforces hooks rules (including the strict v7 `set-state-in-effect` rule)
- `eslint-plugin-react-refresh` — prevents HMR-incompatible component exports

All lint errors are **blocking** — the CI pipeline (`npm run lint`) will fail on any error.

### Type checking

TypeScript type checking runs as part of the build:

```bash
npm run build   # tsc -b runs first; build aborts on any type error
```

To check types without building:

```bash
npx tsc --noEmit
```

TypeScript is configured in strict mode (`tsconfig.app.json`):
- `noUnusedLocals` — flags unused variables
- `noUnusedParameters` — flags unused function parameters
- `noFallthroughCasesInSwitch` — catches missing `break` statements
- `erasableSyntaxOnly` — prevents non-standard TypeScript syntax

### Pre-commit checklist

Before opening a PR, verify locally:

```bash
npm run lint       # zero errors
npm run build      # zero type errors, clean dist/
npm run preview    # smoke test in the production build
```

---

## Debugging guide

### Browser DevTools

**React Developer Tools** (browser extension — install from Chrome Web Store or Firefox Add-ons):
- **Components tab** — inspect the component tree, read and modify state/props live. Select any component and click the eye icon to log its state to the console.
- **Profiler tab** — record renders to find unnecessary re-renders. Look for components that re-render on every keystroke in search forms.

**Network tab** (built into DevTools):
- Filter by `Fetch/XHR` to see only API calls
- When `VITE_USE_MOCK=false`, every `apiService` call appears here with full request/response headers
- Check the `X-API-Key` header is present on every request
- Look for 401 (wrong key), 422 (invalid params), or 500 (server error) status codes

### Vite HMR not reflecting changes

1. Hard reload: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows/Linux)
2. If CSS changes are not showing, check that you are editing `src/index.css` — this is the only CSS file that matters; `src/App.css` was removed
3. Env var changes require a **full dev server restart** (`Ctrl+C` then `npm run dev`)

### TypeScript errors in IDE but not in terminal

This usually means your IDE's TypeScript server is using a different version than the project's. In VS Code:
1. `Cmd+Shift+P` → "TypeScript: Select TypeScript Version"
2. Choose "Use Workspace Version" (should show `~6.x.x`)

### API errors when using the live backend

Step-by-step diagnosis:

```
1. Check VITE_USE_MOCK=false in .env and restart the dev server
2. Check VITE_API_URL points to the running backend (http://localhost:8000 by default)
3. Confirm the backend is running: curl http://localhost:8000/health
4. Confirm the API key: curl -H "X-API-Key: $VITE_API_KEY" http://localhost:8000/v1/courts
5. Open the browser Network tab — find the failing request and read the response body
6. Check the browser Console for the thrown Error message from the request() helper
```

### Common runtime errors

| Error | Cause | Fix |
|---|---|---|
| `API Error: Unauthorized (401)` | Wrong `VITE_API_KEY` | Copy the key from `eCourtSolution/.env` |
| `Failed to fetch` (no status) | Backend not running or wrong `VITE_API_URL` | Start the backend or fix the URL in `.env` |
| `API Error: Unprocessable Entity (422)` | A search parameter is malformed | Check the query params logged in the Network tab |
| Blank page on load | Usually a JS runtime error — check the browser Console | Fix the error shown; most common cause is `undefined` access on unloaded data |
| Toast notification not showing | `Notification` component not added to the page's return JSX | Import and render `<Notification message={message} />` at the bottom of the page |

### Debugging a specific page

Every page component receives a `mockUpdateKey: number` prop. Incrementing it (via the "Refresh data" button in AdminPanel or by toggling mock mode) re-runs all `useEffect` data fetches on that page. Use this to test loading states and error handling without refreshing the whole app.

### VS Code recommended extensions

Add a `.vscode/extensions.json` with these recommendations for the team:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## Production build

### Build

```bash
# Set production env vars first
export VITE_API_URL=https://api.ecourtsolution.in
export VITE_API_KEY=your_production_api_key
export VITE_USE_MOCK=false

npm run build
```

Output goes to `dist/`:

```
dist/
├── index.html                    # Entry point (0.60 kB gzip: 0.37 kB)
├── favicon.svg
├── icons.svg
└── assets/
    ├── index-[hash].js           # Full app bundle (~285 kB gzip: ~80 kB)
    └── index-[hash].css          # All styles (~10 kB gzip: ~2.8 kB)
```

Asset filenames include a content hash — when the file changes, the hash changes, which **automatically busts the browser cache**. The `index.html` is never hashed so it can be delivered fresh on every request.

### Preview the build locally

```bash
npm run preview
# → http://localhost:4173
```

Always verify the production build locally before deploying. The preview server serves `dist/` exactly as a production static server would — no HMR, no source maps, hashed filenames.

### What the build does not include

- **No server-side rendering** — the output is a pure client-side SPA
- **No API credentials in source maps** — Vite strips source maps in production by default
- **No mock data** — if `VITE_USE_MOCK=false` at build time, mock code is tree-shaken out of the bundle. If `VITE_USE_MOCK=true` the mock data constants remain in the bundle (adds ~10 kB uncompressed). For production, always build with `VITE_USE_MOCK=false`.

---

## Deployment

The `dist/` folder is a self-contained static site. Any static file server or CDN can serve it.

> **Important:** `dist/` is gitignored. Always build it fresh during deployment — never commit or deploy a build artifact from a developer machine.

---

### Option A — Nginx (recommended for self-hosted)

**1. Build and copy files:**

```bash
npm run build
sudo cp -r dist/* /var/www/ecourtsolution-ui/
```

**2. Nginx site configuration** (`/etc/nginx/sites-available/ecourtsolution-ui`):

```nginx
server {
    listen 80;
    server_name app.ecourtsolution.in;

    root /var/www/ecourtsolution-ui;
    index index.html;

    # Serve hashed assets with long-lived cache (they never change for a given hash)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # All other paths serve index.html — required for client-side navigation
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compress text assets
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
}
```

**3. Enable and reload:**

```bash
sudo ln -s /etc/nginx/sites-available/ecourtsolution-ui /etc/nginx/sites-enabled/
sudo nginx -t        # test config
sudo systemctl reload nginx
```

**4. HTTPS with Let's Encrypt:**

```bash
sudo certbot --nginx -d app.ecourtsolution.in
```

---

### Option B — Docker (Nginx in a container)

Create `Dockerfile.ui` in the project root:

```dockerfile
# ── Stage 1: build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

COPY . .

# Build args injected at docker build time → become VITE_ env vars
ARG VITE_API_URL=http://localhost:8000
ARG VITE_API_KEY=changeme
ARG VITE_USE_MOCK=false
ENV VITE_API_URL=$VITE_API_URL \
    VITE_API_KEY=$VITE_API_KEY \
    VITE_USE_MOCK=$VITE_USE_MOCK

RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: any unknown path returns index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }\n\
    location / { try_files $uri $uri/ /index.html; }\n\
    gzip on;\n\
    gzip_types text/html text/css application/javascript image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build and run:**

```bash
docker build \
  --build-arg VITE_API_URL=https://api.ecourtsolution.in \
  --build-arg VITE_API_KEY=your_production_key \
  --build-arg VITE_USE_MOCK=false \
  -t ecourtsolution-ui:latest \
  -f Dockerfile.ui \
  .

docker run -p 80:80 ecourtsolution-ui:latest
```

---

### Option C — Vercel / Netlify (zero-config)

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```
Set `VITE_API_URL`, `VITE_API_KEY`, `VITE_USE_MOCK` in the Vercel project dashboard under Settings → Environment Variables.

**Netlify:**
Set `publish = dist` and `command = npm run build` in `netlify.toml`. Add environment variables in the Netlify dashboard.

Both platforms detect the Vite config automatically and inject env vars at build time.

---

### Runtime env injection

Because Vite bakes env vars into the bundle at build time, rebuilding is normally required to change the API URL. If you need to change the backend URL **without rebuilding** (common in K8s environments with a shared image across staging/prod), use a runtime injection pattern:

**1.** Add a `public/config.js` script that is loaded before the bundle:

```js
// public/config.js — replaced at container startup by entrypoint script
window.__ECOURT_CONFIG__ = {
  apiUrl: 'PLACEHOLDER_API_URL',
  apiKey: 'PLACEHOLDER_API_KEY',
  useMock: false,
};
```

**2.** In `index.html`, load it before the main bundle:

```html
<script src="/config.js"></script>
<script type="module" src="/src/main.tsx"></script>
```

**3.** In `src/services/api.ts`, read from `window.__ECOURT_CONFIG__` with a fallback to `import.meta.env`:

```ts
const runtimeConfig = (window as any).__ECOURT_CONFIG__;
export const apiConfig = {
  baseUrl: runtimeConfig?.apiUrl ?? import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  apiKey:  runtimeConfig?.apiKey ?? import.meta.env.VITE_API_KEY  ?? 'changeme',
  useMock: runtimeConfig?.useMock ?? (import.meta.env.VITE_USE_MOCK !== 'false'),
};
```

**4.** In the Docker entrypoint, replace the placeholders using `sed` before Nginx starts:

```bash
#!/bin/sh
sed -i "s|PLACEHOLDER_API_URL|${API_URL}|g" /usr/share/nginx/html/config.js
sed -i "s|PLACEHOLDER_API_KEY|${API_KEY}|g"  /usr/share/nginx/html/config.js
exec nginx -g 'daemon off;'
```

This pattern lets you run one Docker image across staging and production with different `API_URL` environment variables.

---

### CORS note

The browser makes requests directly from the user's browser to the API URL set in `VITE_API_URL`. If the API and the UI are served from **different origins**, the backend must include the appropriate CORS headers:

```
Access-Control-Allow-Origin: https://app.ecourtsolution.in
Access-Control-Allow-Headers: X-API-Key, Content-Type
```

This is configured in the `eCourtSolution` backend via `ECOURTS_CORS_ORIGINS` in its `.env`.

---

## API service layer

All backend communication is centralised in `src/services/api.ts`. This is the **only file that should contain `fetch()` calls**.

### Adding a new API endpoint

1. Add the TypeScript interface for the response type at the top of `api.ts`
2. Add a mock constant (`MOCK_*`) with realistic data
3. Add the method to `apiService` following this pattern:

```ts
async getMyNewData(params: { field: string }): Promise<MyType[]> {
  if (apiConfig.useMock) {
    await sleep(400);                                // realistic simulated latency
    return MOCK_MY_DATA.filter(item => /* ... */);  // filter by params
  }
  const query = new URLSearchParams(params).toString();
  return request<MyType[]>(`/v1/my-endpoint?${query}`);
},
```

4. Import and call `apiService.getMyNewData()` from the relevant page component

### Response type mapping

| UI interface | Backend endpoint | Notes |
|---|---|---|
| `Court` | `GET /v1/courts` | Flat list; hierarchy resolved via `parent_id` |
| `CaseInfo` | `GET /v1/cases/:cnr` | Includes nested `Court` and `CaseOrder[]` |
| `Judgment` | `GET /v1/judgments` | `source` field drives archive vs live badge |
| `CauseListEntry` | `GET /v1/cause-lists/:court/:date` | HC/SCI returns PDF URL; District returns structured entries |
| `Advocate` | `GET /v1/advocates` | `specializations` and `states` are `Record<string, number>` |
| `Judge` | `GET /v1/judges` | `disposal_breakdown` drives the bar chart in `Judges.tsx` |
| `BulkJob` | `GET /v1/bulk/jobs` | `progress` (0–100), `status` enum drives colour coding |
| `ResolutionReviewItem` | `GET /v1/admin/resolution-review` | Merge/reject actions are `POST` |
| `SeedStatus` | `GET /v1/admin/seed-status` | Progress bar on Dashboard |

---

## Design system

The entire visual system is defined in `src/index.css` via CSS custom properties. No external CSS framework is used.

### Colour tokens

```css
--bg-primary       /* #0b0f19  — page background */
--bg-secondary     /* #111827  — sidebar, header */
--bg-tertiary      /* #1f2937  — form inputs, inactive states */
--accent-primary   /* #6366f1  — indigo — primary actions, active nav */
--accent-secondary /* #a855f7  — purple — highlights, charts */
--text-primary     /* #f3f4f6  — headings, values */
--text-secondary   /* #9ca3af  — labels, descriptions */
--text-muted       /* #6b7280  — placeholders, timestamps */
--success          /* #10b981  — disposed, online, completed */
--warning          /* #f59e0b  — pending, running */
--danger           /* #ef4444  — failed, offline, dismissed */
--info             /* #06b6d4  — archive source, info badges */
```

### Reusable utility classes

| Class | Use |
|---|---|
| `.glass-panel` | Primary card container — backdrop blur + border |
| `.glass-card` | Nested content block — subtle background |
| `.glass-input` | All form inputs and selects |
| `.glass-button` | Primary action button — indigo gradient |
| `.glass-button-secondary` | Secondary / ghost button |
| `.badge .badge-{success\|warning\|danger\|info}` | Status chips |
| `.custom-table` | Full-width table with row hover |
| `.timeline` | Vertical event timeline (orders, hearings) |
| `.animate-fade-in` | Entrance animation — applied to every page root |
| `.pulse-glow` | Active nav item animation |

### Layout classes

| Class | Grid |
|---|---|
| `.grid-cols-2/3/4` | Responsive equal-column grids |
| `.split-grid-narrow-wide` | 1.2fr / 1.8fr — list + detail (Cases, Judgments, …) |
| `.split-grid-wide-narrow` | 1.6fr / 1fr — content + sidebar (Dashboard, Admin) |
| `.search-grid-5` | 4 fields + auto button (Judgments search bar) |
| `.search-grid-4` | 3 fields + auto button |
| `.search-grid-3` | 2 fields + auto button (CauseLists search bar) |
| `.two-col-detail` | Equal two-column detail grid inside a panel |
| `.mobile-panel-hidden` | Hides panel on ≤1024px when detail view is active |
| `.mobile-only` | Visible only on ≤1024px |
| `.desktop-only` | Visible only on >1024px |

### Responsive breakpoints

| Breakpoint | Behaviour |
|---|---|
| `> 1024px` | Desktop: sidebar visible, bottom nav hidden, split grids side-by-side |
| `≤ 1024px` | Tablet/mobile: sidebar hidden, hamburger + drawer visible, bottom nav visible, split grids stack |
| `≤ 640px` | Mobile: single column everywhere, reduced padding, scaled-down typography |
# eCourtSolutionUI
