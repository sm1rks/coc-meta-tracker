# M1 (Asset & Pipeline Optimization) Analysis Report

## Summary of Core Findings
The Clash of Clans Meta Tracker can be significantly optimized by removing unused dependencies (`@astrojs/node` and `clashofclans.js`), converting large PNG icons to WebP (saving >95% bandwidth), fixing a regex logic bug in `fetch-meta.ts` that includes Clan Castle units in hero data, and implementing caching/concurrency to protect the API rate limit and speed up data fetching.

---

## 1. astro.config.mjs & package.json Cleanup Opportunities

### Current State
`astro.config.mjs` imports the Node adapter but does not use it:
```javascript
import node from '@astrojs/node'; // Unused
```
In `package.json`, the following dependencies exist:
```json
"dependencies": {
  "@astrojs/node": "^10.1.3",
  "clashofclans.js": "^4.0.5",
  ...
}
```

### Analysis & Recommendations
1. **Remove `@astrojs/node`**: The project is a static website (`output: 'static'`) deployed on GitHub Pages. There is no server environment requiring the Node adapter. Both the import in `astro.config.mjs` and the dependency in `package.json` should be removed.
2. **Remove `clashofclans.js`**: The script `scripts/fetch-meta.ts` uses the native `fetch` API to query the RoyaleAPI proxy directly. The `clashofclans.js` npm package is completely unused in the codebase and should be removed from `package.json` to keep dependencies minimal.
3. **Remove Unused Icon Asset**: The file `public/icons/Hero_Minion_Prince_02_noShadow.png` is a massive 2.84 MB file that is not referenced in the code (the application maps "Minion Prince" to `Icon_HV_Hero_MinionPrince.webp` which is only 92 KB). Removing this file saves repository and build size.

---

## 2. Build & Test Commands Map and M1 Impact

### Workspace Commands Map
Currently, the codebase has these scripts in `package.json`:
* **`npm run dev`** (runs `astro dev`): Launches the local development server.
* **`npm run build`** (runs `astro build`): Generates the static production site in `dist/`.
* **`npm run preview`** (runs `astro preview`): Serves the production build locally.
* **`npm run fetch-data`** (runs `tsx scripts/fetch-meta.ts`): Triggers the Clash of Clans API pipeline.
* **`npm run test`**: *(Planned in E2E Testing Track T1)*.

### M1 Impact on Build & Test Pipeline
* **Build Impact (Asset Size Reduction)**:
  Converting icons to WebP will shrink the asset size from **~60 MB** to **~2.5 MB** (a ~95% size reduction). This drastically reduces static page loading time, client bandwidth, and git bloat.
* **Pipeline Impact (Efficiency & API Protection)**:
  * **Regex Bug Fix & Optimization**: The current regex `/h([^\-dsu]+(?:-[^\-dsu]+)*)/` fails to exclude the Clan Castle troop section (`i`), causing CC troops (e.g. Balloons `i5x3`) to be matched as hero metadata and subsequently parsed and discarded. Changing the regex to `/h([^\-dsui]+(?:-[^\-dsui]+)*)/` (or `/h([^huids]+)/`) isolates heroes perfectly. Furthermore, pre-compiling all section regexes outside the loop avoiding 12,000+ compilations per run.
  * **Local Cache**: Adding a file-based cache for fetched player profiles/battlelogs (e.g. in `.cache/`) avoids redundant API calls during development, testing, and rerun cycles, accelerating local executions from minutes to milliseconds.
  * **Concurrency Control**: Moving from a sequential batching model (waiting for all 20 players to finish, then starting next batch) to a worker pool (sliding window) protects the API rate limit (10 req/s) and prevents rate-limiting delays (429s).
* **Test Impact (E2E Integration)**:
  * E2E tests checking image sources will need to match `.webp` instead of `.png`. Hardcoded assertions on `.png` extensions will fail once M1 is implemented.
  * Local caching of the API data allows E2E test runs to execute without network dependency on the Clash of Clans API.

---

## 3. Interface Contracts & Recommendations

### Contract 1: WebP Asset Directory Structure
* **Rule**: All optimized icon assets must reside in `public/icons/` as `.webp` files.
* **Recommendation**: Implement a simple node script in `scripts/convert-webp.ts` using `sharp` (already installed in `node_modules` by Astro) to convert and compress all pngs in `public/icons/` to WebP, then delete the original pngs.

### Contract 2: Safe Fallback Mapping in `src/utils/iconUtils.ts`
* **Rule**: `src/utils/iconUtils.ts` must map names to `.webp` paths. If missing, it must fallback safely.
* **Problem**: Dynamic file checks using Node's `fs` cannot run in the browser if parts of the frontend are compiled for client-side execution.
* **Recommendation**: Use Vite's native compile-time file-discovery feature `import.meta.glob` to inspect existing files at build time without importing `fs`/`path`. This is 100% safe for both browser and server builds:

```typescript
const base = import.meta.env.BASE_URL;
export const basePath = base.endsWith('/') ? base : base + '/';

// Dynamically discover all WebP icons in the public/icons directory at compile/build time
const iconModules = import.meta.glob('/public/icons/*.webp', { eager: true });
const existingIcons = new Set(
  Object.keys(iconModules).map((key) => key.substring(key.lastIndexOf('/') + 1).toLowerCase())
);

const getIconOrFallback = (filename: string): string => {
  const webpFilename = filename.endsWith('.webp') ? filename : `${filename}.webp`;
  if (existingIcons.has(webpFilename.toLowerCase())) {
    return `${basePath}icons/${webpFilename}`;
  }
  return `${basePath}icons/placeholder.webp`; // Fulfills "fallback safely" contract
};

export const getHeroIcon = (name: string) => 
  getIconOrFallback(`Icon_HV_Hero_${name.replace(/\s+/g, '')}`);

export const getEqIcon = (str: string) => 
  getIconOrFallback(`Icon_HV_Equipment_${str.replace(/\s+/g, '')}`);

export const getPetIcon = (name: string) => 
  getIconOrFallback(`Icon_HV_Hero_Pets_${name.replace(/\s+/g, '_')}`);

export const getSuperTroopIcon = (name: string) => 
  getIconOrFallback(`Icon_HV_${name.replace(/\s+/g, '_')}`);

export const getSiegeMachineIcon = (name: string) => 
  getIconOrFallback(`Icon_HV_Siege_Machine_${name.replace(/ /g, '_')}`);
```
