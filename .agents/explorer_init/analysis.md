# Codebase Exploration & Analysis Report
**Clash of Clans Meta Tracker**

## Executive Summary
The Clash of Clans Meta Tracker is a static Astro application highlighting the daily army compositions and equipment meta of top global players. While the codebase is structured logically, it suffers from severe performance bottlenecks (specifically over 59MB of uncompressed PNG icon assets and a 10,000+ node DOM size on the players page) and critical UI/UX issues, including a broken active navigation link state when deployed under a subpath.

---

## 1. Codebase Overview & Data Flow

The codebase is built using the **Astro (v6.4.4)** framework and styled with **Tailwind CSS (v4.3.0)** using `@tailwindcss/vite`.

### Key Directories & Files
- `scripts/fetch-meta.ts`: A TypeScript CLI script that fetches the top 200 players from the Clash of Clans API, analyzes their profiles and battlelogs, and aggregates the stats into local JSON files.
- `data/`: Holds the aggregated JSON data, most notably `meta.json` (~285KB), which serves as the data source for the static pages.
- `src/pages/`:
  - `index.astro`: Main stats page displaying cards for Hero equipment, Super Troops, and Siege Machines.
  - `armies.astro`: Page displaying top army types with collapsible lists of players using them.
  - `players.astro`: List of the top 200 global players and their detailed loadouts.
- `src/components/`: Astro components that render UI cards, tables, and rows (e.g., `ArmyTypesCard.astro`, `PlayerRow.astro`, `Top200Table.astro`).
- `src/utils/`:
  - `dataUtils.ts`: Utility to read and parse the static JSON data.
  - `iconUtils.ts`: Path builders for units, heroes, and equipment icons.
- `src/styles/global.css`: Global styles registering Tailwind v4 theme colors and setting base page layouts.

### System Data Flow
```
[Clash of Clans API] 
        │
        ▼ (via scripts/fetch-meta.ts)
[data/meta.json]
        │
        ▼ (read at build time via src/utils/dataUtils.ts)
[Astro Pages / Static Site Generation]
        │
        ▼
[Static HTML Output (dist/)]
```

---

## 2. Performance Bottleneck Candidates

### A. Critical Asset Sizes (Oversized PNG Icons)
The `public/icons` directory contains **86 icon assets**, many of which are completely uncompressed and scale up to **7.9MB each**. Since a single page renders dozens of these icons (often as 32x32px or 48x48px small images), a user visiting the site has to download **up to 60MB of image assets**.

Here are the most severe offenders:

| File Name | Size (Bytes) | Size (MB) | Recommended Action |
| :--- | :---: | :---: | :--- |
| `Icon_HV_Siege_Machine_Battle_Drill.png` | 7,921,253 | **7.92 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Equipment_ArcherPuppet.png` | 5,999,339 | **6.00 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Equipment_BarbarianPuppet.png` | 5,933,013 | **5.93 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Equipment_Vampstache.png` | 5,075,660 | **5.08 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Equipment_RageVial.png` | 4,949,136 | **4.95 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Equipment_InvisibilityVial.png` | 4,809,899 | **4.81 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Equipment_EternalTome.png` | 4,587,014 | **4.59 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Equipment_RoyalGem.png` | 4,019,983 | **4.02 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Equipment_FrozenArrow.png` | 3,170,026 | **3.17 MB** | Resize to 128x128 & convert to WebP |
| `Hero_Minion_Prince_02_noShadow.png` | 2,840,541 | **2.84 MB** | Compress and convert to WebP |
| `Icon_HV_Equipment_Fireball.png` | 2,525,794 | **2.53 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Hero_Pets_Greedy_Raven.png` | 2,312,342 | **2.31 MB** | Resize to 128x128 & convert to WebP |
| `Icon_HV_Hero_Pets_Angry_Jelly.png` | 2,278,765 | **2.28 MB** | Resize to 128x128 & convert to WebP |

**Impact**: Slow initial page loads, high mobile bandwidth consumption, and empty/broken layout blocks while large images load.
**Solution**: Run a batch compression and conversion script. Converting all icons to 128x128px WebP files (similar to `Icon_HV_Equipment_MonolithArrow.webp` which is only **12 KB**) will reduce the assets payload from ~60MB to less than 1MB.

### B. DOM Size & Client-Side Rendering
The `src/pages/players.astro` page renders the global top 200 players using `Top200Table.astro` and `PlayerRow.astro`. 
- Each player row renders the player rank, name, clan details, trophies, and their active army composition (which includes icons/tooltips for up to 4 heroes, 4 pets, 8 equipments, 2 super troops, and 1 siege machine).
- This creates **10,000+ DOM nodes** on a single static HTML page.
- There is no pagination, virtualized list, or client-side filtering.
**Impact**: Rendering this many nodes concurrently degrades scroll performance on lower-end mobile devices and increases memory usage.
**Solution**: Implement client-side pagination or a virtual list, or provide client-side search/filter capabilities to show only a subset of players at a time.

### C. Sequential / Slow Data Fetching Script
In `scripts/fetch-meta.ts`, player profiles and battlelogs are fetched in batches of 20 using `Promise.all`:
```ts
const batchSize = 20;
for (let i = 0; i < playerTags.length; i += batchSize) {
  // ...
  const promises = batch.map(async (tag: string) => {
    const pTag = encodeURIComponent(tag);
    const [player, battlelog] = await Promise.all([
      fetchWithRetry(`${BASE_URL}/players/${pTag}`),
      fetchWithRetry(`${BASE_URL}/players/${pTag}/battlelog`)
    ]);
    return { player, battlelog };
  });
  // ...
}
```
**Impact**:
1. Initiating 40 concurrent HTTP requests (2 requests per player in the batch) triggers frequent `429 Too Many Requests` or server timeouts, requiring sleep retries and slowing down the script execution.
2. If the script fails halfway through, there is no cache to resume progress. It must start over.
**Solution**:
- Implement a local cache (e.g. storing fetched JSON responses in a temporary folder) so that repeated runs can skip already fetched player data within a certain TTL window.
- Slow down concurrency by fetching with a worker pool (e.g., using `p-limit`) rather than dumping 40 parallel requests.

### D. Configuration Cleanup
In `astro.config.mjs`, `@astrojs/node` is imported but never registered as an adapter:
```javascript
import node from '@astrojs/node'; // Imported but unused
```
**Solution**: Remove this import to keep configuration clean.

---

## 3. Visual & UI/UX Polish Targets

### A. Navigation Tab Active State Bug
In `src/layouts/Layout.astro`, active navigation tabs are highlighted using this logic:
```ts
const isActive = currentPath === link.href || (link.href !== '/' && currentPath.startsWith(link.href));
```
- When built under a subpath (e.g., `base: '/coc-meta-tracker'` in `astro.config.mjs`), `currentPath` (derived from `Astro.url.pathname`) starts with `/coc-meta-tracker` (e.g., `/coc-meta-tracker/armies`).
- However, `link.href` is defined as `/armies` or `/players`.
- As a result, `currentPath === link.href` and `currentPath.startsWith(link.href)` evaluate to `false`.
**Impact**: The active page's tab is never highlighted in the navigation bar when deployed.
**Solution**: Account for the base path in `isActive` checks:
```ts
const resolvedBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const resolvedHref = resolvedBase + link.href;
const isActive = currentPath === resolvedHref || (link.href !== '/' && currentPath.startsWith(resolvedHref));
```

### B. Typography: Missing Web Font Loading
`src/styles/global.css` defines the primary body font:
```css
font-family: 'Inter', system-ui, sans-serif;
```
- However, the `Inter` font is never loaded via a `<link>` in `Layout.astro` or imported via `@import` in `global.css`.
**Impact**: The browser falls back to system fonts (Segoe UI on Windows, San Francisco on macOS), altering the intended design.
**Solution**: Add Google Font preload and styles links in `Layout.astro`'s `<head>`.

### C. External Asset Dependency
The background texture of the body is loaded from an external site:
```css
body class="... bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] ..."
```
**Impact**: Offline previewing fails to render the background, and external load times block page style complete states.
**Solution**: Save `cubes.png` locally to `public/patterns/cubes.png` and reference it locally.

### D. Security: Inline Event Handlers
The codebase uses inline Javascript event handlers:
- `onclick` in `PlayerRow.astro` (line 57) for copy-to-clipboard:
  ```astro
  onclick={`navigator.clipboard.writeText('${player.armyLink}')`}
  ```
- `onerror` in multiple components (lines 72, 78, 87 in `ArmyTypesCard.astro`, line 30 in `HeroCard.astro`, etc.) to hide broken images:
  ```astro
  onerror="this.style.display='none'"
  ```
**Impact**: Violates strict Content Security Policies (CSP) which forbid `unsafe-inline` scripts.
**Solution**: Define script handlers inside `<script>` blocks using delegation or event listeners.

### E. Accessibility (a11y) & Interactive States
1. **Interactive States**: Collapsible `<details>` summaries in `ArmyTypesCard.astro` don't define clear custom focus states (`focus-visible:ring-2`) or clear hover cues.
2. **Tab Landmarks**: Navigation links do not specify `aria-current="page"` when active, making it difficult for screen reader users to identify the current page.
3. **Empty Tooltips**: If a hero equipment image fails to load, `onerror="this.style.display='none'"` hides the image, but the surrounding tooltip container remains hoverable, presenting a blank space.

---

## 4. Test Suite Analysis & Proposals

### Current State
There are **no tests** configured in the codebase. `package.json` contains no test dependencies (`vitest`, `jest`, etc.) and no `test` script.

### Proposed Testing Setup

#### A. Unit Testing with Vitest
Since Astro uses Vite under the hood, **Vitest** is the natural choice. It requires minimal setup and integrates seamlessly.

**Setup Steps**:
1. Install Vitest:
   ```bash
   npm install -D vitest
   ```
2. Add a test script in `package.json`:
   ```json
   "test": "vitest"
   ```
3. Add a test configuration or simply let Vitest run in its zero-config mode for TypeScript files.

**Sample Unit Test**:
Create a test file `src/utils/dataUtils.test.ts` to verify data parsing and mapping logic:
```ts
import { describe, it, expect } from 'vitest';
import { HeroMap } from '../data/equipmentMap';

describe('Equipment Mapping', () => {
  it('correctly maps hero ID to name', () => {
    expect(HeroMap[0]).toBe('Barbarian King');
    expect(HeroMap[1]).toBe('Archer Queen');
    expect(HeroMap[7]).toBe('Dragon Duke');
  });
});
```

Create another test file `scripts/parser.test.ts` to test army share code extraction robustness:
```ts
import { describe, it, expect } from 'vitest';

function parseHeroSection(code: string) {
  // Regex from fetch-meta.ts, expanded to exclude 'i' to handle CC troop sections correctly
  const hMatch = code.match(/h([^\-dsui]+(?:-[^\-dsui]+)*)/);
  if (!hMatch) return [];
  return hMatch[1].split('-');
}

describe('Army Share Code Hero Section Parser', () => {
  it('extracts hero layout codes from a complete share code', () => {
    const code = "u15x82-3x59s4x1-3x2h2p9e4_22-0p11e10_51-1p16e17_39i3x51";
    const heroes = parseHeroSection(code);
    expect(heroes).toEqual([
      "2p9e4_22",
      "0p11e10_51",
      "1p16e17_39"
    ]);
  });
});
```

#### B. End-to-End (E2E) Testing with Playwright
To verify page loads, page transitions, and user interactions (like details toggling and nav links), **Playwright** is recommended.

**Setup Steps**:
1. Install Playwright:
   ```bash
   npm init playwright@latest
   ```
2. Create `tests/navigation.spec.ts`:
   ```ts
   import { test, expect } from '@playwright/test';

   test('has title and navigates to armies page', async ({ page }) => {
     await page.goto('http://localhost:4321/coc-meta-tracker');
     await expect(page).toHaveTitle(/Stats Meta - Clash Tracker/);

     // Click the armies navigation link
     await page.click('text=Armies');
     await expect(page).toHaveURL(/\/armies/);
     await expect(page.locator('h2')).toContainText('TOP ARMY TYPES');
   });
   ```

---

## 5. Summary of Files to Modify

The following table summarizes the files that require modification to address the performance and UX findings:

| File Path | Issues Addressed | Proposed Changes |
| :--- | :--- | :--- |
| `astro.config.mjs` | Unused node import | Remove `import node from '@astrojs/node';` |
| `src/layouts/Layout.astro` | Nav highlight bug, missing fonts, inline script CSP, accessibility | Update `isActive` logic, load Inter font, refactor visibility listener to avoid inline selectors, add `aria-current`. |
| `src/components/PlayerRow.astro` | Inline `onclick` clipboard copy | Move inline clipboard script to a standard scoped `<script>` block, adding class listeners. |
| `src/components/ArmyTypesCard.astro` | Inline `onerror`, accessibility | Refactor `onerror` to use a global stylesheet fallback or custom `<script>` event handlers. Add focus styles on `<summary>`. |
| `src/components/HeroCard.astro` | Inline `onerror` | Refactor `onerror` image fallback logic. |
| `src/components/SiegeMachinesCard.astro` | Inline `onerror` | Refactor `onerror` image fallback logic. |
| `src/components/SuperTroopsCard.astro` | Inline `onerror` | Refactor `onerror` image fallback logic. |
| `scripts/fetch-meta.ts` | Regex safety, concurrency, caching | Update hero section regex to `/h([^\-dsui]+(?:-[^\-dsui]+)*)/`, implement simple cache mechanisms, optimize fetch concurrency. |
| `public/icons/` | Huge image files (60MB total) | Compress, resize to max 128x128px, and convert all `.png` files to `.webp` format. |
