# Scope: Implementation Track

## Architecture
The application is a static website built with Astro and styled with Tailwind CSS.
- **Data Input**: The Clash of Clans API yields player data, which is fetched daily via `scripts/fetch-meta.ts` and stored as static JSON files in `data/`.
- **Frontend Pages**: Astro compiles page files in `src/pages/` using static data from `data/meta.json` at build time.
- **Output**: Pure static HTML/CSS files in `dist/`.

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|-------------|--------|-----------------|
| M1| Asset & Pipeline Optimization | Convert icons to WebP, optimize data pipeline script (fetch-meta regex, cache, concurrency), and astro config cleanup | None | IN_PROGRESS | f33ca669, 525c084a, fc13bcb6 |
| M2| UI/UX & Security Polish | Fix nav path bug, load Inter font, local background cubes, refactor inline script handlers for CSP, improve accessibility (a11y) landmarks and interactive states | None | PLANNED | TBD |
| M3| Leaderboard Performance | Implement client-side pagination/filtering in `players.astro` to solve DOM size bottleneck | M1, M2 | PLANNED | TBD |
| M4| Final Milestone & Hardening | Pass E2E test suite (Tiers 1-4), perform Tier 5 Adversarial Coverage Hardening, final Forensic Audit | M1, M2, M3 | PLANNED | TBD |

## Interface Contracts
### 1. WebP Asset Directory Structure
- All optimized icon assets must reside in `public/icons/` as `.webp` files.
- `src/utils/iconUtils.ts` must map unit names/types to the corresponding `.webp` path. If an icon is missing, it should fallback safely.

### 2. Client-side Search and Pagination state
- In `players.astro`, the search query and page selection must persist in the URL query string (e.g. `?search=ClashMaster&page=2`) to enable deep-linking while minimizing DOM nodes.

### 3. Active Nav base path compatibility
- Layout navigation tabs check must resolve relative to `import.meta.env.BASE_URL` to support subpath deployments.
