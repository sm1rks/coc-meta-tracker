# M1 Astro Explorer Handoff Report

This report summarizes the findings of the read-only investigation of Milestone M1 (Asset & Pipeline Optimization).

## 1. Observation
* **Unused Import in `astro.config.mjs`**:
  `astro.config.mjs` imports the `@astrojs/node` adapter on line 4, which is not referenced anywhere in the configuration:
  ```javascript
  4: import node from '@astrojs/node';
  ```
  The site uses static output:
  ```javascript
  8:   output: 'static',
  ```
* **Unused Packages in `package.json`**:
  `package.json` lists `@astrojs/node` on line 16 and `clashofclans.js` on line 20:
  ```json
  16:     "@astrojs/node": "^10.1.3",
  20:     "clashofclans.js": "^4.0.5",
  ```
  Neither of these packages is imported or utilized in the codebase (the data fetching is done via native `fetch`).
* **Unused Asset**:
  The directory `public/icons` contains `Hero_Minion_Prince_02_noShadow.png` (size `2,840,541` bytes), but it is never referenced in `src/` or by `iconUtils.ts` (which maps Minion Prince to `Icon_HV_Hero_MinionPrince.webp`).
* **Pipeline Regex Bug in `scripts/fetch-meta.ts`**:
  Line 158:
  ```typescript
  const hMatch = attack.armyShareCode.match(/h([^\-dsu]+(?:-[^\-dsu]+)*)/);
  ```
  The character class `[^\-dsu]` does not exclude the Clan Castle troop identifier `i`, which is standard in Clash of Clans share codes (e.g. `i5x3`). When run on a share code containing `i`, the regex captures `i` and its units as part of the hero list:
  ```
  Input Share Code: u2x1-3x2h0e10_51-1e15_3p4i5x3s1x2
  Captured Section: 0e10_51-1e15_3p4i5x3
  Split list: ['0e10_51', '1e15_3p4i5x3']
  ```
  The proposed regex `/h([^\-dsui]+(?:-[^\-dsui]+)*)/` captures `0e10_51-1e15_3p4` correctly.
* **Large PNG files in `public/icons`**:
  `list_dir` on `public/icons` revealed 86 PNG files, with several files exceeding 4 MB to 7 MB (e.g. `Icon_HV_Siege_Machine_Battle_Drill.png` is 7.92 MB, and equipment cards like `ArcherPuppet` are 5.99 MB). The total folder size is over 60 MB.
* **Workspace Scripts in `package.json`**:
  There are no test scripts in `package.json` (the E2E testing framework milestone T1 is currently in progress).

---

## 2. Logic Chain
1. **Redundancy Analysis**:
   * Since `output` is `'static'`, no SSR adapter is required. Therefore, the `@astrojs/node` import and package are redundant and can be safely deleted.
   * Since the fetch pipeline script uses native `fetch` directly with the RoyaleAPI proxy, the `clashofclans.js` client library dependency in `package.json` is redundant and can be safely removed.
   * Removing unused assets like `Hero_Minion_Prince_02_noShadow.png` directly decreases the repository and build size.
2. **Regex Correction**:
   * The Clash of Clans share code splits sections using prefix letters (`h`, `i`, `d`, `u`, `s`).
   * The hero section begins with `h` and continues until the next section header (usually `i` or `u`).
   * The current regex class `[^\-dsu]` excludes `d`, `s`, and `u`, but fails to exclude `i`.
   * By adding `i` to the excluded set (`[^\-dsui]`), the regex will correctly stop capturing when it encounters the Clan Castle section, solving the parsing bug.
3. **Asset Size Reduction**:
   * Large PNG files can be compressed into lossy or lossless `.webp` format using `sharp`.
   * Standard WebP compression typically achieves 90-95% file size reduction compared to raw PNG files, drastically improving page load performance and lowering bandwidth.
4. **Browser-Safe Fallback mapping**:
   * Checking file existence with Node's `fs` module fails in browser builds because the module does not exist on the client side.
   * Vite provides `import.meta.glob`, which analyzes directory contents at build time and compiles it into a static lookup table, ensuring it is 100% safe to run in any browser-side runtime environment.

---

## 3. Caveats
* **Live API Testing**:
  Investigation was conducted without running the full live pipeline script, as there is no `.env` file containing a `COC_API_KEY` in the workspace. The behavior of `fetch-meta.ts` was analyzed using source inspection and regex execution over mock share codes.
* **E2E Test Coordination**:
  Milestone T1 (E2E Testing Track) is running concurrently. Implementation of the WebP asset conversion must coordinate with T1 to ensure that E2E test assertions do not fail on `.png` paths.

---

## 4. Conclusion
Milestone M1 should implement:
1. Removal of `@astrojs/node` and `clashofclans.js` from `package.json` and `astro.config.mjs`.
2. Deletion of the unused asset `public/icons/Hero_Minion_Prince_02_noShadow.png`.
3. Correction of the hero-parsing regex in `fetch-meta.ts` to `/h([^\-dsui]+(?:-[^\-dsui]+)*)/` (or `/h([^huids]+)/`) and moving the regex compilation outside the loop.
4. Implementing local file caching (in `.cache/`) and sliding-window concurrency limit in the data-fetching pipeline.
5. Converting all PNG icons in `public/icons/` to WebP, updating `src/utils/iconUtils.ts` to use WebP, and integrating compile-time fallback mapping using Vite's `import.meta.glob`.

---

## 5. Verification Method
1. **Regex Correctness**:
   Run `python .agents/explorer_m1_2/verify_regex.py` to verify the output matches for both current and proposed patterns.
   * *Expected output*: The proposed pattern splits the list into `['0e10_51', '1e15_3p4']`, excluding `i5x3`.
2. **Dependency & Configuration Validation**:
   Build the project using `npm run build` after removing the adapter import from `astro.config.mjs` to ensure the static build succeeds without errors.
3. **Fallback & Path Check**:
   Once implemented, verify that requesting a non-existent icon path in `iconUtils.ts` (e.g. `getEqIcon("Unknown Equipment")`) returns `/coc-meta-tracker/icons/placeholder.webp` instead of a broken path.
