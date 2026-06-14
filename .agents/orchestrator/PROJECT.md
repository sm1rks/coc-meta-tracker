# Project: Clash of Clans Meta Tracker Optimization

## Architecture
The application is a static website built with Astro and styled with Tailwind CSS.
- **Data Input**: The Clash of Clans API yields player data, which is fetched daily via `scripts/fetch-meta.ts` and stored as static JSON files in `data/`.
- **Frontend Pages**: Astro compiles page files in `src/pages/` using static data from `data/meta.json` at build time.
- **Output**: Pure static HTML/CSS files in `dist/`.

## Code Layout
- `astro.config.mjs`: Astro project configuration
- `scripts/fetch-meta.ts`: Node script for data fetching pipeline
- `data/meta.json`: Aggregated JSON meta data
- `src/layouts/Layout.astro`: Base HTML layout, navigation menu, global styles registration
- `src/pages/`:
  - `index.astro`: Dashboard for equipment, super troops, siege machines
  - `armies.astro`: Common army layouts and matching players
  - `players.astro`: Full leaderboard listing top 200 players
- `src/components/`:
  - `Top200Table.astro` & `PlayerRow.astro`: Renders the leaderboard grid
  - `HeroCard.astro`, `ArmyTypesCard.astro`, `SiegeMachinesCard.astro`, `SuperTroopsCard.astro`: Dashboards cards
- `src/styles/global.css`: CSS styles using Tailwind v4.3.0
- `src/utils/`:
  - `dataUtils.ts`: Reads and parses static JSON data
  - `iconUtils.ts`: Constructs asset URLs for CoC elements

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|-------------|--------|-----------------|
| T1| E2E Testing Track | Establish E2E testing framework, design Tiers 1-4 test suite, publish `TEST_READY.md` | None | IN_PROGRESS | 2983e005-cc9f-44d9-8dd4-5a27b66c2f2d |
| M1| Asset & Pipeline Optimization | Convert icons to WebP, optimize data pipeline script (fetch-meta regex, cache, concurrency) | None | PLANNED | Owned by Impl (9338cde5-8d4a-4629-930e-ff975d835159) |
| M2| UI/UX & Security Polish | Fix nav path bug, load Inter font, local background cubes, refactor inline script handlers for CSP, improve accessibility (a11y) landmarks and interactive states | None | PLANNED | Owned by Impl (9338cde5-8d4a-4629-930e-ff975d835159) |
| M3| Leaderboard Performance | Implement client-side pagination/filtering in `players.astro` to solve DOM size bottleneck | M1, M2 | PLANNED | Owned by Impl (9338cde5-8d4a-4629-930e-ff975d835159) |
| M4| Final Milestone & Hardening | Pass E2E test suite (Tiers 1-4), perform Tier 5 Adversarial Coverage Hardening, final Forensic Audit | T1, M1, M2, M3 | PLANNED | Owned by Impl (9338cde5-8d4a-4629-930e-ff975d835159) |

## Interface Contracts
### 1. WebP Asset Directory Structure
- All optimized icon assets must reside in `public/icons/` as `.webp` files.
- `src/utils/iconUtils.ts` must map unit names/types to the corresponding `.webp` path. If an icon is missing, it should fallback safely.

### 2. Client-side Search and Pagination state
- In `players.astro`, the search query and page selection must persist in the URL query string (e.g. `?search=ClashMaster&page=2`) to enable deep-linking while minimizing DOM nodes.

### 3. Active Nav base path compatibility
- Layout navigation tabs check must resolve relative to `import.meta.env.BASE_URL` to support subpath deployments.
