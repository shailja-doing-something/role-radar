# RoleRadar

Job market intelligence tool. Scrapes job boards, identifies hiring patterns, and surfaces the top 100 teams actively recruiting.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Prisma 7** + SQLite (`better-sqlite3` driver adapter)
- **NextAuth v5** (JWT credentials)
- **Tailwind CSS v4**
- **Google Gemini** (pattern analysis, generic board scraping)
- **lucide-react** (icons)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy and fill in `.env`:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<generate with: openssl rand -hex 32>"
GEMINI_API_KEY="<your Gemini API key>"
```

### 3. Run migrations and seed

```bash
npx prisma migrate dev
npx prisma db seed
```

This creates the SQLite database and seeds:
- 8 job boards (HN, RemoteOK, LinkedIn, Indeed, Greenhouse, Lever, WWR, AngelList)
- Admin user: `admin@roleradar.local` / `password`

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

## Features

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | Overview stats, top companies, recent postings |
| Patterns | `/patterns` | AI-extracted skill/tool frequency trends |
| Top 100 Teams | `/top100` | Companies ranked by open role count |
| Sources | `/sources` | Manage job boards, trigger manual scrapes |
| Settings | `/settings` | Change password |

## Scraping

- **HN Jobs** and **RemoteOK** use their public APIs and run without a Gemini key.
- All other boards use a Gemini-powered HTML extractor — set `GEMINI_API_KEY` to enable them.
- The scheduler auto-scrapes all active boards every **6 hours** via `instrumentation.ts`.
- Trigger a manual scrape from the Sources page, or call `POST /api/scrape` with `{ "slug": "hn" }`.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats` | Dashboard stats |
| GET | `/api/postings` | Paginated job postings |
| GET | `/api/patterns` | Skill patterns |
| POST | `/api/patterns` | Trigger AI pattern analysis |
| GET | `/api/top100` | Top 100 companies |
| GET | `/api/sources` | List job boards |
| POST | `/api/sources` | Add a job board |
| PATCH | `/api/sources/[id]` | Update a job board |
| DELETE | `/api/sources/[id]` | Delete a job board |
| POST | `/api/scrape` | Trigger scrape (body: `{ slug? }`) |

## Conventions

- TypeScript everywhere, named exports
- Prisma only — never raw SQL
- Tailwind only — no inline styles
- `lucide-react` for all icons
- All Gemini calls wrapped in try/catch with retry (`lib/gemini.ts`)
- `JobBoard.slug` is the single source of truth linking `JobPosting.source` to `JobBoard` records
